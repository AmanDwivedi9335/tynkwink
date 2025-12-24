import { google } from "googleapis";
import { decryptSecret } from "../security/encryption";

export type GmailMessageSummary = {
  id: string;
  threadId?: string | null;
};

export type GmailMessageDetail = {
  id: string;
  threadId?: string | null;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: any;
  labelIds?: string[] | null;
};

export type GmailProfile = {
  emailAddress: string;
};

export function getGmailClient(params: {
  encryptedRefreshToken: string;
  scopes: string[];
}) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Google OAuth environment variables");
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({
    refresh_token: decryptSecret(params.encryptedRefreshToken),
    scope: params.scopes.join(" "),
  });
  return google.gmail({ version: "v1", auth: oauth2 });
}

export async function getProfile(encryptedRefreshToken: string, scopes: string[]) {
  const gmail = getGmailClient({ encryptedRefreshToken, scopes });
  const response = await gmail.users.getProfile({ userId: "me" });
  return response.data as GmailProfile;
}

export async function listMessages(params: {
  encryptedRefreshToken: string;
  scopes: string[];
  query?: string;
  pageToken?: string;
  maxResults?: number;
}) {
  const gmail = getGmailClient({
    encryptedRefreshToken: params.encryptedRefreshToken,
    scopes: params.scopes,
  });
  const response = await gmail.users.messages.list({
    userId: "me",
    q: params.query,
    maxResults: params.maxResults ?? 50,
    pageToken: params.pageToken,
  });
  return {
    messages: (response.data.messages ?? []) as GmailMessageSummary[],
    nextPageToken: response.data.nextPageToken ?? undefined,
  };
}

export async function getMessage(params: {
  encryptedRefreshToken: string;
  scopes: string[];
  messageId: string;
}) {
  const gmail = getGmailClient({
    encryptedRefreshToken: params.encryptedRefreshToken,
    scopes: params.scopes,
  });
  const response = await gmail.users.messages.get({
    userId: "me",
    id: params.messageId,
    format: "full",
  });
  return response.data as GmailMessageDetail;
}
