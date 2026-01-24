import { Prisma, UserRole, WhatsAppIntegrationStatus, WhatsAppMessageDirection, WhatsAppMessageStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenantContext } from "../middleware/rbac";
import { getPrismaClient, prisma } from "../prisma";
import { writeAuditLog } from "../security/audit";
import { respondToPrismaConnectionError } from "../utils/prismaErrors";
import {
  decryptAccessToken,
  normalizeCredentialInput,
  normalizePhoneNumber,
  sendWhatsAppTextMessage,
  validateWhatsAppCredentials,
} from "../services/whatsappService";

const router = Router();

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "TENANT_ADMIN"];
const SEND_ROLES: UserRole[] = ["SUPERADMIN", "TENANT_ADMIN", "SALES_ADMIN", "SALES_EXECUTIVE"];

type WhatsAppModels = {
  whatsAppIntegration: PrismaClient["whatsAppIntegration"];
  whatsAppMessage: PrismaClient["whatsAppMessage"];
};

type WhatsAppMessageWithRelations = Prisma.WhatsAppMessageGetPayload<{
  include: {
    lead: { select: { id: true; name: true; phone: true } };
    sentByUser: { select: { id: true; name: true; email: true } };
  };
}>;

function resolveWhatsAppModels() {
  const client = getPrismaClient() as typeof prisma & Partial<WhatsAppModels>;
  if (!client.whatsAppIntegration || !client.whatsAppMessage) {
    return null;
  }
  return {
    whatsAppIntegration: client.whatsAppIntegration,
    whatsAppMessage: client.whatsAppMessage,
  } satisfies WhatsAppModels;
}

function isMissingWhatsAppTables(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function ensureTenantScope(reqTenantId: string, authTenantId?: string | null, role?: UserRole | null) {
  if (role === "SUPERADMIN") return true;
  return Boolean(authTenantId && authTenantId === reqTenantId);
}

async function ensureActiveMembership(params: { tenantId: string; userId: string; role: UserRole }) {
  if (params.role === "SUPERADMIN") return true;
  const membership = await prisma.tenantUser.findFirst({
    where: {
      tenantId: params.tenantId,
      userId: params.userId,
      isActive: true,
      user: { isActive: true },
    },
  });
  return Boolean(membership);
}

function toOptionalTrimmed(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const connectSchema = z.object({
  accessToken: z.string().trim().min(1, "Access token is required"),
  phoneNumberId: z.string().trim().min(1, "Phone number ID is required"),
  businessAccountId: z.string().trim().optional(),
  appId: z.string().trim().optional(),
  webhookVerifyToken: z.string().trim().optional(),
});

const sendSchema = z
  .object({
    leadId: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    message: z.string().trim().min(1, "Message is required").max(4096, "Message is too long"),
  })
  .refine((value) => Boolean(value.leadId || value.phone), {
    message: "Either leadId or phone is required",
    path: ["leadId"],
  });

router.get("/tenants/:tenantId/integrations/whatsapp", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role as UserRole | undefined;
  const authTenantId = req.auth?.tenantId;

  if (!tenantId) return res.status(400).json({ message: "Tenant is required" });
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (!ensureTenantScope(tenantId, authTenantId, role)) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  if (!(await ensureActiveMembership({ tenantId, userId, role }))) {
    return res.status(403).json({ message: "Inactive membership" });
  }

  const models = resolveWhatsAppModels();
  if (!models) {
    return res.status(200).json({ integration: null, messages: [], warning: "WhatsApp models unavailable. Run prisma generate." });
  }

  try {
    const integration = await models.whatsAppIntegration.findUnique({
      where: { tenantId },
    });

    let messages: WhatsAppMessageWithRelations[] = [];
    if (integration) {
      messages = await models.whatsAppMessage.findMany({
          where: { tenantId, integrationId: integration.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            lead: { select: { id: true, name: true, phone: true } },
            sentByUser: { select: { id: true, name: true, email: true } },
          },
        });
    }

    return res.json({
      integration: integration
        ? {
            id: integration.id,
            tenantId: integration.tenantId,
            businessAccountId: integration.businessAccountId,
            phoneNumberId: integration.phoneNumberId,
            displayPhoneNumber: integration.displayPhoneNumber,
            status: integration.status,
            lastValidatedAt: integration.lastValidatedAt,
            lastValidationError: integration.lastValidationError,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt,
          }
        : null,
      messages: messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        status: message.status,
        recipientPhone: message.recipientPhone,
        messageBody: message.messageBody,
        providerMessageId: message.providerMessageId,
        providerStatus: message.providerStatus,
        providerError: message.providerError,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
        lead: message.lead
          ? {
              id: message.lead.id,
              name: message.lead.name,
              phone: message.lead.phone,
            }
          : null,
        sentByUser: message.sentByUser
          ? {
              id: message.sentByUser.id,
              name: message.sentByUser.name,
              email: message.sentByUser.email,
            }
          : null,
      })),
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    if (isMissingWhatsAppTables(error)) {
      return res.status(503).json({ message: "WhatsApp tables missing. Run prisma migrate." });
    }
    throw error;
  }
});

