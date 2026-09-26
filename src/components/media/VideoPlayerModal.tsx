"use client";

import React, { useState } from "react";
import { X, Download, Film } from "lucide-react";

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
  title = "Shared Video",
}: VideoPlayerModalProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  if (!isOpen || !videoUrl) return null;

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      setDimensions({ width: video.videoWidth, height: video.videoHeight });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center rounded-3xl bg-slate-950/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Modal Header */}
        <div className="w-full px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5 truncate max-w-[60%]">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Film className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">{title}</span>
              {dimensions && (
                <span className="text-[10px] font-mono text-slate-400">
                  Exact Resolution: {dimensions.width} × {dimensions.height} px
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              aria-label="Close video player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Frame displaying in exact original video aspect ratio */}
        <div className="relative w-full max-h-[82vh] overflow-hidden flex items-center justify-center p-3 bg-black/60">
          <video
            src={videoUrl}
            controls
            autoPlay
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            className="max-h-[76vh] max-w-full object-contain rounded-xl shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}

