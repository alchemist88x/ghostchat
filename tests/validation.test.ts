import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatSchema,
  sendMessageSchema,
  editMessageSchema,
  reactionSchema,
  ALLOWED_REACTIONS,
} from "../src/lib/validations.ts";

test("Validation: createChatSchema accepts valid personal and group payloads", () => {
  const personal = createChatSchema.safeParse({ type: "personal" });
  assert.equal(personal.success, true);

  const group = createChatSchema.safeParse({
    type: "group",
    name: "Weekend Project",
    icon: "🚀",
    maxParticipants: 25,
  });
  assert.equal(group.success, true);

  const invalidType = createChatSchema.safeParse({ type: "invalid_type" });
  assert.equal(invalidType.success, false);
});

test("Validation: sendMessageSchema validates clientMessageId and types", () => {
  const validText = sendMessageSchema.safeParse({
    clientMessageId: "msg_12345",
    type: "text",
    content: "Hello everyone!",
  });
  assert.equal(validText.success, true);

  const missingId = sendMessageSchema.safeParse({
    type: "text",
    content: "Missing client message id",
  });
  assert.equal(missingId.success, false);
});

test("Validation: editMessageSchema rejects empty string", () => {
  const valid = editMessageSchema.safeParse({ content: "Updated message" });
  assert.equal(valid.success, true);

  const empty = editMessageSchema.safeParse({ content: "   " });
  assert.equal(empty.success, false);
});

test("Validation: reactionSchema allows valid reaction emojis", () => {
  for (const emoji of ALLOWED_REACTIONS) {
    const res = reactionSchema.safeParse({ emoji });
    assert.equal(res.success, true);
  }
});
