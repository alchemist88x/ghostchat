"use client";

import React from "react";
import { ConnectionStatus } from "@/hooks/useRealtime";

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  if (status === "reconnecting" || status === "connecting") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-rose-400" />
      <span>Disconnected</span>
    </div>
  );
}
