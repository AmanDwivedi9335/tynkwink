import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadDedupeFilters } from "../src/services/leadDedupe";

test("buildLeadDedupeFilters returns filters for email and phone", () => {
  const filters = buildLeadDedupeFilters("a@example.com", "123");
  assert.equal(filters.length, 2);
  assert.deepEqual(filters[0], { email: "a@example.com" });
  assert.deepEqual(filters[1], { phone: "123" });
});


test("buildLeadDedupeFilters returns empty when no identifiers", () => {
  const filters = buildLeadDedupeFilters(undefined, undefined);
  assert.equal(filters.length, 0);
});
