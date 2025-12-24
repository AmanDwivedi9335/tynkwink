import { prisma } from "../prisma";
import { UserRole } from "../../generated/prisma";

export async function canManageIntegrations(params: {
  tenantId: string;
  userId: string;
  role: UserRole;
}) {
  if (params.role === "TENANT_ADMIN") return true;
  const access = await prisma.gmailIntegrationAccess.findUnique({
    where: { tenantId_userId: { tenantId: params.tenantId, userId: params.userId } },
  });
  return Boolean(access);
}
