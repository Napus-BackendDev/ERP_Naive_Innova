"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import {
  Search, User, Calendar,
  Package, Settings, Users, Download, FlaskConical, Factory, UserCheck, X
} from "lucide-react";
import { Card } from "@heroui/react";
import HeroBanner from "@/components/dashboard/HeroBanner";
import { categoryOfLog, CATEGORY_LABEL } from "@/lib/logCategory";

const PAGE_SIZE = 100;
const EMPTY_COUNTS = { all: 0, sales: 0, rnd: 0, production: 0, stock: 0, user: 0, other: 0 };

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("all"); // all | sales | rnd | production | stock | user
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // The search box fires on every keystroke; only the settled value hits the API.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const buildParams = useCallback((overrides = {}) => ({
    category: activeTab,
    q: debouncedSearch || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    limit: PAGE_SIZE,
    ...overrides
  }), [activeTab, debouncedSearch, fromDate, toDate, page]);

  // A slow response for an abandoned filter must not overwrite a newer one.
  const requestSeq = useRef(0);
  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get("/logs", { params: buildParams() })
      .then(res => {
        if (cancelled || seq !== requestSeq.current) return;
        const data = res.data || {};
        setLogs(Array.isArray(data) ? data : (data.items || []));
        setCounts(data.counts || EMPTY_COUNTS);
        setTotal(Array.isArray(data) ? data.length : (data.total || 0));
      })
      .catch(err => {
        if (cancelled || seq !== requestSeq.current) return;
        console.error("Failed to load activity logs:", err);
        setError("โหลดประวัติกิจกรรมไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => {
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [buildParams]);

  // Changing a filter must restart at page 1, or a narrow result set lands on an
  // empty page and reads as "no data". Reset in the same update as the filter so
  // the effect above fires once, not twice.
  const applyFilter = (fn) => (value) => { fn(value); setPage(1); };
  const selectTab = applyFilter(setActiveTab);
  const changeSearch = applyFilter(setSearchTerm);
  const changeFrom = applyFilter(setFromDate);
  const changeTo = applyFilter(setToDate);

  const hasFilters = !!(searchTerm || fromDate || toDate || activeTab !== "all");
  const clearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setActiveTab("all");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  const iconOf = (log) => {
    switch (categoryOfLog(log)) {
      case "sales": return <Users className="h-4 w-4 text-indigo-600" />;
      case "rnd": return <FlaskConical className="h-4 w-4 text-purple-600" />;
      case "production": return <Factory className="h-4 w-4 text-blue-600" />;
      case "stock": return <Package className="h-4 w-4 text-emerald-600" />;
      case "user": return <UserCheck className="h-4 w-4 text-amber-600" />;
      default: return <Settings className="h-4 w-4 text-slate-600" />;
    }
  };

  const bgOf = (log) => {
    switch (categoryOfLog(log)) {
      case "sales": return "bg-indigo-50 border-indigo-100";
      case "rnd": return "bg-purple-50 border-purple-100";
      case "production": return "bg-blue-50 border-blue-100";
      case "stock": return "bg-emerald-50 border-emerald-100";
      case "user": return "bg-amber-50 border-amber-100";
      default: return "bg-slate-50 border-slate-100";
    }
  };

  // Export EVERY row the current filter matches, not just the page on screen —
  // an audit export that silently stops at 100 rows is worse than none.
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.get("/logs", { params: buildParams({ page: 1, limit: 1000 }) });
      const rows = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const headers = ["วันที่/เวลา", "หมวดหมู่", "ประเภท", "ผู้ดำเนินการ", "รายละเอียดกิจกรรม"];
      const csvRows = rows.map(log => [
        `"${new Date(log.createdAt).toLocaleString("th-TH").replace(/"/g, '""')}"`,
        `"${CATEGORY_LABEL[categoryOfLog(log)] || "-"}"`,
        `"${(log.actionType || "").replace(/"/g, '""')}"`,
        `"${(log.operator || "").replace(/"/g, '""')}"`,
        `"${(log.description || "").replace(/"/g, '""')}"`
      ]);
      const csv = "﻿" + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `activity_logs_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export activity logs:", err);
    } finally {
      setExporting(false);
    }
  };

  const KPI_CARDS = [
    { id: "sales", label: "Sale (CRM)", note: "กิจกรรมการขาย", icon: Users, tone: "indigo" },
    { id: "rnd", label: "RD (สูตร & วิจัย)", note: "ปรับปรุงสูตร & BOM", icon: FlaskConical, tone: "purple" },
    { id: "production", label: "Production (ผลิต)", note: "จัดคิวผลิต & QC", icon: Factory, tone: "blue" },
    { id: "stock", label: "Stock (คลังสินค้า)", note: "วัตถุดิบ & บรรจุภัณฑ์", icon: Package, tone: "emerald" },
    { id: "user", label: "User (ผู้ใช้งาน)", note: "ผู้ใช้งาน & สิทธิ์ระบบ", icon: UserCheck, tone: "amber" }
  ];

  const TONE = {
    indigo: { active: "bg-indigo-50/70 border-indigo-300", label: "text-indigo-500", chip: "bg-indigo-50 text-indigo-600", num: "text-indigo-700", note: "text-indigo-400" },
    purple: { active: "bg-purple-50/70 border-purple-300", label: "text-purple-500", chip: "bg-purple-50 text-purple-600", num: "text-purple-700", note: "text-purple-400" },
    blue: { active: "bg-blue-50/70 border-blue-300", label: "text-blue-500", chip: "bg-blue-50 text-blue-600", num: "text-blue-700", note: "text-blue-400" },
    emerald: { active: "bg-emerald-50/70 border-emerald-300", label: "text-emerald-500", chip: "bg-emerald-50 text-emerald-600", num: "text-emerald-700", note: "text-emerald-400" },
    amber: { active: "bg-amber-50/70 border-amber-300", label: "text-amber-500", chip: "bg-amber-50 text-amber-600", num: "text-amber-700", note: "text-amber-400" }
  };

  return (
    <div className="flex flex-col gap-6 select-none text-left">
      <HeroBanner
        title="Activity Logs"
        subtitle="ระบบบันทึกและตรวจสอบประวัติการปฏิบัติงาน การนำเข้า และความเปลี่ยนแปลงภายใน Naive Ops ERP"
      />

      {/* Module KPI cards — clicking one filters the table below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {KPI_CARDS.map(card => {
          const tone = TONE[card.tone];
          const Icon = card.icon;
          const isActive = activeTab === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => selectTab(isActive ? "all" : card.id)}
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm text-left ${
                isActive ? `${tone.active} scale-[1.02]` : "bg-white border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`text-[14px] font-black uppercase tracking-wider ${tone.label}`}>{card.label}</span>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tone.chip}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-left">
                <span className={`text-2xl font-black font-mono ${tone.num}`}>
                  {loading ? "—" : (counts[card.id] || 0).toLocaleString()}
                </span>
                <span className={`text-[14px] font-bold block ${tone.note}`}>{card.note}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl flex flex-col gap-5">
        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ประวัติการดำเนินกิจกรรมทั้งหมด (Audit Log)</h3>
              <p className="text-[15px] text-slate-400 font-semibold mt-0.5">
                {loading
                  ? "กำลังโหลด..."
                  : total === 0
                    ? "ไม่พบรายการตามเงื่อนไข"
                    : `แสดง ${firstRow.toLocaleString()}–${lastRow.toLocaleString()} จาก ${total.toLocaleString()} รายการ`}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs shrink-0"
            >
              <Download className="h-3.5 w-3.5" /> {exporting ? "กำลังส่งออก..." : "ส่งออกข้อมูล (CSV)"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start shadow-2xs gap-1">
              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "sales", label: "Sale" },
                { id: "rnd", label: "RD" },
                { id: "production", label: "Production" },
                { id: "stock", label: "Stock" },
                { id: "user", label: "User" }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-white text-slate-800 shadow-xs border border-slate-200/10"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-extrabold transition-colors ${
                    activeTab === tab.id ? "bg-green-100 text-green-700" : "bg-slate-200/60 text-slate-500"
                  }`}>{(counts[tab.id] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => changeFrom(e.target.value)}
                  className="bg-transparent text-[15px] font-semibold text-slate-600 outline-none w-[110px]"
                />
                <span className="text-slate-300 text-xs">–</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => changeTo(e.target.value)}
                  className="bg-transparent text-[15px] font-semibold text-slate-600 outline-none w-[110px]"
                />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาข้อความ หรือผู้ดำเนินการ..."
                  value={searchTerm}
                  onChange={(e) => changeSearch(e.target.value)}
                  className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 font-semibold w-full sm:w-64 shadow-2xs focus:bg-white transition-all"
                />
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2.5 py-2 text-[15px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" /> ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left text-slate-500 border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[14px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-12">หมวด</th>
                <th className="px-4 py-3">รายละเอียดกิจกรรม / รายงานการดำเนินการ</th>
                <th className="px-4 py-3 w-36">ผู้ดำเนินการ</th>
                <th className="px-4 py-3 w-40">วันที่ / เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {loading && (
                [...Array(8)].map((_, i) => (
                  <tr key={`sk-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-[#FAF6F0]"}>
                    <td className="px-4 py-3"><div className="h-7 w-7 rounded-lg bg-slate-100 mx-auto animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-3/4 rounded bg-slate-100 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-24 rounded bg-slate-100 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-28 rounded bg-slate-100 animate-pulse" /></td>
                  </tr>
                ))
              )}

              {!loading && logs.map((log, idx) => {
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#FAF6F0]";
                const formattedDate = new Date(log.createdAt).toLocaleString("th-TH", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit"
                });

                return (
                  <tr key={log._id} className={`${rowBg} hover:bg-amber-50/40 transition-colors`}>
                    <td className="px-4 py-3 text-center">
                      <div
                        title={CATEGORY_LABEL[categoryOfLog(log)] || log.actionType || "-"}
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center mx-auto shadow-2xs ${bgOf(log)}`}
                      >
                        {iconOf(log)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left font-semibold text-slate-800 text-sm">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-600">{log.operator}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[14px]">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-semibold">
                    ไม่พบข้อมูลประวัติบันทึกกิจกรรมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[15px] font-bold text-slate-400">หน้า {page} จาก {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
