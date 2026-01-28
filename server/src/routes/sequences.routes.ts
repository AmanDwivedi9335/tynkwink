import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRole, requireTenantContext } from "../middleware/rbac";
import { prisma } from "../prisma";
import {
  createSequence,
  getSequenceDetails,
  listSequences,
  replaceSequenceSteps,
  toggleSequence,
  updateSequenceMetadata,
} from "../services/sequenceService";
import {
  cancelEnrollment,
  enrollLeadInSequence,
  pauseEnrollment,
  resumeEnrollment,
} from "../services/sequenceEnrollmentService";

const router = Router();

const triggerTypeSchema = z.enum(["MANUAL", "ON_LEAD_CREATED", "ON_STAGE_CHANGED"]);
const delayUnitSchema = z.enum(["MINUTES", "HOURS", "DAYS"]);
const actionTypeSchema = z.enum(["EMAIL", "WHATSAPP", "CALL_REMINDER"]);

const emailConfigSchema = z.object({
  subject: z.string().trim().min(1, "Email subject is required"),
  body: z.string().trim().min(1, "Email body is required"),
  fromAccountId: z.string().trim().optional(),
  smtpCredentialId: z.string().trim().optional(),
});

const whatsappConfigSchema = z.object({
  messageText: z.string().trim().min(1, "WhatsApp message is required"),
  fromWhatsAppAccountId: z.string().trim().optional(),
});

const callReminderConfigSchema = z
  .object({
    title: z.string().trim().min(1, "Call reminder title is required"),
    description: z.string().trim().optional(),
    assignTo: z.enum(["leadOwner", "specificUserId"]).default("leadOwner"),
    assigneeId: z.string().trim().optional(),
  })
  .refine((value) => value.assignTo !== "specificUserId" || Boolean(value.assigneeId), {
    message: "Assignee is required when selecting a specific user",
    path: ["assigneeId"],
  });

const stepSchema = z.discriminatedUnion("actionType", [
  z.object({
    id: z.string().trim().optional(),
    stepOrder: z.number().int().min(1),
    delayValue: z.number().int().min(0),
    delayUnit: delayUnitSchema,
    actionType: z.literal("EMAIL"),
    actionConfig: emailConfigSchema,
    isEnabled: z.boolean().optional(),
  }),
  z.object({
    id: z.string().trim().optional(),
    stepOrder: z.number().int().min(1),
    delayValue: z.number().int().min(0),
    delayUnit: delayUnitSchema,
    actionType: z.literal("WHATSAPP"),
    actionConfig: whatsappConfigSchema,
    isEnabled: z.boolean().optional(),
  }),
  z.object({
    id: z.string().trim().optional(),
    stepOrder: z.number().int().min(1),
    delayValue: z.number().int().min(0),
    delayUnit: delayUnitSchema,
    actionType: z.literal("CALL_REMINDER"),
    actionConfig: callReminderConfigSchema,
    isEnabled: z.boolean().optional(),
  }),
]);

const sequenceCreateSchema = z.object({
  name: z.string().trim().min(1, "Sequence name is required"),
  description: z.string().trim().optional(),
  triggerType: triggerTypeSchema,
  triggerConfig: z.record(z.any()).default({}),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

const sequenceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    triggerType: triggerTypeSchema.optional(),
    triggerConfig: z.record(z.any()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No updates provided",
  });

const stepsUpdateSchema = z.object({
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

const toggleSchema = z.object({ isActive: z.boolean() });

const enrollSchema = z.object({ leadId: z.string().trim().min(1) });
const bulkEnrollSchema = z.object({ leadIds: z.array(z.string().trim().min(1)).min(1) });

const logsQuerySchema = z.object({
  leadId: z.string().trim().optional(),
  status: z.enum(["SUCCESS", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const ADMIN_ROLES = ["TENANT_ADMIN", "SALES_ADMIN"] as const;
const ENROLL_ROLES = ["TENANT_ADMIN", "SALES_ADMIN", "SALES_EXECUTIVE"] as const;

router.get("/sequences", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const status = req.query.status === "active" ? "active" : "all";
  const sequences = await listSequences(tenantId, status);
  return res.json({ sequences });
});

router.post(
  "/sequences",
  requireAuth,
  requireRole(ADMIN_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = sequenceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    if (parsed.data.triggerType === "ON_STAGE_CHANGED" && !parsed.data.triggerConfig.stageId) {
      return res.status(400).json({ message: "stageId is required for stage trigger" });
    }

    const sequence = await createSequence({
      tenantId,
      createdById: req.auth!.sub,
      name: parsed.data.name,
      description: parsed.data.description,
      triggerType: parsed.data.triggerType,
      triggerConfig: parsed.data.triggerConfig,
      steps: parsed.data.steps,
    });

    return res.status(201).json({ sequence });
  }
);

router.get("/sequences/:id", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const sequence = await getSequenceDetails(tenantId, req.params.id);
  if (!sequence) return res.status(404).json({ message: "Sequence not found" });
  return res.json({ sequence });
});

router.put(
  "/sequences/:id",
  requireAuth,
  requireRole(ADMIN_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = sequenceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const sequence = await prisma.sequence.findFirst({ where: { id: req.params.id, tenantId } });
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });

    if (parsed.data.triggerType === "ON_STAGE_CHANGED" && !parsed.data.triggerConfig?.stageId) {
      return res.status(400).json({ message: "stageId is required for stage trigger" });
    }

    const updated = await updateSequenceMetadata({
      tenantId,
      sequenceId: sequence.id,
      ...parsed.data,
    });

    return res.json({ sequence: updated });
  }
);

router.put(
  "/sequences/:id/steps",
  requireAuth,
  requireRole(ADMIN_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = stepsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const sequence = await prisma.sequence.findFirst({ where: { id: req.params.id, tenantId } });
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });

    await replaceSequenceSteps({
      tenantId,
      sequenceId: sequence.id,
      steps: parsed.data.steps,
    });

    return res.json({ ok: true });
  }
);

router.post(
  "/sequences/:id/toggle",
  requireAuth,
  requireRole(ADMIN_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const sequence = await prisma.sequence.findFirst({ where: { id: req.params.id, tenantId } });
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });

    const updated = await toggleSequence({ tenantId, sequenceId: sequence.id, isActive: parsed.data.isActive });
    return res.json({ sequence: updated });
  }
);

