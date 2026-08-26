"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { subscribePending } from "@/lib/pendingRequests";

/**
 * App-wide "the server is working on it" feedback: a progress bar pinned to the
 * top of the window plus a small pill in the corner, shown whenever any API
 * request is in flight.
 *
 * This is the safety net for EVERY button — including ones with no spinner of
 * their own. On a slow connection a click used to produce no visible change at
 * all, so operators pressed it repeatedly and fired duplicate writes.
 */
export default function GlobalLoadingBar() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let showTimer = null;
    let hideTimer = null;

    const unsubscribe = subscribePending((pending) => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      if (pending > 0) {
        // 150ms grace: fast local calls finish before this fires, so the bar does
        // not strobe on every keystroke-triggered autosave.
        showTimer = setTimeout(() => setBusy(true), 150);
      } else {
        // Small tail so the bar is actually perceivable on quick responses.
        hideTimer = setTimeout(() => setBusy(false), 200);
      }
    });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      unsubscribe();
    };
  }, []);

  if (!busy) return null;

  return (
    <>
      {/* Top progress bar. aria-hidden: the pill below carries the announcement. */}
      <div aria-hidden className="fixed top-0 left-0 right-0 h-0.5 z-[200] bg-green-100 overflow-hidden pointer-events-none">
        <div className="h-full w-1/3 bg-green-600 animate-[loadingbar_1.1s_ease-in-out_infinite]" />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-full bg-slate-900/90 text-white px-3.5 py-2 shadow-lg pointer-events-none select-none"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[15px] font-bold">กำลังโหลด...</span>
      </div>

      <style jsx global>{`
        @keyframes loadingbar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </>
  );
}
