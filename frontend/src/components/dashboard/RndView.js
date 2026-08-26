"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api, { assetUrl } from "@/lib/api";
import HeroBanner from "./HeroBanner";
import {
  Inbox, Factory, FlaskConical, CheckCircle2, Boxes, Beaker, Calculator,
  RefreshCw, Search, Plus, Minus, X, Check, Layers, Zap, Trash2, Copy, Eye, ArrowLeft, Send, Phone, AlertTriangle, FileText
} from "lucide-react";
import FormulaManagerModal from "./FormulaManagerModal";
import IngredientManagerModal from "./IngredientManagerModal";
import IngredientPlanTable from "./IngredientPlanTable";
import ProductChemicalCalculator from "./ProductChemicalCalculator";
import { fmtChem } from "@/lib/chemAmount";
import { compressImage } from "@/lib/imageCompress";
import { openDevelopSpecDoc } from "@/lib/developSpecDoc";
import { formatStructuredMovement, formatThaiStockDateTime } from "@/lib/stockMovement";

const formatTravelLog = (desc) => {
  if (!desc) return "";
  const regex = /:\s*(รับเข้า|เบิกออก)\s*([\d,\.]+)\s*(ก\.|ชิ้น)\s*\(สต็อกคงเหลือปัจจุบัน:\s*([\d,\.]+)\s*(ก\.|ชิ้น)\)(?:\s*\|\s*หมายเหตุ:\s*(.*))?/;
  const match = desc.match(regex);
  if (!match) {
    return desc.replace(/^ปรับปรุงสต็อกวัตถุดิบสารเคมี\s*"[^"]*":\s*/, "")
               .replace(/^ปรับปรุงสต็อกบรรจุภัณฑ์\s*"[^"]*":\s*/, "");
  }

  const action = match[1];
  const amountStr = match[2];
  const unit = match[3];
  const currentStr = match[4];
  const remark = match[6] || "";

  const amount = parseFloat(amountStr.replace(/,/g, ""));
  const current = parseFloat(currentStr.replace(/,/g, ""));
  
  let previous = 0;
  if (action === "รับเข้า") {
    previous = current - amount;
  } else {
    previous = current + amount;
  }

  const fmtPrev = previous.toLocaleString();
  const fmtCurrent = current.toLocaleString();

  let result = `${action} ${amountStr} ${unit} | สต็อกก่อนหน้า: ${fmtPrev} ${unit} | สต็อกปัจจุบัน: ${fmtCurrent} ${unit}`;
  if (remark) {
    result += ` | หมายเหตุ: ${remark}`;
  }
  return result;
};

// The R&D widget tabs. First four are development-order workflow stages;
// last three pull live data straight from the BOM Calculator (ingredients + formulas).
const TABS = [
  { id: "received",  label: "รับใบสั่งผลิต/พัฒนาสูตร",  icon: Inbox },
  { id: "producing", label: "กำลังผลิต/กำลังพัฒนาสูตร", icon: Factory },
  { id: "qc",        label: "Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง", icon: FlaskConical },
  { id: "done",      label: "งานที่เสร็จสิ้นแล้ว",       icon: CheckCircle2 },
  { id: "stock",     label: "Stock วัตถุดิบสารเคมี",     icon: Boxes },
  { id: "bom",       label: "สูตรคำนวณ BOM",            icon: Beaker },
  { id: "calculator", label: "คำนวณสารต่อผลิตภัณฑ์", icon: Calculator },
];

// A production order counts as R&D/formula-development when its ordered product
// carries the isDevelopment flag, or its orderType is explicitly "development".
const isDevOrder = (o) => {
  if (o?.orderType === "development") return true;
  const op = o?.orderedProducts;
  if (!op) return false;
  if (Array.isArray(op)) return op.some((x) => x && x.isDevelopment);
  if (typeof op === "object") return !!op.isDevelopment;
  return false;
};

// Map an order/product to one of the four workflow stages by its production status/step.
// Final QC (the last Production stage) closing the order is what ends R&D's
// involvement. "รอตรวจ QC รอบที่ 2" is Final QC still in progress — not closed.
const isFinalDone = (o, p) => {
  const s = p?.productionStatus || o?.productionStatus || "";
  return /สำเร็จเสร็จสิ้น|ส่งให้ลูกค้า|ส่งเก็บเข้าคลัง/.test(s);
};

// R&D board flow:
//   received → producing → qc (In-Process QC) → done (ผ่าน QC แล้ว)
// A job sits in "done" from the moment R&D passes In-Process QC (rndQcAt) and stays
// there while Production packs/Final-QCs it; once Final QC closes the order it
// drops off the R&D board entirely ("closed" is not a bucket).
const stageOf = (o, p) => {
  const s = p?.productionStatus || o?.productionStatus || "";
  const step = Number(p?.productionStep !== undefined ? p.productionStep : (o?.productionStep !== undefined ? o.productionStep : 0));
  if (isFinalDone(o, p)) return "closed";
  // Checked before the QC/producing rules: after In-Process QC the order goes back to
  // Production as "รอบรรจุ"/"รอตรวจ QC รอบที่ 2", which would otherwise read as
  // producing/qc and pull a finished job back into R&D's earlier tabs.
  if (p?.rndQcAt || o?.rndQcAt) return "done";
  if (/qc|ทดลอง|ตรวจ/i.test(s) || step === 5) return "qc";
  if (/กำลังผลิต/.test(s) || step >= 2) return "producing";
  return "received";
};

// QC checklist — typed items:
//   passfail        → ผ่าน / ไม่ผ่าน (compare against the reference images/spec above)
//   passfail_photo  → ผ่าน / ไม่ผ่าน + แนบรูปหลักฐาน
//   number          → กรอกค่าที่วัดได้ (viscosity / pH)
// The list is configured per formula (BomFormula.qcChecklistItems) — there is no
// built-in fallback on purpose: a hardcoded list looked like every formula had a
// QC spec when none had been set.
// Every formula's checklist starts with a mandatory photo of the bulk substance.
// It is item #1 by construction (not by luck) because Production's Final QC pulls
// rndQcPhotos[0] into its "รูปเนื้อสาร" slot — if the order were free, whichever
// photo happened to be first would land there instead.
export const QC_BULK_PHOTO_KEY = "bulkPhoto";
const QC_BULK_PHOTO_ITEM = {
  key: QC_BULK_PHOTO_KEY,
  label: "รูปเนื้อสาร (ส่งต่อไป Final QC)",
  type: "passfail_photo",
  unit: "",
  locked: true
};

// Normalizes stored data too: formulas saved before this rule still get the item,
// so In-Process QC enforces it without a data migration.
const qcItemsOf = (formula) => {
  const stored = Array.isArray(formula?.qcChecklistItems) ? formula.qcChecklistItems : [];
  return [QC_BULK_PHOTO_ITEM, ...stored.filter((it) => it?.key !== QC_BULK_PHOTO_KEY)];
};

// An item counts as completed when it has been answered (pass/fail chosen, number
// filled) and — for passfail_photo — a photo is attached.
const qcItemDone = (c, checklist, photos) => {
  const v = checklist?.[c.key];
  if (c.type === "number") return v !== undefined && String(v).trim() !== "";
  if (c.type === "passfail_photo") return (v === "pass" || v === "fail") && !!photos?.[c.key];
  return v === "pass" || v === "fail";
};

// Total kilograms this order will produce. Prefer the stored quantityKg (set at
// sale time); fall back to pcs × ml/1000 when absent.
const orderBatchKg = (product) => {
  const stored = parseFloat(product?.quantityKg);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const qty = parseFloat(product?.quantityPcs ?? product?.quantity) || 0;
  const ml = parseFloat(product?.fillVolume || product?.bottleSize) || 0;
  return (qty * ml) / 1000;
};

// Per-ingredient stock check for a formula against this order's batch size.
// ratio (from GET /formulas) = grams-per-1kg ÷ 1000, so grams-per-kg = ratio*1000.
// stock is the ingredient's openingStock (grams). `anyShort` gates the confirm.
const ingredientStockRows = (formula, product, ingredients) => {
  const batchKg = orderBatchKg(product);
  const rows = (formula?.ingredients || []).map((ing) => {
    const gramsPerKg = (parseFloat(ing.ratio) || 0) * 1000;
    const required = gramsPerKg * batchKg;
    const found = (ingredients || []).find((i) => i.name === ing.name);
    const stock = found ? (parseFloat(found.openingStock) || 0) : null; // null = ไม่พบในคลัง
    const remaining = stock === null ? null : stock - required;
    const short = stock !== null && stock < required;
    return { name: ing.name, gramsPerKg, required, stock, remaining, short };
  });
  // Only gate when there is a real batch to produce and a tracked ingredient runs short.
  const anyShort = batchKg > 0 && rows.some((r) => r.short);
  return { batchKg, rows, anyShort };
};

