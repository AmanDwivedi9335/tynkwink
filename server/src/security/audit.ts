import { prisma } from "../prisma";

export async function writeAuditLog(params: {
  tenantId: string;
  actorUserId?: string | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const client = prisma as typeof prisma & {
    auditLog?: {
      create: typeof prisma.auditLog.create;
    };
  };
  if (!client.auditLog) {
    console.warn("[audit-log] Prisma client missing AuditLog model. Run `prisma generate` in server.");
    return;
  }
  const { tenantId, actorUserId, actionType, entityType, entityId, meta } = params;
  await client.auditLog.create({
    data: {
      tenantId,
      actorUserId: actorUserId ?? null,
      actionType,
      entityType,
      entityId: entityId ?? null,
      metaJson: meta ?? undefined,
    },
  });
}
