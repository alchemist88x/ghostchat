"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

interface CustomToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function CustomToast({ toast, onDismiss }: CustomToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] animate-slide-down">
      <div
        className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs font-semibold ${
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : toast.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.type === "info" && <Info className="w-4 h-4 shrink-0" />}
          <span className="truncate">{toast.text}</span>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
