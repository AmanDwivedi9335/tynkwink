import fetch from "node-fetch-native";
import { decryptSecret, encryptSecret, safeTruncate } from "../security/encryption";

export const WHATSAPP_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v21.0";
const WHATSAPP_GRAPH_BASE = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}`;

export type WhatsAppCredentialInput = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  appId?: string | null;
  webhookVerifyToken?: string | null;
};

export type NormalizedWhatsAppCredentials = {
  encryptedAccessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  appId?: string | null;
  webhookVerifyToken?: string | null;
};

export type WhatsAppValidationResult = {
  ok: boolean;
  displayPhoneNumber?: string;
  businessAccountId?: string;
  error?: string;
  raw?: unknown;
};

export type WhatsAppSendResult = {
  ok: boolean;
  providerMessageId?: string;
  providerStatus?: string;
  error?: string;
  raw?: unknown;
};

export function normalizeCredentialInput(input: WhatsAppCredentialInput): NormalizedWhatsAppCredentials {
  const accessToken = input.accessToken.trim();
  const phoneNumberId = input.phoneNumberId.trim();
  const businessAccountId = input.businessAccountId?.trim() || null;
  const appId = input.appId?.trim() || null;
  const webhookVerifyToken = input.webhookVerifyToken?.trim() || null;

  if (!accessToken) {
    throw new Error("Access token is required");
  }
  if (!phoneNumberId) {
    throw new Error("Phone number ID is required");
  }

  return {
    encryptedAccessToken: encryptSecret(accessToken),
    phoneNumberId,
    businessAccountId,
    appId,
    webhookVerifyToken,
  };
}

export function decryptAccessToken(encryptedAccessToken: string) {
  return decryptSecret(encryptedAccessToken);
}

export function normalizePhoneNumber(rawPhone: string) {
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) {
    throw new Error("Recipient phone number is required");
  }
  return hasPlus ? `+${digits}` : digits;
}

type FetchOptions = {
  method?: "GET" | "POST";
  token: string;
  body?: unknown;
};

async function graphFetch<T>(path: string, options: FetchOptions): Promise<{ ok: boolean; data: T }> {
  const url = `${WHATSAPP_GRAPH_BASE}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : null,
  });

  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const errorMessage =
      typeof (data as any)?.error?.message === "string"
        ? (data as any).error.message
        : `Graph API error (${response.status})`;
    throw new Error(errorMessage);
  }

  return { ok: true, data };
}

type PhoneNumberResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  account_mode?: string;
  quality_rating?: string;
  throughput?: unknown;
  waba_id?: string;
};

export async function validateWhatsAppCredentials(input: {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
}): Promise<WhatsAppValidationResult> {
  try {
    const phoneInfo = await graphFetch<PhoneNumberResponse>(`/${input.phoneNumberId}`, {
      token: input.accessToken,
    });

    const resolvedBusinessAccountId = input.businessAccountId?.trim() || phoneInfo.data.waba_id;
    const result: WhatsAppValidationResult = {
      ok: true,
      raw: phoneInfo.data,
    };
    if (phoneInfo.data.display_phone_number) {
      result.displayPhoneNumber = phoneInfo.data.display_phone_number;
    }
    if (resolvedBusinessAccountId) {
      result.businessAccountId = resolvedBusinessAccountId;
    }

    return result;
  } catch (error: any) {
    const message = safeTruncate(error?.message ?? "Failed to validate WhatsApp credentials", 400);
    return { ok: false, error: message };
  }
}

type SendMessageResponse = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string; message_status?: string }>;
  error?: { message?: string; type?: string; code?: number };
};

export async function sendWhatsAppTextMessage(params: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}): Promise<WhatsAppSendResult> {
  try {
    const response = await graphFetch<SendMessageResponse>(`/${params.phoneNumberId}/messages`, {
      method: "POST",
      token: params.accessToken,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: {
          preview_url: false,
          body: params.body,
        },
      },
    });

    const providerMessageId = response.data.messages?.[0]?.id;
    const providerStatus = response.data.messages?.[0]?.message_status ?? "accepted";
    const result: WhatsAppSendResult = {
      ok: true,
      providerStatus,
      raw: response.data,
    };
    if (providerMessageId) {
      result.providerMessageId = providerMessageId;
    }

    return result;
  } catch (error: any) {
    const message = safeTruncate(error?.message ?? "Failed to send WhatsApp message", 400);
    return { ok: false, error: message };
  }
}
