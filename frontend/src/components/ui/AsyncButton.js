"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * A drop-in replacement for a plain <button> whose onClick awaits the server.
 *
 * Keeps whatever className the call site already had (so the existing look is
 * untouched) but, while the promise is pending, swaps the leading content for a
 * spinner and disables the button. Purely presentational buttons should stay as
 * plain <button>; this is for the ones that write to the API.
 *
 * Why: on a slow shop-floor connection a click produced no visible change until
 * the response landed, so operators pressed the button again and duplicate
 * writes went through.
 *
 * Props beyond a normal button:
 *   busyText  optional label shown while pending (defaults to children)
 */
export default function AsyncButton({
  onClick,
  children,
  busyText,
  className = "",
  disabled = false,
  type = "button",
  ...props
}) {
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const handleClick = async (e) => {
    if (busy || !onClick) return; // second click while in flight = ignored
    const result = onClick(e);
    if (!result || typeof result.then !== "function") return; // sync handler
    setBusy(true);
    try {
      await result;
    } finally {
      // The click often unmounts this button (card leaves the stage, modal
      // closes); setting state afterwards would warn and leak.
      if (alive.current) setBusy(false);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={`${className} ${busy ? "opacity-70 cursor-wait" : ""}`}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>{busyText || "กำลังทำงาน..."}</span>
        </>
      ) : children}
    </button>
  );
}
