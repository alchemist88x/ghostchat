"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  QrCode,
  RefreshCw,
  PowerOff,
  Shield,
  Trash2,
  Edit2,
  Flag,
  Search,
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  User,
  Smartphone,
} from "lucide-react";
import { IChat } from "@/types";
import { ExpirationCountdown } from "./ExpirationCountdown";
import { getAvatarForName } from "@/lib/names";
import { getChatDisplayName } from "./ChatHeader";
import { triggerPwaInstall } from "../ui/InstallPwaPrompt";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chat: IChat & { id: string };
  currentParticipant: {
    anonymousId: string;
    displayName: string;
    isCreator: boolean;
  };
  participants: Array<{
    id?: string;
    anonymousId: string;
    displayName: string;
    isCreator: boolean;
    joinedAt: Date | string;
  }>;
  onlineParticipantIds: Set<string>;
  onOpenQR: () => void;
  onOpenChangeName: () => void;
  onOpenReport: () => void;
  onRegenerateLink: () => Promise<void>;
  onEndChat: () => Promise<void>;
  onLeaveGroup?: () => Promise<void>;
  onRemoveParticipant: (id: string) => Promise<void>;
  onUpdateGroupSettings?: (settings: { name?: string; icon?: string; maxParticipants?: number }) => Promise<void>;
}

