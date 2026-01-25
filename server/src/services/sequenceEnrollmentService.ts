import type { Prisma } from "@prisma/client";
import { SequenceEnrollmentStatus, SequenceTriggerType } from "@prisma/client";
import { prisma } from "../prisma";
import { createJobsForEnrollment } from "./sequenceScheduler";

type EnrollmentResult = {
  enrollment: { id: string; status: SequenceEnrollmentStatus };
  duplicated: boolean;
};

function buildDedupeKey(triggerType: SequenceTriggerType, triggerConfig?: Record<string, any> | null) {
  if (triggerType === "ON_STAGE_CHANGED" && triggerConfig?.stageId) {
    return `${triggerType}:${triggerConfig.stageId}`;
  }
  return triggerType;
}

async function ensureSequenceExists(tx: Prisma.TransactionClient, tenantId: string, sequenceId: string) {
  const sequence = await tx.sequence.findFirst({ where: { id: sequenceId, tenantId } });
  if (!sequence) {
    throw new Error("Sequence not found");
  }
  return sequence;
}

async function ensureLeadExists(tx: Prisma.TransactionClient, tenantId: string, leadId: string) {
  const lead = await tx.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) {
    throw new Error("Lead not found");
  }
  return lead;
}

export async function enrollLeadInSequence(params: {
  tenantId: string;
  sequenceId: string;
  leadId: string;
  enrolledById?: string | null;
  dedupeKey?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const sequence = await ensureSequenceExists(tx, params.tenantId, params.sequenceId);
    await ensureLeadExists(tx, params.tenantId, params.leadId);

    if (!sequence.isActive) {
      throw new Error("Sequence is inactive");
    }

    const existing = await tx.sequenceEnrollment.findFirst({
      where: {
        tenantId: params.tenantId,
        sequenceId: params.sequenceId,
        leadId: params.leadId,
        status: SequenceEnrollmentStatus.ACTIVE,
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return { enrollment: existing, duplicated: true } satisfies EnrollmentResult;
    }

    const enrollment = await tx.sequenceEnrollment.create({
      data: {
        tenantId: params.tenantId,
        sequenceId: params.sequenceId,
        leadId: params.leadId,
        enrolledById: params.enrolledById ?? null,
        status: SequenceEnrollmentStatus.ACTIVE,
        startedAt: new Date(),
        dedupeKey: params.dedupeKey ?? null,
      },
      select: {
        id: true,
        tenantId: true,
        sequenceId: true,
        leadId: true,
        startedAt: true,
        status: true,
      },
    });

    const steps = await tx.sequenceStep.findMany({
      where: { tenantId: params.tenantId, sequenceId: params.sequenceId, isEnabled: true },
      orderBy: { stepOrder: "asc" },
    });
    await createJobsForEnrollment({ tx, enrollment, steps });

    return { enrollment, duplicated: false } satisfies EnrollmentResult;
  });
}

export async function enrollLeadForTrigger(params: {
  tenantId: string;
  leadId: string;
  triggerType: SequenceTriggerType;
  triggerConfig?: Record<string, any> | null;
}) {
  const sequences = await prisma.sequence.findMany({
    where: {
      tenantId: params.tenantId,
      isActive: true,
      triggerType: params.triggerType,
    },
  });

  const results: EnrollmentResult[] = [];
  for (const sequence of sequences) {
    if (params.triggerType === "ON_LEAD_CREATED" && sequence.triggerConfig && (sequence.triggerConfig as any).enabled === false) {
      continue;
    }
    if (params.triggerType === "ON_STAGE_CHANGED") {
      const stageId = (sequence.triggerConfig as any)?.stageId;
      if (stageId && stageId !== params.triggerConfig?.stageId) {
        continue;
      }
    }

    const dedupeKey = buildDedupeKey(sequence.triggerType, sequence.triggerConfig as Record<string, any>);
    const result = await enrollLeadInSequence({
      tenantId: params.tenantId,
      sequenceId: sequence.id,
      leadId: params.leadId,
      enrolledById: null,
      dedupeKey,
    });
    results.push(result);
  }

  return results;
}

export async function pauseEnrollment(params: { tenantId: string; enrollmentId: string }) {
  const now = new Date();
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { id: params.enrollmentId, tenantId: params.tenantId },
  });
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  await prisma.$transaction([
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: SequenceEnrollmentStatus.PAUSED, pausedAt: now },
    }),
    prisma.sequenceJob.updateMany({
      where: { enrollmentId: enrollment.id, status: "SCHEDULED" },
      data: { status: "CANCELLED", lastError: "Paused by user" },
    }),
  ]);
}

export async function resumeEnrollment(params: { tenantId: string; enrollmentId: string }) {
  const now = new Date();
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { id: params.enrollmentId, tenantId: params.tenantId },
  });
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  const pausedJobs = await prisma.sequenceJob.findMany({
    where: { enrollmentId: enrollment.id, status: "CANCELLED", lastError: "Paused by user" },
  });

  await prisma.$transaction([
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: SequenceEnrollmentStatus.ACTIVE, pausedAt: null },
    }),
    ...pausedJobs.map((job) =>
      prisma.sequenceJob.update({
        where: { id: job.id },
        data: {
          status: "SCHEDULED",
          scheduledFor: job.scheduledFor > now ? job.scheduledFor : now,
          lastError: null,
        },
      })
    ),
  ]);
}

export async function cancelEnrollment(params: { tenantId: string; enrollmentId: string }) {
  const now = new Date();
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { id: params.enrollmentId, tenantId: params.tenantId },
  });
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  await prisma.$transaction([
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: SequenceEnrollmentStatus.CANCELLED, cancelledAt: now },
    }),
    prisma.sequenceJob.updateMany({
      where: { enrollmentId: enrollment.id, status: "SCHEDULED" },
      data: { status: "CANCELLED", lastError: "Enrollment cancelled" },
    }),
  ]);
}
