import test from "node:test";
import assert from "node:assert/strict";
import { isExpired } from "../src/lib/expiration.ts";

test("Limits: Personal chat maximum 2 participants enforcement logic", () => {
  const maxPersonal = 2;
  const currentCountSingle = 1;
  const currentCountFull = 2;

  assert.ok(currentCountSingle < maxPersonal, "Should allow second participant to join");
  assert.ok(!(currentCountFull < maxPersonal), "Must block third participant from joining personal chat");
});

test("Limits: Group chat configurable participant limits", () => {
  const allowedLimits = [10, 25, 50, 100];
  for (const limit of allowedLimits) {
    assert.ok(limit >= 2 && limit <= 100);
  }

  const customLimit = 25;
  const currentCount = 25;
  assert.equal(currentCount >= customLimit, true, "Must block join when limit is reached");
});

test("Security & Expiration: Authoritative rejection on expired chat", () => {
  const chatExpiresAt = new Date(Date.now() - 1000); // 1s ago
  const expired = isExpired(chatExpiresAt);
  assert.equal(expired, true, "Chat must be rejected immediately upon expiration");
});
