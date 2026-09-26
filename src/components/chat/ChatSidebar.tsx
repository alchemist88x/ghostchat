"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Pin, MessageSquare, Plus, Shield, User, LogOut, Settings } from "lucide-react";
import { IChat } from "@/types";
import { getAvatarForName } from "@/lib/names";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface ChatSidebarProps {
  currentChatId: string;
  managedChats: Array<Partial<IChat> & { id: string }>;
  currentUser: { id: string; username: string } | null;
  onOpenAuthModal: () => void;
  onOpenManagedDrawer: () => void;
  className?: string;
}

export function ChatSidebar({
  currentChatId,
  managedChats,
  currentUser,
  onOpenAuthModal,
  onOpenManagedDrawer,
  className = "",
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = managedChats.filter((c) =>
    (c.name || "Anonymous Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`w-80 border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between h-full shrink-0 ${className}`}
    >
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              GhostChat
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle className="p-1.5" />
            <Link
              href="/chat/new"
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              title="New Chat Room"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-transparent focus:border-indigo-500 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            <p className="font-medium mb-1">No chats found</p>
            <p className="text-[11px]">Create a new chat room to start messaging</p>
          </div>
        ) : (
          filteredChats.map((c) => {
            const isActive = c.id === currentChatId;
            const chatName = c.name || (c.type === "personal" ? "Anonymous Chat" : "Anonymous Group");
            const avatarEmoji = getAvatarForName(chatName);

            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={`group flex items-center justify-between p-3 rounded-2xl transition-all ${
                  isActive
                    ? "bg-indigo-600/15 dark:bg-indigo-600/20 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 font-semibold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-lg border border-slate-300/50 dark:border-slate-700/50">
                      {c.icon || avatarEmoji}
                    </div>
                    {/* Status dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {chatName}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.type === "personal" ? "Private 1-on-1 chat" : `${c.maxParticipants || 50} max members`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Account Footer Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
        {currentUser ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Link
              href="/account"
              className="flex items-center space-x-2.5 min-w-0 overflow-hidden cursor-pointer hover:opacity-90 flex-1"
              title="Account Settings"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-slate-900 dark:text-white truncate">@{currentUser.username}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Account Settings</span>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/account"
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="p-1.5 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Log out of host account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="w-full p-2.5 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center space-x-2 text-xs font-semibold transition-all active:scale-95"
          >
            <User className="w-4 h-4 text-indigo-500" />
            <span>Create Account / Login</span>
          </button>
        )}
      </div>
    </aside>
  );
}
