"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Loader2 } from "lucide-react";

/**
 * A select-and-create combobox. Lists existing master-data options (each an
 * entity with its own _id) and lets the user create a new one inline by typing
 * a name and confirming. The parent links by ObjectId via the selected option.
 *
 * Props:
 *  - options:   [{ _id, name }]           existing entities
 *  - value:     string                     currently selected _id ("" if none)
 *  - displayName: string                   fallback label if the id isn't in options yet
 *  - icon:      string                     small emoji shown on the trigger
 *  - placeholder: string
 *  - onSelect:  (option|null) => void      option is { _id, name } or null to clear
 *  - onCreate:  (name, extras?) => Promise<option>  persists a new entity, resolves to { _id, name }
 *  - tabs:      [{ key, label }]           optional owner tabs; each option carries `_tab`
 *  - createExtras: bool                    when true, clicking "เพิ่ม" opens an inline
 *                                          panel (รูปภาพ + เลขสต็อก) and onCreate is
 *                                          called as onCreate(name, { file, qty })
 */
export default function CreatableSelect({
  options = [],
  value = "",
  displayName = "",
  icon = "",
  placeholder = "-- เลือก --",
  onSelect,
  onCreate,
  tabs = null,
  createExtras = false
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  // Inline new-item panel state (createExtras mode)
  const [showExtras, setShowExtras] = useState(false);
  const [extraFile, setExtraFile] = useState(null);
  const [extraQty, setExtraQty] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => o._id === value) || null;
  const label = selected?.name || displayName || "";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setShowExtras(false);
        setExtraFile(null);
        setExtraQty("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
  const exactMatch = options.find(o => o.name.trim().toLowerCase() === q);
  const creatable = typeof onCreate === "function";
  const canCreate = creatable && q.length > 0 && !exactMatch;

  const handlePick = (option) => {
    onSelect?.(option);
    setOpen(false);
    setQuery("");
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    // In extras mode the first click opens the details panel; the actual
    // create happens from the panel's confirm button.
    if (createExtras && !showExtras) {
      setShowExtras(true);
      return;
    }
    setCreating(true);
    try {
      const created = await onCreate?.(name, createExtras ? { file: extraFile, qty: extraQty } : undefined);
      if (created && created._id) {
        onSelect?.(created);
      }
      setOpen(false);
      setQuery("");
      setShowExtras(false);
      setExtraFile(null);
      setExtraQty("");
    } catch (err) {
      // Surface a lightweight failure; parent logs the detail.
      console.error("Failed to create option:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-1 p-1.5 bg-slate-50 border rounded-lg text-[14px] font-semibold outline-none transition-colors cursor-pointer ${
          open ? "border-green-500" : "border-slate-200 hover:border-slate-300"
        } ${label ? "text-slate-800" : "text-slate-400"}`}
      >
        <span className="flex items-center gap-1 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{label || placeholder}</span>
        </span>
        {creatable && !label && !value ? (
          <Plus className="h-3.5 w-3.5 text-green-600 shrink-0" />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search / create input */}
          <div className="p-1.5 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canCreate) handleCreate();
                  else if (filtered.length === 1) handlePick(filtered[0]);
                }
              }}
              placeholder={creatable ? "ค้นหา หรือพิมพ์เพื่อเพิ่มใหม่..." : "ค้นหา..."}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-semibold text-slate-800 outline-none focus:border-green-500"
            />
          </div>

          {/* Inline-create hint */}
          {creatable && !showExtras && (
            <div className="px-3 py-1.5 bg-green-50/60 border-b border-green-100 text-[13px] font-semibold text-green-700 text-left leading-snug">
              ถ้าไม่มีของในคลัง พิมพ์ชื่อแล้วกด “เพิ่ม” เพื่อบันทึกเข้าฐานข้อมูลได้เลย
            </div>
          )}

          <div className="max-h-44 overflow-y-auto py-1">
            {/* Clear selection */}
            {value && (
              <button
                type="button"
                onClick={() => handlePick(null)}
                className="w-full text-left px-3 py-1.5 text-[14px] text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                ล้างการเลือก
              </button>
            )}

            {/* Existing options */}
            {tabs ? (
              tabs.map(tab => {
                const tabOptions = options.filter(o => o._tab === tab.key);
                const filteredTabOptions = q ? tabOptions.filter(o => o.name.toLowerCase().includes(q)) : tabOptions;

                if (filteredTabOptions.length === 0) return null;

                return (
                  <div key={tab.key} className="space-y-0.5">
                    <div className="px-3 py-1 bg-slate-50 text-[13px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-100 text-left">
                      {tab.label}
                    </div>
                    {filteredTabOptions.map(option => (
                      <button
                        key={option._id}
                        type="button"
                        onClick={() => handlePick(option)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700 cursor-pointer transition-colors text-left"
                      >
                        <span className="truncate">{option.name}</span>
                        {option._id === value && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              filtered.map(option => (
                <button
                  key={option._id}
                  type="button"
                  onClick={() => handlePick(option)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700 cursor-pointer transition-colors text-left"
                >
                  <span className="truncate">{option.name}</span>
                  {option._id === value && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                </button>
              ))
            )}

            {/* Create row */}
            {canCreate && !showExtras && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold text-green-700 hover:bg-green-50 cursor-pointer border-t border-slate-100 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                เพิ่ม “{query.trim()}”
              </button>
            )}

            {/* New-item details panel (createExtras mode) */}
            {canCreate && showExtras && (
              <div className="border-t border-slate-100 p-2.5 space-y-2 bg-green-50/40 text-left">
                <p className="text-[14px] font-bold text-green-800">เพิ่ม “{query.trim()}”</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {extraFile
                      ? <img src={URL.createObjectURL(extraFile)} alt="preview" className="w-full h-full object-cover" />
                      : <span className="text-[13px] text-slate-400">รูป</span>}
                  </div>
                  <label className="px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-[14px] font-bold text-slate-600 cursor-pointer hover:bg-slate-50">
                    อัปโหลดรูปภาพ
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setExtraFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-bold text-slate-500">เลขสต็อก (จำนวนสินค้า)</label>
                  <input
                    type="number"
                    min="0"
                    value={extraQty}
                    onChange={(e) => setExtraQty(e.target.value)}
                    placeholder="เช่น 100"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[14px] font-semibold text-slate-800 outline-none focus:border-green-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[14px] font-bold cursor-pointer disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  บันทึกเข้าสต็อกและเลือกใช้
                </button>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && !canCreate && (
              <div className="px-3 py-2 text-[14px] text-slate-400 text-center italic">
                {creatable ? "ยังไม่มีข้อมูล พิมพ์เพื่อเพิ่มใหม่" : "ไม่พบรายการ"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
