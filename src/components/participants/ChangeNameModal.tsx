"use client";

import React, { useState } from "react";
import { X, Check, Loader2, User } from "lucide-react";

interface ChangeNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSaveName: (newName: string) => Promise<void>;
}

export function ChangeNameModal({
  isOpen,
  onClose,
  currentName,
  onSaveName,
}: ChangeNameModalProps) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    try {
      setSaving(true);
      setError(null);
      await onSaveName(name.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change name.");
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
        className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-6 relative flex flex-col gap-4 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Change Alias</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your anonymous display name is only associated with this temporary chat.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Anonymous Panther"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Update Name</span>
          </button>
        </div>
      </div>
    </div>
  );
}
