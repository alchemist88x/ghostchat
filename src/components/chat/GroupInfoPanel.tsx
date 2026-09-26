"use client";

import React, { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Link2,
  Mic,
  ShieldAlert,
} from "lucide-react";
import { IChat, IParticipant, IMessage } from "@/types";
import { getAvatarForName } from "@/lib/names";

interface GroupInfoPanelProps {
  chat: IChat;
  participants: IParticipant[];
  messages: IMessage[];
  currentParticipantId: string;
  onClose: () => void;
  className?: string;
}

export function GroupInfoPanel({
  chat,
  participants,
  messages,
  currentParticipantId,
  onClose,
  className = "",
}: GroupInfoPanelProps) {
  const [filesExpanded, setFilesExpanded] = useState(true);

  // Extract media items from messages
  const imageMessages = messages.filter(
    (m) => m.type === "image" || m.attachments?.some((a) => a.type === "image")
  );
  const videoMessages = messages.filter(
    (m) => m.type === "video" || m.attachments?.some((a) => a.type === "video")
  );
  const linkMessages = messages.filter(
    (m) => m.content && (m.content.includes("http://") || m.content.includes("https://"))
  );
  const voiceMessages = messages.filter(
    (m) => m.type === "voice" || m.attachments?.some((a) => a.type === "voice")
  );
  const fileMessages = messages.filter(
    (m) => m.type === "file" || m.attachments?.some((a) => a.type === "file")
  );
  const audioMessages = messages.filter(
    (m) => m.attachments?.some((a) => a.mimeType?.startsWith("audio/")) || m.type === "voice"
  );

  // Sample image URLs for grid preview
  const photoPreviews = imageMessages
    .slice(0, 4)
    .map((m) => m.attachments?.[0]?.publicUrl || m.content)
    .filter((url) => url.startsWith("http") || url.startsWith("/") || url.startsWith("blob:"));

  return (
    <aside
      className={`w-80 border-l border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col h-full shrink-0 p-4 space-y-4 overflow-y-auto ${className}`}
    >
      {/* 1. Group Info Box */}
      <div className="rounded-3xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Group Info</h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Files Section */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <span>Shared Media & Files</span>
            {filesExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {filesExpanded && (
            <div className="space-y-3 pt-1">
              {/* Photos Grid Item */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium">{imageMessages.length} photos</span>
                  </div>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Photo Previews */}
                {photoPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/40 text-[11px] text-slate-400 text-center font-medium">
                    No shared photos yet
                  </div>
                )}
              </div>

              {/* Accordion File Rows */}
              <div className="space-y-2.5 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>{videoMessages.length} videos</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>{fileMessages.length} files</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <span>{audioMessages.length} audio files</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-emerald-400" />
                    <span>{linkMessages.length} shared links</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-rose-400" />
                    <span>{voiceMessages.length} voice messages</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Members Box */}
      <div className="rounded-3xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {participants.length} members
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {participants.map((p) => {
            const avatarEmoji = getAvatarForName(p.displayName);
            const isSelf = p.anonymousId === currentParticipantId;

            return (
              <div
                key={p.anonymousId || p.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0 border border-slate-300/40 dark:border-slate-700/40">
                    {avatarEmoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                      {p.displayName}
                      {isSelf && (
                        <span className="text-[10px] text-indigo-400 font-normal">(you)</span>
                      )}
                    </p>
                  </div>
                </div>

                {p.isCreator && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shrink-0">
                    admin
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
