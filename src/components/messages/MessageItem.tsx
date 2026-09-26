"use client";

import React, { useState } from "react";
import {
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Flag,
  CheckCheck,
  Check,
} from "lucide-react";
import { IMessage, IReplyTo } from "@/types";
import { getAvatarForName } from "@/lib/names";
import { AudioPlayer } from "../voice/AudioPlayer";
import { FileCard } from "../media/FileCard";
import { ImagePreviewModal } from "../media/ImagePreviewModal";
import { MessageReactions } from "./MessageReactions";
import { EditMessageDialog } from "./EditMessageDialog";

import { MediaContainer } from "../media/MediaContainer";

interface MessageItemProps {
  message: IMessage;
  currentParticipantId: string;
  isCreator?: boolean;
  onReply: (replyData: IReplyTo) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReportMessage: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onRetryUpload?: (clientMessageId: string) => void;
  senderAccountUsername?: string;
}

export function MessageItem({
  message,
  currentParticipantId,
  isCreator,
  onReply,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
  onScrollToMessage,
  onRetryUpload,
  senderAccountUsername,
}: MessageItemProps) {
  const isOwn = message.senderId === currentParticipantId;
  const avatarEmoji = getAvatarForName(message.senderName);

  const [showMenu, setShowMenu] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [canEdit] = useState(() => {
    if (!isOwn || message.type !== "text" || message.deletedForEveryone) {
      return false;
    }
    const sentTime = new Date(message.createdAt).getTime();
    return Date.now() - sentTime <= 5 * 60 * 1000;
  });

  const canDelete = isOwn || isCreator;

  const formatTime = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const renderMessageContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all font-medium"
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex flex-col my-1.5 px-3 sm:px-4 ${
        isOwn ? "items-end" : "items-start"
      }`}
    >
      <div className={`relative max-w-[85%] sm:max-w-md md:max-w-lg flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Reply Preview Header */}
        {message.replyTo && (
          <div
            onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo!.messageId)}
            className={`cursor-pointer mb-1 p-2 rounded-xl text-xs flex flex-col border-l-2 max-w-full ${
              isOwn
                ? "bg-primary/20 border-white/80 text-white/90"
                : "bg-secondary/70 border-primary text-muted-foreground"
            }`}
          >
            <span className="font-semibold truncate">
              ↩ {message.replyTo.senderName}
            </span>
            <span className="truncate opacity-80">{message.replyTo.content}</span>
          </div>
        )}

        {/* Sender Name & Account Handle for incoming messages */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1 text-xs font-semibold text-muted-foreground">
            <span>{avatarEmoji}</span>
            <span>{message.senderName}</span>
            {senderAccountUsername && (
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]">
                @{senderAccountUsername}
              </span>
            )}
          </div>
        )}

        {/* Bubble Body */}
        <div
          className={`relative rounded-3xl p-3.5 shadow-sm transition-all text-sm leading-relaxed ${
            message.deletedForEveryone
              ? "italic bg-secondary/40 text-muted-foreground border border-border/50"
              : isOwn
              ? "bg-primary text-primary-foreground rounded-br-md shadow-primary/10"
              : "bg-card text-foreground rounded-bl-md border border-border/60"
          }`}
        >
          {/* Action Trigger Button */}
          {!message.deletedForEveryone && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-opacity z-20"
              title="Message options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Action Dropdown Menu */}
          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 z-40 w-44 rounded-2xl bg-card border border-border/80 shadow-2xl p-1 backdrop-blur-xl flex flex-col gap-0.5 text-xs text-foreground animate-fade-in"
            >
              <button
                type="button"
                onClick={() => {
                  onReply({
                    messageId: message.id!,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    content: message.content,
                    type: message.type,
                  });
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDialog(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit message</span>
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMessage(message.id!);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete for everyone</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onReportMessage(message.id!);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report message</span>
              </button>
            </div>
          )}

          {/* Content according to type */}
          {message.deletedForEveryone ? (
            <p className="text-xs">This message was deleted</p>
          ) : (
            <>
              {/* Media Rendering with 5-phase progressive pipeline & Video player */}
              {(() => {
                const attachment = message.attachments?.[0];
                const candidateUrl = attachment?.publicUrl || message.content;
                
                const isMediaUrlValid = (url?: string) => {
                  if (!url) return false;
                  return (
                    url.startsWith("http://") ||
                    url.startsWith("https://") ||
                    url.startsWith("/") ||
                    url.startsWith("data:") ||
                    url.startsWith("blob:")
                  );
                };

                const hasValidMediaUrl = isMediaUrlValid(candidateUrl);
                const isImage = message.type === "image" || attachment?.type === "image";
                const isVideo = message.type === "video" || attachment?.type === "video";
                const isVoice = message.type === "voice" || attachment?.type === "voice";
                const isFile = message.type === "file" || attachment?.type === "file";

                return (
                  <>
                    {/* Media: Image or Video */}
                    {(isImage || isVideo) && hasValidMediaUrl && (
                      <div className="mb-2">
                        <MediaContainer
                          type={message.type}
                          url={candidateUrl}
                          attachment={attachment}
                          uploadStatus={message.uploadStatus}
                          uploadProgress={message.uploadProgress}
                          blurDataUrl={message.blurDataUrl || attachment?.blurDataUrl}
                          aspectRatio={message.aspectRatio || attachment?.aspectRatio}
                          isOwn={isOwn}
                          onRetry={() => onRetryUpload && onRetryUpload(message.clientMessageId)}
                        />
                      </div>
                    )}

                    {/* Media: Voice */}
                    {isVoice && (
                      <div className="mb-1">
                        <AudioPlayer
                          src={hasValidMediaUrl ? candidateUrl : ""}
                          duration={attachment?.duration}
                          isOwn={isOwn}
                        />
                      </div>
                    )}

                    {/* Media: File */}
                    {isFile && (
                      <div className="mb-1">
                        <FileCard
                          attachment={
                            attachment || {
                              chatId: message.chatId,
                              type: "file",
                              storageKey: message.id || "file",
                              publicUrl: hasValidMediaUrl ? candidateUrl : "#",
                              originalName: message.content || "Attached File",
                              mimeType: "application/octet-stream",
                              size: 1024,
                              createdAt: message.createdAt,
                              expiresAt: message.expiresAt,
                            }
                          }
                          isOwn={isOwn}
                        />
                      </div>
                    )}

                    {/* Text / Caption Body */}
                    {(message.type === "text" || !hasValidMediaUrl || (message.content && message.content !== candidateUrl && !isImage && !isVideo)) && message.content && (
                      <div className="break-words whitespace-pre-wrap">
                        {renderMessageContent(message.content)}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Timestamp & Status Checkmarks (Phase 4 vs Phase 5) */}
              <div
                className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                  isOwn ? "opacity-80" : "text-muted-foreground"
                }`}
              >
                {message.editedAt && <span>edited</span>}
                <span>{formatTime(message.createdAt)}</span>

                {/* Status Indicator logic: 1 Tick (Sent), 2 Ticks (Received), 3 Ticks (Viewed/Read) */}
                {isOwn && (
                  message.uploadStatus === "failed" ? (
                    <span className="text-red-400 font-bold ml-1">Failed</span>
                  ) : message.readStatus === "read" || (message.readBy && message.readBy.length > 0) ? (
                    /* 3 Ticks: Viewed / Read by partner */
                    <span className="flex items-center text-cyan-300 ml-0.5" title="3 Ticks: Viewed / Read by recipient">
                      <CheckCheck className="w-3.5 h-3.5 fill-cyan-400/20 text-cyan-300" />
                      <Check className="w-3 h-3 -ml-1 text-cyan-300 stroke-[2.5]" />
                    </span>
                  ) : message.readStatus === "delivered" || (message.deliveredTo && message.deliveredTo.length > 0) || message.id ? (
                    /* 2 Ticks: Received / Delivered */
                    <span title="2 Ticks: Received / Delivered to recipient">
                      <CheckCheck className="w-3.5 h-3.5 text-slate-200 ml-0.5" />
                    </span>
                  ) : (
                    /* 1 Tick: Sent to Server */
                    <span title="1 Tick: Sent to server">
                      <Check className="w-3.5 h-3.5 text-slate-300 ml-0.5" />
                    </span>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Interactive Reactions */}
        {!message.deletedForEveryone && (
          <MessageReactions
            reactions={message.reactions || []}
            currentParticipantId={currentParticipantId}
            onToggleReaction={(emoji) => onToggleReaction(message.id!, emoji)}
            isOwn={isOwn}
          />
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage}
        />
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditMessageDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          messageId={message.id!}
          initialContent={message.content}
          onSave={onEditMessage}
        />
      )}
    </div>
  );
}
