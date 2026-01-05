import { prisma } from "../prisma";
import { writeAuditLog } from "../security/audit";
import { buildLeadDedupeFilters } from "./leadDedupe";
import { InboundSource } from "@prisma/client";
import { extractLeadPreview, normalizeLeadExtraction } from "./leadExtraction";

async function resolveAssignee(tenantId: string, hint?: string | null, fallbackId?: string | null) {
  if (hint) {
    const normalized = hint.toLowerCase();
    const matchByEmail = await prisma.tenantUser.findFirst({
      where: { tenantId, user: { email: { contains: normalized } } },
      include: { user: true },
    });
    if (matchByEmail?.userId) return matchByEmail.userId;

    const matchByName = await prisma.tenantUser.findFirst({
      where: { tenantId, user: { name: { contains: normalized } } },
    });
    if (matchByName?.userId) return matchByName.userId;
  }
  return fallbackId ?? null;
}

export async function importLeadFromInbox(leadInboxId: string, correlationId: string) {
  const leadInbox = await prisma.leadInbox.findUnique({
    where: { id: leadInboxId },
  });
  if (!leadInbox) throw new Error("Lead inbox item not found");
  if (leadInbox.status !== "APPROVED") {
    return { status: leadInbox.status };
  }

  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId: leadInbox.tenantId },
  });
  const cachedExtraction = normalizeLeadExtraction(leadInbox.extractedPreviewJson);
  let extracted = cachedExtraction;
  if (!extracted) {
    if (!tenantSettings?.openaiEncryptedApiKey) {
      throw new Error("OpenAI API key not configured for tenant");
    }

    const preview = await extractLeadPreview({
      tenantId: leadInbox.tenantId,
      from: leadInbox.from,
      subject: leadInbox.subject,
      bodyText: leadInbox.rawBodyText,
      correlationId,
    });

    if (!preview) {
      throw new Error("OpenAI API key not configured for tenant");
    }

    extracted = preview;
  }

  const assigneeId = await resolveAssignee(
    leadInbox.tenantId,
    extracted.assigneeHint ?? leadInbox.detectedAssigneeHint,
    tenantSettings.defaultLeadOwnerUserId
  );

  const dedupeFilters = buildLeadDedupeFilters(extracted.email, extracted.phone);
  const existingLead = dedupeFilters.length
    ? await prisma.lead.findFirst({
        where: {
          tenantId: leadInbox.tenantId,
          OR: dedupeFilters,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const stage = await prisma.leadStage.findFirst({
    where: { tenantId: leadInbox.tenantId, isDeleted: false },
    orderBy: { position: "asc" },
  });
  if (!stage) throw new Error("No lead stages configured");

  const result = await prisma.$transaction(async (tx) => {
    if (existingLead) {
      const updated = await tx.lead.update({
        where: { id: existingLead.id },
        data: {
          notes: [existingLead.notes, extracted.notes].filter(Boolean).join("\n"),
          assignedTo: assigneeId ?? existingLead.assignedTo,
        },
      });
      await tx.leadInbox.update({
        where: { id: leadInbox.id },
        data: {
          status: "IMPORTED",
          extractedPreviewJson: extracted,
          leadId: updated.id,
        },
      });
      return { leadId: updated.id, deduped: true };
    }

    const lead = await tx.lead.create({
      data: {
        tenantId: leadInbox.tenantId,
        stageId: stage.id,
        name: extracted.leadName ?? null,
        email: extracted.email ?? null,
        phone: extracted.phone ?? null,
        company: extracted.company ?? null,
        notes: [extracted.notes, extracted.requirement, extracted.location]
          .filter(Boolean)
          .join("\n"),
        source: InboundSource.EMAIL,
        assignedTo: assigneeId,
      },
    });

    await tx.leadInbox.update({
      where: { id: leadInbox.id },
      data: {
        status: "IMPORTED",
        extractedPreviewJson: extracted,
        leadId: lead.id,
      },
    });
    return { leadId: lead.id, deduped: false };
  });

  await writeAuditLog({
    tenantId: leadInbox.tenantId,
    actionType: "LEAD_IMPORTED",
    entityType: "Lead",
    entityId: result.leadId,
    meta: { leadInboxId: leadInbox.id, deduped: result.deduped },
  });

  return result;
}
