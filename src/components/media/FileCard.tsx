"use client";

import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import { IAttachment } from "@/types";

interface FileCardProps {
  attachment: IAttachment;
  isOwn?: boolean;
}

export function FileCard({ attachment, isOwn }: FileCardProps) {
  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-2xl w-64 sm:w-72 ${
        isOwn
          ? "bg-primary-foreground/15 text-white"
          : "bg-secondary/70 text-foreground border border-border/60"
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isOwn ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          }`}
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold truncate select-all">{attachment.originalName}</p>
          <p className="text-[10px] opacity-75">{formatSize(attachment.size)}</p>
        </div>
      </div>

      <a
        href={attachment.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.originalName}
        className={`p-2 rounded-xl shrink-0 transition-colors ${
          isOwn
            ? "hover:bg-white/20 text-white"
            : "hover:bg-secondary text-primary"
        }`}
        title="Open or download file"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
