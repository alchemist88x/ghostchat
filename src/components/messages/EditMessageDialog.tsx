"use client";

import React, { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  initialContent: string;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export function EditMessageDialog({
  isOpen,
  onClose,
  messageId,
  initialContent,
  onSave,
}: EditMessageDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    try {
      setSaving(true);
      setError(null);
      await onSave(messageId, content.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to edit message");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card border border-border/80 shadow-2xl p-6 relative flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Edit Message</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-2xl bg-secondary/60 border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
