import crypto from "crypto";
import { prisma } from "../prisma";
import { getEmailProvider } from "../providers/email";
import { randomNonce, signApprovalToken, hashToken } from "../security/tokens";
import { writeAuditLog } from "../security/audit";
import { safeTruncate } from "../security/encryption";

const MAX_DIGEST_LEADS = 25;

export async function sendApprovalDigests() {
  const now = new Date();
  const tenants = await prisma.tenantSettings.findMany({
    include: { tenant: { include: { users: { include: { user: true } } } } },
  });

  const emailProvider = getEmailProvider();

  for (const setting of tenants) {
    const frequency = setting.approvalDigestFrequencyMinutes;
    const lastSent = setting.lastApprovalDigestAt;
    if (lastSent) {
      const diffMinutes = (now.getTime() - lastSent.getTime()) / 60000;
      if (diffMinutes < frequency) continue;
    }

    const pendingLeads = await prisma.leadInbox.findMany({
      where: { tenantId: setting.tenantId, status: "PENDING" },
      orderBy: { receivedAt: "desc" },
      take: MAX_DIGEST_LEADS,
    });

    if (pendingLeads.length === 0) {
      continue;
    }

    const admins = setting.tenant.users.filter((membership) => membership.role === "TENANT_ADMIN");
    const recipients = admins.map((membership) => membership.user.email).filter(Boolean);
    if (recipients.length === 0) continue;

    const tokenPayloads = pendingLeads.flatMap((lead) => {
      return ["APPROVE", "REJECT"].map((action) => {
        const nonce = randomNonce();
        const tokenId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const signed = signApprovalToken({ tokenId, nonce, expiresAt: expiresAt.getTime() });
        return {
          leadId: lead.id,
          tenantId: lead.tenantId,
          action,
          signed,
          tokenHash: hashToken(signed),
          expiresAt,
        };
      });
    });

    await prisma.$transaction(
      tokenPayloads.map((token) =>
        prisma.leadApprovalToken.create({
          data: {
            id: crypto.randomUUID(),
            leadInboxId: token.leadId,
            tenantId: token.tenantId,
            tokenHash: token.tokenHash,
            action: token.action === "APPROVE" ? "APPROVE" : "REJECT",
            expiresAt: token.expiresAt,
          },
        })
      )
    );

    const tokenMap = new Map<string, { approve: string; reject: string }>();
    for (const token of tokenPayloads) {
      const existing = tokenMap.get(token.leadId) ?? { approve: "", reject: "" };
      if (token.action === "APPROVE") {
        existing.approve = token.signed;
      } else {
        existing.reject = token.signed;
      }
      tokenMap.set(token.leadId, existing);
    }

    const baseUrl = process.env.APPROVAL_BASE_URL ?? process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";
    const digestItems = pendingLeads
      .map((lead) => {
        const tokenPair = tokenMap.get(lead.id);
        if (!tokenPair) return "";
        const approveLink = `${baseUrl}/api/lead-inbox/approve?token=${encodeURIComponent(tokenPair.approve)}`;
        const rejectLink = `${baseUrl}/api/lead-inbox/reject?token=${encodeURIComponent(tokenPair.reject)}`;
        return `
          <tr>
            <td>${safeTruncate(lead.from, 80)}</td>
            <td>${safeTruncate(lead.subject ?? "", 80)}</td>
            <td>${safeTruncate(lead.snippet ?? "", 120)}</td>
            <td>
              <a href="${approveLink}">Approve</a> | <a href="${rejectLink}">Reject</a>
            </td>
          </tr>`;
      })
      .join("\n");

    const approveAllNonce = randomNonce();
    const approveAllTokenId = crypto.randomUUID();
    const approveAllExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const approveAllSigned = signApprovalToken({
      tokenId: approveAllTokenId,
      nonce: approveAllNonce,
      expiresAt: approveAllExpiresAt.getTime(),
    });
    const approveAllHash = hashToken(approveAllSigned);

    await prisma.$transaction(
      pendingLeads.map((lead) =>
        prisma.leadApprovalToken.create({
          data: {
            id: crypto.randomUUID(),
            leadInboxId: lead.id,
            tenantId: setting.tenantId,
            tokenHash: approveAllHash,
            action: "APPROVE",
            expiresAt: approveAllExpiresAt,
          },
        })
      )
    );

    const approveAllUrl = `${baseUrl}/api/lead-inbox/approve?token=${encodeURIComponent(approveAllSigned)}`;

    const html = `
      <h2>Pending lead approvals (${pendingLeads.length})</h2>
      <p>Approve or reject the leads below.</p>
      <p><a href="${approveAllUrl}">Approve All</a></p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            <th>From</th>
            <th>Subject</th>
            <th>Snippet</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${digestItems}
        </tbody>
      </table>
    `;

    await emailProvider.send({
      to: recipients,
      subject: "Lead approvals pending",
      html,
    });

    await prisma.tenantSettings.update({
      where: { tenantId: setting.tenantId },
      data: { lastApprovalDigestAt: now },
    });

    await writeAuditLog({
      tenantId: setting.tenantId,
      actionType: "LEAD_DIGEST_SENT",
      entityType: "LeadInbox",
      meta: { count: pendingLeads.length },
    });
  }
}
