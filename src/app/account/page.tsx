"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  KeyRound,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CustomModal } from "@/components/ui/CustomModal";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Check Auth on Mount
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user) {
          setCurrentUser(data.user);
        } else {
          // Not logged in, redirect home
          router.replace("/");
        }
      } catch (err) {
        console.error("Fetch user error:", err);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    if (newPassword.length < 6) {
      setChangeError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError("New passwords do not match.");
      return;
    }

    try {
      setChangeLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setChangeSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setChangeError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account.");
      }

      // Account deleted, redirect home
      router.replace("/");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold">Loading Account Settings...</h2>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/40 bg-background/80 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <Link href="/" className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              G
            </div>
            <span>GhostChat</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-border/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                @{currentUser.username}
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              </h1>
              <p className="text-xs text-muted-foreground">User Profile & Security Settings</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Registered Account
          </span>
        </div>

        {/* Section 1: Recovery Code & Security Note */}
        <div className="p-6 rounded-3xl bg-card/60 border border-border/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Password Recovery & Default Code</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account is protected by a 6-digit recovery security code. In addition to your custom code generated at registration, the default fallback code <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-indigo-400 font-bold">123456</code> is also supported for password recovery.
          </p>
        </div>

        {/* Section 2: Change Password Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card/60 border border-border/60 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground">Update your account password</p>
            </div>
          </div>

          {changeError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {changeError}
            </div>
          )}

          {changeSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{changeSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changeLoading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {changeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Section 3: Danger Zone - Delete Account */}
        <div className="p-6 sm:p-8 rounded-3xl bg-destructive/5 border border-destructive/20 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-destructive">Danger Zone</h2>
              <p className="text-xs text-muted-foreground">Permanently delete user account and chat history</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Deleting your account will permanently purge all your created rooms, messages, and uploaded attachments. This action cannot be undone.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setDeleteModalOpen(true)}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account Permanently?"
        description="Are you absolutely sure you want to delete your account? All your active chat rooms and attachments will be permanently erased immediately."
        type="danger"
        confirmText={deleteLoading ? "Deleting..." : "Yes, Delete Account"}
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
