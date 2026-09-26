"use client";

import React, { useState } from "react";
import { X, Download, Maximize2, Minimize2, Image as ImageIcon } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  imageName = "image",
}: ImagePreviewModalProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
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
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">{imageName}</span>
              {dimensions && (
                <span className="text-[10px] font-mono text-slate-400">
                  Exact Size: {dimensions.width} × {dimensions.height} px
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isZoomed ? "Fit to Screen" : "View Actual Size"}
            >
              {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <a
              href={imageUrl}
              download={imageName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Frame displaying in exact natural dimensions */}
        <div className="relative w-full max-h-[82vh] overflow-auto flex items-center justify-center p-4 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageName}
            onLoad={handleImageLoad}
            className={`transition-all duration-200 rounded-xl shadow-2xl object-contain ${
              isZoomed
                ? "max-w-none max-h-none cursor-zoom-out"
                : "max-h-[76vh] max-w-full cursor-zoom-in"
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          />
        </div>
      </div>
    </div>
  );
}

