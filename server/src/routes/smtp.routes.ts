import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRole, requireTenantContext } from "../middleware/rbac";
import { prisma } from "../prisma";
import { encryptSecret } from "../security/encryption";

const router = Router();

const ADMIN_ROLES = ["TENANT_ADMIN", "SALES_ADMIN"] as const;

const credentialSchema = z.object({
  host: z.string().trim().min(1, "SMTP host is required"),
  port: z.coerce.number().int().min(1, "SMTP port is required"),
  secure: z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "n", ""].includes(normalized)) return false;
    }
    return value;
  }, z.boolean().optional().default(false)),
  username: z.string().trim().min(1, "SMTP username is required"),
  password: z.string().trim().min(1, "SMTP password is required").optional(),
  fromEmail: z.string().trim().email().optional(),
});

const messagesQuerySchema = z.object({
  userId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.get("/tenants/:tenantId/smtp-credentials", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const isAdmin = ADMIN_ROLES.includes(req.auth!.role as any);
  const credentials = await prisma.smtpCredential.findMany({
    where: isAdmin ? { tenantId } : { tenantId, userId: req.auth!.sub },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const counts = await prisma.smtpMessageLog.groupBy({
    by: ["smtpCredentialId"],
    where: { tenantId },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const countMap = new Map(
    counts.map((entry) => [entry.smtpCredentialId, { count: entry._count._all, lastMessageAt: entry._max.createdAt }])
  );

  return res.json({
    credentials: credentials.map((credential) => {
      const stats = countMap.get(credential.id);
      return {
        id: credential.id,
        tenantId: credential.tenantId,
        userId: credential.userId,
        host: credential.host,
        port: credential.port,
        secure: credential.secure,
        username: credential.username,
        fromEmail: credential.fromEmail,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        user: credential.user,
        messageCount: stats?.count ?? 0,
        lastMessageAt: stats?.lastMessageAt ?? null,
        passwordSet: true,
      };
    }),
  });
});

router.put("/tenants/:tenantId/smtp-credentials/me", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const userId = req.auth!.sub;
  const parsed = credentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const existing = await prisma.smtpCredential.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  if (!parsed.data.password && !existing) {
    return res.status(400).json({ message: "SMTP password is required for first-time setup" });
  }

  const encryptedPassword = parsed.data.password
    ? encryptSecret(parsed.data.password)
    : existing?.encryptedPassword;

  const fromEmail = parsed.data.fromEmail ?? parsed.data.username;

  const credential = await prisma.smtpCredential.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      host: parsed.data.host,
      port: parsed.data.port,
      secure: parsed.data.secure ?? false,
      username: parsed.data.username,
      encryptedPassword: encryptedPassword!,
      fromEmail,
      isActive: true,
    },
    update: {
      host: parsed.data.host,
      port: parsed.data.port,
      secure: parsed.data.secure ?? false,
      username: parsed.data.username,
      encryptedPassword: encryptedPassword ?? undefined,
      fromEmail,
      isActive: true,
    },
  });

  return res.json({
    credential: {
      id: credential.id,
      tenantId: credential.tenantId,
      userId: credential.userId,
      host: credential.host,
      port: credential.port,
      secure: credential.secure,
      username: credential.username,
      fromEmail: credential.fromEmail,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      passwordSet: true,
    },
  });
});

router.delete("/tenants/:tenantId/smtp-credentials/me", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const userId = req.auth!.sub;
  await prisma.smtpCredential.deleteMany({ where: { tenantId, userId } });
  return res.status(204).send();
});

router.get(
  "/tenants/:tenantId/smtp-messages",
  requireAuth,
  requireTenantContext,
  requireRole(ADMIN_ROLES as any),
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = messagesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query", errors: z.treeifyError(parsed.error) });
    }

    const where = {
      tenantId,
      userId: parsed.data.userId,
    };

    const skip = (parsed.data.page - 1) * parsed.data.pageSize;
    const [messages, total] = await Promise.all([
      prisma.smtpMessageLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parsed.data.pageSize,
      }),
      prisma.smtpMessageLog.count({ where }),
    ]);

    return res.json({
      messages,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total,
    });
  }
);

export default router;
