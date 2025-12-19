import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { hashPassword } from "../utils/crypto";
import { UserRole } from "../../generated/prisma";

const router = Router();

const createTenantSchema = z.object({
  name: z.string().min(2, "Tenant name is required"),
  slug: z.string().optional(),
  adminName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email("Admin email is required"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

router.use(requireAuth, requireRole([UserRole.SUPERADMIN]));

router.get("/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  return res.json({
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      userCount: tenant._count.users,
    })),
  });
});

router.post("/tenants", async (req, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const { name, slug, adminName, adminEmail, adminPassword } = parsed.data;
  const normalizedSlug = normalizeSlug(slug?.trim() || name);

  if (!normalizedSlug) {
    return res.status(400).json({ message: "Tenant slug is required" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return res.status(409).json({ message: "Admin email already in use" });
  }

  try {
    const passwordHash = await hashPassword(adminPassword);
    const inboundSecret = crypto.randomBytes(24).toString("hex");

    const tenant = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name,
          slug: normalizedSlug,
          settings: {
            create: {
              inboundSecret,
            },
          },
        },
      });

      const adminUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          isActive: true,
        },
      });

      await tx.tenantUser.create({
        data: {
          tenantId: createdTenant.id,
          userId: adminUser.id,
          role: UserRole.TENANT_ADMIN,
          isActive: true,
        },
      });

      return createdTenant;
    });

    return res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      },
      admin: {
        name: adminName,
        email: adminEmail,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Tenant slug already exists" });
    }
    return res.status(500).json({ message: "Unable to create tenant" });
  }
});

router.put("/tenants/:tenantId", async (req, res) => {
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const { tenantId } = req.params;
  const updates = parsed.data;

  if (updates.slug) {
    updates.slug = normalizeSlug(updates.slug);
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updates,
    });

    return res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Tenant slug already exists" });
    }
    return res.status(404).json({ message: "Tenant not found" });
  }
});

router.delete("/tenants/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    return res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      },
    });
  } catch {
    return res.status(404).json({ message: "Tenant not found" });
  }
});

export default router;
