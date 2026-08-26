"use client";

import React, { useState } from "react";
import api, { assetUrl as getFileUrl } from "@/lib/api";
import usePageData from "@/lib/usePageData";
import {
  Search, User, Package, FlaskConical, Tag, Layers, ChevronDown, ChevronRight,
  Calendar, Beaker, Download, ShoppingBag, AlertTriangle, Eye, SlidersHorizontal, CheckCircle2, Clock
} from "lucide-react";
import { Card } from "@heroui/react";
import HeroBanner from "@/components/dashboard/HeroBanner";

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "-"; }
};

const COMPLETED_STATUSES = new Set(["สำเร็จเสร็จสิ้น", "ส่งให้ลูกค้า", "ส่งเก็บเข้าคลัง"]);
const IN_PROGRESS_STATUSES = new Set([
  "เลือกเครื่องจักร",
  "กำลังผลิต",
  "กำลังผลิต (บรรจุ)",
  "กำลังผลิต (ติดฉลาก)",
  "รอบรรจุ",
  "รอตรวจ QC รอบที่ 1",
  "รอตรวจ QC รอบที่ 2"
]);
const PENDING_STATUSES = new Set(["", "ยังไม่ผลิต", "รอยืนยัน", "รอการยืนยัน"]);

const statusBucket = (record) => {
  const status = record.productionStatus || "";
  if (COMPLETED_STATUSES.has(status)) return "completed";
  if (IN_PROGRESS_STATUSES.has(status)) return "in_progress";
  // A finished-goods lot is authoritative history even when an older order
  // record still says "ยังไม่ผลิต" or "รอยืนยัน".
  if ((record.lots || []).length > 0 && PENDING_STATUSES.has(status)) return "completed";
  return "pending";
};

const statusLabel = (record) => {
  if (statusBucket(record) === "completed" && PENDING_STATUSES.has(record.productionStatus || "")) {
    return "สำเร็จเสร็จสิ้น";
  }
  return record.productionStatus || "ยังไม่ผลิต";
};

