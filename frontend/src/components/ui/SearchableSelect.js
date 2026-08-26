"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export default function SearchableSelect({
  label,
  options = [], // [{ value, label }]
  value,
  onChange,
  placeholder = "เลือก...",
  searchable = true,
  prefix = "",
  className = "",
  required = false,
  error = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative w-full text-left flex flex-col gap-1.5 ${className}`} ref={dropdownRef}>
      {label && <label className="text-xs font-bold text-slate-700 tracking-wide">{label} {required && "*"}</label>}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch("");
          }}
          className={`w-full h-9 px-3 bg-white border rounded-lg outline-none text-xs text-slate-700 cursor-pointer flex justify-between items-center font-bold transition-all shadow-2xs hover:bg-slate-50/50 ${
            isOpen ? "border-green-600 ring-2 ring-green-50" : "border-slate-200"
          } ${error ? "border-red-500" : ""}`}
        >
          <span className="truncate flex items-center gap-1">
            {prefix && <span className="text-slate-400 font-bold">{prefix}:</span>}
            <span className="font-extrabold text-slate-800">{selectedOption ? selectedOption.label : placeholder}</span>
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-green-600" : ""}`} />
        </div>

        {isOpen && (
          <div className="absolute left-0 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/80 z-50 overflow-hidden max-h-64 flex flex-col min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-100">
            {searchable && (
              <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา..."
                  className="w-full bg-transparent text-xs outline-none text-slate-700 font-semibold"
                />
              </div>
            )}
            <div className="overflow-y-auto flex-1 py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-400 italic text-center">ไม่พบผลลัพธ์</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  if (opt.disabled) {
                    return (
                      <div
                        key={`${opt.value}-${idx}`}
                        className="px-3 py-1 text-[14px] font-black text-slate-400 bg-slate-50 uppercase tracking-wider border-y border-slate-100/50 pointer-events-none"
                      >
                        {opt.label}
                      </div>
                    );
                  }
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`px-3 py-2 text-xs cursor-pointer flex justify-between items-center font-semibold hover:bg-slate-50 transition-colors gap-2 ${
                        isSelected ? "text-green-600 bg-green-50/50" : "text-slate-600"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {opt.badge && (
                          <span className={`text-[14px] px-2 py-0.5 rounded-md font-mono font-black border shrink-0 ${
                            opt.badgeColor || "bg-emerald-50 text-emerald-700 border-emerald-300"
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-[14px] text-red-500 font-bold">{error}</span>}
    </div>
  );
}
