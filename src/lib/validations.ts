import { z } from "zod";

export const ALLOWED_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👎"] as const;

export const MAX_IMAGE_SIZE = (Number(process.env.MAX_IMAGE_SIZE_MB) || 10) * 1024 * 1024;
export const MAX_VOICE_SIZE = (Number(process.env.MAX_VOICE_SIZE_MB) || 20) * 1024 * 1024;
export const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;

export const createChatSchema = z.object({
  type: z.enum(["personal", "group"]),
  name: z.string().trim().max(60).optional(),
  icon: z.string().trim().max(10).optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
});

export const joinChatSchema = z.object({
  token: z.string().min(10).max(128),
  displayName: z.string().trim().min(1).max(40).optional(),
});

export const sendMessageSchema = z.object({
  clientMessageId: z.string().min(1).max(64),
  type: z.enum(["text", "image", "file", "voice", "video"]),
  content: z.string().max(4000).default(""),
  replyTo: z
    .object({
      messageId: z.string(),
      senderName: z.string(),
      senderId: z.string(),
      content: z.string().max(500),
      type: z.enum(["text", "image", "file", "voice", "video"]),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["text", "image", "file", "voice", "video"]),
        storageKey: z.string(),
        publicUrl: z.string().min(1),
        originalName: z.string().max(255),
        mimeType: z.string().max(100),
        size: z.number().positive(),
        duration: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        aspectRatio: z.number().optional(),
        blurDataUrl: z.string().optional(),
      })
    )
    .optional(),
});

export const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  deleteForEveryone: z.boolean().default(true),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const updateGroupSettingsSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().min(1).max(10).optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
});

export const updateParticipantSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
});

export const uploadPresignSchema = z.object({
  type: z.enum(["image", "file", "voice", "video"]),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(100),
  size: z.number().int().positive(),
});

export const reportSchema = z.object({
  chatId: z.string().min(1),
  messageId: z.string().optional(),
  reason: z.string().trim().min(2).max(100),
  details: z.string().trim().max(1000).optional(),
});
