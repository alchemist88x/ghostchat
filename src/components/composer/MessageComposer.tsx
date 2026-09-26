"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  StopCircle,
  Trash2,
  Loader2,
  Image as ImageIcon,
  FileText,
  Camera,
  Film,
  Sparkles,
} from "lucide-react";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useUpload } from "@/hooks/useUpload";
import { IAttachment, IReplyTo, MessageType } from "@/types";
import { CameraModal } from "../media/CameraModal";

interface MessageComposerProps {
  chatId: string;
  onSendMessage: (payload: {
    type: MessageType;
    content: string;
    replyTo?: IReplyTo;
    attachments?: IAttachment[];
  }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  replyingTo: IReplyTo | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export function MessageComposer({
  chatId,
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled = false,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { uploadFile, progress, resetProgress } = useUpload(chatId);
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecorder();

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleSendText = async () => {
    if (!content.trim() || isSending || disabled) return;

    try {
      setIsSending(true);
      onTyping(false);
      const text = content.trim();
      setContent("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      await onSendMessage({
        type: "text",
        content: text,
        replyTo: replyingTo || undefined,
      });

      if (replyingTo) onCancelReply();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Helper to generate a low-res base64 blurred preview data URL and aspect ratio
  const generateMediaPreview = (
    file: File
  ): Promise<{ blurDataUrl?: string; aspectRatio?: number }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        resolve({});
        return;
      }

      if (file.type.startsWith("image/")) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 16, 16);
            const blurDataUrl = canvas.toDataURL("image/jpeg", 0.2);
            const aspectRatio = (img.width || 16) / (img.height || 9);
            URL.revokeObjectURL(url);
            resolve({ blurDataUrl, aspectRatio });
          } else {
            URL.revokeObjectURL(url);
            resolve({});
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        img.src = url;
      } else {
        resolve({ aspectRatio: 16 / 9 });
      }
    });
  };

  // Upload handler for photos / videos / documents / native camera captures
  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "file"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setIsSending(true);

    try {
      const { blurDataUrl, aspectRatio } = await generateMediaPreview(file);
      const isVideo = type === "video" || file.type.startsWith("video/");

      const attachment = await uploadFile(file, {
        type: isVideo ? "video" : file.type.startsWith("image/") ? "image" : type,
        originalName: file.name,
        mimeType: file.type,
      });

      if (attachment) {
        await onSendMessage({
          type: isVideo ? "video" : file.type.startsWith("image/") ? "image" : type,
          content: file.name,
          replyTo: replyingTo || undefined,
          attachments: [
            {
              ...attachment,
              blurDataUrl,
              aspectRatio: aspectRatio || 16 / 9,
            },
          ],
        });
        if (replyingTo) onCancelReply();
      }
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    } finally {
      setIsSending(false);
      resetProgress();
      if (e.target) e.target.value = "";
    }
  };

  // Custom Live Camera Capture Handler (Background Upload)
  const handleCameraCapture = async (file: File, type: "image" | "file") => {
    const isVideo = file.type.startsWith("video/");
    const actualType: MessageType = isVideo ? "video" : "image";

    // Extract blur placeholder and aspect ratio asynchronously
    const { blurDataUrl, aspectRatio } = await generateMediaPreview(file).catch(() => ({
      blurDataUrl: undefined,
      aspectRatio: isVideo ? 16 / 9 : 1,
    }));

    // Start background file upload to S3 / Cloudflare R2 / Server storage
    uploadFile(file, {
      type: actualType,
      originalName: file.name,
      mimeType: file.type,
    })
      .then(async (attachment) => {
        if (attachment) {
          await onSendMessage({
            type: actualType,
            content: isVideo ? "Camera Video" : "Camera Photo",
            replyTo: replyingTo || undefined,
            attachments: [
              {
                ...attachment,
                blurDataUrl,
                aspectRatio: aspectRatio || (isVideo ? 16 / 9 : 1),
              },
            ],
          });
          if (replyingTo) onCancelReply();
        }
      })
      .catch((err) => {
        console.error("Failed to upload camera capture in background:", err);
      })
      .finally(() => {
        resetProgress();
      });
  };

  // Voice recording send
  const handleSendVoice = async () => {
    stopRecording();
  };

  useEffect(() => {
    if (!isRecording && audioBlob) {
      const sendAudio = async () => {
        setIsSending(true);
        try {
          const attachment = await uploadFile(audioBlob, {
            type: "voice",
            originalName: `voice-note-${Date.now()}.webm`,
            mimeType: audioBlob.type || "audio/webm",
            duration: recordingDuration,
          });

          if (attachment) {
            await onSendMessage({
              type: "voice",
              content: "Voice message",
              replyTo: replyingTo || undefined,
              attachments: [attachment],
            });
            if (replyingTo) onCancelReply();
          }
        } catch (err) {
          console.error("Failed to send voice note:", err);
        } finally {
          setIsSending(false);
          resetRecording();
          resetProgress();
        }
      };
      sendAudio();
    }
  }, [isRecording, audioBlob, recordingDuration, uploadFile, onSendMessage, replyingTo, onCancelReply, resetRecording, resetProgress]);

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full relative bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2">
        {/* Reply Preview Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-2xl bg-secondary/80 border border-border/80 text-xs animate-fade-in">
            <div className="flex flex-col overflow-hidden text-left border-l-2 border-primary pl-2.5">
              <span className="font-bold text-primary truncate">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-muted-foreground truncate">{replyingTo.content}</span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {progress.status === "uploading" && (
          <div className="mb-2 p-2 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-2 overflow-hidden">
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              <span className="truncate text-muted-foreground">Uploading {progress.originalName}...</span>
            </div>
            <span className="font-mono text-primary font-bold">{progress.percent}%</span>
          </div>
        )}

        {/* VOICE RECORDING MODE */}
        {isRecording ? (
          <div className="flex items-center justify-between gap-2 sm:gap-3 p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="text-xs sm:text-sm font-bold font-mono tracking-wider">
                {formatRecordingTime(recordingDuration)}
              </span>
              <span className="text-[11px] sm:text-xs text-rose-400 truncate hidden xs:inline">
                Recording voice message...
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={cancelRecording}
                type="button"
                className="p-2 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Cancel recording"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={handleSendVoice}
                type="button"
                className="py-1.5 px-3 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20 flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* NORMAL MESSAGE INPUT COMPOSER */
          <div className="relative flex items-end gap-1 sm:gap-2">
            {/* Hidden Native Inputs */}
            {/* Native Camera App Input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "image")}
            />
            {/* Gallery Image Input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "image")}
            />
            {/* Video Input */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "video")}
            />
            {/* Document Input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "file")}
            />

            {/* Emoji Picker Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 sm:p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <EmojiPickerPopover
                  onSelectEmoji={(emoji) => setContent((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>

            {/* Attachment Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 sm:p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                title="Attach file or photo"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Attach Dropdown Menu */}
              {showAttachMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-3 w-60 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-card border border-border/80 shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-fade-in"
                >
                  {/* Camera Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowCameraModal(true);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Camera (Photo & Video)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Photo / Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      videoInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Film className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Video Clip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Document / File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Message Textarea */}
            <div className="flex-1 relative rounded-2xl bg-secondary/60 border border-input focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden min-h-[42px] flex items-center">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={disabled || isSending}
                rows={1}
                placeholder="Type an anonymous message..."
                className="w-full py-2.5 px-3 text-xs sm:text-sm text-foreground bg-transparent focus:outline-none resize-none max-h-32 placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Right Action: Voice Record OR Send */}
            {content.trim().length > 0 ? (
              <button
                onClick={handleSendText}
                disabled={isSending || disabled}
                type="button"
                className="p-2 sm:p-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 shrink-0 min-w-[42px] min-h-[42px] flex items-center justify-center"
                title="Send message"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={disabled}
                type="button"
                className="p-2 sm:p-2.5 rounded-2xl bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 shrink-0 min-w-[42px] min-h-[42px] flex items-center justify-center"
                title="Hold or click to record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Snapchat Custom Camera Modal */}
      {showCameraModal && (
        <CameraModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </div>
  );
}
