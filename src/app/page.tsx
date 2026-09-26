"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  Clock,
  Sparkles,
  Zap,
  Mic,
  Image as ImageIcon,
  Users,
  Lock,
  ArrowRight,
  Share2,
  Trash2,
  CheckCircle2,
  User,
  Shield,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserAuthModal } from "@/components/auth/UserAuthModal";
import { ManagedChatsDrawer } from "@/components/auth/ManagedChatsDrawer";
import { IChat } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [managedChats, setManagedChats] = useState<Array<Partial<IChat> & { id: string }>>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch current user and managed chats on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user) {
          setCurrentUser(data.user);
          setManagedChats(data.managedChats || []);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setManagedChats([]);
      setDrawerOpen(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleEndChat = async (chatId: string) => {
    const res = await fetch(`/api/chats/${chatId}/end`, { method: "POST" });
    if (res.ok) {
      setManagedChats((prev) => prev.filter((c) => c.id !== chatId));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/15 blur-[110px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-border/40 bg-background/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              GhostChat
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Ephemeral
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Account / Login Option */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>@{currentUser.username}</span>
                {managedChats.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {managedChats.length}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Account</span>
              </button>
            )}

            <Link
              href="/chat/new"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all duration-200 active:scale-95 flex items-center gap-1.5"
            >
              <span>Start a Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* User Auth Modal */}
      <UserAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          // Refetch managed chats
          fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => setManagedChats(d.managedChats || []));
        }}
      />

      {/* Managed Chats Drawer */}
      <ManagedChatsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={currentUser}
        managedChats={managedChats}
        onLogout={handleLogout}
        onEndChat={handleEndChat}
        onNavigateToChat={(id) => router.push(`/chat/${id}`)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center">
        {/* HERO SECTION */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8 backdrop-blur-md animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero Tracking • No Registration Required • 72-Hour Ephemeral</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.1] mb-6">
            Talk. Share.{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Disappear.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Create a temporary anonymous chat, share the private link, and start talking with text, images, files, and voice notes.
            Automatically expires in 3 days.
          </p>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-12">
            <Link
              href="/chat/new"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <span>Start a Chat</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Supporting Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full max-w-3xl pt-2">
            {[
              { icon: ShieldCheck, text: "No account" },
              { icon: Lock, text: "No phone #" },
              { icon: Zap, text: "No email" },
              { icon: Clock, text: "3-Day expiry" },
              { icon: Mic, text: "Voice notes" },
              { icon: Trash2, text: "Auto-purge" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-card/60 border border-border/50 text-muted-foreground text-xs font-medium backdrop-blur-sm"
              >
                <item.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 border-t border-border/40">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
              Simple Flow
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              How it works
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Create",
                desc: "Choose between a 1-on-1 Personal Chat or a multi-participant Group Chat.",
                icon: MessageSquare,
              },
              {
                step: "02",
                title: "Share",
                desc: "Send the cryptographically generated private invitation link or QR code.",
                icon: Share2,
              },
              {
                step: "03",
                title: "Talk",
                desc: "Communicate in real time with text, images, attachments, and voice notes.",
                icon: Mic,
              },
              {
                step: "04",
                title: "Disappear",
                desc: "After 72 hours, the conversation and media are completely purged.",
                icon: Clock,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-2xl bg-card/50 border border-border/60 hover:border-indigo-500/40 transition-all duration-300 backdrop-blur-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                      {step.step}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-indigo-400 transition-colors">
                      <step.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 border-t border-border/40">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
              Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for speed, simplicity & privacy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Anonymous",
                desc: "No registration required. You are assigned a random temporary nature avatar and alias that only exists for this chat.",
              },
              {
                icon: Clock,
                title: "Temporary",
                desc: "Conversations automatically expire after 72 hours. All messages and media files are permanently purged from storage.",
              },
              {
                icon: Zap,
                title: "Real-time",
                desc: "Powered by Ably realtime messaging. Messages, typing status, presence, and reactions appear with sub-second latency.",
              },
              {
                icon: ImageIcon,
                title: "Rich Media",
                desc: "Share pictures, voice recordings with waveforms, and documents up to 25MB stored securely in Cloudflare R2.",
              },
              {
                icon: Lock,
                title: "Personal Chats",
                desc: "Strictly limited to 2 participants atomically enforced on the server. Unauthorized third parties cannot enter.",
              },
              {
                icon: Users,
                title: "Group Rooms",
                desc: "Configure rooms for 10 to 100 people. Creators can change settings, kick participants, and regenerate invitation links.",
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card/40 border border-border/50 hover:border-indigo-500/30 transition-all duration-300 flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRIVACY ACCURACY GUARANTEE SECTION */}
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 mb-12">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-950/20 to-card/60 border border-indigo-500/20 backdrop-blur-md text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Our Privacy Promise</h3>
                <p className="text-xs text-muted-foreground">Clear, transparent, zero deception</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              No account, email address, or phone number is required. Conversations are strictly temporary and automatically expire after 3 days.
              Raw browser session secrets are never saved in the database, and invitation tokens are cryptographically randomized.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-indigo-300/80">
              <span>✓ No third-party trackers</span>
              <span>✓ No invasive fingerprinting</span>
              <span>✓ Direct serverless cleanup</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">GhostChat</span>
            <span>—</span>
            <span>Ephemeral Anonymous Private Messaging</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Conversations expire in 72 hours</span>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
