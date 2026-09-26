"use client";

import React, { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("ghostchat-theme") as "dark" | "light" | null;
  return stored || "dark";
}

function getServerSnapshot(): "dark" | "light" {
  return "dark";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("ghostchat-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    // Trigger storage event so all components sync
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle color theme"
      className={`p-2 rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-500 bg-slate-900/60 dark:bg-slate-800/60 text-slate-300 hover:text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-400 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
