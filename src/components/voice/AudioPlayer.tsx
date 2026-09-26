"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, AlertCircle, Download } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOwn?: boolean;
}

export function AudioPlayer({ src, duration: initialDuration, isOwn }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setHasError(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if ((!duration || duration === 0) && audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.warn("Audio element error for src:", src);
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [src, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.error("Playback error:", err);
          setHasError(true);
        });
    }
  };

  const handleSpeedToggle = () => {
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatSeconds = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  const effectiveDuration = duration > 0 ? duration : Math.max(currentTime, 1);
  const progressPercent = Math.min((currentTime / effectiveDuration) * 100, 100);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl w-full max-w-[280px] ${
          isOwn
            ? "bg-primary-foreground/15 text-white"
            : "bg-secondary/80 text-foreground border border-border/60"
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Voice message error</span>
        </div>
        <a
          href={src}
          download="voice-note.webm"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold flex items-center gap-1 transition-colors"
          title="Download voice note"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl w-full max-w-[280px] sm:max-w-xs ${
        isOwn
          ? "bg-primary-foreground/15 text-white"
          : "bg-secondary/80 text-foreground border border-border/60"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        type="button"
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
          isOwn
            ? "bg-white text-primary"
            : "bg-primary text-primary-foreground"
        }`}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Scrub & Waveform */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 overflow-hidden">
        <div className="relative w-full h-2 rounded-full bg-slate-500/30 overflow-hidden flex items-center">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              isOwn ? "bg-white" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Timers & Speed control */}
        <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
          <span>{formatSeconds(currentTime)}</span>
          <button
            onClick={handleSpeedToggle}
            type="button"
            className="px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 text-[9px] font-bold tracking-tight"
          >
            {playbackRate}x
          </button>
          <span>{formatSeconds(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  );
}