export function ChatDrawer({
  isOpen,
  onClose,
  chat,
  currentParticipant,
  participants,
  onlineParticipantIds,
  onOpenQR,
  onOpenChangeName,
  onOpenReport,
  onRegenerateLink,
  onEndChat,
  onLeaveGroup,
  onRemoveParticipant,
  onUpdateGroupSettings,
}: ChatDrawerProps) {
  const [activeTab, setActiveTab] = useState<"primary" | "general" | "requests">("primary");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Edit settings mode for group creator
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState(chat.name || "");
  const [editLimit, setEditLimit] = useState(chat.maxParticipants || 50);

  if (!isOpen) return null;

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${chat.publicToken}` : "";
  const chatDisplayName = getChatDisplayName(chat, currentParticipant, participants);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(joinUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = joinUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: chatDisplayName || "GhostChat",
          text: "Join my temporary private GhostChat conversation:",
          url: joinUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleSaveSettings = async () => {
    if (!onUpdateGroupSettings) return;
    try {
      await onUpdateGroupSettings({
        name: editName.trim() || undefined,
        maxParticipants: editLimit,
      });
      setIsEditingSettings(false);
    } catch (err) {
      console.error("Settings update failed:", err);
    }
  };

  // Filter participants based on search
  const filteredParticipants = participants.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full bg-card border-l border-border/80 shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Instagram Direct Top Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/90 backdrop-blur-md">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-1.5">
              GhostChat
              <CheckCircle2 className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenChangeName}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Change Display Name"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Instagram Notes / Active Stories Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Notes & Status
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {onlineParticipantIds.size} online
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none pt-1">
              {/* "Your Note" bubble */}
              <div
                onClick={onOpenChangeName}
                className="flex flex-col items-center shrink-0 cursor-pointer group"
              >
                <div className="relative mb-1">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-secondary border border-border text-[9px] font-medium text-foreground whitespace-nowrap shadow-sm">
                    Your note
                  </div>
                  <div className="w-14 h-14 rounded-full bg-secondary border-2 border-border flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                    {getAvatarForName(currentParticipant.displayName)}
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-white text-[9px] font-bold">
                      +
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-foreground max-w-[64px] truncate text-center">
                  You
                </span>
              </div>

              {/* Participants Active Story Circles */}
              {participants.map((p) => {
                const isOnline = onlineParticipantIds.has(p.anonymousId);
                const isMe = p.anonymousId === currentParticipant.anonymousId;
                if (isMe) return null;

                return (
                  <div key={p.anonymousId} className="flex flex-col items-center shrink-0 cursor-pointer group">
                    <div className="relative mb-1">
                      {/* Note Bubble Above Avatar */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background border border-indigo-500/30 text-[9px] font-medium text-indigo-400 whitespace-nowrap shadow-sm">
                        {isOnline ? "Active now" : "Offline"}
                      </div>

                      {/* Avatar with IG Gradient Ring */}
                      <div
                        className={`p-[2px] rounded-full ${
                          isOnline
                            ? "ig-gradient-ring"
                            : "bg-border"
                        }`}
                      >
                        <div className="w-13 h-13 rounded-full bg-card p-0.5">
                          <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-lg">
                            {getAvatarForName(p.displayName)}
                          </div>
                        </div>
                      </div>

                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                      )}
                    </div>

                    <span className="text-[11px] font-medium text-foreground max-w-[64px] truncate text-center">
                      {p.displayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Bar (Instagram Pill Style) */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search participants & settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-secondary/70 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Instagram Direct Category Tabs */}
          <div className="flex border-b border-border/40">
            {[
              { id: "primary", label: `Primary (${participants.length})` },
              { id: "general", label: "Settings" },
              { id: "requests", label: "Share & Actions" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PRIMARY - Active Chat Info & Participants */}
          {activeTab === "primary" && (
            <div className="space-y-4 animate-fade-in">
              {/* Room Banner */}
              <div className="p-4 rounded-3xl bg-secondary/40 border border-border/60 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-2xl text-white shadow-md shrink-0">
                  {chat.icon || (chat.type === "personal" ? "💬" : "👥")}
                </div>
                <div className="overflow-hidden flex-1">
                  <h3 className="font-bold text-foreground text-base truncate">
                    {chatDisplayName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{chat.type} Chat</span>
                    <span>•</span>
                    <ExpirationCountdown expiresAt={chat.expiresAt} showIcon={false} />
                  </div>
                </div>
              </div>

              {/* Participants List (Instagram DM List Aesthetic) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Members ({filteredParticipants.length})
                  </span>
                </div>

                <div className="space-y-1">
                  {filteredParticipants.map((p) => {
                    const isOnline = onlineParticipantIds.has(p.anonymousId);
                    const isMe = p.anonymousId === currentParticipant.anonymousId;

                    return (
                      <div
                        key={p.anonymousId}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-base">
                              {getAvatarForName(p.displayName)}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                            )}
                          </div>

                          <div className="flex flex-col overflow-hidden text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground truncate">
                                {p.displayName}
                              </span>
                              {isMe && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-semibold">
                                  You
                                </span>
                              )}
                              {p.isCreator && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Host
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {isOnline ? "Active now" : "Offline"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {currentParticipant.isCreator && !p.isCreator && !isMe && (
                            <button
                              onClick={() => onRemoveParticipant(p.anonymousId)}
                              className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Remove from chat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredParticipants.length === 0 && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No participants match &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL - Settings & Host Controls */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-fade-in">
              {/* User Identity Setting */}
              <div className="p-4 rounded-3xl bg-secondary/40 border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shrink-0">
                    {getAvatarForName(currentParticipant.displayName)}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[11px] text-muted-foreground block font-medium">Your Identity</span>
                    <span className="text-sm font-bold text-foreground truncate block">
                      {currentParticipant.displayName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onOpenChangeName}
                  className="py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Edit Alias
                </button>
              </div>

              {/* Group Admin Settings */}
              {currentParticipant.isCreator && chat.type === "group" && (
                <div className="p-4 rounded-3xl bg-secondary/40 border border-border/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span>Host Controls</span>
                    </div>
                    {!isEditingSettings && (
                      <button
                        onClick={() => setIsEditingSettings(true)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingSettings ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Group Chat Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={60}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Max Capacity
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[10, 25, 50, 100].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setEditLimit(num)}
                              className={`py-1.5 rounded-xl text-xs font-semibold ${
                                editLimit === num
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-secondary text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setIsEditingSettings(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveSettings}
                          className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setIsRegenerating(true);
                        await onRegenerateLink();
                        setIsRegenerating(false);
                      }}
                      disabled={isRegenerating}
                      type="button"
                      className="w-full py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground flex items-center justify-between transition-colors"
                    >
                      <span>Regenerate Invitation Link</span>
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REQUESTS - Share & Actions */}
          {activeTab === "requests" && (
            <div className="space-y-4 animate-fade-in">
              {/* Share & Link Options */}
              <div className="p-4 rounded-3xl bg-secondary/40 border border-border/60 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  GhostChat Invitation Link
                </span>
                <div className="p-2.5 rounded-2xl bg-background border border-border/60 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground truncate select-all">
                    {joinUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleShare}
                    type="button"
                    className="py-2.5 px-3 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Link</span>
                  </button>

                  <button
                    onClick={onOpenQR}
                    type="button"
                    className="py-2.5 px-3 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show QR Code</span>
                  </button>
                </div>

                <button
                  onClick={() => triggerPwaInstall()}
                  type="button"
                  className="w-full py-2.5 px-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install Web App on Phone</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-4 border-t border-border/40 bg-card/90 backdrop-blur-md space-y-2">
          {currentParticipant.isCreator || chat.type === "personal" ? (
            confirmEnd ? (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-2">
                <p className="text-xs text-destructive font-semibold">
                  End chat? Everyone will lose access immediately.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="flex-1 py-2 rounded-xl bg-secondary text-xs font-medium text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsEnding(true);
                      await onEndChat();
                    }}
                    disabled={isEnding}
                    className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90"
                  >
                    {isEnding ? "Ending..." : "End Chat"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEnd(true)}
                type="button"
                className="w-full py-2.5 px-3 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PowerOff className="w-4 h-4" />
                <span>Delete / End GhostChat</span>
              </button>
            )
          ) : (
            confirmEnd ? (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-2">
                <p className="text-xs text-destructive font-semibold">
                  Leave group chat? You will be removed from member list.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="flex-1 py-2 rounded-xl bg-secondary text-xs font-medium text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsEnding(true);
                      if (onLeaveGroup) await onLeaveGroup();
                    }}
                    disabled={isEnding}
                    className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90"
                  >
                    {isEnding ? "Leaving..." : "Leave Group"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEnd(true)}
                type="button"
                className="w-full py-2.5 px-3 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PowerOff className="w-4 h-4" />
                <span>Leave Group Chat</span>
              </button>
            )
          )}

          <button
            onClick={onOpenReport}
            type="button"
            className="w-full py-2.5 px-3 rounded-2xl bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
