"use client";

import React from "react";
import api from "@/lib/api";
import StockView from "@/components/dashboard/StockView";
import usePageData from "@/lib/usePageData";

const EMPTY = { ingredients: [], packagings: [], sampleProducts: [], fgLots: [] };

export default function StockPage() {
  const { data, loading, error, reload: handleRefresh } = usePageData(
    async () => {
      const [ingredients, packagings, sampleProducts, fgLots] = await Promise.all([
        api.get("/bom/ingredients"),
        api.get("/packaging"),
        api.get("/products?sample=true"),
        api.get("/fg/lots"),
      ]);
      return {
        ingredients: ingredients.data,
        packagings: packagings.data,
        sampleProducts: sampleProducts.data,
        fgLots: fgLots.data,
      };
    },
    { initialData: EMPTY }
  );
  const { ingredients, packagings, sampleProducts, fgLots } = data;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 text-left select-none">
        <div className="h-8 w-32 bg-slate-200 rounded-lg mb-1" />
        <div className="h-4 w-64 bg-slate-150 rounded" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 p-6" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between">
              <div className="h-4 w-1/4 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
              <div className="h-4 w-1/6 bg-slate-200 rounded" />
            </div>
            {[1, 2, 3, 4, 5].map(row => (
              <div key={row} className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="h-4 w-1/3 bg-slate-100 rounded" />
                <div className="h-4 w-12 bg-slate-100 rounded" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-left">
        <div className="flex items-center gap-2 text-sm font-bold text-red-700">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {error}
        </div>
        <button
          onClick={handleRefresh}
          className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <StockView
      ingredients={ingredients}
      packagings={packagings}
      sampleProducts={sampleProducts}
      fgLots={fgLots}
      onRefresh={handleRefresh}
    />
  );
}
