export type LeadInboxStatus = "PENDING" | "APPROVED" | "REJECTED" | "IMPORTED" | "ERROR";

export function nextStatusForAction(status: LeadInboxStatus, action: "APPROVE" | "REJECT") {
  if (action === "APPROVE") {
    if (status === "IMPORTED") return null;
    if (status === "APPROVED") return null;
    return "APPROVED" as const;
  }
  if (status === "REJECTED") return null;
  return "REJECTED" as const;
}
