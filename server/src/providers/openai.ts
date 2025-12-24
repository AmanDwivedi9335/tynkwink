import { decryptSecret, safeTruncate } from "../security/encryption";

export type OpenAiExtractedLead = {
  leadName?: string;
  company?: string;
  email?: string;
  phone?: string;
  requirement?: string;
  location?: string;
  notes?: string;
  preferredStage?: string;
  assigneeHint?: string;
};

const OPENAI_ENDPOINT = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions";

export async function extractLeadFromEmail(params: {
  encryptedApiKey: string;
  content: string;
  correlationId: string;
}) {
  const apiKey = decryptSecret(params.encryptedApiKey);
  const body = {
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a data extraction engine. Return strict JSON with keys: leadName, company, email, phone, requirement, location, notes, preferredStage, assigneeHint.",
      },
      {
        role: "user",
        content: params.content,
      },
    ],
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Correlation-Id": params.correlationId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${safeTruncate(errorText, 500)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return content as string;
}
