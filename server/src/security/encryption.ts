import crypto from "crypto";

const MASTER_KEY_ID = process.env.ENCRYPTION_KEY_ID ?? "primary";
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
const FALLBACK_KEYS = (process.env.ENCRYPTION_MASTER_KEYS ?? "").split(",").filter(Boolean);

if (!MASTER_KEY) {
  throw new Error("ENCRYPTION_MASTER_KEY is required");
}

const masterKeys = new Map<string, Buffer>();
masterKeys.set(MASTER_KEY_ID, Buffer.from(MASTER_KEY, "base64"));
FALLBACK_KEYS.forEach((entry) => {
  const [keyId, keyValue] = entry.split(":");
  if (!keyId || !keyValue) return;
  masterKeys.set(keyId, Buffer.from(keyValue, "base64"));
});

function getMasterKey(keyId: string): Buffer {
  const key = masterKeys.get(keyId);
  if (!key) {
    throw new Error(`Unknown encryption key id: ${keyId}`);
  }
  return key;
}

export type EncryptedPayload = {
  keyId: string;
  encryptedKey: string;
  keyIv: string;
  keyTag: string;
  dataIv: string;
  dataTag: string;
  ciphertext: string;
  version: number;
};

export function encryptSecret(plaintext: string): string {
  const dataKey = crypto.randomBytes(32);
  const dataIv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, dataIv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const dataTag = cipher.getAuthTag();

  const keyIv = crypto.randomBytes(12);
  const keyCipher = crypto.createCipheriv("aes-256-gcm", getMasterKey(MASTER_KEY_ID), keyIv);
  const encryptedKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
  const keyTag = keyCipher.getAuthTag();

  const payload: EncryptedPayload = {
    keyId: MASTER_KEY_ID,
    encryptedKey: encryptedKey.toString("base64"),
    keyIv: keyIv.toString("base64"),
    keyTag: keyTag.toString("base64"),
    dataIv: dataIv.toString("base64"),
    dataTag: dataTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    version: 1,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const payload: EncryptedPayload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const key = getMasterKey(payload.keyId);

  const keyIv = Buffer.from(payload.keyIv, "base64");
  const keyTag = Buffer.from(payload.keyTag, "base64");
  const keyDecipher = crypto.createDecipheriv("aes-256-gcm", key, keyIv);
  keyDecipher.setAuthTag(keyTag);
  const dataKey = Buffer.concat([
    keyDecipher.update(Buffer.from(payload.encryptedKey, "base64")),
    keyDecipher.final(),
  ]);

  const dataIv = Buffer.from(payload.dataIv, "base64");
  const dataTag = Buffer.from(payload.dataTag, "base64");
  const dataDecipher = crypto.createDecipheriv("aes-256-gcm", dataKey, dataIv);
  dataDecipher.setAuthTag(dataTag);
  const plaintext = Buffer.concat([
    dataDecipher.update(Buffer.from(payload.ciphertext, "base64")),
    dataDecipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function safeTruncate(value: string, limit = 2000) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...[truncated]`;
}
