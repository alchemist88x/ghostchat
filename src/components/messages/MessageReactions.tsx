"use client";

import React, { useState } from "react";
import { SmilePlus } from "lucide-react";
import { IReaction } from "@/types";
import { ALLOWED_REACTIONS } from "@/lib/validations";

interface MessageReactionsProps {
  reactions: IReaction[];
  currentParticipantId: string;
  onToggleReaction: (emoji: string) => void;
  isOwn?: boolean;
}

export function MessageReactions({
  reactions = [],
  currentParticipantId,
  onToggleReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; reactedByMe: boolean; users: string[] }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, reactedByMe: false, users: [] };
      }
      acc[r.emoji].count += 1;
      acc[r.emoji].users.push(r.displayName);
      if (r.participantId === currentParticipantId) {
        acc[r.emoji].reactedByMe = true;
      }
      return acc;
    },
    {}
  );

  return (
    <div className="relative inline-flex items-center flex-wrap gap-1 mt-1">
      {/* Existing Reaction Badges */}
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggleReaction(emoji)}
          title={`Reacted by: ${data.users.join(", ")}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all active:scale-90 ${
            data.reactedByMe
              ? "bg-primary/20 border border-primary/40 text-primary"
              : "bg-secondary/80 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{emoji}</span>
          <span>{data.count}</span>
        </button>
      ))}

      {/* Quick Add Reaction Button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
        title="Add reaction"
      >
        <SmilePlus className="w-3.5 h-3.5" />
      </button>

      {/* Floating Reaction Bar */}
      {showPicker && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-1 z-30 flex items-center gap-1 p-1 rounded-2xl bg-card border border-border/80 shadow-xl backdrop-blur-md animate-fade-in"
        >
          {ALLOWED_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onToggleReaction(emoji);
                setShowPicker(false);
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg hover:bg-secondary hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