const fmt = (n) => (Number(n) || 0).toLocaleString();

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) + " น.";
  } catch {
    return "-";
  }
};

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-emerald-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {hint && <p className="text-xs text-slate-500 mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}

// ── Tab 1-4: development-order cards for a given stage ──────────────────────
// R&D card badge shows the formula-production TYPE, not the production status.
const formulaTypeLabel = (o, p) => {
  if (o?.orderType === "develop" || p?.isDevelopment) return "พัฒนาสูตรเอง";
  const t = (p?.customerFormulaType || "").toString();
  if (t.includes("ปรับ")) return "ปรับสูตร";
  return "ผลิตตามสูตรโรงงาน";
};

// A development order is the only kind that asks R&D to invent something; the
// rest are production orders R&D just verifies. `grouped` splits the list on
// that line so the work needing real bench time sits on top.
const isDevelopmentOrder = (item) =>
  item?.order?.orderType === "develop" || !!item?.product?.isDevelopment;

function OrderStage({ items, stageIcon, emptyTitle, emptyHint, onItemClick, selectedId, isReceived = false, statusOverride = null, statusTone = "blue", showQcTimestamp = false, grouped = false, onNavToQc = null, onNavToReceived = null, formulas = [] }) {
  if (!items.length) return <EmptyState icon={stageIcon} title={emptyTitle} hint={emptyHint} />;

  const renderCard = (item) => {
        const o = item.order;
        const p = item.product;
        const isSelected = item.id === selectedId;

        // Done tab (showQcTimestamp) — single-row compact card:
        // ลูกค้า ซ้าย · สูตร+จำนวน / วันเวลา / สถานะ ขวา
        if (showQcTimestamp) {
          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`rounded-2xl border transition-all px-4 py-3 flex items-center justify-between gap-4 flex-wrap cursor-pointer text-left select-none active:scale-[0.99] ${
                isSelected ? "bg-green-50/10 border-2 border-green-600 shadow-sm" : "bg-white border-slate-200 hover:border-slate-355 hover:shadow-xs"
              }`}
            >
              {/* left: customer */}
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                <div className="text-sm font-black text-slate-800 truncate mt-0.5">{o.name || "ไม่ระบุชื่อ"}</div>
              </div>

              {/* right: formula+qty · datetime · status */}
              <div className="flex items-center gap-2.5 flex-wrap justify-end min-w-0">
                <span className="text-xs font-extrabold text-slate-700 truncate max-w-[240px]">
                  🧪 {p.formulaName || "สูตรพิเศษ"}
                  {p.quantityPcs ? <span className="text-slate-500 font-mono"> · {fmt(p.quantityPcs)} ชิ้น</span> : null}
                </span>
                <span className="flex items-center gap-1 text-[15px] font-bold text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-lg px-2 py-1 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {fmtDateTime(p.rndQcAt || o.qcCompletedAt || o.statusChangedAt || o.updatedAt)}
                </span>
                <span className={`shrink-0 text-[14px] font-bold px-2.5 py-0.5 rounded-full border ${
                  (o.orderType === "develop" || p.isDevelopment)
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : (p?.customerFormulaType || "").toString().includes("ปรับ")
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {formulaTypeLabel(o, p)}
                </span>
                <span className="shrink-0 text-[14px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {statusOverride || "QC เสร็จแล้ว"}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => onItemClick(item)}
            className={`rounded-2xl border transition-all p-5 flex flex-col gap-3 cursor-pointer text-left select-none active:scale-[0.99] ${
              isSelected
                ? "bg-green-50/10 border-2 border-green-600 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-355 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                <div className="text-sm font-black text-slate-800 truncate mt-0.5">{o.name || "ไม่ระบุชื่อ"}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(o.orderType === "develop" || p.isDevelopment) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDevelopSpecDoc({ item: p, customer: o, formulas });
                    }}
                    title="พิมพ์ / ดาวน์โหลดใบสั่งพัฒนาสูตร (PDF)"
                    className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className={`text-[14px] font-bold px-2.5 py-0.5 rounded-full border ${
                  (o.orderType === "develop" || p.isDevelopment)
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : statusOverride
                    ? (statusTone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")
                    : isSelected
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-green-50 text-green-700 border-green-150"
                }`}>
                  {(o.orderType === "develop" || p.isDevelopment)
                    ? "กำลังพัฒนาสูตร"
                    : (statusOverride || formulaTypeLabel(o, p))}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-100 my-0.5" />

            <div className="flex flex-col">
              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สูตรที่สั่งผลิต</span>
              <div className="flex justify-between items-center gap-4 mt-0.5">
                <div className="text-xs font-extrabold text-slate-700 truncate">
                  🧪 {p.formulaName || "สูตรพิเศษ/อยู่ระหว่างการวิจัย"}
                </div>
                
                {isReceived && (o.orderType !== "develop" && !p.isDevelopment) && (
                  <div className="text-right shrink-0 flex items-center gap-1.5 text-[15px] font-bold text-slate-500 flex-wrap justify-end">
                    <span>ขนาดขวด <span className="text-slate-800 font-mono">{p.bottleSize ? (/[a-zA-Zก-๙]/.test(p.bottleSize) ? p.bottleSize : `${p.bottleSize} ml`) : "-"}</span></span>
                    <span className="text-slate-300">·</span>
                    <span>ใส่จริง <span className="text-slate-800 font-mono">{p.fillVolume ? (/[a-zA-Zก-๙]/.test(p.fillVolume) ? p.fillVolume : `${p.fillVolume} ml`) : "-"}</span></span>
                    <span className="text-slate-300">·</span>
                    <span>จำนวนขวด <span className="text-slate-800 font-mono">{fmt(p.quantityPcs || p.quantity || 0)} ชิ้น</span></span>
                  </div>
                )}
              </div>
            </div>

            {!isReceived && (
              <div className={`text-[15px] flex flex-wrap gap-x-4 gap-y-1.5 mt-1 p-2.5 rounded-xl border font-medium ${
                isSelected 
                  ? "bg-green-50/5 border-green-100/50 text-slate-600" 
                  : "bg-slate-50 border-slate-100 text-slate-500"
              }`}>
                {(p.brand || o.brand) && (
                  <span>แบรนด์: <span className="text-slate-800 font-bold">{p.brand || o.brand}</span></span>
                )}
                {o.orderType !== "develop" && !p.isDevelopment && p.quantityPcs && (
                  <span>จำนวน: <span className="text-slate-800 font-mono font-bold">{fmt(p.quantityPcs)} ชิ้น</span></span>
                )}
                <span>ขั้นตอน: <span className="font-mono text-slate-800 font-bold">{o.productionStep || 0}/6</span></span>
              </div>
            )}

            {showQcTimestamp && (
              <div className="flex items-center gap-1.5 text-[15px] font-bold text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-xl px-2.5 py-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>QC เสร็จเมื่อ {fmtDateTime(p.rndQcAt || o.qcCompletedAt || o.statusChangedAt || o.updatedAt)}</span>
              </div>
            )}

            {(onNavToQc || onNavToReceived) && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-1" onClick={(e) => e.stopPropagation()}>
                {onNavToReceived && (
                  <button
                    type="button"
                    onClick={() => {
                      onItemClick(item);
                      onNavToReceived(item);
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>กลับไปแก้ไข ใบสั่งพัฒนาสูตร</span>
                  </button>
                )}
                {onNavToQc && (
                  <button
                    type="button"
                    onClick={() => {
                      onItemClick(item);
                      onNavToQc(item);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>ไปยัง Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
  };

  if (!grouped) {
    return <div className="grid grid-cols-1 gap-3.5 p-1 w-full">{items.map(renderCard)}</div>;
  }

  const groups = [
    { key: "dev",  label: "พัฒนาสูตร",                     hint: "ต้องสร้างสูตรใหม่ให้ลูกค้า", tone: "purple", items: items.filter(isDevelopmentOrder) },
    { key: "prod", label: "ผลิตตามสูตรโรงงาน / ปรับสูตร", hint: "ตรวจสูตรเดิมแล้วยืนยันตัดสต็อก", tone: "green",  items: items.filter((i) => !isDevelopmentOrder(i)) }
  ].filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-5 w-full">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2 px-1 flex-wrap">
            <span className={`text-xs font-black uppercase tracking-wider ${
              g.tone === "purple" ? "text-purple-700" : "text-green-700"
            }`}>
              {g.label}
            </span>
            <span className={`text-[14px] font-mono font-bold px-1.5 rounded-full border ${
              g.tone === "purple"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              {g.items.length}
            </span>
            <span className="text-[14px] text-slate-400 font-medium">{g.hint}</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 p-1 w-full">{g.items.map(renderCard)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tab 5: chemical stock — EXACT design copied from BOM Calculator ─────────
function StockTable({ ingredients, onAddIngredient, onAdjustStock }) {
  const router = useRouter();
  const [ingSearch, setIngSearch] = useState("");
  const filteredIngs = useMemo(
    () => ingredients.filter((ing) => (ing.name || "").toLowerCase().includes(ingSearch.toLowerCase())),
    [ingredients, ingSearch]
  );

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาสารเคมี..."
            value={ingSearch}
            onChange={(e) => setIngSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 transition-colors"
          />
        </div>

        {/* Add Chemical Button on the right */}
        {onAddIngredient && (
          <button
            type="button"
            onClick={onAddIngredient}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มสารเคมีใหม่</span>
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs text-left text-slate-500 border-collapse">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[14px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">สารเคมี</th>
              <th className="px-4 py-3">สต็อกคงเหลือ (ก.)</th>
              <th className="px-4 py-3">ระดับคงคลัง</th>
              <th className="px-4 py-3">ผู้จัดจำหน่าย (Supplier)</th>
              <th className="px-4 py-3">ราคา / กรัม</th>
              <th className="px-4 py-3 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
            {filteredIngs.map((ing) => {
              const isLow = ing.openingStock > 0 && ing.openingStock < 3000;
              const isOut = ing.openingStock <= 0;

              return (
                <tr key={ing._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{ing.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 font-semibold">{(ing.openingStock || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {isOut ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                        ● หมดคลัง
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        ● สต็อกต่ำ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-2xs">
                        ● เพียงพอ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{ing.supplier || "-"}</td>
                  <td className="px-4 py-3 font-mono">
                    {ing.pricePerKg ? `${(ing.pricePerKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} บาท` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => {
                          if (onAdjustStock) onAdjustStock(ing, "in");
                        }}
                        className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors border border-green-200 cursor-pointer"
                        title="เพิ่มสต็อก (+)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (onAdjustStock) onAdjustStock(ing, "out");
                        }}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors border border-red-200 cursor-pointer"
                        title="ลดสต็อก (-)"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredIngs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">ไม่พบข้อมูลสารเคมี</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 6: BOM formula matrix — EXACT design copied from BOM Calculator ─────
function BomMatrix({ formulas, ingredients, onManageFormulas }) {
  const [matrixSearch, setMatrixSearch] = useState("");
  const sortedFormulas = useMemo(
    () => [...formulas].sort((a, b) => a.name.localeCompare(b.name, "th")),
    [formulas]
  );
  const sortedAndFilteredIngs = useMemo(
    () => [...ingredients]
      .filter((ing) => ing.name.toLowerCase().includes(matrixSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "th")),
    [ingredients, matrixSearch]
  );

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 sm:w-auto">
          {/* Search Bar for Ingredients on the left */}
          <div className="relative w-64 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาวัตถุดิบสารเคมี..."
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 transition-colors font-medium shadow-xs"
            />
          </div>

          {/* Stats text right after the search input */}
          <div className="text-xs font-bold text-slate-500 shrink-0 bg-slate-200/50 px-3 py-1.5 rounded-lg border border-slate-200/40">
            {sortedFormulas.length} สูตร | {sortedAndFilteredIngs.length} วัตถุดิบที่ใช้
          </div>
        </div>

        {/* Manage Formulas Button on the right */}
        {onManageFormulas && (
          <button
            type="button"
            onClick={onManageFormulas}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Layers className="h-4 w-4" />
            <span>จัดการสูตรผลิต</span>
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm max-h-[550px] overflow-y-auto bg-white">
        <table className="w-full text-xs text-left text-slate-500 border-collapse">
          <thead className="sticky top-0 z-35 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 bg-[#C25E34] text-white font-bold text-center sticky left-0 z-40 min-w-[220px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-[#B34E26]">
                วัตถุดิบ
              </th>
              {sortedFormulas.map((f) => (
                <th
                  key={f._id}
                  className="px-3 py-2 text-center text-[15px] font-bold min-w-[130px] text-white border-r border-white/10"
                  style={{ backgroundColor: f.color || "#2E7D32" }}
                >
                  <div className="truncate max-w-[120px]">{f.name}</div>
                  <div className="text-[13px] font-medium opacity-85 mt-0.5">(ก.)</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
            {sortedAndFilteredIngs.map((ing, idx) => {
              const isEven = idx % 2 === 0;
              const rowBgClass = isEven ? "bg-white" : "bg-[#FAF6F0]";
              return (
                <tr key={ing._id} className={`${rowBgClass} hover:bg-amber-50/40 transition-colors`}>
                  <td className={`px-4 py-2.5 font-bold text-slate-800 border-r border-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${rowBgClass}`}>
                    {ing.name}
                  </td>
                  {sortedFormulas.map((f) => {
                    const ingMatch = f.ingredients?.find((i) => i.name === ing.name);
                    const val = ingMatch ? parseFloat(ingMatch.ratio) * 1000 : null;
                    return (
                      <td key={f._id} className="px-3 py-2.5 text-center font-mono font-semibold text-slate-700 border-r border-slate-100 bg-transparent">
                        {val !== null ? (
                          <span className="text-slate-900 font-extrabold text-[15px]">{fmtChem(val)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {sortedAndFilteredIngs.length === 0 && (
              <tr>
                <td colSpan={sortedFormulas.length + 1} className="px-4 py-8 text-center text-slate-400 font-medium">
                  ไม่พบข้อมูลวัตถุดิบสารเคมีตามคำค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── QC detail panel (qc tab, right column): checklist + photo evidence + confirm ──
function QcDetailPanel({ item, formula, packagings = [], nozzles = [], onSaveSpec, checklist, onToggleCheck, onSetCheck, photos, uploading, onUploadPhoto, canConfirm, submitting, onConfirm }) {
  const qcItems = qcItemsOf(formula);
  const checkedCount = qcItems.filter((c) => qcItemDone(c, checklist, photos)).length;

  // Resolve the catalog items the customer actually selected (by stored id) so the
  // real product/packaging/nozzle/sticker images flow into R&D — no fuzzy matching.
  const findById = (arr, id) => (id ? (arr || []).find((x) => String(x._id) === String(id)) : null);
  const p = item.product || {};
  const bottle = findById(packagings, p.packagingItemId);
  const label = findById(packagings, p.labelItemId);
  const nozzle = findById(nozzles, p.nozzleId);
  const refImages = [
    { label: "สินค้า", url: p.productImageUrl },
    { label: "บรรจุภัณฑ์", url: bottle?.image },
    { label: "หัวฉีด", url: nozzle?.image },
    { label: "สติ๊กเกอร์", url: label?.image },
  ].filter((x) => x.url);

  return (
    <div className="space-y-5 text-left flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Order summary — same shape as received-tab summary */}
        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
          <div>
            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
            <p className="text-xs font-black text-slate-800 mt-0.5">{item.order.name || "ไม่ระบุชื่อ"}</p>
          </div>
          <div>
            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์</span>
            {/* Brand is entered per ordered line in the Sales spec modal; the
                deal-level field was removed and is empty on every record. */}
            <p className="text-xs font-bold text-slate-700 mt-0.5">{item.product?.brand || item.order.brand || "-"}</p>
          </div>
          <div>
            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สูตรสั่งผลิต</span>
            <p className="text-xs font-extrabold text-green-700 mt-0.5">🧪 {item.product.formulaName || "สูตรพิเศษ/อยู่ระหว่างการวิจัย"}</p>
          </div>
          {item.order?.orderType !== "develop" && !item.product?.isDevelopment && (
            <div>
              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">จำนวนที่สั่ง</span>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {item.product.quantityPcs ? `${fmt(item.product.quantityPcs)} ชิ้น` : "-"}
              </p>
            </div>
          )}
        </div>

        {/* Reference images from the order — resolved by stored catalog id */}
        {refImages.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 mb-3 border-b border-slate-100">
              รูปอ้างอิงจากออเดอร์
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {refImages.map((im) => (
                <div key={im.label} className="flex flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(im.url)} alt={im.label} className="w-full h-16 rounded-lg object-cover border border-slate-200" />
                  <span className="text-[13px] font-bold text-slate-500">{im.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The QC method is no longer separate prose — the checklist below IS the
            method, one numbered step per row, authored on the received tab. */}

        {/* QC CHECKLIST — pass/fail toggles, per-item photo, numeric measurements */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายการตรวจสอบ QC</h4>
            <span className={`text-[14px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              qcItems.length > 0 && checkedCount === qcItems.length
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>{checkedCount}/{qcItems.length}</span>
          </div>
          {qcItems.length === 0 && (
            <p className="text-[15px] text-amber-600 font-bold py-3 text-center">
              ยังไม่ได้ตั้งค่ารายการตรวจ QC ของสูตรนี้ — ตั้งค่าก่อนจึงจะยืนยัน QC ได้
            </p>
          )}
          <div className="flex flex-col divide-y divide-slate-50">
            {qcItems.map((c) => {
              const val = checklist[c.key];
              return (
                <div key={c.key} className="flex flex-col gap-2 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-700">{c.label}</span>

                    {c.type === "number" ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={val ?? ""}
                          onChange={(e) => onSetCheck(c.key, e.target.value)}
                          placeholder="0"
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 text-right focus:border-green-400 outline-none"
                        />
                        {c.unit && <span className="text-[14px] font-bold text-slate-400 w-8">{c.unit}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSetCheck(c.key, "pass")}
                          className={`px-3 py-1 rounded-lg text-[15px] font-black border transition-colors cursor-pointer ${
                            val === "pass"
                              ? "bg-green-600 text-white border-green-700"
                              : "bg-white text-slate-500 border-slate-200 hover:border-green-300"
                          }`}
                        >
                          ผ่าน
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetCheck(c.key, "fail")}
                          className={`px-3 py-1 rounded-lg text-[15px] font-black border transition-colors cursor-pointer ${
                            val === "fail"
                              ? "bg-red-600 text-white border-red-700"
                              : "bg-white text-slate-500 border-slate-200 hover:border-red-300"
                          }`}
                        >
                          ไม่ผ่าน
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Per-item photo evidence (e.g. ดูเนื้อ/แยกชั้น) */}
                  {c.type === "passfail_photo" && (
                    <label className={`relative flex items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
                      photos[c.key] ? "border-green-300 bg-green-50/30" : "border-slate-200 bg-slate-50 hover:border-green-300"
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading[c.key]}
                        onChange={(e) => onUploadPhoto(c.key, e.target.files?.[0])}
                      />
                      {uploading[c.key] ? (
                        <span className="text-[14px] font-bold text-slate-400 animate-pulse">กำลังอัปโหลด...</span>
                      ) : photos[c.key] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photos[c.key].startsWith("http") || photos[c.key].startsWith("data:") ? photos[c.key] : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000"}${photos[c.key]}`}
                          alt={c.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[14px] font-bold text-slate-400">+ แนบรูปเนื้อสาร</span>
                      )}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CONFIRM */}
      <div className="pt-4 border-t border-slate-200 mt-6">
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`w-full py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
            canConfirm
              ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-[0.98] shadow-green-100"
              : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          <Check className="h-4 w-4" />
          <span>{submitting ? "กำลังยืนยัน..." : "ยืนยันผ่าน QC"}</span>
        </button>
        {!canConfirm && !submitting && (
          <p className="text-[14px] text-slate-400 font-medium text-center mt-2">
            ต้องเลือกผ่าน/ไม่ผ่านทุกข้อ กรอกค่าที่วัด และแนบรูปเนื้อสารก่อนยืนยัน
          </p>
        )}
      </div>
    </div>
  );
}

// QC setup for a formula (BomFormula.qcChecklistItems), authored on the received
// tab. The steps ARE the method: each row is one numbered check the Incoming-QC
// panel renders and the inspector must answer. The old free-text qcMethod box is
// gone — prose could not be ticked off, so it was written and then ignored while
// the checklist stayed empty and QC could never be confirmed.
const QC_TYPES = [
  { value: "passfail", label: "ผ่าน / ไม่ผ่าน" },
  { value: "passfail_photo", label: "ผ่าน / ไม่ผ่าน + แนบรูป" },
  { value: "number", label: "กรอกค่าที่วัดได้" }
];

function QcMethodEditor({ formula, onSave }) {
  const [items, setItems] = useState(() => qcItemsOf(formula));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editable = !!formula?._id;
  // Autosave: only fires for edits the user actually made. Without this guard the
  // effect would also fire on mount and when switching formulas, writing the
  // loaded value straight back over the record.
  const touched = useRef(false);

  useEffect(() => {
    touched.current = false;
    setItems(qcItemsOf(formula));
    setSaved(false);
  }, [formula?._id]);

  const dirty = (next) => { touched.current = true; setItems(next); setSaved(false); };
  const patch = (idx, key, val) => dirty(items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  const remove = (idx) => dirty(items.filter((_, i) => i !== idx));
  // key is what qcChecklist/qcPhotos are stored under, so it must be stable and
  // unique; generated once on add and never rewritten when the label changes.
  const add = () => dirty([...items, { key: `qc${Date.now().toString(36)}`, label: "", type: "passfail", unit: "" }]);

  // Debounced autosave — no save button. 800ms so typing a label is one write,
  // not one per keystroke.
  useEffect(() => {
    if (!editable || !onSave || !touched.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        // Rows without a label are still being typed; keep them on screen but
        // never persist a blank step (it could never be ticked → QC stuck).
        // The locked bulk-photo item is re-applied by qcItemsOf on read, so it is
        // stored explicitly here to keep the DB and the UI showing the same list.
        const clean = items
          .filter((it) => String(it.label || "").trim())
          .map((it) => ({ ...it, label: it.label.trim(), unit: it.type === "number" ? (it.unit || "").trim() : "" }));
        await onSave(formula._id, { qcChecklistItems: clean });
        setSaved(true);
      } catch { /* surfaced by parent */ }
      finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [items, editable, formula?._id]);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          วิธีการ QC <span className="text-slate-400 font-bold normal-case">({items.length} ขั้นตอน · แสดงในหน้า In-Process QC)</span>
        </h4>
        {/* Autosaved — status only, no button. */}
        {editable && (saving || saved) && (
          <span className={`text-[14px] font-black ${saving ? "text-slate-400" : "text-green-600"}`}>
            {saving ? "กำลังบันทึก..." : "บันทึกแล้ว ✓"}
          </span>
        )}
      </div>

      {!editable ? (
        <p className="text-[14px] text-amber-600 font-bold">ไม่พบสูตรในระบบ BOM — บันทึกวิธี QC ไม่ได้</p>
      ) : (
        <div>
          {items.length === 0 && (
            <p className="text-[14px] text-amber-700 font-bold bg-white border-2 border-slate-300 rounded-lg px-2.5 py-2 mb-2">
              ยังไม่มีขั้นตอนตรวจ — สูตรนี้จะยืนยัน QC ไม่ได้จนกว่าจะเพิ่มอย่างน้อย 1 ข้อ
            </p>
          )}

          {items.length > 0 && (
            <div className="flex items-center gap-2 px-1 pb-1.5 text-[13px] font-black text-slate-400 uppercase tracking-wider">
              <span className="w-6 shrink-0 text-center">ขั้นตอน</span>
              <span className="flex-1">สิ่งที่ต้องตรวจ</span>
              <span className="w-[150px] shrink-0">ประเภท</span>
              <span className="w-8 shrink-0" />
            </div>
          )}

          <div className="space-y-2">
            {items.map((it, idx) => {
              // Step 1 is fixed: it is what Production's Final QC reads. Editing or
              // deleting it would break that handoff, so the row is read-only.
              const locked = it.key === QC_BULK_PHOTO_KEY;
              return (
              <div key={it.key || idx} className="flex items-center gap-2">
                <span className={`w-6 shrink-0 text-center text-[15px] font-mono font-black rounded-lg py-1.5 ${locked ? "text-green-700 bg-green-100" : "text-slate-500 bg-slate-100"}`}>{idx + 1}</span>
                {locked ? (
                  <div className="flex-1 min-w-0 p-2 rounded-lg border border-green-200 bg-green-50/60 text-xs font-bold text-green-800 flex items-center gap-1.5">
                    <span className="truncate">{it.label}</span>
                    <span className="text-[13px] font-black text-green-600 bg-white border border-green-200 rounded-full px-1.5 py-0.5 shrink-0">บังคับ</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={it.label || ""}
                    onChange={(e) => patch(idx, "label", e.target.value)}
                    placeholder="เช่น สีของเนื้อสารตรงตามมาตรฐาน"
                    className="flex-1 min-w-0 p-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-green-400"
                  />
                )}
                <select
                  value={it.type || "passfail"}
                  onChange={(e) => patch(idx, "type", e.target.value)}
                  disabled={locked}
                  className="w-[150px] shrink-0 p-2 rounded-lg border border-slate-200 text-[15px] font-bold text-slate-700 outline-none focus:border-green-400 cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {QC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {!locked && it.type === "number" && (
                  <input
                    type="text"
                    value={it.unit || ""}
                    onChange={(e) => patch(idx, "unit", e.target.value)}
                    placeholder="หน่วย"
                    className="w-20 p-2 rounded-lg border border-slate-200 text-[15px] font-semibold text-slate-700 outline-none focus:border-green-400 shrink-0"
                  />
                )}
                {locked ? (
                  <span className="w-8 shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="w-8 shrink-0 flex items-center justify-center py-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                    title="ลบขั้นตอนนี้"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={add}
            className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-green-300 text-green-700 text-[15px] font-black hover:bg-green-50/60 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> เพิ่มขั้นตอนตรวจ
          </button>
        </div>
      )}
    </div>
  );
}

export default function RndView({
  ingredients = [],
  formulas = [],
  orders = [],
  packagings = [],
  nozzles = [],
  onRefresh,
  onCreateFormula,
  onUpdateFormula,
  onDeleteFormula,
  onCreateIngredient
}) {
  const [active, setActive] = useState("received");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [manageFormulasModalOpen, setManageFormulasModalOpen] = useState(false);
  const [ingModalOpen, setIngModalOpen] = useState(false);
  // True while the formula modal is open to add ONE MORE experimental option to a
  // development order. Tells handleAutoCopySaved to append the created formula to
  // the order's list instead of the "ปรับสูตร" behaviour (repoint + close).
  const [pendingDevAppend, setPendingDevAppend] = useState(false);
  // "ปรับสูตร" flow: copy a base formula into the editor, pre-named for the customer.
  const [copyBaseFormula, setCopyBaseFormula] = useState(null);
  const [copyName, setCopyName] = useState("");
  const [viewFormulaTarget, setViewFormulaTarget] = useState(null);

  const [selectedAdjustItem, setSelectedAdjustItem] = useState(null);
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("in");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustLogs, setAdjustLogs] = useState([]);

  // Start the customer-specific formula flow from the base formula overlay.
  const handleForkFormula = (item, baseFormula) => {
    if (!baseFormula) return;
    const customerName = item?.order?.name || "ลูกค้า";
    setCopyBaseFormula(baseFormula);
    setCopyName(`${baseFormula.name || "สูตร"} - สูตรเฉพาะตัว ของ ${customerName}`);
    setPendingDevAppend(false);
    setManageFormulasModalOpen(true);
  };

  const fetchAdjustLogs = async () => {
    try {
      // /logs now answers with an envelope; keep the array fallback so an older
      // backend still works during a rolling deploy.
      const item = selectedAdjustItem;
      const res = await api.get("/logs", {
        params: {
          category: "stock",
          stockItemType: "ingredient",
          stockItemId: item?._id,
          legacyName: item?.name || "",
          limit: 1000,
          page: 1
        }
      });
      setAdjustLogs(res.data?.items || (Array.isArray(res.data) ? res.data : []));
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  };

  useEffect(() => {
    if (selectedAdjustItem) {
      fetchAdjustLogs();
    }
  }, [selectedAdjustItem]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(e.target.adjustQty.value);
    const note = e.target.adjustNote.value || "";
    if (isNaN(qty) || qty <= 0) return;
    const item = selectedAdjustItem, dir = adjustType;
    setAdjustSubmitting(true);
    try {
       await api.post("/bom/ingredients/tx", { itemId: item._id, type: dir, amount: qty, note });
      setAdjustDrawerOpen(false);
      setSelectedAdjustItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || "ปรับสต็อกไม่สำเร็จ");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // After the copied formula is saved, re-point the selected order's line item to
  // the new formula so it now produces with the customer's adjusted recipe.
  const handleAutoCopySaved = async (newName, created) => {
    if (!selectedItem) return;

    // Development order: the just-created BOM formula is one more experimental
    // option. Register it on the order (with its real formulaId so it can be
    // deleted later) and keep the panel open so more can be added.
    if (pendingDevAppend) {
      const row = {
        formulaId: created?._id || null,
        name: created?.name || newName,
        description: "",
        approved: false
      };
      const next = [...customFormulas, row];
      setCustomFormulas(next);
      setPendingDevAppend(false);
      try {
        await api.put(
          `/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`,
          { customFormulas: next }
        );
        if (onRefresh) onRefresh();
      } catch (e) {
        console.error("Failed to attach development formula to order:", e);
      }
      return;
    }

    // "ปรับสูตร": re-point the order at the customer-specific copy, then leave.
    try {
      await api.put(
        `/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`,
        { formulaId: created?._id || null, formulaName: created?.name || newName }
      );
      setSelectedItem(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Failed to re-point order to adjusted formula:", e);
    }
  };

  // Fit a textarea to its content — height follows scrollHeight so a long spec
  // is fully visible instead of hidden behind an inner scrollbar. The placeholder
  // is blanked while measuring: Chrome folds a wrapped placeholder into
  // scrollHeight, which left an EMPTY box ~175px tall.
  const autoGrow = (el) => {
    if (!el) return;
    const ph = el.placeholder;
    el.placeholder = "";
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    el.placeholder = ph;
  };

  const [deletingDevIdx, setDeletingDevIdx] = useState(null);

  // Remove one development option. The row is a real BOM formula, so removing
  // it archives the formula while preserving existing Lot traceability.
  const removeDevFormula = async (cIdx) => {
    if (!selectedItem) return;
    const target = customFormulas[cIdx];
    if (!target) return;
    const ok = window.confirm(
      `ลบสูตรพัฒนา "${target.name}" ?` +
      (target.formulaId ? "\n\nสูตร BOM นี้จะถูกเก็บถาวร (ประวัติ Lot เดิมยังอยู่)" : "")
    );
    if (!ok) return;

    setDeletingDevIdx(cIdx);
    const next = customFormulas.filter((_, i) => i !== cIdx);
    try {
      if (target.formulaId) {
        await onDeleteFormula(target.formulaId);
      }
      setCustomFormulas(next);
      await api.put(
        `/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`,
        { customFormulas: next }
      );
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("ลบสูตรไม่สำเร็จ: " + (e?.response?.data?.message || e?.message || e));
    } finally {
      setDeletingDevIdx(null);
    }
  };

  // QC panel state (qc tab) — reset whenever a different item is selected so
  // checklist/photos never leak between orders.
  const [qcChecklist, setQcChecklist] = useState({});   // { [itemKey]: boolean }
  const [qcPhotos, setQcPhotos] = useState({});          // { productPhoto: url, testResultPhoto: url }
  const [qcUploading, setQcUploading] = useState({});    // { productPhoto: bool, testResultPhoto: bool }
  const [qcSubmitting, setQcSubmitting] = useState(false);
  // Guards the R&D confirm button while chemicals are being deducted — a double
  // click would otherwise fire two /bom/confirm-production calls.
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  // Deducting chemicals is not undoable from the UI, so the button opens a
  // summary dialog first instead of firing straight away.
  const [confirmOrderTarget, setConfirmOrderTarget] = useState(null);
  // Same for passing In-Process QC — it hands the order back to the production line.
  const [confirmQcTarget, setConfirmQcTarget] = useState(null);

  // Custom R&D formulas list created per develop order line
  const [customFormulas, setCustomFormulas] = useState([]);

  // Formula IDs are authoritative. Name matching remains only for legacy rows
  // created before formulaId was added to orderedProducts.
  const resolveFormula = (product) => {
    if (!product) return null;
    return (product.formulaId && formulas.find((f) => String(f._id) === String(product.formulaId))) ||
      formulas.find((f) => f.name === product.formulaName) || null;
  };

  useEffect(() => {
    setQcChecklist({});
    setQcPhotos({});
    setQcUploading({});
    if (selectedItem?.product) {
      const existing = selectedItem.product.customFormulas || selectedItem.order?.customFormulas || [];
      setCustomFormulas(Array.isArray(existing) ? existing : []);
    } else {
      setCustomFormulas([]);
    }
  }, [selectedItem?.id]);

  const handleSetQcCheck = (key, value) => {
    setQcChecklist((prev) => ({ ...prev, [key]: value }));
  };

  // All items answered (pass/fail chosen or number filled), and the photo item
  // has a photo attached — see qcItemDone. An empty checklist must NOT pass:
  // .every() on [] is true, which would approve QC with nothing inspected.
  const qcFormula = resolveFormula(selectedItem?.product);
  const qcItemsForOrder = qcItemsOf(qcFormula);
  const qcAllChecked =
    qcItemsForOrder.length > 0 &&
    qcItemsForOrder.every((c) => qcItemDone(c, qcChecklist, qcPhotos));
  const qcCanConfirm = qcAllChecked && !qcSubmitting;

  // Received-tab ingredient stock check for the selected order's formula — used to
  // drive the per-row "พอใช้ / ไม่พอ" mark and to block "ยืนยันเริ่มผลิต" when short.
  const receivedFormula = active === "received" && selectedItem
    ? resolveFormula(selectedItem?.product)
    : null;
  const receivedStock = receivedFormula
    ? ingredientStockRows(receivedFormula, selectedItem?.product, ingredients)
    : null;

  const uploadQcPhoto = async (slotKey, file) => {
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setQcUploading((prev) => ({ ...prev, [slotKey]: true }));
    try {
      const formData = new FormData();
      formData.append("file", await compressImage(file));
      // No explicit Content-Type: the browser must set the multipart boundary itself.
      const res = await api.post("/production/upload", formData);
      setQcPhotos((prev) => ({ ...prev, [slotKey]: res.data.secure_url }));
    } catch (error) {
      console.error("QC photo upload failed:", error);
      alert("อัปโหลดรูปไม่สำเร็จ: " + (error.response?.data?.error || error.message));
    } finally {
      setQcUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const handleConfirmQc = async (item) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setQcSubmitting(true);
    try {
      await api.put(
        `/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`,
        {
          // In-Process QC passed → hand the order BACK to Production for QC round 2
          // (the 4-step บรรจุ/สติ๊กเกอร์/LOT/ซีล packaging flow), not terminal-done.
          productionStatus: "รอบรรจุ",
          productionStep: 4,
          packagingSubStep: "filling",
          rndQcChecklist: qcChecklist,
          // Bulk-substance photo FIRST: Production's Final QC shows rndQcPhotos[0]
          // in its "รูปเนื้อสาร" slot. Object.values() order is insertion order —
          // i.e. whichever photo was uploaded first — so it is pinned explicitly.
          rndQcPhotos: [
            qcPhotos[QC_BULK_PHOTO_KEY],
            ...Object.entries(qcPhotos)
              .filter(([k]) => k !== QC_BULK_PHOTO_KEY)
              .map(([, url]) => url)
          ].filter(Boolean),
          rndQcAt: new Date().toISOString(),
        });
      // No success alert: the confirm dialog already stated the outcome, and the
      // row leaving this tab is the confirmation.
      setSelectedItem(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to confirm QC:", error);
      alert("เกิดข้อผิดพลาดในการยืนยัน QC: " + (error.response?.data?.error || error.message));
    } finally {
      setQcSubmitting(false);
      setConfirmQcTarget(null);
    }
  };

  // R&D owns the CHEMICAL side: confirming here deducts the raw materials and
  // registers the production lot. Production's prep-confirm then only deducts
  // packaging (ขวด/ฝา/สติกเกอร์) — the two stages never touch each other's stock.
  const handleConfirmOrder = async (item) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const p = item.product || {};
    const qty = parseFloat(p.quantityPcs || p.quantity || p.bottleCount) || 0;
    const ml = parseFloat(p.fillVolume || p.bottleSize) || 0;
    const quantityKg = orderBatchKg(p);
    const isDev = item.order?.orderType === "develop" || p.isDevelopment;
    const formula = resolveFormula(p);

    // /bom/confirm-production 400s on a blank formula or zero quantity — say what
    // is missing rather than firing a request that cannot pass.
    const missing = [];
    if (!p.formulaName?.trim() && !formula) missing.push("สูตรผลิต");
    if (!isDev) {
      if (!(qty > 0)) missing.push("จำนวนที่ต้องผลิต (ตอนนี้เป็น 0)");
      if (!(quantityKg > 0)) missing.push("ขนาดขวด/ปริมาณบรรจุ (คำนวณเป็นกิโลกรัมไม่ได้)");
    }
    if (missing.length) {
      alert(`ยืนยันไม่ได้ — ข้อมูลไม่ครบ:\n• ${missing.join("\n• ")}\n\nกรุณาแก้ไขรายการใบสั่งผลิตในหน้า Sales ก่อน`);
      return;
    }
    if ((!formula || formula.isArchived) && !isDev) {
      alert(`ยืนยันไม่ได้ — สูตร "${formula?.name || p.formulaName}" ถูก archive หรือไม่พบในระบบ BOM`);
      return;
    }

    setConfirmingOrder(true);
    try {
      // 1. Deduct chemicals + create the production lot (idempotent: skip when the
      //    line already carries a producedLotId from an earlier confirm or is a custom develop formula without BOM).
      // Development orders must never consume stock, even when their line
      // happens to resolve to an existing BOM formula.
      if (!isDev && !p.producedLotId && formula && quantityKg > 0) {
        await api.post("/bom/confirm-production", {
          formulaId: formula._id,
          quantityKg,
          productId: formula._id,
          lotNo: "LOT-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
          mfgDate: p.mfgDate || new Date().toISOString().slice(0, 10),
          expDate: p.expDate || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
          lotQuantity: qty,
          customer: item.order.name,
          customerId: item.order._id,
          productIndex: item.productIndex
        });
      }

      // 2. Update status: for develop orders, set status to 'กำลังผลิต' and step 2 so it moves into 'กำลังผลิต/กำลังพัฒนาสูตร' tab in R&D
      await api.put(
        `/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`,
        {
          productionStatus: "กำลังผลิต",
          productionStep: 2
        });

      // No success alert: the confirm dialog already said what would happen, and
      // the row leaving this tab is the confirmation.
      setSelectedItem(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to confirm production:", error);
      alert("เกิดข้อผิดพลาดในการยืนยันผลิต: " + (error.response?.data?.message || error.response?.data?.error || error.message));
    } finally {
      setConfirmingOrder(false);
      setConfirmOrderTarget(null);
    }
  };

  // Flatten orders into product-centric development items
  const devItems = useMemo(() => {
    const items = [];
    orders.forEach((o) => {
      // Sales fulfils samples directly from finished-product stock. Keep them
      // out of every R&D stage even if stale/cached API data still contains one.
      if (o.orderType === "sample") return;

      const op = o.orderedProducts;
      if (!op) return;

      const products = Array.isArray(op) ? op : [op];
      products.forEach((p, idx) => {
        const prodObj = typeof p === "string" ? { formulaName: p } : p;
        if (!prodObj) return;

        items.push({
          order: o,
          product: prodObj,
          productIndex: idx,
          id: `${o._id}-${idx}`,
          stage: stageOf(o, prodObj)
        });
      });
    });
    return items;
  }, [orders]);

  // Group by workflow stage
  const devItemsByStage = useMemo(() => {
    const acc = { received: [], producing: [], qc: [], done: [] };
    devItems.forEach((item) => {
      if (acc[item.stage]) {
        acc[item.stage].push(item);
      }
    });
    return acc;
  }, [devItems]);

  // Filter based on active tab and search term
  const filteredDevItems = useMemo(() => {
    const items = devItemsByStage[active] || [];
    if (!searchTerm.trim()) return items;
    const query = searchTerm.toLowerCase();
    return items.filter((item) => {
      const custName = (item.order.name || "").toLowerCase();
      const formulaName = (item.product.formulaName || "").toLowerCase();
      const brand = (item.product?.brand || item.order.brand || "").toLowerCase();
      return custName.includes(query) || formulaName.includes(query) || brand.includes(query);
    });
  }, [devItemsByStage, active, searchTerm]);

  const counts = {
    received: devItemsByStage.received.length,
    producing: devItemsByStage.producing.length,
    qc: devItemsByStage.qc.length,
    done: devItemsByStage.done.length,
    stock: ingredients.length,
    bom: formulas.length,
    calculator: formulas.length,
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <HeroBanner
        title="R&D"
        subtitle="ศูนย์วิจัยและพัฒนาสูตร — ติดตามงานพัฒนาสูตร ตั้งแต่รับใบสั่งจนส่งมอบ พร้อมคลังวัตถุดิบและสูตร BOM"
      >
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className="h-4 w-4 shrink-0 text-green-600" />
            <span>รีเฟรช</span>
          </button>
        )}
      </HeroBanner>

      {/* Widget tab bar — Stock-style cards */}
      <div className="grid grid-cols-2 gap-3 w-full md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActive(t.id);
                setSearchTerm(""); // Clear search when tab changes
                setSelectedItem(null); // Clear selected item when tab changes
              }}
              className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "text-green-600 scale-110" : "text-slate-400"}`} />
                <span className={`text-xs md:text-sm tracking-tight ${isActive ? "font-black" : "font-bold text-slate-600"}`}>
                  {t.label}
                </span>
              </div>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
                isActive ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {counts[t.id]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab content — stock/bom render their own BOM-style card; order stages share a wrapper */}
      {active === "stock" ? (
        <StockTable 
          ingredients={ingredients} 
          onAddIngredient={() => setIngModalOpen(true)}
          onAdjustStock={(item, type) => {
            setSelectedAdjustItem(item);
            setAdjustType(type);
            setAdjustDrawerOpen(true);
          }}
        />
      ) : active === "bom" ? (
        <BomMatrix 
          formulas={formulas} 
          ingredients={ingredients} 
          onManageFormulas={() => setManageFormulasModalOpen(true)}
        />
      ) : active === "calculator" ? (
        <ProductChemicalCalculator
          formulas={formulas}
          ingredients={ingredients}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
          {/* Search bar inside the Data Table of Order Stages */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อลูกค้า สูตร หรือแบรนด์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Grid Layout: Left Cards vs Right Details Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Customer Cards */}
            <div className={`${
              (active === "received") || (active === "qc" && selectedItem)
                ? "lg:col-span-5"
                : "lg:col-span-12"
            } flex flex-col gap-3 min-h-[300px]`}>
              {active === "received" && (
                <OrderStage
                  items={filteredDevItems}
                  stageIcon={Inbox}
                  emptyTitle="ยังไม่มีใบสั่งผลิตพัฒนาสูตร"
                  emptyHint="ใบสั่งผลิตพัฒนาสูตรที่รับเข้ามาจะแสดงที่นี่"
                  onItemClick={setSelectedItem}
                  selectedId={selectedItem?.id}
                  isReceived={true}
                  grouped={true}
                  formulas={formulas}
                />
              )}
              {active === "producing" && (
                <OrderStage
                  items={filteredDevItems}
                  stageIcon={Factory}
                  emptyTitle="ยังไม่มีงานที่รอ QC"
                  emptyHint="งานที่ผลิตเสร็จจากฝั่ง Production แล้วรอ QC จะแสดงที่นี่"
                  onItemClick={setSelectedItem}
                  selectedId={selectedItem?.id}
                  statusOverride="รอ QC (In-Process QC)"
                  formulas={formulas}
                  onNavToQc={async (item) => {
                    if (item?.order?._id) {
                      try {
                        await api.put(`/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`, {
                          productionStatus: "รอ QC",
                          productionStep: 5
                        });
                        if (onRefresh) onRefresh();
                      } catch (e) {
                        console.error("Failed to update status to QC:", e);
                      }
                    }
                    setActive("qc");
                  }}
                  onNavToReceived={async (item) => {
                    if (item?.order?._id) {
                      try {
                        await api.put(`/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`, {
                          productionStatus: "รับใบสั่งผลิต",
                          productionStep: 1
                        });
                        if (onRefresh) onRefresh();
                      } catch (e) {
                        console.error("Failed to update status to Received:", e);
                      }
                    }
                    setActive("received");
                  }}
                />
              )}
              {active === "qc" && (
                <OrderStage
                  items={filteredDevItems}
                  stageIcon={FlaskConical}
                  emptyTitle="ยังไม่มีงานในขั้น QC / ทดลอง"
                  emptyHint="งานที่รอ QC หรือส่งให้ลูกค้าทดลองจะแสดงที่นี่"
                  onItemClick={setSelectedItem}
                  selectedId={selectedItem?.id}
                  formulas={formulas}
                />
              )}
              {active === "done" && (
                <OrderStage
                  items={filteredDevItems}
                  stageIcon={CheckCircle2}
                  emptyTitle="ยังไม่มีลูกค้าที่ผ่าน QC"
                  emptyHint="ลูกค้าที่ผ่านการ QC เสร็จแล้วจะแสดงที่นี่ พร้อมวันเวลาที่ QC เสร็จ"
                  onItemClick={setSelectedItem}
                  selectedId={selectedItem?.id}
                  statusOverride="QC เสร็จแล้ว"
                  statusTone="emerald"
                  showQcTimestamp={true}
                  formulas={formulas}
                />
              )}
            </div>

            {/* Right Column: Chemical & Formula Plan Details or QC Details Panel */}
            {((active === "received") || (active === "qc" && selectedItem)) && (
            <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-slate-50/50 p-6 flex flex-col gap-5 min-h-[450px]">
              {(active === "received" || active === "producing") ? (
                <>
                  <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      {active === "received" && (selectedItem?.order?.orderType === "develop" || selectedItem?.product?.isDevelopment) ? "ข้อมูลการพัฒนาสูตร" : "วัตถุดิบสารเคมีที่ต้องใช้ตามแผนผลิต"}
                    </h3>
                    {selectedItem && (
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="text-[14px] font-bold text-slate-400 hover:text-slate-650 transition-colors"
                      >
                        ล้างการเลือก
                      </button>
                    )}
                  </div>

                  {selectedItem ? (
                    <div className="space-y-5 text-left flex flex-col justify-between h-full">
                      <div className="space-y-5">
                        {/* Customer Order Info */}
                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{selectedItem.order.name || "ไม่ระบุชื่อ"}</p>
                          </div>
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedItem.product?.brand || selectedItem.order.brand || "-"}</p>
                          </div>
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สูตรสั่งผลิต</span>
                            <p className="text-xs font-extrabold text-green-700 mt-0.5">🧪 {selectedItem.product.formulaName}</p>
                          </div>
                          {selectedItem.order?.orderType !== "develop" && !selectedItem.product?.isDevelopment && (
                            <div>
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">จำนวนที่สั่ง</span>
                              <p className="text-xs font-bold text-slate-700 mt-0.5">
                                {selectedItem.product.quantityPcs ? `${fmt(selectedItem.product.quantityPcs)} ชิ้น` : "-"}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Customer brief / notes (if available) */}
                        {(() => {
                          const p = selectedItem.product;
                          const hasStructured = p.productCategory || p.targetSkinPet || p.desiredClaim || p.textureColorScent || p.ingredientsMustHaveAvoid || p.budgetAndQty || p.timelineTarget || p.referenceSample || p.targetPackaging || p.marketStandard || p.shelfLife || p.ipNdaAgreement;
                          if (!hasStructured && !p.brief) return null;

                          return (
                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-3xs space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                  ความต้องการและรายละเอียดสเปกจากลูกค้า (Brief Specification)
                                </h4>
                                {(selectedItem.order?.orderType === "develop" || selectedItem.product?.isDevelopment) && (
                                  <button
                                    type="button"
                                    onClick={() => openDevelopSpecDoc({ item: selectedItem.product, customer: selectedItem.order, formulas })}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition-colors cursor-pointer shrink-0"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    ดาวโหลดเอกสารพัฒนาสูตร
                                  </button>
                                )}
                              </div>

                              {hasStructured && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                  {p.productCategory && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">1. หมวดผลิตภัณฑ์</span><span className="font-semibold text-slate-800">{p.productCategory}</span></div>}
                                  {p.targetSkinPet && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">2. กลุ่มสัตว์ / ผิวเป้าหมาย</span><span className="font-semibold text-slate-800">{p.targetSkinPet}</span></div>}
                                  {p.desiredClaim && <div className="p-2 bg-slate-50 rounded-lg sm:col-span-2"><span className="font-bold text-slate-500 block text-[11px]">3. Claim ที่อยากได้</span><span className="font-semibold text-purple-700">{p.desiredClaim}</span></div>}
                                  {p.textureColorScent && <div className="p-2 bg-slate-50 rounded-lg sm:col-span-2"><span className="font-bold text-slate-500 block text-[11px]">4. ลักษณะเนื้อ + สี + กลิ่น</span><span className="font-semibold text-slate-800">{p.textureColorScent}</span></div>}
                                  {p.ingredientsMustHaveAvoid && <div className="p-2 bg-slate-50 rounded-lg sm:col-span-2"><span className="font-bold text-slate-500 block text-[11px]">5. สารต้องมี / สารต้องห้าม</span><span className="font-semibold text-slate-800">{p.ingredientsMustHaveAvoid}</span></div>}
                                  {p.budgetAndQty && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">6. งบต่อหน่วย + จำนวน</span><span className="font-semibold text-slate-800">{p.budgetAndQty}</span></div>}
                                  {p.timelineTarget && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">7. Timeline</span><span className="font-semibold text-slate-800">{p.timelineTarget}</span></div>}
                                  {p.referenceSample && <div className="p-2 bg-slate-50 rounded-lg sm:col-span-2"><span className="font-bold text-slate-500 block text-[11px]">8. ตัวอย่างอ้างอิง</span><span className="font-semibold text-slate-800">{p.referenceSample}</span></div>}
                                  {p.targetPackaging && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">9. บรรจุภัณฑ์ที่จะใช้</span><span className="font-semibold text-slate-800">{p.targetPackaging}</span></div>}
                                  {p.marketStandard && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">10. ตลาด + มาตรฐาน</span><span className="font-semibold text-slate-800">{p.marketStandard}</span></div>}
                                  {p.shelfLife && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">11. Shelf life</span><span className="font-semibold text-slate-800">{p.shelfLife}</span></div>}
                                  {p.ipNdaAgreement && <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-500 block text-[11px]">12. สิทธิเจ้าของสูตร (IP) / NDA</span><span className="font-semibold text-slate-800">{p.ipNdaAgreement}</span></div>}
                                </div>
                              )}

                              {p.brief && (
                                <div className="p-2.5 bg-slate-50 rounded-lg">
                                  <span className="font-bold text-slate-500 block text-[11px] mb-0.5">หมายเหตุสรุปรวม / Brief Note</span>
                                  <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">{p.brief}</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Formula details or Custom Formula Creator for Develop orders */}
                        {(() => {
                          const isDevItem = selectedItem.order?.orderType === "develop" || selectedItem.product?.isDevelopment;
                          const formula = resolveFormula(selectedItem.product);

                          if (isDevItem) {
                            return (
                              <div className="space-y-4 bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
                                <div className="space-y-3">
                                  {customFormulas.map((cf, cIdx) => (
                                    <div key={cIdx} className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-extrabold text-purple-800 flex items-center gap-1.5 flex-wrap">
                                          🧪 สูตรพัฒนาทางเลือกที่ {cIdx + 1}
                                          {cf.formulaId && (
                                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white text-purple-600 border border-purple-200">สูตรจริงในระบบ</span>
                                          )}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {/* View & Edit Formula Details Modal */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const targetF = formulas.find(f => f._id === cf.formulaId || f.name === cf.name);
                                              if (targetF) {
                                                setCopyBaseFormula(targetF);
                                                setCopyName(targetF.name);
                                              } else {
                                                setCopyBaseFormula({ name: cf.name, ingredients: [], procedures: [], note: [] });
                                                setCopyName(cf.name);
                                              }
                                              setManageFormulasModalOpen(true);
                                            }}
                                            className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg cursor-pointer text-[11px] font-bold flex items-center gap-1 transition-colors"
                                            title="เปิดแก้ไขหน้าต่างสูตรผลิต B.O.M."
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>ดูสูตรทางเลือกนี้</span>
                                          </button>

                                          <button
                                            type="button"
                                            disabled={deletingDevIdx === cIdx}
                                            onClick={() => removeDevFormula(cIdx)}
                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer disabled:opacity-40"
                                            title="เก็บถาวรสูตรนี้ (เก็บประวัติ BOM เดิมไว้)"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <input
                                        type="text"
                                        readOnly
                                        value={cf.name || ""}
                                        className="w-full p-2.5 bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none cursor-not-allowed select-none"
                                        title="ชื่อสูตรพัฒนาถูกล็อกไว้อัตโนมัติ"
                                      />

                                      <textarea
                                        ref={(el) => autoGrow(el)}
                                        rows={2}
                                        value={cf.description || ""}
                                        onChange={(e) => {
                                          autoGrow(e.target);
                                          const val = e.target.value;
                                          const next = customFormulas.map((f, i) => i === cIdx ? { ...f, description: val } : f);
                                          setCustomFormulas(next);
                                        }}
                                        onBlur={() => {
                                          api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, {
                                            customFormulas: customFormulas
                                          }).catch(() => {});
                                        }}
                                        className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-700 outline-none focus:border-purple-500 leading-relaxed resize-none overflow-hidden"
                                        placeholder="รายละเอียดส่วนผสม Active Ingredient / สเปกสูตรพัฒนา..."
                                      />

                                      {/* Customer Feedback Comment Display */}
                                      {(cf.resultStatus || cf.resultNote) && (
                                        <div className="p-2.5 bg-white border-2 border-slate-300 rounded-lg space-y-1 mt-1.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold text-slate-900 font-black flex items-center gap-1">
                                              💬 Comment จากลูกค้า:
                                            </span>
                                            {cf.resultStatus && (
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                cf.resultStatus === "pass"
                                                  ? "bg-green-600 text-white font-black"
                                                  : "bg-red-600 text-white font-black"
                                              }`}>
                                                {cf.resultStatus === "pass" ? "✓ ผ่าน" : "✕ ไม่ผ่าน"}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-900 font-extrabold bg-slate-100 p-2.5 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
                                            {cf.resultNote || "-"}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {customFormulas.length === 0 && (
                                    <div className="py-6 text-center text-xs font-semibold text-purple-400 border border-dashed border-purple-200 rounded-xl bg-purple-50/20">
                                      ยังไม่ได้สร้างสูตรพัฒนา — กด "+ เพิ่มช่องสร้างสูตรพัฒนา" ด้านล่างเพื่อเริ่มสร้างสูตร
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const n = customFormulas.length + 1;
                                      const defaultName = `${selectedItem.product.formulaName || "สูตรพัฒนา"} - ${selectedItem.order.name || "ลูกค้า"} (ทางเลือก ${n})`;
                                      setCopyName(defaultName);
                                      setCopyBaseFormula(null);
                                      setPendingDevAppend(true);
                                      setManageFormulasModalOpen(true);
                                    }}
                                    className="w-full py-2.5 border border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-700 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    <Plus className="h-4 w-4" />
                                    สร้างสูตรคำนวณ B.O.M. ใหม่ (สร้างได้ไม่จำกัด)
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (formula) {
                            const alreadyAdjusted = /ปรับปรุง\s+ของ|สูตรเฉพาะตัว\s+ของ/.test(selectedItem.product.formulaName || "");
                            const isAdjust = formulaTypeLabel(selectedItem.order, selectedItem.product) === "ปรับสูตร" && !alreadyAdjusted;
                            return (
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between pb-2 mb-2">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                      รายการสารเคมีในสูตร ({formula.name})
                                    </h4>
                                    {formula.color && (
                                      <span 
                                        className="w-4.5 h-4.5 rounded-full border border-slate-355 shadow-2xs" 
                                        style={{ backgroundColor: formula.color }}
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="relative">
                                    {/* Copy base formula overlay for ปรับสูตร */}
                                    {isAdjust && (
                                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs rounded-xl z-10 flex items-center justify-center p-4">
                                        <div className="bg-white p-4 rounded-2xl shadow-xl max-w-xs text-center border border-slate-200">
                                          <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Copy className="h-5 w-5" />
                                          </div>
                                          <h4 className="text-xs font-black text-slate-800">สำเนาสูตรเพื่อปรับปรุงเฉพาะลูกค้า</h4>
                                          <p className="text-[13px] text-slate-500 font-semibold mt-1 mb-3">
                                            กดปุ่มเพื่อคัดลอกสูตรดั้งเดิม "{formula.name}" มาสร้างสูตรปรับปรุงใหม่ของลูกค้ารายนี้
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => handleForkFormula(selectedItem, formula)}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs transition-colors"
                                          >
                                            คัดลอกและสร้างสูตรปรับปรุง
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* The shared plan table — same one Production prints from, so
                                        R&D and the shop floor read identical numbers. It carries the
                                        phase order, the 100 g base, per-1 kg, the required weight and
                                        the stock check. Do not hand-roll a table here: the local copy
                                        that replaced it read an `ing.percentage` field the API never
                                        sends, which printed an empty % and NaN for every row. */}
                                    <IngredientPlanTable
                                      showStock
                                      rows={(formula.ingredients || []).map((ing, idx) => {
                                        const sr = receivedStock?.rows?.[idx];
                                        return {
                                          name: ing.name,
                                          phase: ing.phase,
                                          gramsPerKg: (parseFloat(ing.ratio) || 0) * 1000,
                                          required: sr?.required || 0,
                                          stock: sr?.stock,
                                          short: sr?.short
                                        };
                                      })}
                                    />
                                  </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2.5">
                                    วิธีการผลิต / ขั้นตอนการผสม
                                  </h4>
                                  {formula.procedures && formula.procedures.length > 0 ? (
                                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600 font-medium">
                                      {formula.procedures.map((step, idx) => (
                                        <li key={idx} className="leading-relaxed">
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">ไม่ได้ระบุวิธีทำไว้ในสูตร BOM</p>
                                  )}
                                </div>

                                {formula.note && formula.note.length > 0 && (
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2">
                                      หมายเหตุของสูตร
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 font-medium">
                                      {formula.note.map((n, idx) => (
                                        <li key={idx} className="leading-relaxed">{n}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {selectedItem.order?.notes && (
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2">
                                      หมายเหตุลูกค้าของ SALE
                                    </h4>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                      {selectedItem.order.notes}
                                    </p>
                                  </div>
                                )}

                                {String(selectedItem.product?.notes || "").trim() && (
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2">
                                      หมายเหตุจากใบสั่งผลิต Sale
                                    </h4>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                      {selectedItem.product.notes}
                                    </p>
                                  </div>
                                )}

                                <QcMethodEditor formula={formula} onSave={onUpdateFormula} />
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-4 bg-white border-2 border-slate-300 text-slate-900 font-black text-xs rounded-xl flex flex-col gap-1 font-semibold leading-relaxed shadow-3xs">
                                <p>⚠️ ยังไม่มีข้อมูลสูตรดั้งเดิมชื่อ "{selectedItem.product.formulaName}" ในฐานข้อมูล BOM</p>
                                <p className="text-[14px] text-amber-600 font-medium mt-1">
                                  *คุณสามารถเพิ่มสูตรได้ที่เมนู "BOM Calculator"
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Confirm Production / Progress Status Button Container */}
                      <div className="pt-4 border-t border-slate-200 mt-6">
                        {selectedItem.stage === "received" ? (
                          <>
                            {(() => {
                              const isDevItem = selectedItem.order?.orderType === "develop" || selectedItem.product?.isDevelopment;
                              const resolvedReceived = resolveFormula(selectedItem.product);
                              const formulaUnavailable = !resolvedReceived || resolvedReceived.isArchived;
                              const isDisabled = (!isDevItem && (receivedStock?.anyShort || formulaUnavailable)) || confirmingOrder;
                              return (
                                <>
                                  <button
                                    onClick={() => setConfirmOrderTarget(selectedItem)}
                                    disabled={isDisabled}
                                    className={`w-full py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                                      isDisabled
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-green-600 hover:bg-green-700 text-white cursor-pointer active:scale-[0.98] shadow-green-100"
                                    }`}
                                  >
                                    <Check className="h-4 w-4" />
                                    <span>{confirmingOrder ? "กำลังดำเนินการ..." : (isDevItem ? "ยืนยันเริ่มพัฒนาสูตร" : "ยืนยันเริ่มผลิต (ตัดสต็อกสารเคมี)")}</span>
                                  </button>
                                  {!isDevItem && receivedStock?.anyShort && (
                                    <p className="text-[14px] text-red-500 font-bold text-center mt-2">
                                      วัตถุดิบสารเคมีในคลังไม่เพียงพอสำหรับล็อตนี้ — เติมสต็อกก่อนเริ่มผลิต
                                    </p>
                                  )}
                                  {!isDevItem && formulaUnavailable && (
                                    <p className="text-[14px] text-amber-600 font-bold text-center mt-2">
                                      ไม่สามารถเริ่มผลิตได้ — สูตร BOM {resolvedReceived?.isArchived ? "ถูก archive" : "ยังไม่ผูก ID หรือไม่พบสูตร"} กรุณา refresh และตรวจสอบ BOM
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </>
                        ) : selectedItem.stage === "producing" ? (
                          <div className="flex flex-col gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActive("qc");
                              }}
                              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                            >
                              <Send className="h-4 w-4" />
                              <span>ไปยัง Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActive("received");
                              }}
                              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              <span>กลับไปแก้ไข ใบสั่งพัฒนาสูตร</span>
                            </button>
                          </div>
                        ) : selectedItem.stage === "qc" ? (
                          <button
                            disabled
                            className="w-full py-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <FlaskConical className="h-4 w-4 text-blue-500 animate-bounce" />
                            <span>อยู่ในกระบวนการทดลองและตรวจสอบ QC</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-3.5 bg-slate-100 text-slate-450 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                            <span>เสร็จสิ้นและส่งมอบเรียบร้อยแล้ว</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400 my-auto">
                      <FlaskConical className="h-10 w-10 text-slate-300 stroke-1 mb-3 animate-pulse" />
                      <p className="text-xs font-bold text-slate-600">เลือกรายชื่อลูกค้าฝั่งซ้าย</p>
                      <p className="text-[15px] text-slate-400 mt-1.5">เพื่อแสดงสัดส่วนวัตถุดิบและขั้นตอนวิธีผลิต</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* If this is a develop order, render the Custom Formulas Evaluation panel */}
                  {(selectedItem?.order?.orderType === "develop" || selectedItem?.product?.isDevelopment) ? (
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-purple-900 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                            ผลการทดสอบและประเมินสูตรทางเลือกจากลูกค้า (Sample Trial Results)
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            เลือกสูตรทางเลือกที่ลูกค้าประเมินผลผ่าน/ไม่ผ่าน พร้อมบันทึกหมายเหตุข้อเสนอแนะ
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedItem(null)}
                          className="text-[14px] font-bold text-slate-400 hover:text-slate-650 transition-colors"
                        >
                          ล้างการเลือก
                        </button>
                      </div>

                      {/* Header customer summary card (2 rows) */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3">
                        <div className="flex flex-col gap-2.5 divide-y divide-slate-100">
                          {/* Row 1: ลูกค้า & แบรนด์ */}
                          <div className="grid grid-cols-2 gap-3 pb-2.5">
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 block uppercase">ลูกค้า</span>
                              <span className="text-xs font-black text-slate-800">{selectedItem.order?.name || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 block uppercase">แบรนด์</span>
                              <span className="text-xs font-black text-slate-800">{selectedItem.product?.brand || selectedItem.order?.brand || "-"}</span>
                            </div>
                          </div>

                          {/* Row 2: สูตรที่สั่งผลิต & เบอร์โทรศัพท์ */}
                          <div className="grid grid-cols-2 gap-3 pt-2.5">
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 block uppercase">สูตรที่สั่งผลิต</span>
                              <span className="text-xs font-black text-purple-700">🧪 {selectedItem.product?.formulaName || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 block uppercase">เบอร์โทรศัพท์</span>
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-blue-600 shrink-0" />
                                {selectedItem.order?.phone || selectedItem.order?.tel || "-"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Call Reminder Alert Box */}
                        <div className="p-2.5 bg-white border-2 border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-900 font-black text-xs font-bold">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 animate-bounce" />
                          <span>กรุณาโทรศัพท์ติดต่อคุยรายละเอียดผลการทดลองสูตรกับลูกค้าโดยตรง</span>
                        </div>
                      </div>

                      {/* Custom Formulas Evaluation Cards */}
                      <div className="space-y-3">
                        {customFormulas.map((cf, cIdx) => (
                          <div key={cIdx} className="p-4 bg-white rounded-xl border border-purple-200 shadow-3xs space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                🧪 สูตรพัฒนาทางเลือกที่ {cIdx + 1}: <span className="text-slate-800 font-bold">{cf.name}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const targetF = formulas.find(f => f._id === cf.formulaId || f.name === cf.name);
                                  if (targetF) {
                                    setCopyBaseFormula(targetF);
                                    setCopyName(targetF.name);
                                  } else {
                                    setCopyBaseFormula({ name: cf.name, ingredients: [], procedures: [], note: [] });
                                    setCopyName(cf.name);
                                  }
                                  setManageFormulasModalOpen(true);
                                }}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg cursor-pointer text-[11px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>ดูสูตรนี้</span>
                              </button>
                            </div>

                            {cf.description && (
                              <p className="text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {cf.description}
                              </p>
                            )}

                            {/* Pass / Fail Buttons */}
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <span className="text-xs font-bold text-slate-700">ผลการประเมินจากลูกค้า:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = customFormulas.map((f, i) => i === cIdx ? { ...f, resultStatus: "pass" } : f);
                                    setCustomFormulas(next);
                                    api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, { customFormulas: next }).catch(() => {});
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                                    cf.resultStatus === "pass"
                                      ? "bg-green-600 text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700 border border-slate-200"
                                  }`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>ผ่าน (ลูกค้าเลือก)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = customFormulas.map((f, i) => i === cIdx ? { ...f, resultStatus: "fail" } : f);
                                    setCustomFormulas(next);
                                    api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, { customFormulas: next }).catch(() => {});
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                                    cf.resultStatus === "fail"
                                      ? "bg-red-600 text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200"
                                  }`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>ไม่ผ่าน</span>
                                </button>
                              </div>
                            </div>

                            {/* Note input */}
                            <div className="flex flex-col gap-1 pt-1">
                              <label className="text-[11px] font-bold text-slate-500">หมายเหตุ / ข้อเสนอแนะการปรับแก้จากลูกค้า</label>
                              <input
                                type="text"
                                value={cf.resultNote || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const next = customFormulas.map((f, i) => i === cIdx ? { ...f, resultNote: val } : f);
                                  setCustomFormulas(next);
                                }}
                                onBlur={() => {
                                  api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, { customFormulas: customFormulas }).catch(() => {});
                                }}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white"
                                placeholder="ระบุความคิดเห็นลูกค้า เช่น ชอบเนื้อสัมผัสแต่ขอเพิ่มกลิ่นหอมอีกนิด..."
                              />
                            </div>
                          </div>
                        ))}

                        {customFormulas.length === 0 && (
                          <div className="p-6 text-center text-xs font-semibold text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            ยังไม่มีรายการสูตรทางเลือกที่สร้างไว้
                          </div>
                        )}
                      </div>

                      {/* Final Decision Action Buttons */}
                      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                        {/* Button 1: ไม่ผ่าน (ลบสูตรที่ไม่ผ่านออกจาก BOM และย้อนกลับไปแก้ไขใบสั่งพัฒนาสูตร) */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedItem) return;
                            try {
                              // Find all formulas marked as 'fail' or all unapproved formulas if all failed
                              const failedFormulas = customFormulas.filter(f => f.resultStatus === "fail");
                              const targetFailed = failedFormulas.length > 0 ? failedFormulas : customFormulas;

                              // Delete failed formulas from BOM database
                              for (const target of targetFailed) {
                                if (target.formulaId) await onDeleteFormula(target.formulaId);
                              }

                              // Keep only formulas that were passed (if any) or clear customFormulas list
                              const remainingFormulas = customFormulas.filter(f => f.resultStatus !== "fail");

                              await api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, {
                                productionStatus: "รับใบสั่งผลิต",
                                productionStep: 1,
                                customFormulas: remainingFormulas
                              });

                              setCustomFormulas(remainingFormulas);
                              setSelectedItem(null);
                              setActive("received");
                              if (onRefresh) onRefresh();
                            } catch (e) {
                              alert("ไม่สามารถเปลี่ยนสถานะได้: " + (e?.response?.data?.message || e?.message));
                            }
                          }}
                          className="w-full sm:w-1/2 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <X className="h-4 w-4 text-red-600" />
                          <span>ไม่ผ่าน — ลบสูตรทิ้งและกลับไปแก้ไขใบสั่งพัฒนาสูตร</span>
                        </button>

                        {/* Button 2: ผ่าน (ย้ายงานไปเสร็จสมบูรณ์ และย้ายลูกค้าใน Sales ไป Retention 1) */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedItem) return;
                            const approvedFormula = customFormulas.find(f => f.resultStatus === "pass");
                            try {
                              await api.put(`/production/orders/${selectedItem.order._id}/status?productIndex=${selectedItem.productIndex}`, {
                                productionStatus: "ผ่าน QC แล้ว",
                                productionStep: 6,
                                rndQcAt: new Date().toISOString(),
                                selectedFormulaName: approvedFormula?.name || selectedItem.product?.formulaName
                              });

                              // Move customer in Sales CRM to Retention 1
                              try {
                                const crmRes = await api.get("/sales/columns");
                                const retentionCol = (crmRes.data || []).find(c => /^retention\s*1$/i.test(c.label || ""));
                                if (retentionCol && selectedItem.order?._id) {
                                  await api.put(`/sales/${selectedItem.order._id}`, {
                                    section: retentionCol.id,
                                    previousSection: "",
                                    isReturningCustomer: true,
                                    orderType: "",
                                    orderedProducts: []
                                  });
                                }
                              } catch (crmErr) {
                                console.error("Could not auto-move lead to Retention 1:", crmErr);
                              }

                              setSelectedItem(null);
                              setActive("done");
                              if (onRefresh) onRefresh();
                            } catch (e) {
                              alert("ไม่สามารถอนุมัติสูตรผ่าน QC ได้: " + (e?.response?.data?.message || e?.message));
                            }
                          }}
                          className="w-full sm:w-1/2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                        >
                          <Check className="h-4 w-4" />
                          <span>ผ่าน — ส่งไปงานที่เสร็จแล้ว (ย้ายเข้า Retention 1)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                          ตรวจสอบคุณภาพ (QC Verification)
                        </h3>
                        <button
                          onClick={() => setSelectedItem(null)}
                          className="text-[14px] font-bold text-slate-400 hover:text-slate-650 transition-colors"
                        >
                          ล้างการเลือก
                        </button>
                      </div>
                      <QcDetailPanel
                        item={selectedItem}
                        formula={resolveFormula(selectedItem?.product)}
                        packagings={packagings}
                        nozzles={nozzles}
                        onSaveSpec={onUpdateFormula}
                        checklist={qcChecklist}
                        onSetCheck={handleSetQcCheck}
                        photos={qcPhotos}
                        uploading={qcUploading}
                        onUploadPhoto={uploadQcPhoto}
                        canConfirm={qcCanConfirm}
                        submitting={qcSubmitting}
                        onConfirm={() => setConfirmQcTarget(selectedItem)}
                      />
                    </>
                  )}
                </>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      <FormulaManagerModal
        isOpen={manageFormulasModalOpen}
        onClose={() => { setManageFormulasModalOpen(false); setCopyBaseFormula(null); setCopyName(""); setPendingDevAppend(false); }}
        formulas={formulas}
        ingredients={ingredients}
        onCreateFormula={onCreateFormula}
        onUpdateFormula={onUpdateFormula}
        onDeleteFormula={onDeleteFormula}
        autoCopyFormula={copyBaseFormula}
        autoCopyName={copyName}
        onAutoCopySaved={handleAutoCopySaved}
      />

      {/* ─── Modal View Single Custom Formula Details ────────────────────────── */}
      {viewFormulaTarget && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[80] transition-opacity"
            onClick={() => setViewFormulaTarget(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[85]">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-purple-200 bg-purple-100/90 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <FlaskConical className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{viewFormulaTarget.name}</h3>
                    <p className="text-xs font-bold text-purple-800">รายละเอียดตารางสูตรคำนวณ BOM เฉพาะทางเลือกนี้</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewFormulaTarget(null)}
                  className="p-1.5 rounded-full hover:bg-purple-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left bg-white">
                {/* Ingredients Table */}
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>รายการสารเคมีในสูตร (อัตราส่วนต่อ 1 กิโลกรัม)</span>
                    {viewFormulaTarget.color && (
                      <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: viewFormulaTarget.color }} />
                    )}
                  </h4>

                  {viewFormulaTarget.ingredients && viewFormulaTarget.ingredients.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                          <tr>
                            <th className="p-2.5">ลำดับ</th>
                            <th className="p-2.5">เฟส (Phase)</th>
                            <th className="p-2.5">ชื่อวัตถุดิบสารเคมี</th>
                            <th className="p-2.5 text-right">สัดส่วน (กรัม/กก.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                          {viewFormulaTarget.ingredients.map((ing, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2.5 font-extrabold text-purple-700">{ing.phase || "-"}</td>
                              <td className="p-2.5 font-bold text-slate-900">{ing.name}</td>
                              <td className="p-2.5 text-right font-mono font-extrabold text-slate-950">
                                {((parseFloat(ing.ratio) || 0) * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ก.
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold italic text-center">
                      ไม่มีตารางสารเคมีระบุในสูตร BOM นี้
                    </div>
                  )}
                </div>

                {/* Procedures */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-2.5">
                    ขั้นตอนวิธีการผลิต / วิธีการผสมสาร
                  </h4>
                  {viewFormulaTarget.procedures && viewFormulaTarget.procedures.length > 0 ? (
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-800 font-semibold">
                      {viewFormulaTarget.procedures.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-400 italic">ไม่ได้ระบุขั้นตอนวิธีผลิตไว้</p>
                  )}
                </div>

                {/* Notes */}
                {viewFormulaTarget.note && viewFormulaTarget.note.length > 0 && (
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-3xs">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-2">
                      หมายเหตุของสูตร / คำเตือน
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800 font-semibold">
                      {viewFormulaTarget.note.map((n, idx) => (
                        <li key={idx} className="leading-relaxed">{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setViewFormulaTarget(null)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <IngredientManagerModal
        isOpen={ingModalOpen}
        onClose={() => setIngModalOpen(false)}
        onCreateIngredient={onCreateIngredient}
      />

      {/* Confirm-before-deduct dialog. Chemicals leave stock and a production lot
          is created here; neither can be rolled back from this screen, so the
          operator sees exactly what is about to be consumed first. */}
      {/* Confirm passing In-Process QC. Replaces a success alert(): the operator sees
          what they are signing off BEFORE it moves, not a popup after. */}
      {confirmQcTarget && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60]"
            onClick={() => !qcSubmitting && setConfirmQcTarget(null)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[65]">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-left">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-800">ยืนยันผ่าน In-Process QC</h3>
                  <p className="text-[14px] text-slate-500 font-semibold mt-0.5">
                    ตรวจครบทุกข้อแล้ว — ยืนยันเพื่อส่งกลับสายการผลิต
                  </p>
                </div>
                <button
                  type="button"
                  disabled={qcSubmitting}
                  onClick={() => setConfirmQcTarget(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["ลูกค้า", confirmQcTarget.order?.name || "-"],
                    ["สูตรผลิต", confirmQcTarget.product?.formulaName || "-"],
                    ["จำนวนที่สั่ง", `${fmt(confirmQcTarget.product?.quantityPcs || 0)} ชิ้น`],
                    ["ผลตรวจ", `ผ่านครบ ${qcItemsForOrder.length}/${qcItemsForOrder.length} ข้อ`]
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">{k}</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block break-words">{v}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[14px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 leading-relaxed">
                  ยืนยันแล้วใบสั่งนี้จะถูกส่งกลับหน้า <b>Production</b> เข้าช่อง <b>บรรจุ / ติดสติ๊กเกอร์ / ยิง LOT / ซีลขวด</b> (QC รอบ 2)
                </p>
              </div>

              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  disabled={qcSubmitting}
                  onClick={() => setConfirmQcTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={qcSubmitting}
                  onClick={() => handleConfirmQc(confirmQcTarget)}
                  className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {qcSubmitting ? "กำลังยืนยัน..." : "ยืนยันผ่าน QC"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmOrderTarget && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60]"
            onClick={() => !confirmingOrder && setConfirmOrderTarget(null)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[65]">
            <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] text-left">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-800">ยืนยันเริ่มผลิต</h3>
                  <p className="text-[14px] text-slate-500 font-semibold mt-0.5">
                    {(confirmOrderTarget.order?.orderType === "develop" || confirmOrderTarget.product?.isDevelopment)
                      ? "ตรวจสอบข้อมูลก่อนเริ่มพัฒนาสูตร — ไม่ตัดสต็อก"
                      : "ตรวจสอบก่อนตัดสต็อกสารเคมี — ย้อนกลับจากหน้านี้ไม่ได้"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirmingOrder}
                  onClick={() => setConfirmOrderTarget(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {(() => {
                  const isDevItem = confirmOrderTarget.order?.orderType === "develop" || confirmOrderTarget.product?.isDevelopment;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">ลูกค้า</span>
                          <span className="text-xs font-black text-slate-800 mt-0.5 block break-words">{confirmOrderTarget.order?.name || "-"}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">สูตรสั่งพัฒนา</span>
                          <span className="text-xs font-black text-purple-700 mt-0.5 block break-words">{confirmOrderTarget.product?.formulaName || "-"}</span>
                        </div>
                        {confirmOrderTarget.product?.brand && (
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 col-span-2">
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">ชื่อแบรนด์</span>
                            <span className="text-xs font-black text-slate-800 mt-0.5 block break-words">{confirmOrderTarget.product.brand}</span>
                          </div>
                        )}
                        {!isDevItem && (
                          <>
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">จำนวนที่สั่ง</span>
                              <span className="text-xs font-black text-slate-800 mt-0.5 block break-words">{fmt(confirmOrderTarget.product?.quantityPcs || 0)} ชิ้น</span>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">ปริมาณเนื้อ</span>
                              <span className="text-xs font-black text-slate-800 mt-0.5 block break-words">{(receivedStock?.batchKg || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} กก.</span>
                            </div>
                          </>
                        )}
                      </div>

                      {isDevItem && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-xs font-bold leading-relaxed">
                          ✨ ใบสั่งพัฒนาสูตรนี้จะถูกย้ายเข้าสู่ขั้นตอน <b>"กำลังผลิต / กำลังพัฒนาสูตร"</b> เพื่อทำการวิจัยและพัฒนาสูตรผลิตภัณฑ์ต่อไป
                        </div>
                      )}
                    </>
                  );
                })()}

                {!(confirmOrderTarget.order?.orderType === "develop" || confirmOrderTarget.product?.isDevelopment) && (
                  <>
                    <div>
                      <p className="text-[14px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                        สารเคมีที่จะถูกตัดออกจากคลัง ({receivedStock?.rows?.length || 0} รายการ)
                      </p>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <tbody className="divide-y divide-slate-100">
                            {(receivedStock?.rows || []).map((r) => (
                              <tr key={r.name}>
                                <td className="px-3 py-1.5 font-bold text-slate-700">{r.name}</td>
                                <td className="px-3 py-1.5 text-right font-mono font-black text-red-600 whitespace-nowrap">
                                  -{fmtChem(r.required)} ก.
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="text-[14px] font-bold text-amber-700 bg-white border-2 border-slate-300 rounded-xl px-3 py-2 leading-relaxed">
                      ยืนยันแล้วระบบจะสร้างล็อตผลิต และส่งใบสั่งนี้ไปช่อง <b>เตรียมพัสดุ</b> ในหน้า Production
                      (บรรจุภัณฑ์จะยังไม่ถูกตัด — ตัดตอนยืนยันเตรียมพัสดุ)
                    </p>
                  </>
                )}
              </div>

              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  disabled={confirmingOrder}
                  onClick={() => setConfirmOrderTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={confirmingOrder}
                  onClick={() => handleConfirmOrder(confirmOrderTarget)}
                  className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {confirmingOrder
                    ? ((confirmOrderTarget.order?.orderType === "develop" || confirmOrderTarget.product?.isDevelopment)
                      ? "กำลังยืนยันเริ่มพัฒนาสูตร..."
                      : "กำลังตัดสต็อกสารเคมี...")
                    : ((confirmOrderTarget.order?.orderType === "develop" || confirmOrderTarget.product?.isDevelopment)
                      ? "ยืนยันเริ่มพัฒนาสูตร"
                      : "ยืนยัน ตัดสต็อกและเริ่มผลิต")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* stock adjust drawer */}
      {adjustDrawerOpen && selectedAdjustItem && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }} />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
            <div className={`p-6 flex justify-between items-center text-left shrink-0 shadow-xs ${adjustType === "in" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
              <div>
                <h2 className="text-sm font-extrabold">{adjustType === "in" ? "เพิ่มจำนวนสต็อก (+)" : "ลดจำนวนสต็อก (-)"}</h2>
                <p className={`text-[14px] font-semibold mt-0.5 ${adjustType === "in" ? "text-green-100" : "text-red-100"}`}>{selectedAdjustItem.name}</p>
              </div>
              <button type="button" className={`p-1.5 rounded-full cursor-pointer transition-colors ${adjustType === "in" ? "hover:bg-green-700 text-white" : "hover:bg-red-700 text-white"}`} onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="flex-1 flex flex-col overflow-hidden text-left bg-white p-6 space-y-4">
              <div className={`p-4 border rounded-xl flex items-center justify-between font-bold text-xs ${adjustType === "in" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <span>จำนวนคงคลังปัจจุบัน</span>
                <span className="font-mono font-extrabold text-sm">{(selectedAdjustItem.openingStock || 0).toLocaleString()} ก.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">{adjustType === "in" ? `จำนวนที่ต้องการเพิ่ม (ก.)` : `จำนวนที่ต้องการลด (ก.)`} <span className="text-red-500">*</span></label>
                <input name="adjustQty" required min="0.0001" type="number" step="any" className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-semibold transition-all ${adjustType === "in" ? "focus:border-green-600 focus:bg-white" : "focus:border-red-600 focus:bg-white"}`} placeholder="ระบุจำนวน เช่น 100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">หมายเหตุ (ระบุสาเหตุการปรับสต็อก)</label>
                <textarea name="adjustNote" className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 h-20 resize-none font-semibold transition-all ${adjustType === "in" ? "focus:border-green-600 focus:bg-white" : "focus:border-red-600 focus:bg-white"}`} placeholder="เช่น ส่งตัวอย่างลูกค้า / ปรับปรุงยอดประจำปี" />
              </div>
              <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-4 overflow-hidden">
                <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block mb-2">ประวัติการเคลื่อนไหว (Log การเดินทาง)</span>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {(() => {
                    const itemLogs = adjustLogs;
                    if (itemLogs.length === 0) {
                      return (
                        <div className="h-full flex items-center justify-center py-6 text-[15px] text-slate-400 font-semibold italic bg-slate-50 rounded-xl border border-slate-100">
                          ยังไม่มีประวัติการเคลื่อนไหวของรายการนี้
                        </div>
                      );
                    }
                    return itemLogs.map((l) => {
                      const movement = l.stockMovement;
                      const isEntry = movement ? movement.direction === "in" : l.description && l.description.includes("รับเข้า");
                      return (
                        <div key={l._id} className={`p-3 rounded-xl border border-slate-200/60 border-l-4 ${isEntry ? "border-l-green-500 bg-green-50/10" : "border-l-red-400 bg-red-50/10"} text-[15px] text-slate-650 flex flex-col gap-1`}>
                          <div className="flex justify-between items-center text-slate-400 text-[13px] font-bold">
                            <span className="font-extrabold text-slate-500">{l.operator}</span>
                            <span>{formatThaiStockDateTime(l.createdAt)}</span>
                          </div>
                          <p className="font-bold leading-normal text-slate-700">
                            {movement ? formatStructuredMovement(movement) : formatTravelLog(l.description)}
                            {l.isLegacyStockMovement && <span className="ml-2 text-[11px] text-slate-400">(ข้อมูลเดิม)</span>}
                          </p>
                          {movement?.relatedOrderName && <p className="text-[12px] text-slate-500 font-semibold">ออเดอร์: {movement.relatedOrderName}</p>}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex gap-3 mt-auto shrink-0 bg-white">
                <button type="submit" disabled={adjustSubmitting} className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-xs text-white disabled:opacity-50 ${adjustType === "in" ? "bg-green-600 hover:bg-green-700 shadow-xs" : "bg-red-600 hover:bg-red-700 shadow-xs"}`}>{adjustSubmitting ? "กำลังบันทึก..." : "ยืนยันทำรายการ"}</button>
                <button type="button" className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs" onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
