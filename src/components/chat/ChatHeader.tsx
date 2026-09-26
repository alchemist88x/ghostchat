"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MoreVertical, QrCode, Search, Phone, Sliders } from "lucide-react";
import { IChat } from "@/types";
import { ConnectionBadge } from "./ConnectionBadge";
import { ExpirationCountdown } from "./ExpirationCountdown";
import { ThemeToggle } from "../ui/ThemeToggle";
import { ConnectionStatus } from "@/hooks/useRealtime";

interface ChatHeaderProps {
  chat: IChat;
  currentParticipant?: {
    anonymousId: string;
    displayName: string;
  } | null;
  participants?: Array<{
    anonymousId: string;
    displayName: string;
  }>;
  participantCount: number;
  onlineCount: number;
  connectionStatus: ConnectionStatus;
  onOpenDrawer: () => void;
  onOpenQR: () => void;
  onToggleGroupInfo?: () => void;
  onToggleSidebar?: () => void;
}

export function getChatDisplayName(
  chat: { type: "personal" | "group"; name?: string },
  currentParticipant?: { anonymousId: string; displayName: string } | null,
  participants: Array<{ anonymousId: string; displayName: string }> = []
) {
  if (chat.type === "personal") {
    const otherParticipant = participants.find(
      (p) => p.anonymousId !== currentParticipant?.anonymousId
    );
    if (otherParticipant) {
      return otherParticipant.displayName;
    }
    return chat.name || "Waiting for partner...";
  }
  return chat.name || "Group Chat";
}

export function ChatHeader({
  chat,
  currentParticipant,
  participants = [],
  participantCount,
  onlineCount,
  connectionStatus,
  onOpenDrawer,
  onOpenQR,
  onToggleGroupInfo,
  onToggleSidebar,
}: ChatHeaderProps) {
  const displayName = getChatDisplayName(chat, currentParticipant, participants);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 transition-colors">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Sidebar toggle (mobile), Back & Room Details */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
              title="Toggle Chat List"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
            title="Go to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Clickable Title & Subtitle */}
          <div
            onClick={onOpenDrawer}
            className="flex flex-col overflow-hidden text-left cursor-pointer group"
          >
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span>{participantCount} members, {onlineCount} online</span>
              <span>•</span>
              <ExpirationCountdown expiresAt={chat.expiresAt} showIcon={false} />
            </div>
          </div>
        </div>

        {/* Right: Actions (Search, QR, Theme, Info Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ConnectionBadge status={connectionStatus} />

          <button
            type="button"
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden md:flex"
            title="Search message history"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={onOpenQR}
            type="button"
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex"
            title="Share QR Code"
          >
            <QrCode className="w-4.5 h-4.5" />
          </button>

          <ThemeToggle className="hidden sm:flex p-2" />

          {/* 3-Dots Menu Button */}
          <button
            onClick={chat.type === "group" && onToggleGroupInfo ? onToggleGroupInfo : onOpenDrawer}
            type="button"
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={chat.type === "group" ? "Group Info & Settings" : "Chat Settings"}
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

