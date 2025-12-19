import { prisma } from "../prisma";
import { hashPassword } from "./crypto";

const SUPERADMIN_EMAIL = "super@aman.com";
const SUPERADMIN_PASSWORD = "123456";
const SUPERADMIN_NAME = "Super Admin";

export async function ensureSuperAdmin() {
  const passwordHash = await hashPassword(SUPERADMIN_PASSWORD);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: SUPERADMIN_EMAIL },
      update: {
        name: SUPERADMIN_NAME,
        passwordHash,
        isActive: true,
      },
      create: {
        name: SUPERADMIN_NAME,
        email: SUPERADMIN_EMAIL,
        passwordHash,
        isActive: true,
      },
    });

    await tx.tenantUser.deleteMany({
      where: { userId: user.id },
    });
  });
}
