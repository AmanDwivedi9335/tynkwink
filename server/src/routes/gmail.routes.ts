import crypto from "crypto";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import type { Response } from "express";
import type { google as GoogleApis } from "googleapis";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenantContext } from "../middleware/rbac";
import { getPrismaClient, prisma } from "../prisma";
import { encryptSecret } from "../security/encryption";
import { signState, verifyState } from "../security/tokens";
import { writeAuditLog } from "../security/audit";
import { canManageIntegrations } from "../services/tenantAccess";
import { gmailRuleSchema } from "../services/gmailRules";
import { gmailSyncQueue } from "../queues/queues";

const router = Router();

const gmailScopes = ["https://www.googleapis.com/auth/gmail.readonly"];

const loadGoogleApis = () =>
  import("googleapis")
    .then((module) => module.google)
    .catch(() => null as GoogleApis | null);

const startSchema = z.object({
  redirectUri: z.string().trim().optional(),
});

const allowedRedirectOrigins = (() => {
  const configured = (process.env.PUBLIC_BASE_URL ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.flatMap((value) => {
    try {
      return [new URL(value).origin];
    } catch (error) {
      return [];
    }
  });
})();

function resolveRedirectUri(candidate?: string | null, requestOrigin?: string | null) {
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    if (allowedRedirectOrigins.length > 0) {
      if (allowedRedirectOrigins.includes(url.origin)) {
        return url.toString();
      }
    } else if (requestOrigin && url.origin === requestOrigin) {
      return url.toString();
    }
  } catch (error) {
    return undefined;
  }
  return undefined;
}

const ruleSchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  conditions: gmailRuleSchema,
});

const MAX_REASON_LENGTH = 180;
const GOOGLE_OAUTH_ENV_KEYS = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
];

function sanitizeReason(reason?: string | null) {
  if (!reason) return undefined;
  return reason.toString().slice(0, MAX_REASON_LENGTH);
}

function resolveMissingGoogleConfig() {
  const missing = GOOGLE_OAUTH_ENV_KEYS.filter((key) => !(process.env[key] ?? "").trim());
  return {
    missing,
    message: missing.length > 0 ? `Missing Google OAuth config: ${missing.join(", ")}` : "",
  };
}

type GmailModels = {
  gmailIntegration: PrismaClient["gmailIntegration"];
  gmailRule: PrismaClient["gmailRule"];
};

function resolveGmailModels(
  res: Response,
  options?: { allowMissing?: boolean; missingMessage?: string }
): GmailModels | null {
  const client = getPrismaClient() as typeof prisma & Partial<GmailModels>;
  if (!client.gmailIntegration || !client.gmailRule) {
    const message =
      options?.missingMessage ??
      "Prisma client missing Gmail models. Run `prisma generate` in server and restart the API.";
    if (options?.allowMissing) {
      res.status(200).json({ integrations: [], warning: message });
    } else {
      res.status(500).json({ message });
    }
    return null;
  }

  return { gmailIntegration: client.gmailIntegration, gmailRule: client.gmailRule };
}

