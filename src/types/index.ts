export type ChatType = "personal" | "group";
export type ChatStatus = "active" | "ended" | "expired";

export interface IChat {
  _id?: string;
  id?: string;
  publicToken: string;
  type: ChatType;
  name?: string;
  icon?: string;
  createdByParticipantId?: string;
  maxParticipants: number;
  participantCount?: number;
  createdAt: Date;
  expiresAt: Date;
  status: ChatStatus;
}

export interface IParticipant {
  _id?: string;
  id?: string;
  chatId: string;
  anonymousId: string;
  displayName: string;
  isCreator: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  sessionHash: string;
  userId?: string;
  username?: string;
}

export type MessageType = "text" | "image" | "file" | "voice" | "video";

export interface IAttachment {
  _id?: string;
  id?: string;
  chatId: string;
  messageId?: string;
  type: MessageType;
  storageKey: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number; // For voice & video messages in seconds
  width?: number;
  height?: number;
  aspectRatio?: number;
  blurDataUrl?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IReaction {
  emoji: string;
  participantId: string;
  displayName: string;
  createdAt: Date;
}

export interface IReplyTo {
  messageId: string;
  senderName: string;
  senderId: string;
  content: string;
  type: MessageType;
}

export interface IMessage {
  _id?: string;
  id?: string;
  chatId: string;
  senderId: string;
  senderName: string;
  clientMessageId: string;
  type: MessageType;
  content: string;
  replyTo?: IReplyTo;
  attachments?: IAttachment[];
  reactions: IReaction[];
  createdAt: Date;
  updatedAt?: Date;
  expiresAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  deletedForEveryone?: boolean;
  // Progressive Upload UI states
  uploadStatus?: "compressing" | "uploading" | "sent" | "failed";
  uploadProgress?: number; // 0 - 100
  blurDataUrl?: string;
  aspectRatio?: number;
  // 1 Tick (sent), 2 Ticks (delivered), 3 Ticks (viewed/read)
  readStatus?: "sent" | "delivered" | "read";
  readBy?: string[];
  deliveredTo?: string[];
}

export interface IReport {
  _id?: string;
  chatId: string;
  messageId?: string;
  reportedByParticipantId: string;
  reason: string;
  details?: string;
  createdAt: Date;
}

export interface IUser {
  _id?: string;
  id?: string;
  username: string;
  passwordHash: string;
  recoveryCode?: string;
  createdAt: Date;
  managedChatIds?: string[];
}

// Realtime Event Types for Ably
export type RealtimeEventName =
  | "message:new"
  | "message:update"
  | "message:delete"
  | "message:reaction"
  | "message:read"
  | "message:delivered"
  | "typing:start"
  | "typing:stop"
  | "presence:join"
  | "presence:leave"
  | "participant:joined"
  | "participant:left"
  | "participant:updated"
  | "chat:updated"
  | "chat:expired"
  | "chat:ended";

export interface TypingEventPayload {
  participantId: string;
  displayName: string;
}

export interface PresenceMemberData {
  participantId: string;
  displayName: string;
  joinedAt: string;
}
