import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { normalizeLeadExtraction } from "../services/leadExtraction";
import { ensureStages, fallbackStageColor, stageColorMap } from "../services/leadStages";

const router = Router();

const contactLookupSchema = z.object({
  phone: z.string().trim().min(3),
});

const leadInboxCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(3),
  email: z.string().trim().email().optional(),
  company: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  preferredStage: z.string().trim().optional(),
});

async function ensureExtensionIntegration(tenantId: string, userId: string) {
  const gmailAddress = "whatsapp-extension@tynkwink.local";
  const existing = await prisma.gmailIntegration.findUnique({
    where: { tenantId_gmailAddress: { tenantId, gmailAddress } },
  });
  if (existing) return existing;

  return prisma.gmailIntegration.create({
    data: {
      tenantId,
      createdByUserId: userId,
      gmailAddress,
      encryptedRefreshToken: "extension",
      scopes: "extension",
      status: "ACTIVE",
    },
  });
}

router.get("/extension/contact-status", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  const userId = req.auth?.sub;
  if (!tenantId || !userId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = contactLookupSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const phone = parsed.data.phone;

  const lead = await prisma.lead.findFirst({
    where: { tenantId, phone },
    include: { stage: true },
  });

  if (lead) {
    return res.json({
      status: "lead",
      lead: {
        id: lead.id,
        name: lead.name ?? "",
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        company: lead.company ?? "",
        stage: lead.stage ? { id: lead.stage.id, name: lead.stage.name } : null,
      },
    });
  }

  const inbox = await prisma.leadInbox.findFirst({
    where: {
      tenantId,
      extractedPreviewJson: {
        path: "$.phone",
        equals: phone,
      },
    },
    orderBy: { receivedAt: "desc" },
  });

  if (inbox) {
    const preview = normalizeLeadExtraction(inbox.extractedPreviewJson);
    return res.json({
      status: "inbox",
      inbox: {
        id: inbox.id,
        status: inbox.status,
        leadPreview: preview
          ? {
              name: preview.leadName ?? "",
              phone: preview.phone ?? "",
              email: preview.email ?? "",
              company: preview.company ?? "",
              preferredStage: preview.preferredStage ?? "",
            }
          : null,
      },
    });
  }

  return res.json({ status: "none" });
});

router.post("/extension/lead-inbox", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  const userId = req.auth?.sub;
  if (!tenantId || !userId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = leadInboxCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const existingLead = await prisma.lead.findFirst({
    where: { tenantId, phone: parsed.data.phone },
    include: { stage: true },
  });
  if (existingLead) {
    return res.json({
      status: "lead",
      lead: {
        id: existingLead.id,
        name: existingLead.name ?? "",
        phone: existingLead.phone ?? "",
        email: existingLead.email ?? "",
        company: existingLead.company ?? "",
        stage: existingLead.stage ? { id: existingLead.stage.id, name: existingLead.stage.name } : null,
      },
    });
  }

  const integration = await ensureExtensionIntegration(tenantId, userId);
  const messageId = `extension-${randomUUID()}`;
  const from = parsed.data.name ? `${parsed.data.name} (${parsed.data.phone})` : parsed.data.phone;

  const inbox = await prisma.leadInbox.create({
    data: {
      tenantId,
      integrationId: integration.id,
      gmailMessageId: messageId,
      threadId: messageId,
      from,
      subject: "WhatsApp Lead",
      snippet: parsed.data.notes ?? null,
      receivedAt: new Date(),
      rawHeadersJson: {},
      rawBodyText: parsed.data.notes ?? null,
      status: "PENDING",
      extractedPreviewJson: {
        leadName: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        company: parsed.data.company,
        notes: parsed.data.notes,
        preferredStage: parsed.data.preferredStage,
      },
    },
  });

  return res.json({
    status: "inbox",
    inbox: {
      id: inbox.id,
      status: inbox.status,
      leadPreview: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? "",
        company: parsed.data.company ?? "",
        preferredStage: parsed.data.preferredStage ?? "",
      },
    },
  });
});

router.get("/extension/summary", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role;

  if (!tenantId || !userId || !role) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { tenant: true },
  });

  if (!membership || !membership.isActive || !membership.tenant.isActive) {
    return res.status(403).json({ message: "Tenant access denied" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return res.status(403).json({ message: "User inactive" });
  }

  const stages = await ensureStages(tenantId);
  const stageCounts = await prisma.lead.groupBy({
    by: ["stageId"],
    where: { tenantId },
    _count: { _all: true },
  });

  const countsByStage = new Map(stageCounts.map((entry) => [entry.stageId, entry._count._all]));
  const totalLeads = stageCounts.reduce((sum, entry) => sum + entry._count._all, 0);
  const defaultStageId = stages[0]?.id ?? null;

  const canSync = role === "TENANT_ADMIN" || role === "SALES_ADMIN" || role === "SALES_EXECUTIVE";

  return res.json({
    tenantId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    },
    permissions: {
      canSync,
      canViewPipeline: true,
    },
    stats: {
      allChats: totalLeads,
      unreadChats: 0,
      needsReply: 0,
      groups: 0,
      pendingReminders: 0,
    },
    pipeline: {
      name: "Leads",
      defaultStageId,
      totalLeads,
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stageColorMap[stage.name] ?? fallbackStageColor(stage.name),
        count: countsByStage.get(stage.id) ?? 0,
      })),
    },
    features: {
      aiAutoReplyEnabled: false,
    },
  });
});

export default router;
