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
  threshold = 40,
  edgeOnly = false,
  targetRef,
}: SwipeGestureOptions) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Store callbacks in refs to avoid constant listener re-binding
  const callbacksRef = useRef({
    onSwipeRight,
    onSwipeLeft,
    onSwipeDown,
    onSwipeUp,
    threshold,
    edgeOnly,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSwipeRight,
      onSwipeLeft,
      onSwipeDown,
      onSwipeUp,
      threshold,
      edgeOnly,
    };
  });

  useEffect(() => {
    const element = targetRef?.current || (typeof window !== "undefined" ? document : null);
    if (!element) return;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length !== 1) return;
      const touch = touchEvent.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: Event) => {
      if (!touchStartRef.current) return;
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length !== 1) return;

      const touch = touchEvent.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // If user is swiping horizontally, block the browser's native back/forward history navigation
      if (Math.abs(deltaX) > Math.abs(deltaY) + 5 && Math.abs(deltaX) > 15) {
        if (touchEvent.cancelable) {
          touchEvent.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (!touchStartRef.current || touchEvent.changedTouches.length !== 1) return;

      const touch = touchEvent.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const startX = touchStartRef.current.x;

      touchStartRef.current = null;

      const {
        onSwipeRight: cbRight,
        onSwipeLeft: cbLeft,
        onSwipeDown: cbDown,
        onSwipeUp: cbUp,
        threshold: tHold,
        edgeOnly: eOnly,
      } = callbacksRef.current;

      // Horizontal swipe must be larger than vertical drag
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= tHold) {
        if (deltaX > 0) {
          // Swipe Right
          if (!eOnly || startX <= 50) {
            cbRight?.();
          }
        } else {
          // Swipe Left
          cbLeft?.();
        }
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) >= tHold) {
        if (deltaY > 0) {
          // Swipe Down
          cbDown?.();
        } else {
          // Swipe Up
          cbUp?.();
        }
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [targetRef]);
}
