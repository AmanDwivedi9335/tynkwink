import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenantContext } from "../middleware/rbac";
import { prisma } from "../prisma";
import { handleLeadApproval } from "../services/approvalService";
import { leadImportQueue } from "../queues/queues";
import { checkRateLimit } from "../utils/rateLimit";
import { normalizeLeadExtraction } from "../services/leadExtraction";

const router = Router();

router.get("/lead-inbox/approve", async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ message: "Missing token" });

  const rate = checkRateLimit(`lead-approve:${req.ip}`, 20, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ message: "Rate limit exceeded" });
  }

  try {
    const result = await handleLeadApproval(token, "APPROVE");
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ message: error.message ?? "Unable to approve" });
  }
});

router.get("/lead-inbox/reject", async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ message: "Missing token" });

  const rate = checkRateLimit(`lead-reject:${req.ip}`, 20, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ message: "Rate limit exceeded" });
  }

  try {
    const result = await handleLeadApproval(token, "REJECT");
    return res.json({ ok: true, ...result });
  } catch (error: any) {
    return res.status(400).json({ message: error.message ?? "Unable to reject" });
  }
});

const inboxQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "IMPORTED", "ERROR"]).optional(),
});

router.get("/tenants/:tenantId/lead-inbox", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const parsed = inboxQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const inbox = await prisma.leadInbox.findMany({
    where: {
      tenantId,
      status: parsed.data.status,
    },
    orderBy: { receivedAt: "desc" },
  });

  const formattedInbox = inbox.map((lead) => {
    const preview = normalizeLeadExtraction(lead.extractedPreviewJson);
    const notes = [preview?.notes, preview?.requirement, preview?.location]
      .filter(Boolean)
      .join("\n");

    return {
      id: lead.id,
      from: lead.from,
      subject: lead.subject,
      snippet: lead.snippet,
      receivedAt: lead.receivedAt,
      status: lead.status,
      leadPreview: preview
        ? {
            name: preview.leadName ?? "",
            email: preview.email ?? "",
            phone: preview.phone ?? "",
            company: preview.company ?? "",
            notes,
            preferredStage: preview.preferredStage ?? "",
            assigneeHint: preview.assigneeHint ?? lead.detectedAssigneeHint ?? "",
          }
        : null,
    };
  });

  return res.json({ inbox: formattedInbox });
});

router.post("/tenants/:tenantId/lead-inbox/:leadInboxId/approve", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const leadInboxId = req.params.leadInboxId;
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const lead = await prisma.leadInbox.findFirst({
    where: { id: leadInboxId, tenantId },
  });
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (lead.status !== "PENDING") {
    return res.json({ ok: true, status: lead.status });
  }

  await prisma.leadInbox.update({
    where: { id: leadInboxId },
    data: { status: "APPROVED" },
  });

  await leadImportQueue.add(
    "lead.import",
    { leadInboxId },
    { jobId: `lead.import.${leadInboxId}` }
  );

  return res.json({ ok: true });
});

router.post("/tenants/:tenantId/lead-inbox/:leadInboxId/reject", requireAuth, requireTenantContext, async (req, res) => {
  const tenantId = req.params.tenantId;
  const leadInboxId = req.params.leadInboxId;
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ message: "Tenant mismatch" });
  }

  const lead = await prisma.leadInbox.findFirst({
    where: { id: leadInboxId, tenantId },
  });
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (lead.status !== "PENDING") {
    return res.json({ ok: true, status: lead.status });
  }

  await prisma.leadInbox.update({
    where: { id: leadInboxId },
    data: { status: "REJECTED" },
  });

  return res.json({ ok: true });
});

export default router;
