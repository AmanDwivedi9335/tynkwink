import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenantContext } from "../middleware/rbac";
import { prisma } from "../prisma";
import { encryptSecret } from "../security/encryption";
import { writeAuditLog } from "../security/audit";

const router = Router();

const settingsSchema = z.object({
  approvalDigestFrequencyMinutes: z.number().int().min(15).max(24 * 60).optional(),
  defaultLeadOwnerUserId: z.string().trim().optional().nullable(),
  openaiApiKey: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

const accessSchema = z.object({
  userId: z.string().trim(),
});

router.get("/tenants/:tenantId/settings", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
  });

  return res.json({ settings });
});

router.patch("/tenants/:tenantId/settings", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const encryptedKey = parsed.data.openaiApiKey ? encryptSecret(parsed.data.openaiApiKey) : undefined;

  const settings = await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {
      approvalDigestFrequencyMinutes: parsed.data.approvalDigestFrequencyMinutes,
      defaultLeadOwnerUserId: parsed.data.defaultLeadOwnerUserId ?? undefined,
      openaiEncryptedApiKey: encryptedKey,
      timezone: parsed.data.timezone,
    },
    create: {
      tenantId,
      approvalDigestFrequencyMinutes: parsed.data.approvalDigestFrequencyMinutes ?? 60,
      defaultLeadOwnerUserId: parsed.data.defaultLeadOwnerUserId ?? null,
      openaiEncryptedApiKey: encryptedKey ?? null,
      timezone: parsed.data.timezone ?? "UTC",
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: userId,
    actionType: "TENANT_SETTINGS_UPDATED",
    entityType: "TenantSettings",
  });

  return res.json({ settings: { ...settings, openaiEncryptedApiKey: settings.openaiEncryptedApiKey ? "***" : null } });
});

router.post("/tenants/:tenantId/integrations/gmail/access", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role;
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }
  if (role !== "TENANT_ADMIN") {
    return res.status(403).json({ message: "Only tenant admins can manage permissions" });
  }

  const parsed = accessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const access = await prisma.gmailIntegrationAccess.create({
    data: {
      tenantId,
      userId: parsed.data.userId,
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: userId,
    actionType: "GMAIL_ACCESS_GRANTED",
    entityType: "GmailIntegrationAccess",
    entityId: access.id,
  });

  return res.status(201).json({ access });
});

router.delete(
  "/tenants/:tenantId/integrations/gmail/access/:userId",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }
    if (role !== "TENANT_ADMIN") {
      return res.status(403).json({ message: "Only tenant admins can manage permissions" });
    }

    await prisma.gmailIntegrationAccess.delete({
      where: { tenantId_userId: { tenantId, userId: req.params.userId } },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "GMAIL_ACCESS_REVOKED",
      entityType: "GmailIntegrationAccess",
      entityId: req.params.userId,
    });

    return res.json({ ok: true });
  }
);

export default router;
