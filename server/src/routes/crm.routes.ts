import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { InboundSource } from "@prisma/client";
import { ensureStages, stageColorMap, fallbackStageColor } from "../services/leadStages";

const router = Router();


const leadSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required"),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  ),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Invalid email address").optional()
  ),
  company: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  ),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  ),
  stageId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  ),
  createdAt: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  ),
});


function formatLead(lead: {
  id: string;
  stageId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const daysInStage = Math.max(
    0,
    Math.floor((Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    id: lead.id,
    stageId: lead.stageId,
    personal: {
      name: lead.name ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
    },
    company: {
      name: lead.company ?? "",
      size: "",
      location: "",
    },
    notes: lead.notes ?? "",
    autoFollowUp: {
      sequence: "Manual",
      nextStep: "Set follow-up",
    },
    callTracker: {
      lastCall: "Not called",
      outcome: "Not contacted",
      attempts: 0,
    },
    nextReminder: "Not scheduled",
    daysInStage,
  };
}

router.get("/crm/pipeline", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const stages = await ensureStages(tenantId);
  const leads = await prisma.lead.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    stages: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stageColorMap[stage.name] ?? fallbackStageColor(stage.name),
    })),
    leads: leads.map((lead) => formatLead(lead)),
  });
});

router.post("/crm/leads", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const { name, phone, email, company, notes, stageId, createdAt } = parsed.data;

  const stages = await ensureStages(tenantId);
  const resolvedStageId = stageId ?? stages[0]?.id;

  if (!resolvedStageId) {
    return res.status(400).json({ message: "No stages available for tenant" });
  }

  const stage = await prisma.leadStage.findFirst({
    where: { id: resolvedStageId, tenantId, isDeleted: false },
  });

  if (!stage) {
    return res.status(400).json({ message: "Invalid stage selected" });
  }

  let createdAtDate: Date | undefined;
  if (createdAt) {
    const parsedDate = new Date(createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid created date" });
    }
    createdAtDate = parsedDate;
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      stageId: stage.id,
      name,
      phone,
      email,
      company,
      notes,
      source: InboundSource.MANUAL,
      createdAt: createdAtDate,
    },
  });

  return res.status(201).json({ lead: formatLead(lead) });
});

export default router;