router.post("/tenants/:tenantId/integrations/whatsapp/connect", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role as UserRole | undefined;
  const authTenantId = req.auth?.tenantId;

  if (!tenantId) return res.status(400).json({ message: "Tenant is required" });
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (!ensureTenantScope(tenantId, authTenantId, role)) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ message: "Only tenant admins can connect WhatsApp" });
  }

  if (!(await ensureActiveMembership({ tenantId, userId, role }))) {
    return res.status(403).json({ message: "Inactive membership" });
  }

  const models = resolveWhatsAppModels();
  if (!models) {
    return res.status(500).json({ message: "WhatsApp models unavailable. Run prisma generate." });
  }

  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const credentialInput = {
    accessToken: parsed.data.accessToken,
    phoneNumberId: parsed.data.phoneNumberId,
    ...(parsed.data.businessAccountId ? { businessAccountId: parsed.data.businessAccountId } : {}),
    ...(parsed.data.appId ? { appId: parsed.data.appId } : {}),
    ...(parsed.data.webhookVerifyToken ? { webhookVerifyToken: parsed.data.webhookVerifyToken } : {}),
  };

  let normalized;
  try {
    normalized = normalizeCredentialInput(credentialInput);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message ?? "Invalid credentials" });
  }

  const optionalBusinessAccountId = toOptionalTrimmed(parsed.data.businessAccountId);
  const validation = await validateWhatsAppCredentials({
    accessToken: parsed.data.accessToken,
    phoneNumberId: normalized.phoneNumberId,
    ...(optionalBusinessAccountId ? { businessAccountId: optionalBusinessAccountId } : {}),
  });

  const now = new Date();
  const status = validation.ok ? WhatsAppIntegrationStatus.ACTIVE : WhatsAppIntegrationStatus.ERROR;

  try {
    const resolvedBusinessAccountId = validation.businessAccountId ?? normalized.businessAccountId ?? null;
    const resolvedDisplayNumber = validation.displayPhoneNumber ?? null;

    const integrationUpdate: Prisma.WhatsAppIntegrationUpdateInput = {
      phoneNumberId: normalized.phoneNumberId,
      displayPhoneNumber: resolvedDisplayNumber,
      encryptedAccessToken: normalized.encryptedAccessToken,
      status,
      lastValidatedAt: validation.ok ? now : null,
      lastValidationError: validation.ok ? null : validation.error ?? "Validation failed",
      createdByUser: { connect: { id: userId } },
    };
    integrationUpdate.businessAccountId = resolvedBusinessAccountId;
    integrationUpdate.appId = normalized.appId ?? null;
    integrationUpdate.webhookVerifyToken = normalized.webhookVerifyToken ?? null;

    const integrationCreate: Prisma.WhatsAppIntegrationCreateInput = {
      tenant: { connect: { id: tenantId } },
      createdByUser: { connect: { id: userId } },
      phoneNumberId: normalized.phoneNumberId,
      displayPhoneNumber: resolvedDisplayNumber,
      encryptedAccessToken: normalized.encryptedAccessToken,
      status,
      lastValidatedAt: validation.ok ? now : null,
      lastValidationError: validation.ok ? null : validation.error ?? "Validation failed",
      businessAccountId: resolvedBusinessAccountId,
      appId: normalized.appId ?? null,
      webhookVerifyToken: normalized.webhookVerifyToken ?? null,
    };

    const integration = await models.whatsAppIntegration.upsert({
      where: { tenantId },
      update: integrationUpdate,
      create: integrationCreate,
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "WHATSAPP_CONNECTED",
      entityType: "WhatsAppIntegration",
      entityId: integration.id,
      meta: {
        status: integration.status,
        phoneNumberId: integration.phoneNumberId,
        displayPhoneNumber: integration.displayPhoneNumber,
        validationOk: validation.ok,
      },
    });

    return res.json({
      integration: {
        id: integration.id,
        tenantId: integration.tenantId,
        businessAccountId: integration.businessAccountId,
        phoneNumberId: integration.phoneNumberId,
        displayPhoneNumber: integration.displayPhoneNumber,
        status: integration.status,
        lastValidatedAt: integration.lastValidatedAt,
        lastValidationError: integration.lastValidationError,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
      validation,
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    if (isMissingWhatsAppTables(error)) {
      return res.status(503).json({ message: "WhatsApp tables missing. Run prisma migrate." });
    }
    throw error;
  }
});

router.post("/tenants/:tenantId/integrations/whatsapp/disconnect", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role as UserRole | undefined;
  const authTenantId = req.auth?.tenantId;

  if (!tenantId) return res.status(400).json({ message: "Tenant is required" });
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (!ensureTenantScope(tenantId, authTenantId, role)) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ message: "Only tenant admins can disconnect WhatsApp" });
  }

  if (!(await ensureActiveMembership({ tenantId, userId, role }))) {
    return res.status(403).json({ message: "Inactive membership" });
  }

  const models = resolveWhatsAppModels();
  if (!models) {
    return res.status(500).json({ message: "WhatsApp models unavailable. Run prisma generate." });
  }

  try {
    const existing = await models.whatsAppIntegration.findUnique({ where: { tenantId } });
    if (!existing) {
      return res.status(404).json({ message: "WhatsApp integration not found" });
    }

    const updated = await models.whatsAppIntegration.update({
      where: { tenantId },
      data: {
        status: WhatsAppIntegrationStatus.DISCONNECTED,
        lastValidationError: null,
      },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "WHATSAPP_DISCONNECTED",
      entityType: "WhatsAppIntegration",
      entityId: updated.id,
    });

    return res.json({ integration: { id: updated.id, status: updated.status } });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    if (isMissingWhatsAppTables(error)) {
      return res.status(503).json({ message: "WhatsApp tables missing. Run prisma migrate." });
    }
    throw error;
  }
});

