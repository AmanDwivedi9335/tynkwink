import crypto from "crypto";

const STATE_SECRET = process.env.OAUTH_STATE_SECRET ?? "";
const APPROVAL_SECRET = process.env.APPROVAL_TOKEN_SECRET ?? "";

if (!STATE_SECRET) {
  throw new Error("OAUTH_STATE_SECRET is required");
}
if (!APPROVAL_SECRET) {
  throw new Error("APPROVAL_TOKEN_SECRET is required");
}

export type SignedState = {
  tenantId: string;
  userId: string;
  nonce: string;
  redirectUri?: string;
  issuedAt: number;
};

export function signState(payload: SignedState): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyState(token: string): SignedState {
  const [data, signature] = token.split(".");
  if (!data || !signature) {
    throw new Error("Invalid state token");
  }
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid state signature");
  }
  return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SignedState;
}

export function signApprovalToken(payload: { tokenId: string; nonce: string; expiresAt: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", APPROVAL_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyApprovalToken(token: string): { tokenId: string; nonce: string; expiresAt: number } {
  const [data, signature] = token.split(".");
  if (!data || !signature) {
    throw new Error("Invalid approval token");
  }
  const expected = crypto.createHmac("sha256", APPROVAL_SECRET).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid approval token signature");
  }
  return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomNonce() {
  return crypto.randomBytes(16).toString("hex");
}
