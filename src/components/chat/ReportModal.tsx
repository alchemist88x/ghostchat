"use client";

import React, { useState } from "react";
import { X, Flag, Check, Loader2 } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  messageId?: string;
}

const REPORT_REASONS = [
  "Harassment or bullying",
  "Inappropriate or explicit content",
  "Spam or malicious links",
  "Illegal activity",
  "Other abuse",
];

export function ReportModal({ isOpen, onClose, chatId, messageId }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messageId,
          reason,
          details: details.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Report submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-6 relative flex flex-col gap-4 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {messageId ? "Report Message" : "Report Chat"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center space-y-1">
            <Check className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm font-bold">Report Received</p>
            <p className="text-xs text-muted-foreground">Thank you for helping keep the platform safe.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Your report is completely confidential. Other participants will not know who reported this.
            </p>

            {error && (
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Select Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Describe what occurred..."
                className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 flex items-center gap-1.5 shadow-md shadow-destructive/20"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                <span>Submit Report</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
