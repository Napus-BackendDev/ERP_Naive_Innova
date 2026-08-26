"use client";

import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import { fmtChem } from "@/lib/chemAmount";

/**
 * The chemical-plan table: one row per ingredient, showing the recipe amount
 * (grams per 1 kg) next to what this specific batch actually consumes.
 *
 * Shared by R&D (รับใบสั่งผลิต/พัฒนาสูตร) and Production (ใบสั่งผลิตเตรียมพัสดุ +
 * the สายการผลิต formula modal) so the operator reads the same table wherever
 * they are. Production passes showStock={false}: stock sufficiency is R&D's gate
 * before the lot exists, and by the time Production sees it the chemicals have
 * already been deducted — a stock mark there would be stale and misleading.
 *
 * rows: [{ name, phase, gramsPerKg, required, stock, short }] — any order; the
 *   table sorts by phase itself and numbers the result as ขั้นตอน.
 *   stock === null | undefined → "ไม่มีสารในคลัง"
 */
export default function IngredientPlanTable({ rows = [], showStock = false, className = "" }) {
  // Exact amounts, never rounded — see lib/chemAmount.
  const g = (n) => `${fmtChem(n)} ก.`;

  // Phase-sorted here rather than at each call site, so the "ขั้นตอน" numbering
  // means the same thing in R&D and in both Production views: weigh all of group
  // A before group B, in this order.
  const ordered = [...rows].sort((a, b) =>
    String(a.phase || "A").toUpperCase().localeCompare(String(b.phase || "A").toUpperCase())
  );

  // Calculate totals
  const total100g = rows.reduce((sum, r) => sum + ((r.gramsPerKg || 0) / 10), 0);
  const totalPerKg = rows.reduce((sum, r) => sum + (r.gramsPerKg || 0), 0);
  const totalRequired = rows.reduce((sum, r) => sum + (r.required || 0), 0);

  return (
    <div className={`border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-3xs ${className}`}>
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-50 font-bold text-[13px] text-slate-500 border-b border-slate-200 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5 text-center w-10">ขั้นตอน</th>
            <th className="px-3 py-2.5">ชื่อสารเคมี</th>
            <th className="px-3 py-2.5 text-center whitespace-nowrap">กลุ่ม</th>
            <th className="px-3 py-2.5 text-right whitespace-nowrap">100 ก.</th>
            <th className="px-3 py-2.5 text-right whitespace-nowrap">ต่อ 1 กก.</th>
            <th className="px-3 py-2.5 text-right whitespace-nowrap">ต้องใช้</th>
            {showStock && <th className="px-3 py-2.5 text-center">สต็อก</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
          {ordered.map((r, idx) => (
            <tr key={`${r.name}-${idx}`} className={`transition-colors ${showStock && r.short ? "bg-red-50/60" : "hover:bg-slate-50/50"}`}>
              {/* Weigh-out order — the running index over the phase-sorted rows. */}
              <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
              <td className="px-3 py-2 font-bold text-slate-800">{r.name}</td>
              <td className="px-3 py-2 text-center whitespace-nowrap">
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100 font-mono font-bold text-[14px]">
                  {r.phase || "A"}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                {fmtChem((r.gramsPerKg || 0) / 10)} ก.
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                {fmtChem(r.gramsPerKg)} ก.
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                {r.required > 0 ? g(r.required) : "-"}
              </td>
              {showStock && (
                // Exact stock figures live in Stock; here we only need the yes/no
                // answer "is there enough?". The wording + real numbers come back on
                // hover. Tooltip opens to the LEFT: the wrapper is overflow-x-auto,
                // so anything above the row clips.
                <td className="px-3 py-2 text-center">
                  {(() => {
                    const missing = r.stock === null || r.stock === undefined;
                    const state = missing
                      ? { label: "ไม่มีสารในคลัง", detail: "", cls: "text-amber-600", icon: <X className="h-4 w-4" /> }
                      : r.short
                        ? { label: "ไม่พอ", detail: `ต้องใช้ ${g(r.required)} · คงเหลือ ${g(r.stock)}`, cls: "text-red-600", icon: <X className="h-4 w-4" /> }
                        : { label: "พอใช้", detail: `คงเหลือ ${g(r.stock)}`, cls: "text-emerald-600", icon: <CheckCircle2 className="h-4 w-4" /> };
                    return (
                      <span className={`group/stk relative inline-flex items-center justify-center cursor-help ${state.cls}`}>
                        {state.icon}
                        <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 z-20 hidden group-hover/stk:flex flex-col items-end gap-0.5 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 shadow-lg">
                          <span className="text-[14px] font-bold text-white leading-none">{state.label}</span>
                          {state.detail && <span className="text-[13px] font-mono text-slate-300 leading-none">{state.detail}</span>}
                        </span>
                      </span>
                    );
                  })()}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-[13px] text-slate-800">
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-center font-black uppercase tracking-wider text-slate-700">
              รวมทั้งหมด (Total)
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-black text-blue-700 whitespace-nowrap">
              {fmtChem(total100g)} ก.
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
              {fmtChem(totalPerKg)} ก.
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
              {totalRequired > 0 ? g(totalRequired) : "-"}
            </td>
            {showStock && <td className="px-3 py-2.5" />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
