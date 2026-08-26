"use client";

import React from "react";
import { Upload, Download, Plus, FileSpreadsheet } from "lucide-react";

export default function HeroBanner({
  title,
  subtitle,
  onImport,
  onExport,
  onDownloadTemplate,
  onImportExport,
  onCreateManual,
  createLabel = "เพิ่มข้อมูล (Manual)",
  importLabel = "นำเข้าเอกสาร",
  exportLabel = "ส่งออกเอกสาร",
  importExportLabel = "นำเข้า/ส่งออก",
  children
}) {
  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 mb-0 text-slate-800 shadow-xs relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
        <div className="absolute right-0 top-0 h-40 w-40 bg-slate-50/60 rounded-full blur-2xl -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 h-24 w-24 bg-slate-50/40 rounded-full blur-xl" />
      </div>

      {/* Title & Subtitle */}
      <div className="relative z-10 text-left space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-850">{title}</h1>
        <p className="text-xs text-slate-500 font-medium max-w-xl">{subtitle}</p>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 flex flex-wrap gap-2 shrink-0">
        {children}
        {onImportExport && (
          <button
            type="button"
            onClick={onImportExport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
            <span>{importExportLabel}</span>
          </button>
        )}
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="h-4 w-4 shrink-0 text-green-600" />
            <span>{importLabel}</span>
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download className="h-4 w-4 shrink-0 text-blue-600" />
            <span>{exportLabel}</span>
          </button>
        )}
        {onDownloadTemplate && (
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download className="h-4 w-4 shrink-0 text-amber-600" />
            <span>ดาวน์โหลดเทมเพลต</span>
          </button>
        )}
        {onCreateManual && (
          <button
            type="button"
            onClick={onCreateManual}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-green-100"
          >
            <Plus className="h-4 w-4 shrink-0 text-white" />
            <span>{createLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
