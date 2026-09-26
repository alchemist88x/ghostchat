"use client";

import { useEffect, useRef } from "react";

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
  edgeOnly?: boolean;
  targetRef?: React.RefObject<HTMLElement | null>;
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  onSwipeDown,
  onSwipeUp,
  threshold = 50,
  edgeOnly = false,
  targetRef,
}: SwipeGestureOptions) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = targetRef?.current || (typeof window !== "undefined" ? document : null);
    if (!element) return;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length !== 1) return;
      const touch = touchEvent.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (!touchStartRef.current || touchEvent.changedTouches.length !== 1) return;
      const touch = touchEvent.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const startX = touchStartRef.current.x;

      touchStartRef.current = null;

      // Horizontal swipe must be significantly larger than vertical drag
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= threshold) {
        if (deltaX > 0) {
          // Swipe Right
          if (!edgeOnly || startX <= 50) {
            onSwipeRight?.();
          }
        } else {
          // Swipe Left
          onSwipeLeft?.();
        }
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) >= threshold) {
        if (deltaY > 0) {
          // Swipe Down
          onSwipeDown?.();
        } else {
          // Swipe Up
          onSwipeUp?.();
        }
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, onSwipeDown, onSwipeUp, threshold, edgeOnly, targetRef]);
}
