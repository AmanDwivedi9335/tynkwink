import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { ensureStages, fallbackStageColor, stageColorMap } from "../services/leadStages";

const router = Router();

router.get("/extension/summary", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  const userId = req.auth?.sub;
  const role = req.auth?.role;

  if (!tenantId || !userId || !role) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { tenant: true },
  });

  if (!membership || !membership.isActive || !membership.tenant.isActive) {
    return res.status(403).json({ message: "Tenant access denied" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return res.status(403).json({ message: "User inactive" });
  }

  const stages = await ensureStages(tenantId);
  const stageCounts = await prisma.lead.groupBy({
    by: ["stageId"],
    where: { tenantId },
    _count: { _all: true },
  });

  const countsByStage = new Map(stageCounts.map((entry) => [entry.stageId, entry._count._all]));
  const totalLeads = stageCounts.reduce((sum, entry) => sum + entry._count._all, 0);
  const defaultStageId = stages[0]?.id ?? null;

  const canSync = role === "TENANT_ADMIN" || role === "SALES_ADMIN" || role === "SALES_EXECUTIVE";

  return res.json({
    tenantId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    },
    permissions: {
      canSync,
      canViewPipeline: true,
    },
    stats: {
      allChats: totalLeads,
      unreadChats: 0,
      needsReply: 0,
      groups: 0,
      pendingReminders: 0,
    },
    pipeline: {
      name: "Leads",
      defaultStageId,
      totalLeads,
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stageColorMap[stage.name] ?? fallbackStageColor(stage.name),
        count: countsByStage.get(stage.id) ?? 0,
      })),
    },
    features: {
      aiAutoReplyEnabled: false,
    },
  });
});

export default router;
