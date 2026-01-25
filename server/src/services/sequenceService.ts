import { prisma } from "../prisma";
import { SequenceActionType, SequenceTriggerType } from "@prisma/client";

export async function listSequences(tenantId: string, status: "active" | "all") {
  const sequences = await prisma.sequence.findMany({
    where: {
      tenantId,
      ...(status === "active" ? { isActive: true } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      steps: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      jobs: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  return sequences.map((sequence) => ({
    id: sequence.id,
    name: sequence.name,
    description: sequence.description,
    triggerType: sequence.triggerType,
    triggerConfig: sequence.triggerConfig,
    isActive: sequence.isActive,
    stepsCount: sequence.steps.length,
    activeEnrollments: sequence.enrollments.length,
    lastRunStatus: sequence.jobs[0]?.status ?? null,
    updatedAt: sequence.updatedAt,
  }));
}

export async function getSequenceDetails(tenantId: string, sequenceId: string) {
  const sequence = await prisma.sequence.findFirst({
    where: { tenantId, id: sequenceId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!sequence) return null;

  return {
    id: sequence.id,
    name: sequence.name,
    description: sequence.description,
    triggerType: sequence.triggerType,
    triggerConfig: sequence.triggerConfig,
    isActive: sequence.isActive,
    steps: sequence.steps,
    createdAt: sequence.createdAt,
    updatedAt: sequence.updatedAt,
  };
}

export async function createSequence(params: {
  tenantId: string;
  createdById: string;
  name: string;
  description?: string | null;
  triggerType: SequenceTriggerType;
  triggerConfig: Record<string, any>;
  steps: Array<{
    stepOrder: number;
    delayValue: number;
    delayUnit: string;
    actionType: SequenceActionType;
    actionConfig: Record<string, any>;
    isEnabled?: boolean;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const sequence = await tx.sequence.create({
      data: {
        tenantId: params.tenantId,
        createdById: params.createdById,
        name: params.name,
        description: params.description ?? null,
        triggerType: params.triggerType,
        triggerConfig: params.triggerConfig,
        isActive: true,
      },
    });

    if (params.steps.length > 0) {
      await tx.sequenceStep.createMany({
        data: params.steps.map((step) => ({
          tenantId: params.tenantId,
          sequenceId: sequence.id,
          stepOrder: step.stepOrder,
          delayValue: step.delayValue,
          delayUnit: step.delayUnit as any,
          actionType: step.actionType,
          actionConfig: step.actionConfig,
          isEnabled: step.isEnabled ?? true,
        })),
      });
    }

    return sequence;
  });
}

export async function updateSequenceMetadata(params: {
  tenantId: string;
  sequenceId: string;
  name?: string;
  description?: string | null;
  triggerType?: SequenceTriggerType;
  triggerConfig?: Record<string, any>;
}) {
  return prisma.sequence.update({
    where: { id: params.sequenceId },
    data: {
      name: params.name,
      description: params.description ?? undefined,
      triggerType: params.triggerType,
      triggerConfig: params.triggerConfig,
    },
  });
}

export async function replaceSequenceSteps(params: {
  tenantId: string;
  sequenceId: string;
  steps: Array<{
    id?: string;
    stepOrder: number;
    delayValue: number;
    delayUnit: string;
    actionType: SequenceActionType;
    actionConfig: Record<string, any>;
    isEnabled?: boolean;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.sequenceStep.findMany({
      where: { tenantId: params.tenantId, sequenceId: params.sequenceId },
    });
    const existingById = new Map(existing.map((step) => [step.id, step]));
    const incomingIds = new Set(params.steps.map((step) => step.id).filter(Boolean) as string[]);

    for (const step of params.steps) {
      if (step.id && existingById.has(step.id)) {
        await tx.sequenceStep.update({
          where: { id: step.id },
          data: {
            stepOrder: step.stepOrder,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit as any,
            actionType: step.actionType,
            actionConfig: step.actionConfig,
            isEnabled: step.isEnabled ?? true,
          },
        });
      } else {
        await tx.sequenceStep.create({
          data: {
            tenantId: params.tenantId,
            sequenceId: params.sequenceId,
            stepOrder: step.stepOrder,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit as any,
            actionType: step.actionType,
            actionConfig: step.actionConfig,
            isEnabled: step.isEnabled ?? true,
          },
        });
      }
    }

    const disabledSteps = existing.filter((step) => !incomingIds.has(step.id));
    for (const [index, step] of disabledSteps.entries()) {
      await tx.sequenceStep.update({
        where: { id: step.id },
        data: { isEnabled: false, stepOrder: 1000 + index },
      });
    }

    if (disabledSteps.length > 0) {
      await tx.sequenceJob.updateMany({
        where: {
          tenantId: params.tenantId,
          sequenceId: params.sequenceId,
          stepId: { in: disabledSteps.map((step) => step.id) },
          status: "SCHEDULED",
        },
        data: { status: "SKIPPED", lastError: "Step disabled" },
      });
    }
  });
}

export async function toggleSequence(params: { tenantId: string; sequenceId: string; isActive: boolean }) {
  const sequence = await prisma.sequence.update({
    where: { id: params.sequenceId },
    data: { isActive: params.isActive },
  });

  if (!params.isActive) {
    await prisma.sequenceJob.updateMany({
      where: { tenantId: params.tenantId, sequenceId: params.sequenceId, status: "SCHEDULED" },
      data: { status: "CANCELLED", lastError: "Sequence inactive" },
    });
  }

  return sequence;
}
