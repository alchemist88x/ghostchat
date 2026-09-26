"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface VoiceRecorderState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  hasPermission: boolean | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  resetRecording: () => void;
}

export function useVoiceRecorder(): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      // navigator.mediaDevices requires a secure context (HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isInsecure = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost";
        const hint = isInsecure
          ? "Voice recording requires HTTPS. Try accessing via localhost:3000 or deploy to a secure host."
          : "Your browser does not support audio recording.";
        console.warn("Voice recording unavailable:", hint);
        setHasPermission(false);
        return;
      }

      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      // Determine supported mime type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        // Stop media tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100); // 100ms chunking
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied or unsupported:", err);
      setHasPermission(false);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setRecordingDuration(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);
  }, [audioUrl]);

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  };
}