function isMissingGmailTables(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function respondToMissingGmailTables(res: Response, error: unknown) {
  if (!isMissingGmailTables(error)) return false;
  res
    .status(503)
    .json({ message: "Gmail tables are missing. Run `prisma migrate` in server." });
  return true;
}

function isRecordNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function resolveDefaultRedirect() {
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";
  try {
    return new URL("/app/settings/gmail", base).toString();
  } catch (error) {
    return "http://localhost:5173/app/settings/gmail";
  }
}

function appendParams(url: string, params: Record<string, string | undefined>) {
  const target = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      target.searchParams.set(key, value);
    }
  });
  return target.toString();
}

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

  const missingConfig = resolveMissingGoogleConfig();
  if (missingConfig.missing.length > 0) {
    return res.status(500).json({
      message: "Google OAuth config missing",
      missing: missingConfig.missing,
    });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";

  const google = await loadGoogleApis();
  if (!google) {
    return res.status(500).json({ message: "Google APIs dependency missing. Run npm install in server." });
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const state = signState({
    tenantId,
    userId,
    nonce: crypto.randomUUID(),
    redirectUri: resolveRedirectUri(parsed.data.redirectUri, req.get("origin")),
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
  const errorParam = req.query.error as string | undefined;
  const errorDescription = req.query.error_description as string | undefined;
  let redirectBase = resolveDefaultRedirect();

  let parsedState;
  if (state) {
    try {
      parsedState = verifyState(state);
      redirectBase = parsedState.redirectUri ?? redirectBase;
    } catch (error) {
      return res.redirect(
        appendParams(redirectBase, {
          gmailConnect: "error",
          stage: "oauth_state",
          reason: "Invalid OAuth state",
        })
      );
    }
  }

  if (errorParam) {
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_consent",
        reason: sanitizeReason(errorDescription ?? errorParam),
      })
    );
  }

  if (!code || !state) {
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_callback",
        reason: "Missing OAuth parameters",
      })
    );
  }

  if (!parsedState?.tenantId || !parsedState?.userId) {
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_state",
        reason: "Invalid OAuth state payload",
      })
    );
  }

  const missingConfig = resolveMissingGoogleConfig();
  if (missingConfig.missing.length > 0) {
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_config",
        reason: sanitizeReason(missingConfig.message || "Google OAuth config missing"),
      })
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";

  const google = await loadGoogleApis();
  if (!google) {
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_setup",
        reason: "Google APIs dependency missing. Run npm install in server.",
      })
    );
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      return res.redirect(
        appendParams(redirectBase, {
          gmailConnect: "error",
          stage: "oauth_token",
          reason: "No refresh token received. Ensure consent prompt is enabled.",
        })
      );
    }

    oauth2.setCredentials(tokens);
    if (!tokens.access_token) {
      const accessTokenResponse = await oauth2.getAccessToken();
      const accessToken =
        typeof accessTokenResponse === "string" ? accessTokenResponse : accessTokenResponse?.token;
      if (!accessToken) {
        return res.redirect(
          appendParams(redirectBase, {
            gmailConnect: "error",
            stage: "oauth_token",
            reason: "Unable to obtain access token from refresh token.",
          })
        );
      }
      oauth2.setCredentials({ ...tokens, access_token: accessToken });
    }
    const oauth2Api = google.oauth2({ auth: oauth2, version: "v2" });
    const profile = await oauth2Api.userinfo.get();
    const gmailAddress = profile.data.email ?? "";
    if (!gmailAddress) {
      return res.redirect(
        appendParams(redirectBase, {
          gmailConnect: "error",
          stage: "oauth_profile",
          reason: "Unable to determine Gmail address",
        })
      );
    }

    const encryptedRefreshToken = encryptSecret(tokens.refresh_token);
    const scopes = tokens.scope ?? gmailScopes.join(" ");

    const models = resolveGmailModels(res);
    if (!models) return;

    let integration;
    try {
      integration = await models.gmailIntegration.upsert({
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
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      throw error;
    }

    await writeAuditLog({
      tenantId: parsedState.tenantId,
      actorUserId: parsedState.userId,
      actionType: "GMAIL_CONNECTED",
      entityType: "GmailIntegration",
      entityId: integration.id,
    });

    await gmailSyncQueue.add("gmail.sync", { integrationId: integration.id }, { jobId: `gmail.sync.${integration.id}` });

    const redirectTo = parsedState.redirectUri ?? redirectBase;
    return res.redirect(
      appendParams(redirectTo, {
        gmailConnect: "success",
        gmail: gmailAddress,
      })
    );
  } catch (error: any) {
    if (respondToMissingGmailTables(res, error)) return;
    return res.redirect(
      appendParams(redirectBase, {
        gmailConnect: "error",
        stage: "oauth_finalize",
        reason: sanitizeReason(error?.message ?? "Unknown error"),
      })
    );
  }
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

    const models = resolveGmailModels(res);
    if (!models) return;

    let integration;
    try {
      integration = await models.gmailIntegration.update({
        where: { id: integrationId, tenantId },
        data: { status: "REVOKED" },
      });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      if (isRecordNotFound(error)) {
        return res.status(404).json({ message: "Integration not found" });
      }
      throw error;
    }

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

  const models = resolveGmailModels(res, { allowMissing: true });
  if (!models) return;

  let integrations;
  try {
    integrations = await models.gmailIntegration.findMany({
      where: { tenantId },
      include: { syncState: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (isMissingGmailTables(error)) {
      return res
        .status(200)
        .json({ integrations: [], warning: "Gmail tables are missing. Run `prisma migrate` in server." });
    }
    throw error;
  }

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

    const models = resolveGmailModels(res);
    if (!models) return;

    let integration;
    try {
      integration = await models.gmailIntegration.findFirst({ where: { id: integrationId, tenantId } });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      throw error;
    }
    if (!integration) {
      return res.status(404).json({ message: "Integration not found" });
    }

    let rule;
    try {
      rule = await models.gmailRule.create({
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
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      throw error;
    }

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

    const models = resolveGmailModels(res);
    if (!models) return;

    let rules;
    try {
      rules = await models.gmailRule.findMany({
        where: { tenantId, integrationId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      throw error;
    }

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
    if (!tenantId || !integrationId || !ruleId) {
      return res.status(400).json({ message: "Missing route parameters" });
    }
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

    const models = resolveGmailModels(res);
    if (!models) return;

    let existing;
    try {
      existing = await models.gmailRule.findFirst({ where: { id: ruleId, tenantId, integrationId } });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      throw error;
    }
    if (!existing) {
      return res.status(404).json({ message: "Rule not found" });
    }

    let updated;
    try {
      updated = await models.gmailRule.update({
        where: { id: ruleId },
        data: {
          name: parsed.data.name ?? existing.name,
          isActive: parsed.data.isActive ?? existing.isActive,
          conditionsJson: parsed.data.conditions ?? existing.conditionsJson,
          version: existing.version + 1,
        },
      });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      if (isRecordNotFound(error)) {
        return res.status(404).json({ message: "Rule not found" });
      }
      throw error;
    }

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
    if (!tenantId || !integrationId || !ruleId) {
      return res.status(400).json({ message: "Missing route parameters" });
    }
    if (tenantId !== req.auth?.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    if (!(await canManageIntegrations({ tenantId, userId, role }))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const models = resolveGmailModels(res);
    if (!models) return;

    try {
      await models.gmailRule.delete({ where: { id: ruleId } });
    } catch (error) {
      if (respondToMissingGmailTables(res, error)) return;
      if (isRecordNotFound(error)) {
        return res.status(404).json({ message: "Rule not found" });
      }
      throw error;
    }

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
