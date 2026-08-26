"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import CockpitView from "@/components/dashboard/CockpitView";
import { useRouter } from "next/navigation";

export default function CockpitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [fgLots, setFgLots] = useState([]);
  const [boardColumns, setBoardColumns] = useState([]);
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData(token);
  }, []);

  const fetchData = async (token) => {
    setLoading(true);
    setError("");

    try {
      const [leadsRes, ingRes, pkgRes, fgLotRes, colRes, macRes] = await Promise.all([
        api.get("/sales"),
        api.get("/bom/ingredients"),
        api.get("/packaging"),
        api.get("/fg/lots"),
        api.get("/sales/columns"),
        api.get("/machines").catch(() => ({ data: [] }))
      ]);

      setLeads(leadsRes.data);
      setIngredients(ingRes.data);
      setPackaging(pkgRes.data);
      setFgLots(fgLotRes.data);
      setBoardColumns(colRes.data || []);
      setMachines(macRes.data || []);
    } catch (error) {
      console.error("Error fetching cockpit data:", error);
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const res = await api.get(`/export/stock/${type}`, { responseType: "blob" });
      const filename = type === "csv" ? "raw_materials_stock.csv" : "raw_materials_stock.xlsx";
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting stock:", err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8 select-none text-left">
        {/* Page Actions Skeleton */}
        <div className="flex justify-end items-center gap-2">
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-4 w-4 bg-slate-100 rounded-full" />
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <div className="h-7 w-20 bg-slate-200 rounded-lg" />
                <div className="h-5 w-12 bg-slate-150 rounded-full" />
              </div>
              <div className="h-3 w-32 bg-slate-100 rounded pt-1" />
            </div>
          ))}
        </div>

        {/* Sales CRM Task Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-7 w-24 bg-slate-100 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 w-2/3">
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-slate-150 rounded-full" />
                </div>
                <div className="pt-2">
                  <div className="h-3 w-24 bg-slate-100 rounded mb-1.5" />
                  <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-52 bg-slate-200 rounded-lg" />
            <div className="h-7 w-24 bg-slate-150 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-150 rounded-full" />
                </div>
                <div className="pt-2">
                  <div className="h-3 w-24 bg-slate-100 rounded mb-1.5" />
                  <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button
            onClick={() => {
              const token = localStorage.getItem("token");
              if (token) fetchData(token);
            }}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // These used to be computed here — totalSalesVal against a hard-coded "s11"
  // that no longer exists as a column, so it always read 0 — and then passed down
  // to CockpitView, which never used them and derived its own from boardColumns.
  // Removed rather than fixed twice; the view owns these numbers.
  return (
    <CockpitView
      ingredients={ingredients}
      packaging={packaging}
      fgLots={fgLots}
      leads={leads}
      boardColumns={boardColumns}
      machines={machines}
      handleExport={handleExport}
      setActiveTab={(tab) => router.push(`/admin/${tab}`)}
    />
  );
}