const statusColor = (s) => {
  if (COMPLETED_STATUSES.has(s)) return "bg-green-50 text-green-700 border-green-200";
  if (IN_PROGRESS_STATUSES.has(s) || String(s || "").startsWith("กำลังผลิต")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (!s || s === "ยังไม่ผลิต") return "bg-slate-50 text-slate-500 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const formatChemicalGrams = (value) => {
  const grams = Number(value);
  return Number.isFinite(grams) ? grams.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-";
};

function CustomerLogChemicalTable({ ingredients = [] }) {
  const orderedIngredients = [...ingredients]
    .filter(Boolean)
    .sort((a, b) => String(a.phase || "A").localeCompare(String(b.phase || "A")));
  const totalGrams = orderedIngredients.reduce((sum, ingredient) => sum + (Number(ingredient.grams) || 0), 0);

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1.5 text-[14px] font-bold text-slate-500 mb-1.5">
        <Beaker className="h-3 w-3 text-amber-500" />
        สารเคมีตามสูตร R&D ({orderedIngredients.length} รายการ)
      </div>
      <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-3xs">
        <table className="w-full min-w-[560px] text-xs text-left border-collapse">
          <thead className="bg-amber-50/70 font-bold text-[13px] text-amber-900 border-b border-amber-200/80 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5 text-center w-12">ขั้นตอน</th>
              <th className="px-3 py-2.5">ชื่อสารเคมี</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">กลุ่ม</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">ปริมาณ (กรัม)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/80 text-slate-600 font-medium">
            {orderedIngredients.map((ingredient, index) => (
              <tr key={`${ingredient.name || "ingredient"}-${index}`} className="hover:bg-amber-50/40 transition-colors">
                <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                <td className="px-3 py-2 font-bold text-slate-800">{ingredient.name || "-"}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100 font-mono font-bold text-[13px]">
                    {ingredient.phase || "A"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                  {formatChemicalGrams(ingredient.grams)} ก.
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-amber-50/60 border-t-2 border-amber-200 font-bold text-[13px] text-slate-800">
            <tr>
              <td colSpan={3} className="px-3 py-2.5 text-right font-black uppercase tracking-wider text-slate-700">
                รวมทั้งหมด
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-black text-amber-800 whitespace-nowrap">
                {formatChemicalGrams(totalGrams)} ก.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function CustomerLogPage() {
  const { data, loading, error, reload: fetchRecords } = usePageData(
    async () => {
      const [logRes, packRes] = await Promise.all([
        api.get("/customer-log"),
        api.get("/packaging").catch(() => ({ data: [] }))
      ]);
      return { records: logRes.data || [], packagings: packRes.data || [] };
    },
    { initialData: { records: [], packagings: [] } }
  );

  const records = data.records;
  const packagings = data.packagings;

  const catalogById = (id) => (id ? packagings.find(p => String(p._id) === String(id)) : null);
  const catalogByName = (name) => (name ? packagings.find(p => p.name === name) : null);
  const resolveItem = (id, name) => catalogById(id) || catalogByName(name) || null;

  const [search, setSearch] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [zoomImage, setZoomImage] = useState(null);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Status Filter Logic
  const statusFiltered = records.filter(r => {
    if (activeStatusTab === "all") return true;
    if (activeStatusTab === "in_progress") return statusBucket(r) === "in_progress";
    if (activeStatusTab === "completed") return statusBucket(r) === "completed";
    if (activeStatusTab === "pending") return statusBucket(r) === "pending";
    return true;
  });

  // Search Filter Logic
  const filtered = statusFiltered.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name || "").toLowerCase().includes(q) ||
      (r.brand || "").toLowerCase().includes(q) ||
      (r.province || "").toLowerCase().includes(q) ||
      (r.orderedProducts || []).some(p =>
        (p.formulaName || p.name || "").toLowerCase().includes(q)
      ) ||
      (r.lots || []).some(l => (l.lotNo || "").toLowerCase().includes(q) || (l.formulaName || "").toLowerCase().includes(q));
  });

  const totalLots = filtered.reduce((s, r) => s + (r.lots || []).length, 0);

  // Counts for tabs
  const countAll = records.length;
  const countInProgress = records.filter(r => statusBucket(r) === "in_progress").length;
  const countCompleted = records.filter(r => statusBucket(r) === "completed").length;
  const countPending = records.filter(r => statusBucket(r) === "pending").length;

  // Export CSV
  const handleExport = () => {
    const headers = ["ลูกค้า", "แบรนด์", "สถานะ", "Lot No.", "สูตร", "วันผลิต", "วันหมดอายุ", "จำนวน", "สารเคมี", "ปริมาณ (ก.)", "บรรจุภัณฑ์ที่ใช้"];
    const rows = [];
    filtered.forEach(r => {
      const pack = (r.consumedPackaging || []).map(p => `${p.name} x${p.qty}`).join(" | ");
      const recordStatus = statusLabel(r);
      if ((r.lots || []).length === 0) {
        rows.push([r.name, r.brand, recordStatus, "-", (r.orderedProducts?.[0] || {}).formulaName || "", "", "", "", "", "", pack]);
      }
      (r.lots || []).forEach(l => {
        if ((l.ingredients || []).length === 0) {
          rows.push([r.name, r.brand, recordStatus, l.lotNo, l.formulaName, fmtDate(l.mfgDate), fmtDate(l.expDate), l.quantity, "", "", pack]);
        }
        (l.ingredients || []).forEach(ing => {
          rows.push([r.name, r.brand, recordStatus, l.lotNo, l.formulaName, fmtDate(l.mfgDate), fmtDate(l.expDate), l.quantity, ing.name, ing.grams, pack]);
        });
      });
    });
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 text-left select-none">
        <div className="h-24 bg-slate-100 rounded-3xl" />
        <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none text-left">
      <HeroBanner
        title="บันทึกประวัติลูกค้า (Customer Log DataTable)"
        subtitle="ประวัติการผลิตและสอบกลับข้อมูล (Traceability) แยกตามลูกค้า สูตร ล็อต สารเคมี และบรรจุภัณฑ์"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={fetchRecords}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* KPI stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">ลูกค้าที่มีประวัติ</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{filtered.length}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">ล็อตที่ผลิตรวม</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{totalLots}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <button 
          onClick={handleExport} 
          className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-xs hover:shadow-sm hover:border-green-300 transition-all cursor-pointer text-left"
        >
          <div>
            <span className="text-[14px] text-green-600 font-bold uppercase tracking-wider">ส่งออกรายงาน (CSV)</span>
            <div className="text-sm font-black text-slate-800 mt-1">Traceability Full Export</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <Download className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Main DataTable Card */}
      <Card className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl flex flex-col gap-5">
        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold text-slate-800 text-sm">ตารางข้อมูลบันทึกประวัติการผลิตลูกค้า (Customer Log DataTable)</h3>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Status Tabs */}
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start shadow-2xs gap-1">
              {[
                { id: "all", label: "ทั้งหมด", count: countAll },
                { id: "in_progress", label: "กำลังผลิต", count: countInProgress },
                { id: "completed", label: "สำเร็จเสร็จสิ้น", count: countCompleted },
                { id: "pending", label: "รอผลิต / รอยืนยัน", count: countPending },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStatusTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeStatusTab === tab.id 
                      ? "bg-white text-slate-800 shadow-xs border border-slate-200/10" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-extrabold transition-colors ${
                    activeStatusTab === tab.id ? "bg-green-100 text-green-700" : "bg-slate-200/60 text-slate-500"
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาลูกค้า / แบรนด์ / Lot / สูตร..."
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold w-full sm:w-72 shadow-2xs focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* DataTable Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm max-h-[650px] overflow-y-auto">
          <table className="w-full text-xs text-left text-slate-500 border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[14px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-center w-10"></th>
                <th className="px-4 py-3.5">ลูกค้า / แบรนด์</th>
                <th className="px-4 py-3.5">สูตรสินค้าที่สั่งผลิต</th>
                <th className="px-4 py-3.5 w-36 text-center">จำนวนล็อตผลิต</th>
                <th className="px-4 py-3.5 w-36 text-center">สถานะการผลิต</th>
                <th className="px-4 py-3.5 w-28 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {filtered.map((r, idx) => {
                const isOpen = !!expanded[r.customerId];
                const isEven = idx % 2 === 0;
                const rowBg = isEven ? "bg-white" : "bg-[#FAF6F0]"; // soft cream-yellow zebra stripe

                // Extract summary list of formulas and lot numbers
                const formulaList = (r.orderedProducts || []).map(p => p.formulaName).filter(Boolean);
                const uniqueFormulas = Array.from(new Set(formulaList));
                const lotNumbers = (r.lots || []).map(l => l.lotNo).filter(Boolean);

                return (
                  <React.Fragment key={r.customerId}>
                    <tr 
                      onClick={() => toggle(r.customerId)}
                      className={`${rowBg} hover:bg-amber-50/50 transition-colors cursor-pointer`}
                    >
                      {/* Expand Arrow */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-green-700 font-bold" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                        </div>
                      </td>

                      {/* Customer Name & Brand */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm">
                              {r.name}
                              {r.brand && <span className="text-slate-400 font-semibold ml-1.5">({r.brand})</span>}
                            </div>
                            <div className="text-[14px] text-slate-400 font-semibold">
                              {r.province || "ไม่ระบุจังหวัด"} · {r.orderedProducts?.length || 0} รายการสินค้า
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Formula & Lot Summary */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {uniqueFormulas.slice(0, 2).map((fname, fi) => (
                              <span key={fi} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[14px] font-bold">
                                {fname}
                              </span>
                            ))}
                            {uniqueFormulas.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[13px] font-bold">
                                +{uniqueFormulas.length - 2} สูตร
                              </span>
                            )}
                            {uniqueFormulas.length === 0 && <span className="text-slate-400 italic text-[15px]">-</span>}
                          </div>
                          {lotNumbers.length > 0 && (
                            <div className="text-[14px] text-slate-400 font-mono">
                              Lot: {lotNumbers.slice(0, 2).join(", ")}{lotNumbers.length > 2 ? "..." : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Lot Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                          {(r.lots || []).length} ล็อต
                        </span>
                      </td>

                      {/* Production Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[14px] font-bold px-2.5 py-1 rounded-lg border shrink-0 inline-block ${statusColor(statusLabel(r))}`}>
                          {statusLabel(r)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(r.customerId);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                            isOpen ? "bg-green-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isOpen ? "ซ่อน" : "เปิดดู"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Drawer Row */}
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-slate-50/70 border-b border-slate-200">
                          <div className="space-y-4 p-2">
                            <div className="flex items-center gap-1.5 text-[15px] font-black text-slate-700 uppercase tracking-wider">
                              <ShoppingBag className="h-4 w-4 text-indigo-600" />
                              รายละเอียดประวัติการผลิตและบรรจุภัณฑ์ (Full Traceability Record)
                            </div>

                            {(() => {
                              const entries = [];
                              const usedProducts = new Set();
                              (r.lots || []).forEach((l) => {
                                const pi = (r.orderedProducts || []).findIndex(
                                  (op, idx) => !usedProducts.has(idx) && (
                                    (op.formulaId && l.formulaId && String(op.formulaId) === String(l.formulaId)) ||
                                    ((!op.formulaId || !l.formulaId) && op.formulaName === l.formulaName)
                                  )
                                );
                                if (pi >= 0) usedProducts.add(pi);
                                entries.push({ lot: l, product: pi >= 0 ? r.orderedProducts[pi] : null, date: l.mfgDate });
                              });
                              (r.orderedProducts || []).forEach((op, idx) => {
                                if (!usedProducts.has(idx)) entries.push({ lot: null, product: op, date: null });
                              });

                              if (entries.length === 0) {
                                return <div className="text-xs text-slate-400 italic">ไม่มีรายการสั่งผลิต</div>;
                              }

                              const dayKey = (d) => {
                                if (!d) return "";
                                const x = new Date(d);
                                if (isNaN(x.getTime())) return "";
                                return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
                              };

                              const buckets = new Map();
                              entries.forEach((en) => {
                                const k = dayKey(en.date);
                                if (!buckets.has(k)) buckets.set(k, []);
                                buckets.get(k).push(en);
                              });

                              const groups = [...buckets.entries()].sort((a, b) =>
                                a[0] ? (b[0] ? b[0].localeCompare(a[0]) : -1) : 1
                              );

                              return (
                                <div className="space-y-5">
                                  {groups.map(([gkey, gitems]) => (
                                    <div key={gkey || "no-date"} className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[14px] font-black rounded-full px-2.5 py-0.5 border whitespace-nowrap ${gkey ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                          {gkey ? fmtDate(gkey) : "ยังไม่ได้ผลิต"}
                                        </span>
                                        <span className="text-[14px] font-bold text-slate-400">{gitems.length} รายการ</span>
                                        <span className="flex-1 h-px bg-slate-200" />
                                      </div>

                                      {gitems.map((en, i) => {
                                        const o = en.product || {};
                                        const l = en.lot;
                                        const chemicalIngredients = l?.ingredients?.length > 0 ? l.ingredients : (o.rndIngredients || []);
                                        const bottle = resolveItem(o.packagingItemId, o.packagingType);
                                        const nozzle = resolveItem(o.nozzleId, o.nozzleType);
                                        const sticker = resolveItem(o.labelItemId, o.labelType);
                                        const cards = [
                                          { title: "สินค้า", name: o.formulaName, img: o.productImageUrl, extra: o.quantityPcs ? `${Number(o.quantityPcs).toLocaleString()} ชิ้น` : "" },
                                          { title: "ขวด / บรรจุภัณฑ์", name: bottle?.name || o.packagingType, img: bottle?.image, extra: o.bottleCount ? `${o.bottleCount} ชิ้น` : "" },
                                          { title: "หัวฝา / หัวปั๊ม", name: nozzle?.name || o.nozzleType, img: nozzle?.image, extra: o.nozzleCount ? `${o.nozzleCount} ชิ้น` : "" },
                                          { title: "สติกเกอร์", name: sticker?.name || o.labelType, img: o.labelArtworkUrl || sticker?.image, extra: "" }
                                        ];

                                        return (
                                          <div key={i} className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                                              <span className="font-black text-slate-800 text-xs">
                                                {o.isDevelopment ? "🧪 " : ""}{o.formulaName || "-"}
                                              </span>
                                              <div className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold">
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                  ขนาดขวด {o.bottleSize || "-"} ml
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  บรรจุจริง {o.fillVolume || "-"} ml
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                  {o.quantityPcs ? Number(o.quantityPcs).toLocaleString() : (l?.quantity?.toLocaleString() || "-")} ขวด
                                                </span>
                                                {o.scentType && (
                                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                    🌿 {o.scentType}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
                                              {cards.map((c) => (
                                                <div key={c.title} className="rounded-lg border border-slate-200/80 bg-white p-2 text-center">
                                                  <div className="text-[13px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{c.title}</div>
                                                  {c.img ? (
                                                    <img
                                                      src={getFileUrl(c.img)}
                                                      alt={c.name || c.title}
                                                      onClick={() => setZoomImage({ src: getFileUrl(c.img), alt: c.name || c.title })}
                                                      className="w-full h-20 object-contain bg-slate-50 rounded-md cursor-zoom-in hover:ring-2 hover:ring-green-400 transition-all"
                                                    />
                                                  ) : (
                                                    <div className="w-full h-20 rounded-md border border-dashed border-slate-200 flex items-center justify-center text-[13px] text-slate-300 font-bold">
                                                      ไม่มีรูป
                                                    </div>
                                                  )}
                                                  <div className="text-[14px] font-bold text-slate-700 mt-1.5 leading-tight break-words">{c.name || "-"}</div>
                                                  {c.extra && <div className="text-[13px] text-slate-400 font-semibold">{c.extra}</div>}
                                                </div>
                                              ))}
                                            </div>

                                            {/* Chemical Ingredients breakdown */}
                                            {l ? (
                                              <div className="border-t border-slate-100">
                                                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50/50">
                                                  <span className="font-mono font-black text-slate-800 text-xs">{l.lotNo}</span>
                                                  <div className="flex flex-wrap items-center gap-3 text-[14px] font-semibold text-slate-500">
                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-emerald-500" /> ผลิต {fmtDate(l.mfgDate)}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-rose-500" /> หมดอายุ {fmtDate(l.expDate)}</span>
                                                    <span className="font-mono font-bold text-slate-700">{l.quantity?.toLocaleString()} {l.unit}</span>
                                                  </div>
                                                </div>
                                                {chemicalIngredients.length > 0 ? (
                                                  <CustomerLogChemicalTable ingredients={chemicalIngredients} />
                                                ) : (
                                                  <div className="px-3 pb-3 text-[14px] text-slate-400 italic">ไม่มีข้อมูลสารเคมีในระบบ R&D</div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="border-t border-slate-100">
                                                {chemicalIngredients.length > 0 ? (
                                                  <CustomerLogChemicalTable ingredients={chemicalIngredients} />
                                                ) : (
                                                  <div className="p-3 text-[14px] text-slate-400 italic">ยังไม่มีล็อต — ยังไม่ได้ยืนยันสั่งผลิต</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Consumed packaging */}
                            {(r.consumedPackaging || []).length > 0 && (
                              <div className="pt-2">
                                <div className="flex items-center gap-1.5 text-[15px] font-black text-slate-600 uppercase tracking-wider mb-2">
                                  <Package className="h-3.5 w-3.5 text-emerald-500" /> บรรจุภัณฑ์ / สติกเกอร์ ที่ตัดออก
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {r.consumedPackaging.map((p, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[15px] font-bold text-emerald-700">
                                      {p.name} × {p.qty}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 italic font-semibold">
                    ไม่พบข้อมูลประวัติบันทึกการผลิตลูกค้าตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Image Modal Zoom */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/80 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <div className="flex flex-col items-center gap-3 max-w-[90vw]">
            <img src={zoomImage.src} alt={zoomImage.alt || "zoom"} className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain bg-white" />
            {zoomImage.alt && <p className="text-white text-sm font-bold">{zoomImage.alt}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
