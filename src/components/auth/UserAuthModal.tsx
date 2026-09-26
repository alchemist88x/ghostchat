"use client";

import React, { useState } from "react";
import {
  X,
  UserCheck,
  LogIn,
  UserPlus,
  Lock,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Copy,
  Check,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; username: string }) => void;
  initialMode?: "login" | "register" | "forgot";
}

export function UserAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}: UserAuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Post-registration Recovery Code Display
  const [createdRecoveryCode, setCreatedRecoveryCode] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{ id: string; username: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    if (!createdRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(createdRecoveryCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleFinishRegistration = () => {
    if (createdUser) {
      onSuccess(createdUser);
    }
    onClose();
    setCreatedRecoveryCode(null);
    setCreatedUser(null);
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === "forgot") {
      if (!username.trim() || !recoveryCodeInput.trim() || !newPassword.trim()) {
        setError("Please enter username, 6-digit recovery code, and new password.");
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            recoveryCode: recoveryCodeInput.trim(),
            newPassword: newPassword.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to reset password.");
        }

        setSuccessMsg("Password reset successfully! You can now log in.");
        setMode("login");
        setPassword(newPassword);
        setNewPassword("");
        setRecoveryCodeInput("");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reset password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("Please fill in both username and password.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      if (mode === "register" && data.recoveryCode) {
        // Show recovery code screen before finalizing
        setCreatedRecoveryCode(data.recoveryCode);
        setCreatedUser(data.user);
      } else {
        onSuccess(data.user);
        onClose();
        setUsername("");
        setPassword("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Glowing Background Accent */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              {createdRecoveryCode
                ? "Account Created!"
                : mode === "login"
                ? "Welcome Back"
                : mode === "register"
                ? "Create Account"
                : "Reset Password"}
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            </h3>
            <p className="text-xs text-slate-400">
              {createdRecoveryCode
                ? "Save your 6-digit recovery code to reset password anytime"
                : mode === "login"
                ? "Log in to view and manage your active chats"
                : mode === "register"
                ? "Optional user registration to manage your chats"
                : "Enter your username and 6-digit code to reset password"}
            </p>
          </div>
        </div>

        {/* Post-Registration 6-Digit Code View */}
        {createdRecoveryCode ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-indigo-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span>Your 6-Digit Recovery Security Code</span>
              </div>

              <div className="py-3 px-4 rounded-xl bg-slate-950 border border-indigo-500/40 text-2xl font-mono font-extrabold tracking-[0.3em] text-cyan-400 text-center select-all">
                {createdRecoveryCode}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Save this code safely! If you ever forget your password, enter this 6-digit code (or default 123456) to recover your account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Code Copied!" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishRegistration}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
              >
                Continue to Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switcher Tabs */}
            <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === "login"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === "register"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === "forgot"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Forgot?
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <span className="font-bold">Success:</span> {successMsg}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your unique username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {mode === "forgot" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      6-Digit Recovery Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={recoveryCodeInput}
                        onChange={(e) => setRecoveryCodeInput(e.target.value)}
                        placeholder="e.g. 123456 or your 6-digit code"
                        required
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "login"
                        ? "Log In to GhostChat"
                        : mode === "register"
                        ? "Register Account"
                        : "Reset Password"}
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              {mode === "forgot"
                ? "Default code 123456 is supported for password recovery."
                : "Note: User registration is 100% optional. Guest users can chat freely."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
