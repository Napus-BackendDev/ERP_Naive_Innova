"use client";

import React from "react";
import { Star } from "lucide-react";

// One star per completed order (Final QC → handover). Capped at three drawn
// stars because a card is only so wide; beyond that the extra rounds are shown
// as "+N", so a 6-time buyer reads ★★★ +3 instead of six icons pushing the
// customer's name out of the card.
export const MAX_STARS = 3;

export function loyaltyCount(lead) {
  const n = Number(lead?.completedOrderCount);
  if (Number.isFinite(n) && n > 0) return n;
  // Records created before the counter existed only carry the old boolean.
  return lead?.isReturningCustomer ? 1 : 0;
}

export default function LoyaltyStars({ lead, size = "sm", className = "" }) {
  const count = loyaltyCount(lead);
  if (count < 1) return null;

  const drawn = Math.min(count, MAX_STARS);
  const extra = count - MAX_STARS;
  const star = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex items-center gap-px shrink-0 ${className}`}
      title={`ลูกค้าเก่า — สั่งผลิตจนจบแล้ว ${count} ครั้ง`}
    >
      {Array.from({ length: drawn }).map((_, i) => (
        <Star key={i} className={`${star} text-yellow-500 fill-yellow-400`} />
      ))}
      {extra > 0 && (
        <span className="ml-0.5 text-[13px] font-black text-yellow-600 leading-none">+{extra}</span>
      )}
    </span>
  );
}
