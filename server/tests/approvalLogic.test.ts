import test from "node:test";
import assert from "node:assert/strict";
import { nextStatusForAction } from "../src/services/approvalLogic";

test("approval is idempotent", () => {
  assert.equal(nextStatusForAction("APPROVED", "APPROVE"), null);
  assert.equal(nextStatusForAction("IMPORTED", "APPROVE"), null);
});

test("reject is idempotent", () => {
  assert.equal(nextStatusForAction("REJECTED", "REJECT"), null);
  assert.equal(nextStatusForAction("PENDING", "REJECT"), "REJECTED");
});
