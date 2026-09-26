"use client";

import { useState, useCallback } from "react";
import { IAttachment, MessageType } from "@/types";

export interface UploadProgress {
  originalName: string;
  percent: number;
  status: "idle" | "uploading" | "completed" | "error";
  error?: string;
}

export function useUpload(chatId: string) {
  const [progress, setProgress] = useState<UploadProgress>({
    originalName: "",
    percent: 0,
    status: "idle",
  });

  const uploadFile = useCallback(
    async (
      file: File | Blob,
      options: {
        type: MessageType;
        originalName?: string;
        mimeType?: string;
        duration?: number;
      }
    ): Promise<IAttachment | null> => {
      const originalName =
        options.originalName ||
        (file instanceof File ? file.name : `voice-note-${Date.now()}.webm`);

      setProgress({
        originalName,
        percent: 15,
        status: "uploading",
      });

      try {
        const formData = new FormData();
        formData.append("file", file, originalName);
        formData.append("chatId", chatId);
        formData.append("type", options.type);
        formData.append("originalName", originalName);
        if (options.duration) {
          formData.append("duration", options.duration.toString());
        }

        const attachment = await new Promise<IAttachment>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/uploads/direct", true);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.min(Math.round((e.loaded / e.total) * 85) + 10, 95);
              setProgress({
                originalName,
                percent,
                status: "uploading",
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.success && res.attachment) {
                  resolve(res.attachment);
                } else {
                  reject(new Error(res.error || "Upload failed"));
                }
              } catch (e) {
                reject(new Error("Invalid response from server"));
              }
            } else {
              try {
                const res = JSON.parse(xhr.responseText);
                reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network error during file upload"));
          xhr.send(formData);
        });

        setProgress({
          originalName,
          percent: 100,
          status: "completed",
        });

        return attachment;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        console.error("Upload error:", errorMsg);
        setProgress({
          originalName,
          percent: 0,
          status: "error",
          error: errorMsg,
        });
        return null;
      }
    },
    [chatId]
  );

  const resetProgress = useCallback(() => {
    setProgress({ originalName: "", percent: 0, status: "idle" });
  }, []);

  return {
    uploadFile,
    progress,
    resetProgress,
  };
}
