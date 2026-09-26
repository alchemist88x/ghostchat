"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { formatRemainingTime } from "@/lib/expiration";

interface CountdownProps {
  expiresAt: string | Date;
  onExpired?: () => void;
  className?: string;
  showIcon?: boolean;
}

export function ExpirationCountdown({
  expiresAt,
  onExpired,
  className = "",
  showIcon = true,
}: CountdownProps) {
  const [timeInfo, setTimeInfo] = useState(() => formatRemainingTime(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const info = formatRemainingTime(expiresAt);
      setTimeInfo(info);
      if (info.isExpired && onExpired) {
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (timeInfo.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Chat expired</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        timeInfo.isUrgent
          ? "text-rose-400 font-semibold animate-pulse"
          : timeInfo.isNearExpiry
          ? "text-amber-400"
          : "text-muted-foreground"
      } ${className}`}
    >
      {showIcon && <Clock className="w-3.5 h-3.5 shrink-0" />}
      <span>Expires in {timeInfo.formatted}</span>
    </div>
  );
}
