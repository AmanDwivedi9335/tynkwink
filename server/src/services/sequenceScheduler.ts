import type { Prisma, SequenceEnrollment, SequenceStep } from "@prisma/client";
import { SequenceDelayUnit } from "@prisma/client";

function addDelay(base: Date, value: number, unit: SequenceDelayUnit) {
  const ms =
    unit === "MINUTES"
      ? value * 60 * 1000
      : unit === "HOURS"
        ? value * 60 * 60 * 1000
        : value * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}

export function buildSchedule(startAt: Date, steps: SequenceStep[]) {
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  let cursor = startAt;
  return sorted.map((step) => {
    cursor = addDelay(cursor, step.delayValue, step.delayUnit);
    return { step, scheduledFor: new Date(cursor) };
  });
}

export async function createJobsForEnrollment(params: {
  tx: Prisma.TransactionClient;
  enrollment: Pick<SequenceEnrollment, "id" | "tenantId" | "sequenceId" | "leadId" | "startedAt">;
  steps: SequenceStep[];
}) {
  const { tx, enrollment } = params;
  const enabledSteps = params.steps.filter((step) => step.isEnabled);
  const scheduled = buildSchedule(enrollment.startedAt, enabledSteps);

  if (scheduled.length === 0) return [];

  const jobsData = scheduled.map(({ step, scheduledFor }) => ({
    tenantId: enrollment.tenantId,
    enrollmentId: enrollment.id,
    sequenceId: enrollment.sequenceId,
    leadId: enrollment.leadId,
    stepId: step.id,
    stepOrder: step.stepOrder,
    actionType: step.actionType,
    actionConfig: step.actionConfig,
    scheduledFor,
    status: "SCHEDULED" as const,
    attemptCount: 0,
    maxAttempts: 3,
    idempotencyKey: `${enrollment.tenantId}:${enrollment.id}:${step.stepOrder}:${step.actionType}`,
  }));

  await tx.sequenceJob.createMany({ data: jobsData });
  return jobsData;
}
