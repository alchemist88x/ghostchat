"use client";

import React, { useState } from "react";
import { X, Shield, Clock, ExternalLink, Copy, Check, Trash2, LogOut, MessageSquare, Sparkles } from "lucide-react";
import { IChat } from "@/types";

interface ManagedChatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; username: string } | null;
  managedChats: Array<Partial<IChat> & { id: string }>;
  onLogout: () => void;
  onEndChat: (chatId: string) => Promise<void>;
  onNavigateToChat: (chatId: string) => void;
}

export function ManagedChatsDrawer({
  isOpen,
  onClose,
  user,
  managedChats,
  onLogout,
  onEndChat,
  onNavigateToChat,
}: ManagedChatsDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleCopyLink = (publicToken: string, chatId: string) => {
    const url = `${window.location.origin}/join/${publicToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(chatId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEnd = async (chatId: string) => {
    if (!confirm("Are you sure you want to end this chat permanently for all participants?")) return;
    try {
      setEndingId(chatId);
      await onEndChat(chatId);
    } finally {
      setEndingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 relative bg-slate-950/40">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{user.username}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Managed Account
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  You have host management over {managedChats.length} active chat room{managedChats.length === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          </div>

          {/* Managed Chats List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Active Managed Chats ({managedChats.length})
            </h4>

            {managedChats.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">No active managed chats</p>
                <p className="text-xs text-slate-500 mt-1">
                  Create a new chat room while logged in to manage it here.
                </p>
              </div>
            ) : (
              managedChats.map((c) => {
                const expiresAtDate = c.expiresAt ? new Date(c.expiresAt) : null;
                const hoursRemaining = expiresAtDate
                  ? Math.max(0, Math.round((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60)))
                  : 72;

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 hover:border-indigo-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">{c.icon || "💬"}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{c.name || "Anonymous Chat"}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {c.type || "group"}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                              <Clock className="w-3 h-3" /> {hoursRemaining}h left
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => c.publicToken && handleCopyLink(c.publicToken, c.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedId === c.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Share Link
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEnd(c.id)}
                          disabled={endingId === c.id}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-colors"
                          title="End conversation permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToChat(c.id);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/20 transition-all"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Logout */}
          <div className="p-6 border-t border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" /> Log Out Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
