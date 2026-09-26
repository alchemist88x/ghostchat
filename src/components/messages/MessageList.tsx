"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowDown, Loader2, MessageSquare } from "lucide-react";
import { IMessage, IReplyTo } from "@/types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: IMessage[];
  currentParticipantId: string;
  isCreator?: boolean;
  hasMoreOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: (replyData: IReplyTo) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReportMessage: (messageId: string) => void;
}

export function MessageList({
  messages,
  currentParticipantId,
  isCreator,
  hasMoreOlder,
  isLoadingOlder,
  onLoadOlder,
  onReply,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom on first load and when new messages arrive
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, showScrollBottom]);

  // Track scroll position to show/hide "Scroll to bottom" button
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceToBottom > 200);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-primary/10", "rounded-2xl");
      setTimeout(() => el.classList.remove("bg-primary/10", "rounded-2xl"), 2000);
    }
  };

  // Group messages with date separators
  const formatSeparatorDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto pt-4 pb-4 relative flex flex-col justify-start"
    >
      {/* Load More Button for older messages */}
      {hasMoreOlder && (
        <div className="flex justify-center my-2">
          <button
            onClick={onLoadOlder}
            disabled={isLoadingOlder}
            className="py-1.5 px-4 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {isLoadingOlder ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading older messages...</span>
              </>
            ) : (
              <span>Load older messages</span>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-14 h-14 rounded-3xl bg-secondary/60 text-muted-foreground flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No messages yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Start the conversation! Everything is anonymous and expires in 3 days.
          </p>
        </div>
      ) : (
        /* Messages with Date Separators */
        messages.map((message, idx) => {
          const prevMessage = messages[idx - 1];
          const showDateSeparator =
            !prevMessage ||
            new Date(prevMessage.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

          return (
            <React.Fragment key={message.id || message.clientMessageId}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="py-1 px-3 rounded-full bg-secondary/60 text-[10px] font-medium text-muted-foreground uppercase tracking-wider backdrop-blur-sm">
                    {formatSeparatorDate(message.createdAt)}
                  </span>
                </div>
              )}
              <MessageItem
                message={message}
                currentParticipantId={currentParticipantId}
                isCreator={isCreator}
                onReply={onReply}
                onToggleReaction={onToggleReaction}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onReportMessage={onReportMessage}
                onScrollToMessage={scrollToMessage}
              />
            </React.Fragment>
          );
        })
      )}

      <div ref={bottomRef} className="h-1" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-30 p-2.5 rounded-full bg-card border border-border/80 text-foreground shadow-xl hover:bg-secondary transition-all active:scale-95 animate-fade-in"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
