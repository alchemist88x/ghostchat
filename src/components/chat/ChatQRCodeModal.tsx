"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Download, Copy, Check, Share2 } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  chatName?: string;
}

export function ChatQRCodeModal({ isOpen, onClose, url, chatName }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ghostchat-qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: chatName || "Join my WhatsApp Messenger Chat",
          text: "Join my temporary private WhatsApp Messenger chat:",
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-6 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-foreground mb-1">Scan to Join</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Anyone with this QR code can join anonymously
        </p>

        {/* QR Code Container */}
        <div className="p-4 rounded-2xl bg-white shadow-inner flex items-center justify-center mb-6">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Chat invitation QR code" className="w-56 h-56 rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400">
              Generating QR...
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            onClick={handleCopy}
            type="button"
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 mb-1" /> : <Copy className="w-4 h-4 mb-1" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownload}
            type="button"
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 mb-1" />
            <span>Save</span>
          </button>

          <button
            onClick={handleShare}
            type="button"
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-md shadow-primary/20"
          >
            <Share2 className="w-4 h-4 mb-1" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
