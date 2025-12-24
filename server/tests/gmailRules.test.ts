import test from "node:test";
import assert from "node:assert/strict";
import { matchesRule } from "../src/services/gmailRules";

test("matchesRule respects sender and subject", () => {
  const rule = { from: "acme", subjectContains: "proposal" };
  const email = {
    headers: { from: "Acme Sales <sales@acme.com>", subject: "Proposal for Q4" },
    bodyText: "Hello",
    labelIds: [],
    hasAttachments: false,
    receivedAt: new Date(),
  };
  assert.equal(matchesRule(rule, email), true);
});

test("matchesRule respects attachments flag", () => {
  const rule = { hasAttachments: true };
  const email = {
    headers: { from: "test", subject: "" },
    bodyText: "Hello",
    labelIds: [],
    hasAttachments: false,
    receivedAt: new Date(),
  };
  assert.equal(matchesRule(rule, email), false);
});
