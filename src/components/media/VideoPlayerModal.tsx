"use client";

import React from "react";
import { X, Download } from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title = "Video Player",
}: VideoPlayerModalProps) {
  if (!isOpen || !videoUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h3 className="text-sm font-bold text-white truncate">{title}</h3>
          <div className="flex items-center gap-2">
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[75vh] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
