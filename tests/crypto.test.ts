import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSecureToken,
  generateAnonymousId,
  hashSessionToken,
  generateStorageKey,
} from "../src/lib/crypto.ts";

test("Crypto: generateSecureToken generates high entropy unique tokens", () => {
  const token1 = generateSecureToken(24);
  const token2 = generateSecureToken(24);

  assert.notEqual(token1, token2);
  assert.ok(token1.length >= 32, "Token should be at least 32 characters base64url");
  assert.match(token1, /^[A-Za-z0-9_-]+$/, "Token must be URL safe");
});

test("Crypto: generateAnonymousId produces random prefixed identifier", () => {
  const id1 = generateAnonymousId();
  const id2 = generateAnonymousId();

  assert.notEqual(id1, id2);
  assert.ok(id1.startsWith("anon_"), "Must have anon_ prefix");
});

test("Crypto: hashSessionToken creates deterministic SHA-256 hash", () => {
  const secret = "super-secret-user-cookie-token";
  const hash1 = hashSessionToken(secret);
  const hash2 = hashSessionToken(secret);

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64, "SHA-256 output must be 64 hex characters");
  assert.notEqual(hash1, secret, "Hashed value must not match plaintext secret");
});

test("Crypto: generateStorageKey protects against directory traversal", () => {
  const maliciousChatId = "../../etc/passwd";
  const maliciousExt = "../../../sh";
  const storageKey = generateStorageKey(maliciousChatId, maliciousExt);

  const safeChatId = maliciousChatId.replace(/[^a-zA-Z0-9_-]/g, "");
  assert.ok(storageKey.startsWith(`ghostchat/chat_${safeChatId}/`));
  assert.ok(!storageKey.includes(".."), "Storage key must not contain path traversal dots");
  assert.ok(storageKey.includes("/"), "Storage key has date hierarchy");
  assert.notEqual(storageKey, maliciousChatId);
});
