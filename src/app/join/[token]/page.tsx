"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<"invalid" | "expired" | "full" | "general" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Attempt initial join or check
  useEffect(() => {
    let isCancelled = false;

    async function checkAndJoin() {
      try {
        setLoading(true);
        const res = await fetch(`/api/chats/${token}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const data = await res.json();

        if (isCancelled) return;

        if (!res.ok) {
          if (res.status === 404) {
            setErrorType("invalid");
            setErrorMessage(data.error || "This invitation link is invalid.");
          } else if (res.status === 410) {
            setErrorType("expired");
            setErrorMessage(data.error || "This chat has expired.");
          } else if (res.status === 403) {
            setErrorType("full");
            setErrorMessage(data.error || "This chat is already full.");
          } else {
            setErrorType("general");
            setErrorMessage(data.error || "Something went wrong.");
          }
          setLoading(false);
          return;
        }

        // Successfully joined or already member
        if (data.alreadyMember) {
          router.replace(`/chat/${data.chat.id}`);
          return;
        }

        // Joined fresh, redirect to chat room
        router.replace(`/chat/${data.chat.id}`);
      } catch (err: unknown) {
        if (isCancelled) return;
        setErrorType("general");
        setErrorMessage(err instanceof Error ? err.message : "Failed to join chat.");
        setLoading(false);
      }
    }

    checkAndJoin();

    return () => {
      isCancelled = true;
    };
  }, [token, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Connecting to chat...</h2>
        <p className="text-xs text-muted-foreground">Validating anonymous session & invitation</p>
      </div>
    );
  }

  // Error States
  if (errorType) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-background text-foreground">
        <header className="h-16 border-b border-border/40 px-4 flex items-center justify-between max-w-2xl mx-auto w-full">
          <Link href="/" className="font-extrabold text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg wa-green-gradient flex items-center justify-center text-white text-xs">
              WA
            </div>
            <span>WhatsApp Messenger</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="max-w-md mx-auto w-full px-4 py-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-6">
            {errorType === "expired" ? (
              <Clock className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            {errorType === "invalid" && "Invalid Invitation Link"}
            {errorType === "expired" && "This Chat Has Expired"}
            {errorType === "full" && "Chat is Full"}
            {errorType === "general" && "Unable to Join"}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
            {errorMessage}
          </p>

          <div className="w-full space-y-3">
            <Link
              href="/chat/new"
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:bg-primary/90"
            >
              <span>Start a New Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full py-3.5 px-4 rounded-xl bg-secondary/80 text-foreground text-sm font-medium flex items-center justify-center transition-all hover:bg-secondary"
            >
              Return Home
            </Link>
          </div>
        </main>

        <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
          Anonymous temporary messaging • Automatically disappears after 3 days
        </footer>
      </div>
    );
  }

  return null;
}
