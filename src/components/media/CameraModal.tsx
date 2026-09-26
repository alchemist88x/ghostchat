"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Camera,
  Video,
  StopCircle,
  RefreshCw,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, type: "image" | "file") => Promise<void>;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        video: { facingMode },
        audio: mode === "video",
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: unknown) {
      console.error("Camera error:", err);
      setCameraError(err instanceof Error ? err.message : "Failed to access camera.");
    }
  }, [facingMode, mode, stream]);

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
  }, [isOpen, facingMode, mode]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setIsRecording(false);
    onClose();
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

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
      }
    }, "image/jpeg", 0.92);
  };

  // Start Video Recording
  const startRecordingVideo = () => {
    if (!stream) return;
    chunksRef.current = [];

    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
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
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingVideo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleConfirmSend = async () => {
    if (!capturedBlob) return;

    try {
      setIsSending(true);
      const ext = mode === "photo" ? "jpg" : "webm";
      const filename = `camera-${mode}-${Date.now()}.${ext}`;
      const mimeType = mode === "photo" ? "image/jpeg" : capturedBlob.type || "video/webm";

      const file = new File([capturedBlob], filename, { type: mimeType });
      await onCapture(file, mode === "photo" ? "image" : "file");
      handleClose();
    } catch (err) {
      console.error("Failed to send captured media:", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-card border border-border/80 shadow-2xl p-4 flex flex-col gap-4 text-center overflow-hidden"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Camera className="w-4 h-4 text-primary" />
            <span>Camera Capture</span>
          </div>

          <div className="flex items-center gap-2">
            {!previewUrl && (
              <button
                onClick={toggleFacingMode}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-black overflow-hidden flex items-center justify-center shadow-inner">
          {cameraError ? (
            <div className="p-6 text-center text-xs text-rose-400 space-y-2">
              <p className="font-bold">{cameraError}</p>
              <p className="text-[11px] opacity-80">
                Ensure camera permissions are granted and you are using HTTPS or localhost:3000.
              </p>
            </div>
          ) : previewUrl ? (
            mode === "photo" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Camera capture" className="w-full h-full object-cover" />
            ) : (
              <video src={previewUrl} controls autoPlay className="w-full h-full object-cover" />
            )
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
            />
          )}

          {/* Live Recording Badge Overlay */}
          {isRecording && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-500/90 text-white text-xs font-bold font-mono flex items-center gap-2 shadow-lg animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>{formatTimer(recordSeconds)}</span>
            </div>
          )}
        </div>

        {/* Mode Selector & Action Buttons */}
        {previewUrl ? (
          /* Preview Confirmation Actions */
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={retake}
              disabled={isSending}
              className="flex-1 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake</span>
            </button>

            <button
              onClick={handleConfirmSend}
              disabled={isSending}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSending ? "Attaching..." : "Use Media"}</span>
            </button>
          </div>
        ) : (
          /* Live Viewfinder Actions */
          <div className="space-y-3 pt-1">
            {/* Mode Switch Tabs */}
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setMode("photo")}
                disabled={isRecording}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === "photo"
                    ? "bg-primary text-white shadow-md"
                    : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                Photo
              </button>
              <button
                type="button"
                onClick={() => setMode("video")}
                disabled={isRecording}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === "video"
                    ? "bg-primary text-white shadow-md"
                    : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                Video
              </button>
            </div>

            {/* Trigger Button */}
            <div className="flex items-center justify-center">
              {mode === "photo" ? (
                <button
                  onClick={takePhoto}
                  disabled={Boolean(cameraError)}
                  className="w-16 h-16 rounded-full border-4 border-white bg-primary text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  title="Take photo snapshot"
                >
                  <Camera className="w-7 h-7" />
                </button>
              ) : isRecording ? (
                <button
                  onClick={stopRecordingVideo}
                  className="w-16 h-16 rounded-full border-4 border-white bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all animate-bounce"
                  title="Stop recording"
                >
                  <StopCircle className="w-8 h-8" />
                </button>
              ) : (
                <button
                  onClick={startRecordingVideo}
                  disabled={Boolean(cameraError)}
                  className="w-16 h-16 rounded-full border-4 border-white bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  title="Start video recording"
                >
                  <Video className="w-7 h-7" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
