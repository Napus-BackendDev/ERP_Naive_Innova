"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Light/dark switcher. The initial class on <html> is set by the inline
// no-FOUC script in app/layout.js; this component only reads/toggles it.
// No stored preference → follow the OS theme (and live-track OS changes);
// clicking the button pins an explicit choice in localStorage.
export default function ThemeToggle({ className = "" }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const fadeTimer = useRef(null);

  // Flip the class with a smooth crossfade: View Transitions API where the
  // browser has it, otherwise a temporary .theme-fade class (see globals.css)
  // that tweens colors for the duration of the switch only.
  const applyTheme = (isDark) => {
    const root = document.documentElement;
    const flip = () => root.classList.toggle("dark", isDark);
    if (document.startViewTransition) {
      document.startViewTransition(flip);
    } else {
      root.classList.add("theme-fade");
      flip();
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => root.classList.remove("theme-fade"), 400);
    }
    setDark(isDark);
  };

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (e) => {
      if (localStorage.getItem("theme")) return; // user pinned a choice
      applyTheme(e.matches);
    };
    mq.addEventListener("change", onSystemChange);
    return () => {
      mq.removeEventListener("change", onSystemChange);
      clearTimeout(fadeTimer.current);
    };
  }, []);

  const toggle = () => {
    const next = !dark;
    applyTheme(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) { /* private mode — theme just won't persist */ }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      aria-label="สลับธีมสว่าง/มืด"
      className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer border border-transparent ${className}`}
    >
      {/* render nothing theme-specific until mounted — avoids hydration mismatch */}
      {mounted && dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
