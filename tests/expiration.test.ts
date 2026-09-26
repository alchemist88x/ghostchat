import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateExpirationDate,
  isExpired,
  getRemainingMs,
  formatRemainingTime,
} from "../src/lib/expiration.ts";

test("Expiration: calculateExpirationDate defaults to 72 hours", () => {
  const start = new Date("2026-09-26T12:00:00Z");
  const expiresAt = calculateExpirationDate(start, 72);

  const diffHours = (expiresAt.getTime() - start.getTime()) / (1000 * 60 * 60);
  assert.equal(diffHours, 72);
});

test("Expiration: isExpired returns true for past dates and false for future", () => {
  const pastDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
  const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour ahead

  assert.equal(isExpired(pastDate), true, "Past date must be expired");
  assert.equal(isExpired(futureDate), false, "Future date must not be expired");
});

test("Expiration: getRemainingMs calculates positive time or 0 for expired", () => {
  const pastDate = new Date(Date.now() - 5000);
  assert.equal(getRemainingMs(pastDate), 0);

  const futureDate = new Date(Date.now() + 60000);
  assert.ok(getRemainingMs(futureDate) > 50000);
});

test("Expiration: formatRemainingTime formats days, hours, and minutes cleanly", () => {
  const threeDaysAhead = new Date(Date.now() + (3 * 24 * 60 * 60 - 60) * 1000);
  const formatted = formatRemainingTime(threeDaysAhead);

  assert.equal(formatted.isExpired, false);
  assert.equal(formatted.days, 2);
  assert.ok(formatted.formatted.includes("2d"), "Formatted string must include 2d");
});
