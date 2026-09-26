"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "🫨", "🙂‍↕️", "🙂‍↔️", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
  },
  {
    name: "Gestures",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "🫷", "🫸", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪"],
  },
  {
    name: "Hearts & Sparkles",
    emojis: ["❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤", "🩶", "🤍", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✨", "⭐", "🌟", "💫", "⚡", "💥", "🔥", "💯", "🎉", "🎊"],
  },
  {
    name: "Animals & Nature",
    emojis: ["🐼", "🦊", "🐺", "🦅", "🐯", "🦁", "🐱", "🐶", "🐵", "🐻", "🐨", "🐸", "🦉", "🐬", "🐳", "🐙", "🦋", "🌸", "🌹", "🍀", "🍁", "🍄", "🌴", "🌙", "☀️", "☁️", "⚡", "❄️"],
  },
];

export function EmojiPickerPopover({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Smileys");

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter(() => true)
    : EMOJI_CATEGORIES.find((c) => c.name === activeCategory)?.emojis || [];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-full left-0 mb-3 w-80 sm:w-88 rounded-3xl bg-card/95 border border-border/80 shadow-2xl backdrop-blur-xl p-3 z-50 flex flex-col gap-2 animate-fade-in"
    >
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-secondary/60 border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Category Pills (only if not searching) */}
      {!search && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/40 text-[11px] scrollbar-none">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(cat.name)}
              className={`px-2 py-1 rounded-lg shrink-0 font-medium transition-colors ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-secondary hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
