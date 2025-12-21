import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole, requireTenantContext } from "../middleware/rbac";
import { hashPassword } from "../utils/crypto";

const router = Router();

const roleSchema = z.enum(["TENANT_ADMIN", "SALES_ADMIN", "SALES_EXECUTIVE"]);

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: roleSchema,
});

const updateStaffSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    email: z.string().trim().email("Invalid email").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No updates provided" });

function formatStaffMember(member: {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
}) {
  return {
    id: member.id,
    role: member.role,
    isActive: member.isActive,
    createdAt: member.createdAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      isActive: member.user.isActive,
    },
  };
}

router.get(
  "/staff",
  requireAuth,
  requireRole(["TENANT_ADMIN"]),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;

    const staff = await prisma.tenantUser.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ staff: staff.map((member) => formatStaffMember(member)) });
  }
);

router.post(
  "/staff",
  requireAuth,
  requireRole(["TENANT_ADMIN"]),
  requireTenantContext,
  async (req, res) => {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const tenantId = req.auth!.tenantId!;
    const { name, email, password, role } = parsed.data;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!password) {
        return res.status(400).json({ message: "Password is required for new staff members" });
      }
      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(password),
        },
      });
    } else {
      const updates: { name?: string; passwordHash?: string; isActive?: boolean } = {
        name,
      };
      if (password) {
        updates.passwordHash = await hashPassword(password);
      }
      if (!user.isActive) {
        updates.isActive = true;
      }
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }

    const membership = await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {
        role,
        isActive: true,
      },
      create: {
        tenantId,
        userId: user.id,
        role,
        isActive: true,
      },
      include: { user: true },
    });

    return res.status(201).json({ staff: formatStaffMember(membership) });
  }
);

router.patch(
  "/staff/:staffId",
  requireAuth,
  requireRole(["TENANT_ADMIN"]),
  requireTenantContext,
  async (req, res) => {
    const parsed = updateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const tenantId = req.auth!.tenantId!;
    const { staffId } = req.params;

    const membership = await prisma.tenantUser.findFirst({
      where: { id: staffId, tenantId },
      include: { user: true },
    });

    if (!membership) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const { name, email, password, role, isActive } = parsed.data;

    if (isActive === false && membership.userId === req.auth!.sub) {
      return res.status(400).json({ message: "You cannot revoke your own access" });
    }

    if (email && email !== membership.user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== membership.userId) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    const userUpdates: { name?: string; email?: string; passwordHash?: string } = {};
    if (name) userUpdates.name = name;
    if (email) userUpdates.email = email;
    if (password) userUpdates.passwordHash = await hashPassword(password);

    const membershipUpdates: { role?: z.infer<typeof roleSchema>; isActive?: boolean } = {};
    if (role) membershipUpdates.role = role;
    if (typeof isActive === "boolean") membershipUpdates.isActive = isActive;

    if (Object.keys(userUpdates).length) {
      await prisma.user.update({ where: { id: membership.userId }, data: userUpdates });
    }

    if (Object.keys(membershipUpdates).length) {
      await prisma.tenantUser.update({ where: { id: membership.id }, data: membershipUpdates });
    }

    const refreshedMembership = await prisma.tenantUser.findUnique({
      where: { id: membership.id },
      include: { user: true },
    });

    if (!refreshedMembership) {
      return res.status(500).json({ message: "Unable to refresh staff member" });
    }

    return res.json({ staff: formatStaffMember(refreshedMembership) });
  }
);

export default router;
