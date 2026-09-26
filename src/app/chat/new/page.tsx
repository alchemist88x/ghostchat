"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Lock,
  Users,
  ArrowRight,
  Copy,
  Check,
  Share2,
  QrCode,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ExpirationCountdown } from "@/components/chat/ExpirationCountdown";
import { ChatQRCodeModal } from "@/components/chat/ChatQRCodeModal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const GROUP_ICONS = ["💬", "🎮", "🎬", "💼", "🎉", "❤️", "🚀", "🔥", "💡", "🍕"];

export default function NewChatPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"personal" | "group">("personal");
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("💬");
  const [maxParticipants, setMaxParticipants] = useState<number>(50);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ready State after creation
  const [createdChat, setCreatedChat] = useState<{
    id: string;
    publicToken: string;
    type: "personal" | "group";
    name: string;
    expiresAt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleCreateChat = async (type: "personal" | "group") => {
    setIsCreating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { type };
      if (groupName.trim()) payload.name = groupName.trim();
      if (type === "group") {
        payload.icon = groupIcon;
        payload.maxParticipants = maxParticipants;
      }

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create chat");
      }

      setCreatedChat(data.chat);

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsCreating(false);
    }
  };

  const getJoinUrl = () => {
    if (!createdChat) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/join/${createdChat.publicToken}`;
  };

  const handleCopyLink = async () => {
    const url = getJoinUrl();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-HTTPS contexts (e.g. local network IP)
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleShare = async () => {
    const url = getJoinUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: createdChat?.name || "WhatsApp Messenger Invitation",
          text: "Join my temporary private WhatsApp Messenger chat:",
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/40 bg-background/80">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* VIEW 1: CREATION FORM */}
        {!createdChat ? (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                What type of chat do you want?
              </h1>
              <p className="text-sm text-muted-foreground">
                All conversations are anonymous and automatically expire after 72 hours.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            {/* Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Personal Chat Card */}
              <div
                onClick={() => setSelectedType("personal")}
                className={`cursor-pointer p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden ${
                  selectedType === "personal"
                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                    : "border-border/70 bg-card/60 hover:border-border hover:bg-card"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Personal Chat</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    A temporary one-to-one conversation. Maximum 2 people strictly enforced.
                  </p>
                </div>
                <div className="text-xs font-semibold text-indigo-400">Strictly 2 participants</div>
              </div>

              {/* Group Chat Card */}
              <div
                onClick={() => setSelectedType("group")}
                className={`cursor-pointer p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden ${
                  selectedType === "group"
                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                    : "border-border/70 bg-card/60 hover:border-border hover:bg-card"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Group Chat</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    A temporary room for multiple people with customizable name, icon, and limit.
                  </p>
                </div>
                <div className="text-xs font-semibold text-cyan-400">Up to 100 participants</div>
              </div>
            </div>

            {/* Chat Options & Customization */}
            <div className="p-6 rounded-3xl bg-card/70 border border-border/80 space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Chat Name / Topic (Optional)
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={selectedType === "personal" ? "e.g. Secret Catchup, Coffee Talk" : "e.g. Weekend Trip, Project Brainstorm"}
                  maxLength={60}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
                />
              </div>

              {selectedType === "group" && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Choose Room Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GROUP_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setGroupIcon(icon)}
                          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                            groupIcon === icon
                              ? "bg-primary text-white scale-110 shadow-md shadow-primary/30"
                              : "bg-secondary/60 hover:bg-secondary text-foreground"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Participant Limit
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxParticipants(num)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            maxParticipants === num
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {num} People
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Create Submit Button */}
            <button
              onClick={() => handleCreateChat(selectedType)}
              disabled={isCreating}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating temporary chat...</span>
                </>
              ) : (
                <>
                  <span>
                    Create {selectedType === "personal" ? "Personal Chat" : "Group Chat"}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* VIEW 2: CHAT READY STATE */
          <div className="w-full space-y-8 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/15 mb-2">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Your chat is ready
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Share this link with anyone you want to invite. No accounts needed.
              </p>
            </div>

            {/* Live Expiration Badge */}
            <div className="inline-flex py-1.5 px-4 rounded-full bg-secondary/80 border border-border/80 text-xs">
              <ExpirationCountdown expiresAt={createdChat.expiresAt} />
            </div>

            {/* Link Box */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-between gap-3 text-left">
              <span className="font-mono text-xs sm:text-sm text-foreground truncate select-all">
                {getJoinUrl()}
              </span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                title="Copy Link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleCopyLink}
                type="button"
                className="py-3 px-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>

              <button
                onClick={handleShare}
                type="button"
                className="py-3 px-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setShowQRModal(true)}
                type="button"
                className="py-3 px-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </button>
            </div>

            {/* Enter Chat Button */}
            <button
              onClick={() => router.push(`/chat/${createdChat.id}`)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-base shadow-xl shadow-indigo-500/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Enter Chat Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* QR Code Modal */}
        <ChatQRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          url={getJoinUrl()}
          chatName={createdChat?.name}
        />
      </main>

      {/* Footer info */}
      <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        No accounts • Temporary conversations • Fully disappears in 72 hours
      </footer>
    </div>
  );
}
