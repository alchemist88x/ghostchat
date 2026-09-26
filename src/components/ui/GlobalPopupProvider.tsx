"use client";

import React, { useEffect, useState } from "react";
import { CustomModal, ModalType } from "./CustomModal";
import { CustomToast, ToastMessage } from "./CustomToast";

export function GlobalPopupProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: ModalType;
    onConfirm?: () => void;
  } | null>(null);

  const [toastState, setToastState] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Override native window.alert globally
    const nativeAlert = window.alert;
    window.alert = (msg?: unknown) => {
      const text = String(msg || "");
      setModalState({
        isOpen: true,
        title: "Notification",
        description: text,
        type: "warning",
      });
    };

    // Override native window.confirm globally
    const nativeConfirm = window.confirm;
    window.confirm = (msg?: unknown) => {
      const text = String(msg || "");
      setModalState({
        isOpen: true,
        title: "Confirm Action",
        description: text,
        type: "confirm",
      });
      return false; // Non-blocking async pattern
    };

    // Custom event listeners
    const handleCustomAlert = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setModalState({
          isOpen: true,
          title: detail.title || "Notice",
          description: detail.description || String(detail),
          type: detail.type || "info",
          onConfirm: detail.onConfirm,
        });
      }
    };

    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setToastState({
          id: Date.now().toString(),
          type: detail.type || "info",
          text: detail.text || String(detail),
        });
      }
    };

    window.addEventListener("ghostchat:alert", handleCustomAlert);
    window.addEventListener("ghostchat:toast", handleCustomToast);

    return () => {
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
      window.removeEventListener("ghostchat:alert", handleCustomAlert);
      window.removeEventListener("ghostchat:toast", handleCustomToast);
    };
  }, []);

  return (
    <>
      {children}

      {/* Global Custom Modal Override */}
      {modalState && (
        <CustomModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          title={modalState.title}
          description={modalState.description}
          type={modalState.type}
          confirmText="OK"
          onConfirm={() => {
            if (modalState.onConfirm) modalState.onConfirm();
            setModalState(null);
          }}
        />
      )}

      {/* Global Custom Toast Notification */}
      <CustomToast toast={toastState} onDismiss={() => setToastState(null)} />
    </>
  );
}
