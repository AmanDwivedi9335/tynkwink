import { z } from "zod";
import { extractLeadFromEmail } from "../providers/openai";
import { safeTruncate } from "../security/encryption";
import { prisma } from "../prisma";

export const leadExtractionSchema = z.object({
  leadName: z.string().trim().optional(),
  company: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  requirement: z.string().trim().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  preferredStage: z.string().trim().optional(),
  assigneeHint: z.string().trim().optional(),
});

export type LeadExtraction = z.infer<typeof leadExtractionSchema>;

export function parseLeadExtraction(content: string) {
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("OpenAI response did not contain JSON");
  }
  const raw = content.slice(jsonStart, jsonEnd + 1);
  return leadExtractionSchema.parse(JSON.parse(raw));
}

export function normalizeLeadExtraction(input: unknown): LeadExtraction | null {
  const parsed = leadExtractionSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function buildLeadExtractionPrompt(params: {
  from: string;
  subject?: string | null;
  bodyText?: string | null;
}) {
  return `Extract lead data from the email below.\n\nFrom: ${params.from}\nSubject: ${
    params.subject ?? ""
  }\nBody:\n${safeTruncate(params.bodyText ?? "", 3000)}`;
}

export async function extractLeadPreview(params: {
  tenantId: string;
  from: string;
  subject?: string | null;
  bodyText?: string | null;
  correlationId: string;
}) {
  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId: params.tenantId },
  });
  if (!tenantSettings?.openaiEncryptedApiKey) {
    return null;
  }

  return extractLeadPreviewWithKey({
    encryptedApiKey: tenantSettings.openaiEncryptedApiKey,
    from: params.from,
    subject: params.subject,
    bodyText: params.bodyText,
    correlationId: params.correlationId,
  });
}

export async function extractLeadPreviewWithKey(params: {
  encryptedApiKey: string;
  from: string;
  subject?: string | null;
  bodyText?: string | null;
  correlationId: string;
}) {
  const prompt = buildLeadExtractionPrompt({
    from: params.from,
    subject: params.subject,
    bodyText: params.bodyText,
  });

  const response = await extractLeadFromEmail({
    encryptedApiKey: params.encryptedApiKey,
    content: prompt,
    correlationId: params.correlationId,
  });

  return parseLeadExtraction(response);
}
