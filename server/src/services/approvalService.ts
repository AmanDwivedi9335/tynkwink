import { prisma } from "../prisma";
import { verifyApprovalToken, hashToken } from "../security/tokens";
import { leadImportQueue } from "../queues/queues";
import { writeAuditLog } from "../security/audit";
import { nextStatusForAction } from "./approvalLogic";

export async function handleLeadApproval(token: string, action: "APPROVE" | "REJECT") {
  const payload = verifyApprovalToken(token);
  if (payload.expiresAt < Date.now()) {
    throw new Error("Approval token expired");
  }
  const tokenHash = hashToken(token);
  const tokens = await prisma.leadApprovalToken.findMany({
    where: { tokenHash, action },
    include: { leadInbox: true },
  });
  if (tokens.length === 0) {
    throw new Error("Invalid approval token");
  }

  const now = new Date();
  const leadsToUpdate = tokens.map((entry) => entry.leadInbox).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.leadApprovalToken.updateMany({
      where: { tokenHash, action, usedAt: null },
      data: { usedAt: now },
    });

    for (const lead of leadsToUpdate) {
      if (!lead) continue;
      const nextStatus = nextStatusForAction(lead.status as any, action);
      if (!nextStatus) continue;
      await tx.leadInbox.update({
        where: { id: lead.id },
        data: { status: nextStatus },
      });
    }
  });

  if (action === "APPROVE") {
    for (const lead of leadsToUpdate) {
      if (!lead) continue;
      await leadImportQueue.add(
        "lead.import",
        { leadInboxId: lead.id },
        { jobId: `lead.import.${lead.id}` }
      );
    }
  }

  const tenantId = leadsToUpdate[0]?.tenantId;
  if (tenantId) {
    await writeAuditLog({
      tenantId,
      actionType: action === "APPROVE" ? "LEAD_APPROVED" : "LEAD_REJECTED",
      entityType: "LeadInbox",
      meta: { count: leadsToUpdate.length },
    });
  }

  return { count: leadsToUpdate.length };
}