router.post(
  "/sequences/:id/enroll",
  requireAuth,
  requireRole(ENROLL_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = enrollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const result = await enrollLeadInSequence({
      tenantId,
      sequenceId: req.params.id,
      leadId: parsed.data.leadId,
      enrolledById: req.auth!.sub,
      dedupeKey: null,
    });

    return res.status(201).json(result);
  }
);

router.post(
  "/sequences/:id/enroll/bulk",
  requireAuth,
  requireRole(ENROLL_ROLES as any),
  requireTenantContext,
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const parsed = bulkEnrollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
    }

    const results = [];
    for (const leadId of parsed.data.leadIds) {
      const result = await enrollLeadInSequence({
        tenantId,
        sequenceId: req.params.id,
        leadId,
        enrolledById: req.auth!.sub,
        dedupeKey: null,
      });
      results.push({ leadId, ...result });
    }

    return res.status(201).json({ results });
  }
);

router.post(
  "/enrollments/:id/pause",
  requireAuth,
  requireRole(ENROLL_ROLES as any),
  requireTenantContext,
  async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  await pauseEnrollment({ tenantId, enrollmentId: req.params.id });
  return res.json({ ok: true });
  }
);

router.post(
  "/enrollments/:id/resume",
  requireAuth,
  requireRole(ENROLL_ROLES as any),
  requireTenantContext,
  async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  await resumeEnrollment({ tenantId, enrollmentId: req.params.id });
  return res.json({ ok: true });
  }
);

router.post(
  "/enrollments/:id/cancel",
  requireAuth,
  requireRole(ENROLL_ROLES as any),
  requireTenantContext,
  async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  await cancelEnrollment({ tenantId, enrollmentId: req.params.id });
  return res.json({ ok: true });
  }
);

router.get("/sequences/:id/logs", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const parsed = logsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: z.treeifyError(parsed.error) });
  }
  const pageSize = 25;
  const skip = (parsed.data.page - 1) * pageSize;

  const logs = await prisma.sequenceExecutionLog.findMany({
    where: {
      tenantId,
      enrollment: { sequenceId: req.params.id, ...(parsed.data.leadId ? { leadId: parsed.data.leadId } : {}) },
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    include: {
      enrollment: { include: { lead: { select: { id: true, name: true, email: true, phone: true } } } },
      step: true,
      job: { select: { attemptCount: true, maxAttempts: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip,
  });

  return res.json({ logs, page: parsed.data.page });
});

router.get("/enrollments/:id/jobs", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const jobs = await prisma.sequenceJob.findMany({
    where: { tenantId, enrollmentId: req.params.id },
    orderBy: { stepOrder: "asc" },
  });
  return res.json({ jobs });
});

router.get("/sequences/:id/enrollments", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { tenantId, sequenceId: req.params.id },
    include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ enrollments });
});

router.post("/sequence-jobs/:id/retry", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const job = await prisma.sequenceJob.findFirst({ where: { id: req.params.id, tenantId } });
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.attemptCount >= job.maxAttempts) {
    return res.status(400).json({ message: "Max attempts reached" });
  }
  const updated = await prisma.sequenceJob.update({
    where: { id: job.id },
    data: {
      status: "SCHEDULED",
      scheduledFor: new Date(),
      lastError: null,
      lockedAt: null,
      lockToken: null,
    },
  });
  return res.json({ job: updated });
});

export default router;
