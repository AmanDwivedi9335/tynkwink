import { Router } from "express";
import { z } from "zod";
import fetch from "node-fetch-native";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { InboundSource } from "@prisma/client";

const router = Router();

const pullSchema = z.object({
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  lookbackHours: z.number().int().positive().max(168).optional(),
});

const defaultStages = [
  { name: "New Lead", color: "#f59e0b" },
  { name: "Qualified", color: "#3b82f6" },
  { name: "In Conversation", color: "#a855f7" },
  { name: "Good Lead", color: "#22c55e" },
  { name: "Lead Won", color: "#ef4444" },
  { name: "No Response", color: "#6366f1" },
  { name: "Deleted", color: "#06b6d4" },
];

async function ensureStages(tenantId: string) {
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

function formatIndiamartDate(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  return `${pad(date.getDate())}-${month}-${date.getFullYear()}${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

function parseIndiamartDate(value: string) {
  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const [, day, mon, year] = dateOnlyMatch;
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(
      mon
    );
    if (monthIndex === -1) return undefined;
    return new Date(Number(year), monthIndex, Number(day));
  }

  const dateTimeMatch = /^(\d{2})-([A-Za-z]{3})-(\d{4})(\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (dateTimeMatch) {
    const [, day, mon, year, hour, minute, second] = dateTimeMatch;
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(
      mon
    );
    if (monthIndex === -1) return undefined;
    return new Date(Number(year), monthIndex, Number(day), Number(hour), Number(minute), Number(second));
  }

  const numericDateTimeMatch = /^(\d{2})-(\d{2})-(\d{4})(\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (numericDateTimeMatch) {
    const [, day, month, year, hour, minute, second] = numericDateTimeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function pickValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number") {
      return value.toString();
    }
  }
  return undefined;
}

function extractLeadArray(payload: unknown) {
  if (!payload) return [] as Record<string, unknown>[];
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [
      record.RESPONSE,
      record.response,
      record.DATA,
      record.data,
      record.RESULTS,
      record.results,
      record.leads,
      record.records,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as Record<string, unknown>[];
      }
      if (candidate && typeof candidate === "object") {
        const nested = extractLeadArray(candidate);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [] as Record<string, unknown>[];
}

function buildLeadNotes(lead: Record<string, unknown>) {
  const parts = [
    pickValue(lead, ["QUERY_TYPE", "QUERY_TYPE_NAME"]),
    pickValue(lead, ["QUERY_MESSAGE", "ENQ_MESSAGE", "MESSAGE"]),
    pickValue(lead, ["SENDER_COUNTRY_ISO", "COUNTRY", "COUNTRY_ISO"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function parseLeadDate(raw: Record<string, unknown>) {
  const value = pickValue(raw, ["QUERY_TIME", "ENQ_DATE", "ENQ_DATE_TIME", "DATE", "CREATED_AT", "created_at"]);
  if (!value) return undefined;
  const parsed = parseIndiamartDate(value) ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

router.post("/indiamart/pull", requireAuth, async (req, res) => {
  const tenantId = req.auth?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }

  const parsed = pullSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: z.treeifyError(parsed.error) });
  }

  const crmKey = process.env.INDIAMART_GLUSR_CRM_KEY;
  const baseUrl = process.env.INDIAMART_BASE_URL ?? "https://mapi.indiamart.com/wservce/crm/crmListing/v2/";

  if (!crmKey) {
    return res.status(400).json({
      message: "IndiaMART credentials are missing",
      missing: ["INDIAMART_GLUSR_CRM_KEY"],
    });
  }

  const now = new Date();
  const { startTime, endTime, lookbackHours } = parsed.data;

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return res.status(400).json({ message: "Invalid IndiaMART base URL" });
  }
  url.searchParams.set("glusr_crm_key", crmKey);

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return res.status(400).json({ message: "Both startTime and endTime are required when specifying a date range." });
  }

  const resolvedStartTime = startTime
    ? startTime
    : lookbackHours
      ? formatIndiamartDate(new Date(now.getTime() - lookbackHours * 60 * 60 * 1000))
      : undefined;
  const resolvedEndTime = endTime ? endTime : lookbackHours ? formatIndiamartDate(now) : undefined;

  if (resolvedStartTime && resolvedEndTime) {
    const startDate = parseIndiamartDate(resolvedStartTime);
    const endDate = parseIndiamartDate(resolvedEndTime);
    if (startDate && endDate) {
      const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        return res.status(400).json({ message: "IndiaMART date ranges cannot exceed 7 days." });
      }
    }

    url.searchParams.set("start_time", resolvedStartTime);
    url.searchParams.set("end_time", resolvedEndTime);
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return res.status(502).json({ message: "Unable to reach IndiaMART API" });
  }

  if (!response.ok) {
    return res.status(response.status).json({ message: "IndiaMART API error", status: response.status });
  }

  let data: unknown;
  try {
    data = (await response.json()) as unknown;
  } catch {
    return res.status(502).json({ message: "Invalid response from IndiaMART API" });
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const status = record.STATUS;
    if (status === "FAILURE") {
      const code = typeof record.CODE === "number" ? record.CODE : undefined;
      const message = typeof record.MESSAGE === "string" ? record.MESSAGE : "IndiaMART API error";
      if (code === 204) {
        return res.json({
          total: 0,
          imported: 0,
          skipped: 0,
          window: {
            startTime: resolvedStartTime,
            endTime: resolvedEndTime,
          },
          message,
        });
      }
      return res.status(code ?? 400).json({ message, code });
    }
  }
  const rawLeads = extractLeadArray(data);

  const stages = await ensureStages(tenantId);
  const stageId = stages[0]?.id;
  if (!stageId) {
    return res.status(400).json({ message: "No stages available for tenant" });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const rawLead of rawLeads) {
    const uniqueQueryId = pickValue(rawLead, ["UNIQUE_QUERY_ID", "QUERY_ID", "ENQ_ID"]);
    const name = pickValue(rawLead, ["SENDER_NAME", "SENDERNAME", "NAME"]) ?? "IndiaMART Buyer";
    const phone = pickValue(rawLead, ["SENDER_MOBILE", "SENDERPHONE", "SENDERMOBILE", "MOBILE", "PHONE"]);
    const email = pickValue(rawLead, ["SENDER_EMAIL", "SENDEREMAIL", "EMAIL", "EMAIL_ID", "EMAILID"]);
    const company = pickValue(rawLead, ["SENDER_COMPANY", "SENDERCOMPANY", "COMPANY", "COMPANYNAME"]);
    const notesParts = [
      buildLeadNotes(rawLead),
      uniqueQueryId ? `IM UID: ${uniqueQueryId}` : null,
      pickValue(rawLead, ["QUERY_TIME"]) ? `Query time: ${pickValue(rawLead, ["QUERY_TIME"])}` : null,
    ].filter(Boolean);
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : undefined;
    const createdAt = parseLeadDate(rawLead);

    const orFilters = [
      uniqueQueryId ? { notes: { contains: `IM UID: ${uniqueQueryId}` } } : null,
      phone ? { phone } : null,
      email ? { email } : null,
      company && phone ? { company, phone } : null,
    ].filter(Boolean) as Array<{ phone?: string; email?: string; company?: string } | { notes: { contains: string } }>;

    if (orFilters.length > 0) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          tenantId,
          source: InboundSource.INDIAMART,
          OR: orFilters,
        },
      });

      if (existingLead) {
        skippedCount += 1;
        continue;
      }
    }

    await prisma.lead.create({
      data: {
        tenantId,
        stageId,
        name,
        phone,
        email,
        company,
        notes,
        source: InboundSource.INDIAMART,
        createdAt,
      },
    });

    createdCount += 1;
  }

  return res.json({
    total: rawLeads.length,
    imported: createdCount,
    skipped: skippedCount,
    window: {
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
    },
  });
});

export default router;
