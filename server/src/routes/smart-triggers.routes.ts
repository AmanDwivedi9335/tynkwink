import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { respondToPrismaConnectionError } from "../utils/prismaErrors";

const router = Router();

const stepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  type: z.enum(["TRIGGER", "ACTION", "DELAY", "DECISION"]),
  tags: z.array(z.string()).optional().default([]),
});

const createFlowSchema = z.object({
  name: z.string().trim().min(1, "Flow name is required"),
  description: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  steps: z.array(stepSchema).optional().default([]),
});

const updateFlowSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  steps: z.array(stepSchema).optional(),
});

router.get("/smart-triggers", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  let flows;
  try {
    flows = await prisma.smartTriggerFlow.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  return res.json({ flows });
});

router.get("/smart-triggers/:id", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  let flow;
  try {
    flow = await prisma.smartTriggerFlow.findFirst({
      where: { id: req.params.id, tenantId },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  if (!flow) {
    return res.status(404).json({ message: "Flow not found" });
  }

  return res.json({ flow });
});

router.post("/smart-triggers", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = createFlowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  let flow;
  try {
    flow = await prisma.smartTriggerFlow.create({
      data: {
        tenantId,
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status ?? "DRAFT",
        steps: parsed.data.steps,
      },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  return res.status(201).json({ flow });
});

router.put("/smart-triggers/:id", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = updateFlowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  let existing;
  try {
    existing = await prisma.smartTriggerFlow.findFirst({
      where: { id: req.params.id, tenantId },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  if (!existing) {
    return res.status(404).json({ message: "Flow not found" });
  }

  let flow;
  try {
    flow = await prisma.smartTriggerFlow.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name ?? existing.name,
        description: parsed.data.description ?? existing.description,
        status: parsed.data.status ?? existing.status,
        steps: parsed.data.steps ?? existing.steps,
      },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  return res.json({ flow });
});

router.delete("/smart-triggers/:id", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  let existing;
  try {
    existing = await prisma.smartTriggerFlow.findFirst({
      where: { id: req.params.id, tenantId },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  if (!existing) {
    return res.status(404).json({ message: "Flow not found" });
  }

  try {
    await prisma.smartTriggerFlow.delete({
      where: { id: existing.id },
    });
  } catch (error) {
    if (respondToPrismaConnectionError(res, error)) return;
    throw error;
  }

  return res.status(204).send();
});

export default router;
