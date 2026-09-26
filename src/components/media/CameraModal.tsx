"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  RefreshCw,
  RotateCcw,
  Zap,
  ZapOff,
  Send,
  Moon,
  Image as ImageIcon,
  ChevronUp,
} from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, type: "image" | "file") => Promise<void>;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Video recording & mode state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_RECORD_SECONDS = 60;

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access requires HTTPS or localhost.");
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: unknown) {
      console.error("Camera error:", err);
      setCameraError(
        err instanceof Error ? err.message : "Failed to access camera stream."
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && !previewUrl) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, facingMode, previewUrl]);

  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setIsRecording(false);
    onClose();
  }, [stream, previewUrl, onClose]);

  // Handle Keyboard Escape key to close camera modal safely without touching browser history
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Touch Swipe Gesture (Swipe Down / Swipe Right to return to chat)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (
      (deltaX > 75 && Math.abs(deltaX) > Math.abs(deltaY)) ||
      (deltaY > 85 && Math.abs(deltaY) > Math.abs(deltaX))
    ) {
      handleClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture Photo Snapshot
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);

          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            setStream(null);
          }
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Start Video Recording
  const startRecordingVideo = () => {
    if (!stream) return;
    chunksRef.current = [];

    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "video/webm";
    }

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };

    recorder.start(100);
    setIsRecording(true);
    setRecordSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev >= MAX_RECORD_SECONDS - 1) {
          stopRecordingVideo();
          return MAX_RECORD_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecordingVideo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setRecordSeconds(0);
    startCamera();
  };

  const handleConfirmSend = () => {
    if (!capturedBlob) return;

    const ext = mode === "photo" ? "jpg" : "webm";
    const filename = `camera-${mode}-${Date.now()}.${ext}`;
    const mimeType =
      mode === "photo" ? "image/jpeg" : capturedBlob.type || "video/webm";

    const file = new File([capturedBlob], filename, { type: mimeType });

    // Instantly close camera modal
    handleClose();

    // Process media send in the background
    onCapture(file, mode === "photo" ? "image" : "file");
  };

  // Handle Gallery Selection inside Camera Screen
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");

    // Instantly close camera modal
    handleClose();

    // Process media send in the background
    onCapture(file, isVideo ? "file" : "image");

    if (e.target) e.target.value = "";
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  const progressPercent = (recordSeconds / MAX_RECORD_SECONDS) * 100;
  const strokeDashoffset = 251.2 - (251.2 * progressPercent) / 100;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 bg-black animate-fade-in select-none"
    >
      {/* Hidden File Input for Gallery Picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleGallerySelect}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full bg-black flex flex-col justify-between overflow-hidden"
      >
        {/* Top Header Overlay Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Close Button (Left) */}
          <button
            onClick={handleClose}
            type="button"
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center border border-white/10 transition-transform active:scale-90"
            aria-label="Close Camera"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recording Timer Badge (Center Top) */}
          {isRecording && (
            <div className="px-4 py-1 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg animate-pulse border border-rose-400/50">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{formatTimer(recordSeconds)}</span>
            </div>
          )}

          {/* Right Action Icons (Night mode & Flash) */}
          <div className="flex items-center gap-3">
            {!previewUrl && (
              <>
                {/* Night Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setNightMode(!nightMode)}
                  className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-transform active:scale-90 ${
                    nightMode
                      ? "bg-indigo-600/90 text-white border-indigo-400"
                      : "bg-black/40 hover:bg-black/60 text-white"
                  }`}
                  title="Night Mode"
                >
                  <Moon className="w-4 h-4" />
                </button>

                {/* Flash Toggle */}
                <button
                  type="button"
                  onClick={() => setFlashEnabled(!flashEnabled)}
                  className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-transform active:scale-90 ${
                    flashEnabled
                      ? "bg-yellow-400 text-black border-yellow-300"
                      : "bg-black/40 hover:bg-black/60 text-white"
                  }`}
                  title="Flash toggle"
                >
                  {flashEnabled ? (
                    <Zap className="w-4 h-4 fill-black" />
                  ) : (
                    <ZapOff className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Camera Viewfinder in Screen Aspect Ratio */}
        <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-8 text-center text-rose-400 space-y-3 max-w-xs">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-300">
                <X className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold">{cameraError}</p>
              <p className="text-xs text-slate-400">
                Ensure camera permissions are granted.
              </p>
            </div>
          ) : previewUrl ? (
            mode === "photo" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Captured preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === "user" ? "-scale-x-100" : ""
              } ${nightMode ? "brightness-125 contrast-110" : ""}`}
            />
          )}

          {/* Flash Simulator Overlay */}
          {flashEnabled && !previewUrl && (
            <div className="absolute inset-0 bg-white/10 pointer-events-none transition-opacity" />
          )}
        </div>

        {/* Bottom Control Bar (Matching Reference Image) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-30 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {previewUrl ? (
            /* Post-Capture Review Actions */
            <div className="w-full max-w-md flex items-center justify-between gap-4 px-4 pb-2">
              <button
                type="button"
                onClick={retake}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-transform active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span>{isSending ? "Sending..." : "Send Media"}</span>
                <Send className="w-4 h-4 fill-white" />
              </button>
            </div>
          ) : (
            /* Live Camera Capture Controls */
            <div className="w-full max-w-md flex flex-col items-center gap-3">
              {/* Chevron Up Indicator */}
              <div className="text-white/60 animate-bounce">
                <ChevronUp className="w-4 h-4" />
              </div>

              {/* Main Controls Row (Gallery | Shutter | Flip) */}
              <div className="w-full flex items-center justify-between px-6">
                {/* Gallery Picker (Left) */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center border border-white/15 transition-transform active:scale-90"
                  title="Choose from Gallery"
                >
                  <ImageIcon className="w-5 h-5 text-white/90" />
                </button>

                {/* Shutter Button (Center) */}
                <div className="relative flex items-center justify-center">
                  {isRecording && (
                    <svg className="absolute w-24 h-24 transform -rotate-90 pointer-events-none">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#ef4444"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 ease-linear"
                      />
                    </svg>
                  )}

                  {mode === "photo" ? (
                    <button
                      type="button"
                      onClick={takePhoto}
                      disabled={Boolean(cameraError)}
                      className="w-20 h-20 rounded-full border-4 border-white bg-transparent p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group shadow-2xl"
                      title="Take Photo"
                    >
                      <div className="w-full h-full rounded-full bg-white group-hover:bg-slate-200 transition-colors shadow-inner" />
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecordingVideo}
                      className="w-20 h-20 rounded-full border-4 border-rose-500 bg-transparent p-2 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl animate-pulse"
                      title="Stop Recording"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500 shadow-md" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecordingVideo}
                      disabled={Boolean(cameraError)}
                      className="w-20 h-20 rounded-full border-4 border-white bg-transparent p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group shadow-2xl"
                      title="Start Recording Video"
                    >
                      <div className="w-full h-full rounded-full bg-rose-500 group-hover:bg-rose-400 transition-colors shadow-inner" />
                    </button>
                  )}
                </div>

                {/* Camera Flip Button (Right) */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center border border-white/15 transition-transform active:scale-90"
                  title="Flip Camera"
                >
                  <RefreshCw className="w-5 h-5 text-white/90" />
                </button>
              </div>

              {/* Mode Switcher Pill Slider (Video | Photo) */}
              <div className="flex items-center justify-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setMode("video")}
                  disabled={isRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    mode === "video"
                      ? "bg-slate-800 text-white shadow-md border border-white/10"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  disabled={isRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    mode === "photo"
                      ? "bg-slate-800 text-white shadow-md border border-white/10"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Photo
                </button>
              </div>

              {/* Home Indicator Bar */}
              <div className="w-32 h-1 rounded-full bg-white/70 mt-2" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


