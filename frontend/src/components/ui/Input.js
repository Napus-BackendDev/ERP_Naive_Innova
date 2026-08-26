"use client";

import React, { useRef, useEffect } from "react";

export function Input({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  className = "",
  icon: Icon,
  suffix,
  required = false,
  error = "",
  helperText = "",
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-700 tracking-wide">{label} {required && "*"}</label>}
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full h-9 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-green-500 outline-none shadow-2xs transition-all ${
            Icon ? "pl-9" : "pl-3"
          } ${suffix ? "pr-10" : "pr-3"} ${error ? "border-red-500 focus:border-red-500" : ""}`}
          {...props}
        />
        {suffix && <div className="absolute right-2.5 flex items-center">{suffix}</div>}
      </div>
      {error && <span className="text-[14px] text-red-500 font-bold">{error}</span>}
      {!error && helperText && <span className="text-[14px] text-slate-400">{helperText}</span>}
    </div>
  );
}

export function Textarea({
  label,
  placeholder = "",
  value,
  onChange,
  className = "",
  required = false,
  rows = 3,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-700 tracking-wide">{label} {required && "*"}</label>}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-xs text-slate-700 font-medium shadow-2xs transition-all resize-none"
        {...props}
      />
    </div>
  );
}

export function AutoGrowingTextarea({
  label,
  placeholder = "",
  value,
  onChange,
  className = "",
  required = false,
  minHeight = "36px",
  ...props
}) {
  const textareaRef = useRef(null);

  const adjustHeight = (element) => {
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight(textareaRef.current);
  }, [value]);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-700 tracking-wide">{label} {required && "*"}</label>}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e);
          adjustHeight(e.target);
        }}
        placeholder={placeholder}
        required={required}
        rows={1}
        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-green-500 outline-none shadow-2xs resize-none overflow-hidden"
        style={{ minHeight }}
        {...props}
      />
    </div>
  );
}