router.post("/tenants/:tenantId/whatsapp/messages", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role as UserRole | undefined;
  const authTenantId = req.auth?.tenantId;

  if (!tenantId) return res.status(400).json({ message: "Tenant is required" });
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (!ensureTenantScope(tenantId, authTenantId, role)) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }
  if (!SEND_ROLES.includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!(await ensureActiveMembership({ tenantId, userId, role }))) {
    return res.status(403).json({ message: "Inactive membership" });
  }

  const models = resolveWhatsAppModels();
  if (!models) {
    return res.status(500).json({ message: "WhatsApp models unavailable. Run prisma generate." });
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  try {
    const integration = await models.whatsAppIntegration.findUnique({ where: { tenantId } });
    if (!integration || integration.status === WhatsAppIntegrationStatus.DISCONNECTED) {
      return res.status(400).json({ message: "WhatsApp is not connected for this tenant" });
    }

    const lead = parsed.data.leadId
      ? await prisma.lead.findFirst({ where: { id: parsed.data.leadId, tenantId } })
      : null;

    if (parsed.data.leadId && !lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const rawPhone = parsed.data.phone || lead?.phone;
    if (!rawPhone) {
      return res.status(400).json({ message: "Lead does not have a phone number" });
    }

    let recipientPhone: string;
    try {
      recipientPhone = normalizePhoneNumber(rawPhone);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message ?? "Invalid recipient phone" });
    }

    const queuedMessage = await models.whatsAppMessage.create({
      data: {
        tenantId,
        integrationId: integration.id,
        leadId: lead?.id ?? null,
        direction: WhatsAppMessageDirection.OUTBOUND,
        status: WhatsAppMessageStatus.QUEUED,
        recipientPhone,
        messageBody: parsed.data.message,
        sentByUserId: userId,
      },
    });

    const accessToken = decryptAccessToken(integration.encryptedAccessToken);

    const sendResult = await sendWhatsAppTextMessage({
      accessToken,
      phoneNumberId: integration.phoneNumberId,
      to: recipientPhone,
      body: parsed.data.message,
    });

    const now = new Date();
    const finalStatus = sendResult.ok ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED;

    const messageUpdate: Prisma.WhatsAppMessageUpdateInput = {
      status: finalStatus,
      providerError: sendResult.ok ? null : sendResult.error ?? "Send failed",
      sentAt: sendResult.ok ? now : null,
    };
    if (sendResult.providerMessageId) {
      messageUpdate.providerMessageId = sendResult.providerMessageId;
    }
    if (sendResult.providerStatus) {
      messageUpdate.providerStatus = sendResult.providerStatus;
    }
    if (sendResult.raw) {
      messageUpdate.metadataJson = sendResult.raw as Prisma.InputJsonValue;
    }

    const updatedMessage = await models.whatsAppMessage.update({
      where: { id: queuedMessage.id },
      data: messageUpdate,
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        sentByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await models.whatsAppIntegration.update({
      where: { tenantId },
      data: sendResult.ok
        ? {
            status: WhatsAppIntegrationStatus.ACTIVE,
            lastValidatedAt: now,
            lastValidationError: null,
          }
        : {
            status: WhatsAppIntegrationStatus.ERROR,
            lastValidationError: sendResult.error ?? "Failed to send message",
          },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: sendResult.ok ? "WHATSAPP_MESSAGE_SENT" : "WHATSAPP_MESSAGE_FAILED",
      entityType: "WhatsAppMessage",
      entityId: updatedMessage.id,
      meta: {
        leadId: updatedMessage.lead?.id ?? null,
        recipientPhone,
        status: updatedMessage.status,
        providerMessageId: updatedMessage.providerMessageId,
      },
    });

    const responsePayload = {
      id: updatedMessage.id,
      direction: updatedMessage.direction,
      status: updatedMessage.status,
      recipientPhone: updatedMessage.recipientPhone,
      messageBody: updatedMessage.messageBody,
      providerMessageId: updatedMessage.providerMessageId,
      providerStatus: updatedMessage.providerStatus,
      providerError: updatedMessage.providerError,
      sentAt: updatedMessage.sentAt,
      createdAt: updatedMessage.createdAt,
      lead: updatedMessage.lead
        ? {
            id: updatedMessage.lead.id,
            name: updatedMessage.lead.name,
            phone: updatedMessage.lead.phone,
          }
        : null,
      sentByUser: updatedMessage.sentByUser
        ? {
            id: updatedMessage.sentByUser.id,
            name: updatedMessage.sentByUser.name,
            email: updatedMessage.sentByUser.email,
          }
        : null,
    };

    if (!sendResult.ok) {
      return res.status(502).json({ message: sendResult.error ?? "Failed to send message", whatsappMessage: responsePayload });
    }

    return res.status(201).json({ whatsappMessage: responsePayload });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    if (isMissingWhatsAppTables(error)) {
      return res.status(503).json({ message: "WhatsApp tables missing. Run prisma migrate." });
    }
    throw error;
  }
});

export default router;
