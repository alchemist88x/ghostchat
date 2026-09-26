import Link from "next/link";
import { Clock, ArrowRight, Home } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function ChatExpiredPage() {
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
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-6">
          <Clock className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
          This Chat Has Expired
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
          Temporary conversations automatically disappear after 3 days. All messages, images, files, and voice notes have been permanently purged.
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
            className="w-full py-3.5 px-4 rounded-xl bg-secondary/80 text-foreground text-sm font-medium flex items-center justify-center transition-all hover:bg-secondary gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </main>

      <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        WhatsApp Messenger • Direct ephemeral private messaging
      </footer>
    </div>
  );
}
