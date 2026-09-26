"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Sparkles, Share, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function triggerPwaInstall() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ghostchat_trigger_install_pwa"));
  }
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 2. Detect if app is already running in standalone PWA mode
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone)
    ) {
      setIsInstalled(true);
      return;
    }

    // 3. Detect iOS Safari
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent;
      const isIosDevice = /iphone|ipad|ipod/i.test(ua);
      setIsIos(isIosDevice);
    }

    // 4. Listen for native browser PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem("ghostchat_pwa_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    // 5. Custom event listener for manual trigger (e.g. from Sidebar or Settings button)
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        setShowBanner(true);
        handleInstallClick();
      } else if (isIos) {
        setShowIosModal(true);
      } else {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("ghostchat_trigger_install_pwa", handleManualTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("ghostchat_trigger_install_pwa", handleManualTrigger);
    };
  }, [deferredPrompt, isIos]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setShowBanner(false);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowBanner(false);
      setShowIosModal(true);
    } else {
      // Show generic instructions if prompt unavailable
      alert("To install GhostChat as a web app on your phone, open your browser menu and select 'Add to Home screen' or 'Install App'.");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("ghostchat_pwa_dismissed", "true");
  };

  if (isInstalled) return null;

  return (
    <>
      {/* 1. Floating Banner Prompt */}
      {showBanner && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-fade-in pointer-events-auto">
          <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Install GhostChat App</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                    Web App
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  Add to home screen for native full-screen chat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS Safari Step-by-Step Installation Modal */}
      {showIosModal && (
        <div
          onClick={() => setShowIosModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center text-white space-y-5 shadow-2xl relative"
          >
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Install GhostChat on iOS</h3>
              <p className="text-xs text-slate-400">
                Install as a native full-screen app on your iPhone or iPad home screen in 2 quick steps:
              </p>
            </div>

            <div className="space-y-3 text-left bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span>Tap the</span>
                  <span className="p-1 rounded bg-slate-800 text-indigo-400 font-bold inline-flex items-center gap-1">
                    <Share className="w-3.5 h-3.5 inline" /> Share
                  </span>
                  <span>icon in Safari toolbar</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span>Scroll down & tap</span>
                  <span className="p-1 rounded bg-slate-800 text-indigo-400 font-bold inline-flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

