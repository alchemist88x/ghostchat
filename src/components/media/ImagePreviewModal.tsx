"use client";

import React from "react";
import { X, Download } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
      >
        {/* Controls */}
        <div className="absolute top-[-44px] right-0 flex items-center gap-2">
          <a
            href={imageUrl}
            download={imageName}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageName}
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
