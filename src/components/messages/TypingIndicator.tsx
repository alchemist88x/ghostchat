"use client";

import React from "react";

export function TypingIndicator({ users }: { users: string[] }) {
  if (!users || users.length === 0) return null;

  let label = "";
  if (users.length === 1) {
    label = `${users[0]} is typing...`;
  } else if (users.length === 2) {
    label = `${users[0]} and ${users[1]} are typing...`;
  } else {
    label = `${users[0]} and ${users.length - 1} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
      </div>
      <span className="italic">{label}</span>
    </div>
  );
}
