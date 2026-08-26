"use client";

import React from "react";

export default function Badge({
  children,
  variant = "success", // success, warning, danger, info, default
  className = "",
  showDot = true,
  ...props
}) {
  const variants = {
    success: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    danger: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    default: "bg-slate-50 border-slate-200 text-slate-600",
  };

  const dots = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    default: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[15px] font-bold border ${variants[variant]} ${className}`}
      {...props}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dots[variant]}`} />}
      {children}
    </span>
  );
}
