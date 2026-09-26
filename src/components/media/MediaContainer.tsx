"use client";

import React, { useState } from "react";
import { Play, RotateCcw, AlertTriangle, Check, CheckCheck, Clock, Film } from "lucide-react";
import { IAttachment, MessageType } from "@/types";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface MediaContainerProps {
  type: MessageType;
  url: string;
  attachment?: IAttachment;
  uploadStatus?: "compressing" | "uploading" | "sent" | "failed";
  uploadProgress?: number; // 0 to 100
  blurDataUrl?: string;
  aspectRatio?: number;
  isOwn?: boolean;
  onRetry?: () => void;
}

export function MediaContainer({
  type,
  url,
  attachment,
  uploadStatus = "sent",
  uploadProgress = 100,
  blurDataUrl,
  aspectRatio = 16 / 9,
  isOwn = false,
  onRetry,
}: MediaContainerProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const isVideo = type === "video" || attachment?.type === "video" || url.endsWith(".mp4") || url.endsWith(".webm");
  const isImage = type === "image" || attachment?.type === "image";

  const isUploading = uploadStatus === "uploading";
  const isCompressing = uploadStatus === "compressing";
  const isFailed = uploadStatus === "failed";
  const isSent = uploadStatus === "sent";

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:15";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleContainerClick = () => {
    if (isFailed && onRetry) {
      onRetry();
      return;
    }

    if (isUploading || isCompressing) return;

    if (isVideo) {
      setShowVideoModal(true);
    } else if (isImage) {
      setShowImageModal(true);
    }
  };

  return (
    <>
      <div
        onClick={handleContainerClick}
        className={`relative w-[190px] xs:w-[210px] sm:w-[230px] h-[130px] xs:h-[142px] sm:h-[155px] rounded-2xl overflow-hidden cursor-pointer group bg-slate-900 shadow-sm transition-all flex-shrink-0 ${
          isFailed ? "ring-2 ring-red-500/50" : ""
        }`}
      >
        {/* Phase 2: Blurry Placeholder / Shimmer / Base64 thumbnail */}
        {(blurDataUrl || attachment?.blurDataUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blurDataUrl || attachment?.blurDataUrl}
            alt="Blur placeholder"
            className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110 opacity-70"
          />
        )}

        {/* Actual Image / Video Preview */}
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment?.originalName || "Media preview"}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCompressing || isUploading ? "opacity-40" : "opacity-100 group-hover:scale-102"
            }`}
          />
        )}

        {isVideo && (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-950/80">
            <video
              src={url}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCompressing || isUploading ? "opacity-30" : "opacity-90"
              }`}
            />
          </div>
        )}

        {/* Phase 3 & Large File Handling: Circular Progress Overlay or Compressing */}
        {(isCompressing || isUploading) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white">
            {/* Compressing State */}
            {isCompressing ? (
              <div className="flex flex-col items-center space-y-2 animate-pulse">
                <Film className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-xs font-bold text-amber-300 tracking-wide">
                  Compressing Video...
                </span>
                <span className="text-[10px] text-slate-300">Optimizing resolution & ratio</span>
              </div>
            ) : (
              /* Uploading State with Circular Percentage Spinner */
              <div className="flex flex-col items-center space-y-1.5">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-white/20"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 - (125.6 * (uploadProgress || 0)) / 100}
                      className="text-indigo-400 transition-all duration-200"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-extrabold text-white">
                    {Math.round(uploadProgress || 0)}%
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-200">Transferring...</span>
              </div>
            )}
          </div>
        )}

        {/* Phase 3 Special State: Failed Upload Overlay with Retry */}
        {isFailed && (
          <div className="absolute inset-0 bg-red-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white space-y-2">
            <div className="w-10 h-10 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-red-200">Upload Failed</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onRetry) onRetry();
              }}
              className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Sending</span>
            </button>
          </div>
        )}

        {/* Video Play Button Graphic (Center, dimmed when sending) */}
        {isVideo && !isCompressing && !isUploading && !isFailed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Video Duration Badge (Bottom Right) */}
        {isVideo && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white flex items-center gap-1 border border-white/10">
            <span>{formatDuration(attachment?.duration)}</span>
          </div>
        )}

        {/* Phase 4 & 5 Status Indicator Overlay for Media */}
        {isOwn && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white flex items-center gap-1 border border-white/10">
            {isCompressing || isUploading ? (
              <>
                <Clock className="w-3 h-3 text-slate-300 animate-spin" />
                <span>Uploading</span>
              </>
            ) : isFailed ? (
              <span className="text-red-400 font-bold">Failed</span>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sent</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Video Modal Player */}
      {showVideoModal && (
        <VideoPlayerModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={url}
          title={attachment?.originalName || "Shared Video"}
        />
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <ImagePreviewModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={url}
        />
      )}
    </>
  );
}
