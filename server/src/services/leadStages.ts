import { prisma } from "../prisma";

export const defaultStages = [
  { name: "New Lead", color: "#f59e0b" },
  { name: "Qualified", color: "#3b82f6" },
  { name: "In Conversation", color: "#a855f7" },
  { name: "Good Lead", color: "#22c55e" },
  { name: "Lead Won", color: "#ef4444" },
  { name: "No Response", color: "#6366f1" },
  { name: "Deleted", color: "#06b6d4" },
];

export const stageColorMap = defaultStages.reduce<Record<string, string>>((acc, stage) => {
  acc[stage.name] = stage.color;
  return acc;
}, {});

export function fallbackStageColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export async function ensureStages(tenantId: string) {
  let stages = await prisma.leadStage.findMany({
    where: { tenantId, isDeleted: false },
    orderBy: { position: "asc" },
  });

  if (stages.length === 0) {
    await prisma.leadStage.createMany({
      data: defaultStages.map((stage, index) => ({
        tenantId,
        name: stage.name,
        position: index + 1,
      })),
    });

    stages = await prisma.leadStage.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { position: "asc" },
    });
  }

  return stages;
}
