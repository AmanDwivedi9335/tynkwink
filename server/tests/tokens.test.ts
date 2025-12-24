import test from "node:test";
import assert from "node:assert/strict";

process.env.OAUTH_STATE_SECRET = "test-state-secret";
process.env.APPROVAL_TOKEN_SECRET = "test-approval-secret";

test("state token round-trip", async () => {
  const tokens = await import("../src/security/tokens");
  const payload = { tenantId: "tenant", userId: "user", nonce: "abc", issuedAt: Date.now() };
  const signed = tokens.signState(payload);
  const verified = tokens.verifyState(signed);
  assert.equal(verified.tenantId, payload.tenantId);
  assert.equal(verified.userId, payload.userId);
});

test("approval token hashing is stable", async () => {
  const tokens = await import("../src/security/tokens");
  const signed = tokens.signApprovalToken({ tokenId: "id", nonce: "nonce", expiresAt: Date.now() + 1000 });
  const hash = tokens.hashToken(signed);
  assert.equal(hash, tokens.hashToken(signed));
});
