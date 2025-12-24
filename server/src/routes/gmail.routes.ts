import crypto from "crypto";
import { Router } from "express";
import { google } from "googleapis";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenantContext } from "../middleware/rbac";
import { prisma } from "../prisma";
import { encryptSecret } from "../security/encryption";
import { signState, verifyState } from "../security/tokens";
import { writeAuditLog } from "../security/audit";
import { canManageIntegrations } from "../services/tenantAccess";
import { gmailRuleSchema } from "../services/gmailRules";
import { gmailSyncQueue } from "../queues/queues";

const router = Router();

const gmailScopes = ["https://www.googleapis.com/auth/gmail.readonly"];

const startSchema = z.object({
  redirectUri: z.string().trim().optional(),
});

const ruleSchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  conditions: gmailRuleSchema,
});

router.post("/tenants/:tenantId/integrations/gmail/start", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role;
  if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  if (!(await canManageIntegrations({ tenantId, userId, role }))) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ message: "Google OAuth config missing" });
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const state = signState({
    tenantId,
    userId,
    nonce: crypto.randomUUID(),
    redirectUri: parsed.data.redirectUri,
    issuedAt: Date.now(),
  });

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: gmailScopes,
    state,
  });

  return res.json({ url });
});

router.get("/integrations/gmail/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  if (!code || !state) {
    return res.status(400).json({ message: "Missing OAuth parameters" });
  }

  let parsedState;
  try {
    parsedState = verifyState(state);
  } catch (error) {
    return res.status(400).json({ message: "Invalid state" });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ message: "Google OAuth config missing" });
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    return res.status(400).json({ message: "No refresh token received. Ensure consent prompt is enabled." });
  }

  oauth2.setCredentials(tokens);
  const oauth2Api = google.oauth2({ auth: oauth2, version: "v2" });
  const profile = await oauth2Api.userinfo.get();
  const gmailAddress = profile.data.email ?? "";
  if (!gmailAddress) {
    return res.status(400).json({ message: "Unable to determine Gmail address" });
  }

  const encryptedRefreshToken = encryptSecret(tokens.refresh_token);
  const scopes = tokens.scope ?? gmailScopes.join(" ");

  const integration = await prisma.gmailIntegration.upsert({
    where: { tenantId_gmailAddress: { tenantId: parsedState.tenantId, gmailAddress } },
    update: {
      encryptedRefreshToken,
      scopes,
      status: "ACTIVE",
    },
    create: {
      tenantId: parsedState.tenantId,
      createdByUserId: parsedState.userId,
      gmailAddress,
      encryptedRefreshToken,
      scopes,
      status: "ACTIVE",
    },
  });

  await writeAuditLog({
    tenantId: parsedState.tenantId,
    actorUserId: parsedState.userId,
    actionType: "GMAIL_CONNECTED",
    entityType: "GmailIntegration",
    entityId: integration.id,
  });

  await gmailSyncQueue.add("gmail.sync", { integrationId: integration.id }, { jobId: `gmail.sync.${integration.id}` });

  const redirectTo = parsedState.redirectUri ?? process.env.PUBLIC_BASE_URL ?? "http://localhost:5173/app/integrations";
  return res.redirect(redirectTo);
});

router.post(
  "/tenants/:tenantId/integrations/gmail/:integrationId/disconnect",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const integrationId = req.params.integrationId;
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    if (!(await canManageIntegrations({ tenantId, userId, role }))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const integration = await prisma.gmailIntegration.update({
      where: { id: integrationId, tenantId },
      data: { status: "REVOKED" },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "GMAIL_DISCONNECTED",
      entityType: "GmailIntegration",
      entityId: integration.id,
    });

    return res.json({ ok: true });
  }
);

router.get("/tenants/:tenantId/integrations/gmail", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const integrations = await prisma.gmailIntegration.findMany({
    where: { tenantId },
    include: { syncState: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ integrations });
});

router.post(
  "/tenants/:tenantId/integrations/gmail/:integrationId/rules",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const integrationId = req.params.integrationId;
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    if (!(await canManageIntegrations({ tenantId, userId, role }))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const integration = await prisma.gmailIntegration.findFirst({ where: { id: integrationId, tenantId } });
    if (!integration) {
      return res.status(404).json({ message: "Integration not found" });
    }

    const rule = await prisma.gmailRule.create({
      data: {
        tenantId,
        integrationId,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
        conditionsJson: parsed.data.conditions,
        createdBy: userId,
        version: 1,
      },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "GMAIL_RULE_CREATED",
      entityType: "GmailRule",
      entityId: rule.id,
      meta: { integrationId },
    });

    return res.status(201).json({ rule });
  }
);

router.get(
  "/tenants/:tenantId/integrations/gmail/:integrationId/rules",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const integrationId = req.params.integrationId;
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const rules = await prisma.gmailRule.findMany({
      where: { tenantId, integrationId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ rules });
  }
);

router.patch(
  "/tenants/:tenantId/integrations/gmail/:integrationId/rules/:ruleId",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const integrationId = req.params.integrationId;
    const ruleId = req.params.ruleId;
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    if (!(await canManageIntegrations({ tenantId, userId, role }))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = ruleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const existing = await prisma.gmailRule.findFirst({ where: { id: ruleId, tenantId, integrationId } });
    if (!existing) {
      return res.status(404).json({ message: "Rule not found" });
    }

    const updated = await prisma.gmailRule.update({
      where: { id: ruleId },
      data: {
        name: parsed.data.name ?? existing.name,
        isActive: parsed.data.isActive ?? existing.isActive,
        conditionsJson: parsed.data.conditions ?? existing.conditionsJson,
        version: existing.version + 1,
      },
    });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "GMAIL_RULE_UPDATED",
      entityType: "GmailRule",
      entityId: updated.id,
      meta: { integrationId },
    });

    return res.json({ rule: updated });
  }
);

router.delete(
  "/tenants/:tenantId/integrations/gmail/:integrationId/rules/:ruleId",
  requireAuth,
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.params.tenantId;
    const integrationId = req.params.integrationId;
    const ruleId = req.params.ruleId;
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) return res.status(401).json({ message: "Unauthenticated" });
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    if (!(await canManageIntegrations({ tenantId, userId, role }))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.gmailRule.delete({ where: { id: ruleId } });

    await writeAuditLog({
      tenantId,
      actorUserId: userId,
      actionType: "GMAIL_RULE_DELETED",
      entityType: "GmailRule",
      entityId: ruleId,
      meta: { integrationId },
    });

    return res.json({ ok: true });
  }
);

export default router;
