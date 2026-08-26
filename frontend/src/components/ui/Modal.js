"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  size = "md", // sm, md, lg, xl, 2xl
  heightClass = "", // e.g. "h-[600px]"
  footer,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <>
      {/* Clickaway backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Centered modal container */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        {/* On a phone the panel docks to the bottom edge, square-cornered and
            full width; from sm up it is the centred card it always was.
            heightClass is applied from sm only — a fixed pixel height taller
            than the phone's usable area buries the footer buttons. */}
        <div className={`bg-white w-full ${sizes[size]} rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[92dvh] sm:max-h-[90vh] ${heightClass ? `sm:${heightClass}` : ""}`}>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center gap-3 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
              {Icon && <Icon className="h-4.5 w-4.5 text-green-600 shrink-0" />}
              <span className="truncate">{title}</span>
            </h3>
            <button
              onClick={onClose}
              aria-label="ปิด"
              className="shrink-0 -mr-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer outline-none transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 min-h-0">
            {children}
          </div>

          {/* Optional Footer — pinned, and padded past the phone's home bar. */}
          {footer && (
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
