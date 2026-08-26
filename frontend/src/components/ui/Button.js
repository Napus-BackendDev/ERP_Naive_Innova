"use client";

import React, { useState, useRef, useEffect } from "react";

export default function Button({
  children,
  type = "button",
  variant = "primary", // primary, secondary, danger, outline, text
  size = "md", // sm, md, lg
  className = "",
  disabled = false,
  isLoading = false,
  onClick,
  icon: Icon,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center gap-1.5 font-bold transition-all duration-200 rounded-xl outline-none active:scale-95";
  
  const variants = {
    primary: "bg-green-600 hover:bg-green-700 text-white shadow-xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed disabled:active:scale-100",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    dangerHover: "text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-red-600 cursor-pointer transition-all duration-75 border border-transparent hover:border-red-600 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:active:scale-100", // Special delete style
    outline: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    text: "text-slate-500 hover:text-slate-700 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-[15px]",
    md: "px-4 py-2.5 text-xs",
    lg: "px-5 py-3 text-sm",
  };

  // Auto-spinner: when onClick returns a promise (i.e. it awaits the server), the
  // button shows a spinner and disables itself until it settles — no isLoading
  // state needed at the call site. On a slow connection a click otherwise looked
  // like nothing happened, and operators clicked again, sending duplicate writes.
  // Passing isLoading explicitly still forces the state on.
  const [autoBusy, setAutoBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const handleClick = async (e) => {
    if (!onClick) return;
    const result = onClick(e);
    if (!result || typeof result.then !== "function") return; // sync handler
    setAutoBusy(true);
    try {
      await result;
    } finally {
      // The click may unmount this button (closing a modal, moving a card);
      // setting state then would warn and leak.
      if (alive.current) setAutoBusy(false);
    }
  };

  const busy = isLoading || autoBusy;

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {busy && (
        <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!busy && Icon && <Icon className="h-4.5 w-4.5 shrink-0" />}
      {children}
    </button>
  );
}
