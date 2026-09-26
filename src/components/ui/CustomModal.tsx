"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Loader2,
  HelpCircle,
} from "lucide-react";

export type ModalType = "info" | "success" | "warning" | "danger" | "confirm";

export interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  type = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  children,
}: CustomModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!onConfirm) {
      onClose();
      return;
    }

    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Modal action error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  const activeLoading = isLoading || internalLoading;

  // Icon & Theme mapping
  const renderIcon = () => {
    switch (type) {
      case "success":
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "danger":
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
        );
      case "confirm":
        return (
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
      case "info":
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card border border-border/80 shadow-2xl p-6 relative flex flex-col gap-4 text-left overflow-hidden animate-scale-up"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {renderIcon()}
            <div>
              <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                {title}
              </h3>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                GhostChat Notification
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description / Content Body */}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        {children}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {(type === "confirm" || type === "danger" || type === "warning") && onConfirm && (
            <button
              onClick={onClose}
              disabled={activeLoading}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={handleConfirm}
            disabled={activeLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
              type === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20"
                : type === "warning"
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                : type === "success"
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {activeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
