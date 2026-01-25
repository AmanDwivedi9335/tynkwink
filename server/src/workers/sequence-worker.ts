import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../prisma";
import { getEmailProvider } from "../providers/email";
import { decryptAccessToken, normalizePhoneNumber, sendWhatsAppTextMessage } from "../services/whatsappService";
import { buildTemplateContext, renderTemplate } from "../services/sequenceTemplates";
import { SequenceActionType, SequenceExecutionStatus, SequenceJobStatus } from "@prisma/client";

const BATCH_SIZE = Number(process.env.SEQUENCE_WORKER_BATCH ?? 50);
const POLL_INTERVAL_MS = Number(process.env.SEQUENCE_WORKER_INTERVAL_MS ?? 60_000);
const backoffMinutes = [5, 15, 60];

function addDelay(base: Date, value: number, unit: "MINUTES" | "HOURS" | "DAYS") {
  const ms =
    unit === "MINUTES"
      ? value * 60 * 1000
      : unit === "HOURS"
        ? value * 60 * 60 * 1000
        : value * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}

async function lockDueJobs() {
  const now = new Date();
  const candidates = await prisma.sequenceJob.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: now },
      lockedAt: null,
    },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_SIZE,
  });

  const eligibleIds = candidates.filter((job) => job.attemptCount < job.maxAttempts).map((job) => job.id);
  if (eligibleIds.length === 0) return [];

  const lockToken = randomUUID();
  await prisma.sequenceJob.updateMany({
    where: { id: { in: eligibleIds }, status: "SCHEDULED", lockedAt: null },
    data: { status: "RUNNING", lockedAt: now, lockToken },
  });

  return prisma.sequenceJob.findMany({
    where: { lockToken },
    include: {
      enrollment: true,
      sequence: true,
      lead: true,
      step: true,
    },
  });
}

async function markJobResult(params: {
  jobId: string;
  status: SequenceJobStatus;
  lastError?: string | null;
  scheduledFor?: Date;
  providerMessageId?: string | null;
}) {
  await prisma.sequenceJob.update({
    where: { id: params.jobId },
    data: {
      status: params.status,
      lastError: params.lastError ?? null,
      scheduledFor: params.scheduledFor,
      providerMessageId: params.providerMessageId ?? undefined,
      lockedAt: null,
      lockToken: null,
    },
  });
}

