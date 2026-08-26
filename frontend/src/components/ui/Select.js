"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export default function Select({
  label,
  value,
  onChange,
  options = [], // array of { value, label } or strings
  placeholder = "",
  className = "",
  icon: Icon,
  required = false,
  error = "",
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-700 tracking-wide">{label} {required && "*"}</label>}
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />}
        <select
          value={value}
          onChange={onChange}
          className={`w-full h-9 pr-8 bg-white border rounded-lg text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer transition-colors shadow-2xs ${
            error ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-green-500"
          } ${
            Icon ? "pl-9" : "pl-3"
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === "object" ? opt.value : opt;
            const lbl = typeof opt === "object" ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      </div>
      {error && <span className="text-[14px] text-red-500 font-bold">{error}</span>}
    </div>
  );
}
