"use client";

import React from "react";

export default function Card({
  children,
  className = "",
  hoverable = false,
  padding = "p-4",
  ...props
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${padding} ${
        hoverable ? "hover:border-slate-300 transition-colors duration-200" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
