import { prisma } from "../prisma";

export async function writeAuditLog(params: {
  tenantId: string;
  actorUserId?: string | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { tenantId, actorUserId, actionType, entityType, entityId, meta } = params;
  await prisma.auditLog.create({
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