async function logExecution(params: {
  tenantId: string;
  jobId: string;
  enrollmentId: string;
  stepId: string;
  actionType: SequenceActionType;
  status: SequenceExecutionStatus;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  await prisma.sequenceExecutionLog.create({
    data: {
      tenantId: params.tenantId,
      jobId: params.jobId,
      enrollmentId: params.enrollmentId,
      stepId: params.stepId,
      actionType: params.actionType,
      status: params.status,
      requestPayload: params.requestPayload,
      responsePayload: params.responsePayload,
      errorMessage: params.errorMessage ?? null,
    },
  });
}

async function handleJob(job: Awaited<ReturnType<typeof lockDueJobs>>[number]) {
  if (!job.sequence.isActive) {
    await markJobResult({ jobId: job.id, status: "CANCELLED", lastError: "Sequence inactive" });
    return;
  }
  if (job.enrollment.status !== "ACTIVE") {
    await markJobResult({ jobId: job.id, status: "CANCELLED", lastError: "Enrollment not active" });
    return;
  }
  if (!job.step?.isEnabled) {
    await markJobResult({ jobId: job.id, status: "SKIPPED", lastError: "Step disabled" });
    return;
  }

  const existingSuccess = await prisma.sequenceJob.findFirst({
    where: { idempotencyKey: job.idempotencyKey, status: "SUCCESS" },
  });
  if (existingSuccess) {
    await markJobResult({ jobId: job.id, status: "SUCCESS" });
    return;
  }
  const successLog = await prisma.sequenceExecutionLog.findFirst({
    where: { jobId: job.id, status: SequenceExecutionStatus.SUCCESS },
  });
  if (successLog) {
    await markJobResult({ jobId: job.id, status: "SUCCESS" });
    return;
  }

  const owner = job.lead.assignedTo
    ? await prisma.user.findUnique({ where: { id: job.lead.assignedTo } })
    : null;
  const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
  const templateContext = buildTemplateContext({
    lead: job.lead,
    owner,
    tenant: { id: tenant?.id ?? job.tenantId, name: tenant?.name ?? "" },
  });

  try {
    if (job.actionType === "EMAIL") {
      if (!job.lead.email) {
        throw new Error("Missing lead email");
      }
      const fromAccountId = (job.actionConfig as any).fromAccountId ?? null;
      if (fromAccountId) {
        const integration = await prisma.gmailIntegration.findFirst({
          where: { id: fromAccountId, tenantId: job.tenantId },
        });
        if (!integration) {
          throw new Error("Email integration missing");
        }
      }
      const subject = renderTemplate((job.actionConfig as any).subject ?? "", templateContext);
      const body = renderTemplate((job.actionConfig as any).body ?? "", templateContext);

      const provider = getEmailProvider();
      await provider.send({
        to: [job.lead.email],
        subject,
        html: body,
        text: body,
      });

      await logExecution({
        tenantId: job.tenantId,
        jobId: job.id,
        enrollmentId: job.enrollmentId,
        stepId: job.stepId,
        actionType: job.actionType,
        status: SequenceExecutionStatus.SUCCESS,
        requestPayload: { to: job.lead.email, subject },
        responsePayload: { ok: true },
      });
    }

    if (job.actionType === "WHATSAPP") {
      if (!job.lead.phone) {
        throw new Error("Missing lead phone");
      }
      const integrationId = (job.actionConfig as any).fromWhatsAppAccountId ?? null;
      const integration = integrationId
        ? await prisma.whatsAppIntegration.findFirst({
            where: { id: integrationId, tenantId: job.tenantId },
          })
        : await prisma.whatsAppIntegration.findFirst({ where: { tenantId: job.tenantId } });
      if (!integration) {
        throw new Error("WhatsApp integration missing");
      }
      const body = renderTemplate((job.actionConfig as any).messageText ?? "", templateContext);
      const to = normalizePhoneNumber(job.lead.phone);
      const sendResult = await sendWhatsAppTextMessage({
        accessToken: decryptAccessToken(integration.encryptedAccessToken),
        phoneNumberId: integration.phoneNumberId,
        to,
        body,
      });

      await logExecution({
        tenantId: job.tenantId,
        jobId: job.id,
        enrollmentId: job.enrollmentId,
        stepId: job.stepId,
        actionType: job.actionType,
        status: sendResult.ok ? SequenceExecutionStatus.SUCCESS : SequenceExecutionStatus.FAILED,
        requestPayload: { to, body, integrationId: integration.id },
        responsePayload: { ok: sendResult.ok, providerStatus: sendResult.providerStatus },
        errorMessage: sendResult.error ?? null,
      });

      if (!sendResult.ok) {
        throw new Error(sendResult.error ?? "WhatsApp send failed");
      }

      await markJobResult({ jobId: job.id, status: "SUCCESS", providerMessageId: sendResult.providerMessageId ?? null });
    }

    if (job.actionType === "CALL_REMINDER") {
      const config = job.actionConfig as any;
      const title = renderTemplate(config.title ?? "Call lead", templateContext);
      const description = renderTemplate(config.description ?? "", templateContext);
      const assignTo = config.assignTo ?? "leadOwner";
      const assigneeId = assignTo === "specificUserId" ? config.assigneeId : job.lead.assignedTo;
      if (!assigneeId) {
        throw new Error("Missing assignee for call reminder");
      }
      const assignee = await prisma.tenantUser.findFirst({
        where: { tenantId: job.tenantId, userId: assigneeId, isActive: true },
      });
      if (!assignee) {
        throw new Error("Assignee is not part of tenant");
      }

      const task = await prisma.task.create({
        data: {
          tenantId: job.tenantId,
          leadId: job.leadId,
          assigneeId,
          type: "CALL",
          title,
          description: description || null,
          dueAt: job.scheduledFor,
          status: "OPEN",
        },
      });

      await logExecution({
        tenantId: job.tenantId,
        jobId: job.id,
        enrollmentId: job.enrollmentId,
        stepId: job.stepId,
        actionType: job.actionType,
        status: SequenceExecutionStatus.SUCCESS,
        requestPayload: { assigneeId, dueAt: job.scheduledFor },
        responsePayload: { taskId: task.id },
      });
    }

    if (job.actionType !== "WHATSAPP") {
      await markJobResult({ jobId: job.id, status: "SUCCESS" });
    }

    const nextStep = await prisma.sequenceStep.findFirst({
      where: { tenantId: job.tenantId, sequenceId: job.sequenceId, isEnabled: true, stepOrder: { gt: job.stepOrder } },
      orderBy: { stepOrder: "asc" },
    });
    if (nextStep) {
      const nextJob = await prisma.sequenceJob.findFirst({
        where: { enrollmentId: job.enrollmentId, stepId: nextStep.id, status: "SCHEDULED" },
      });
      if (nextJob) {
        const rescheduledFor = addDelay(new Date(), nextStep.delayValue, nextStep.delayUnit);
        if (nextJob.scheduledFor < rescheduledFor) {
          await prisma.sequenceJob.update({
            where: { id: nextJob.id },
            data: { scheduledFor: rescheduledFor },
          });
        }
      }
    }

    const lastStep = await prisma.sequenceStep.findFirst({
      where: { tenantId: job.tenantId, sequenceId: job.sequenceId, isEnabled: true },
      orderBy: { stepOrder: "desc" },
    });

    await prisma.sequenceEnrollment.update({
      where: { id: job.enrollmentId },
      data: {
        currentStepOrder: Math.max(job.enrollment.currentStepOrder, job.stepOrder),
        completedAt: lastStep && lastStep.stepOrder === job.stepOrder ? new Date() : undefined,
        status: lastStep && lastStep.stepOrder === job.stepOrder ? "COMPLETED" : undefined,
      },
    });
  } catch (error: any) {
    const message = error?.message ?? "Sequence job failed";
    const isMissingData = message.includes("Missing lead email") || message.includes("Missing lead phone");
    await logExecution({
      tenantId: job.tenantId,
      jobId: job.id,
      enrollmentId: job.enrollmentId,
      stepId: job.stepId,
      actionType: job.actionType,
      status: SequenceExecutionStatus.FAILED,
      requestPayload: {},
      responsePayload: {},
      errorMessage: message,
    });

    if (isMissingData || job.attemptCount + 1 >= job.maxAttempts) {
      await markJobResult({ jobId: job.id, status: "FAILED", lastError: message });
      return;
    }

    const attempt = job.attemptCount + 1;
    const backoff = backoffMinutes[Math.min(backoffMinutes.length - 1, attempt - 1)];
    await prisma.sequenceJob.update({
      where: { id: job.id },
      data: {
        status: "SCHEDULED",
        attemptCount: attempt,
        scheduledFor: new Date(Date.now() + backoff * 60 * 1000),
        lastError: message,
        lockedAt: null,
        lockToken: null,
      },
    });
  }
}

export async function runSequenceWorkerOnce() {
  const jobs = await lockDueJobs();
  for (const job of jobs) {
    await handleJob(job);
  }
}

async function startWorker() {
  await runSequenceWorkerOnce();
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runSequenceWorkerOnce();
    } finally {
      running = false;
    }
  }, POLL_INTERVAL_MS);
}

if (require.main === module) {
  void startWorker();
}
