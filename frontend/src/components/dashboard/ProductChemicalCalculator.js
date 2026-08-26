"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Minus,
  Plus,
  Trash2,
  XCircle
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fmtChem } from "@/lib/chemAmount";

const MIN_BATCH_KG = 0.001;
const COUNTER_STEP_KG = 1;
const DEFAULT_FORMULA_COLOR = "#2563eb";

const formulaIngredients = (formula) => {
  if (Array.isArray(formula?.ingredients)) return formula.ingredients;
  if (!formula?.bom || typeof formula.bom !== "object") return [];

  return Object.entries(formula.bom).map(([name, gramsPerKg]) => ({
    name,
    ratio: Number(gramsPerKg) / 1000
  }));
};

const parseBatchKg = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const quantityError = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "กรุณากรอกเป็นตัวเลข";
  if (parsed < 0) return "จำนวนต้องไม่ติดลบ";
  if (parsed > 0 && parsed < MIN_BATCH_KG) return `จำนวนต่ำสุด ${MIN_BATCH_KG} กก.`;
  return "";
};

const inputValueFromNumber = (value) => {
  if (value <= 0) return "";
  return String(Number(value.toFixed(6)));
};

const formulaColor = (formula) => formula?.color || DEFAULT_FORMULA_COLOR;

function StockStatus({ row }) {
  if (row.stock === null) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-200 px-3.5 py-1.5 text-[13px] font-extrabold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
        title="ไม่มีสารนี้ในคลัง"
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>ไม่มีในคลัง</span>
      </span>
    );
  }

  if (row.short) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-500 px-3.5 py-1.5 text-[13px] font-extrabold text-white">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>ขาด {fmtChem(Math.abs(row.remaining))} ก.</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-green-500 px-3.5 py-1.5 text-[13px] font-extrabold text-white">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span>พอ</span>
    </span>
  );
}

function FormulaQuantityCard({ formula, value, error, selected, onChange, onStep }) {
  const color = formulaColor(formula);

  return (
    <div
      className={`flex min-h-[78px] items-center justify-between gap-2 rounded-xl border bg-white px-3 py-3 shadow-sm transition-all ${
        error
          ? "border-red-400 ring-1 ring-red-200"
          : selected
            ? "border-blue-500 ring-1 ring-blue-200"
            : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <span
            className="line-clamp-2 min-w-0 overflow-hidden text-[11px] font-black leading-tight text-[color:var(--formula-color)] dark:text-slate-800"
            style={{ "--formula-color": color }}
            title={formula.name}
          >
            {formula.name}
          </span>
        </div>
        {error && <p className="mt-1 text-[10px] font-bold text-red-600">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 rounded-lg p-0 text-red-600"
          onClick={() => onStep(-COUNTER_STEP_KG)}
          aria-label={`ลดจำนวนผลิตสูตร ${formula.name}`}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Input
          label=""
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="w-[66px]"
          aria-label={`จำนวนผลิตสูตร ${formula.name}`}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 rounded-lg p-0 text-green-700"
          onClick={() => onStep(COUNTER_STEP_KG)}
          aria-label={`เพิ่มจำนวนผลิตสูตร ${formula.name}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function CalculatorTable({ rows, selectedFormulas, totalRequired, shortageCount }) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 text-center">
        <Calculator className="mb-3 h-9 w-9 text-slate-400" aria-hidden="true" />
        <h3 className="text-sm font-black text-slate-700">เลือกสูตรและจำนวนผลิตด้านบน</h3>
        <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">
          ตารางจะแสดงวัตถุดิบ ปริมาณรวม สต็อก และสถานะความเพียงพอทันที
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="text-white">
            <tr>
              <th
                scope="col"
                className="min-w-[280px] px-4 py-4 text-left text-xs font-black"
                style={{ backgroundColor: "#6b21a8" }}
              >
                วัตถุดิบ
              </th>
              {selectedFormulas.map((formula) => (
                <th
                  key={formula._id}
                  scope="col"
                  className="min-w-[160px] px-4 py-3 text-center text-xs font-black"
                  style={{ backgroundColor: formulaColor(formula) }}
                >
                  <span className="block break-words leading-tight">{formula.name}</span>
                  <span className="mt-1 block text-[11px] font-bold opacity-90">
                    *{fmtChem(parseBatchKg(formula.quantity))} กก.
                  </span>
                </th>
              ))}
              <th scope="col" className="min-w-[125px] px-4 py-4 text-center text-xs font-black" style={{ backgroundColor: "#374151" }}>
                รวม(ก.)
              </th>
              <th scope="col" className="min-w-[135px] px-4 py-4 text-center text-xs font-black" style={{ backgroundColor: "#374151" }}>
                สต็อก(ก.)
              </th>
              <th scope="col" className="min-w-[175px] px-4 py-4 text-center text-xs font-black" style={{ backgroundColor: "#374151" }}>
                เพียงพอ?
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {rows.map((row) => (
              <tr key={row.name} className="even:bg-slate-50 hover:bg-blue-50/50">
                <th scope="row" className="px-4 py-3 text-left font-black text-slate-800">
                  {row.name}
                </th>
                {selectedFormulas.map((formula) => {
                  const amount = row.byFormula[formula._id] || 0;
                  return (
                    <td key={formula._id} className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                      {amount > 0 ? fmtChem(amount) : "—"}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right font-mono font-black text-blue-700">
                  {fmtChem(row.required)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                  {row.stock === null ? "—" : fmtChem(row.stock)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StockStatus row={row} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-800">
            <tr>
              <td colSpan={selectedFormulas.length + 1} className="px-4 py-3 text-left text-xs">
                รวมทั้งหมด
              </td>
              <td className="px-4 py-3 text-right font-mono text-blue-700">{fmtChem(totalRequired)}</td>
              <td colSpan={2} className="px-4 py-3 text-center text-xs">
                {shortageCount > 0 ? `ขาด ${shortageCount} รายการ` : "วัตถุดิบเพียงพอ"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function ProductChemicalCalculator({ formulas = [], ingredients = [] }) {
  const [quantities, setQuantities] = useState({});

  const inputErrors = useMemo(() => {
    const errors = {};
    Object.entries(quantities).forEach(([formulaId, value]) => {
      const error = quantityError(value);
      if (error) errors[formulaId] = error;
    });
    return errors;
  }, [quantities]);

  const selectedFormulas = useMemo(
    () => formulas
      .filter((formula) => {
        const quantity = parseBatchKg(quantities[formula._id]);
        return quantity >= MIN_BATCH_KG && !inputErrors[formula._id];
      })
      .map((formula) => ({ ...formula, quantity: quantities[formula._id] })),
    [formulas, inputErrors, quantities]
  );

  const calculation = useMemo(() => {
    const stockByName = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient]));
    const rowsByName = new Map();

    selectedFormulas.forEach((formula) => {
      const quantity = parseBatchKg(formula.quantity);
      formulaIngredients(formula).forEach((ingredient) => {
        const name = String(ingredient.name || "").trim();
        const gramsPerKg = Number(ingredient.ratio || 0) * 1000;
        if (!name || !Number.isFinite(gramsPerKg) || gramsPerKg <= 0) return;

        const required = gramsPerKg * quantity;
        const row = rowsByName.get(name) || { name, required: 0, byFormula: {} };
        row.required += required;
        row.byFormula[formula._id] = (row.byFormula[formula._id] || 0) + required;
        rowsByName.set(name, row);
      });
    });

    const rows = [...rowsByName.values()]
      .map((row) => {
        const stockItem = stockByName.get(row.name);
        const stock = stockItem ? Number(stockItem.openingStock) || 0 : null;
        const remaining = stock === null ? null : stock - row.required;
        return {
          ...row,
          stock,
          remaining,
          short: stock !== null && stock < row.required
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "th"));

    return {
      rows,
      totalRequired: rows.reduce((sum, row) => sum + row.required, 0),
      shortageCount: rows.filter((row) => row.stock === null || row.short).length
    };
  }, [ingredients, selectedFormulas]);

  const updateQuantity = (formulaId, value) => {
    setQuantities((current) => ({ ...current, [formulaId]: value }));
  };

  const stepQuantity = (formulaId, value, delta) => {
    const current = parseBatchKg(value);
    updateQuantity(formulaId, inputValueFromNumber(Math.max(0, current + delta)));
  };

  return (
    <div className="space-y-5">
      <Card className="!border-transparent !bg-blue-50 shadow-none" padding="p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-blue-700">จำนวนที่ต้องการผลิต (กก.)</h2>
            <p className="mt-1 text-xs font-medium text-slate-600">กำหนดน้ำหนักผลิตของแต่ละสูตร ระบบจะคำนวณวัตถุดิบด้านล่างทันที</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-700" aria-live="polite">
            <span className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5">เลือก {selectedFormulas.length} สูตร</span>
            <span className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5">ใช้วัตถุดิบ {calculation.rows.length} รายการ</span>
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              disabled={Object.keys(quantities).length === 0}
              onClick={() => setQuantities({})}
              aria-label="ล้างจำนวนผลิตทั้งหมด"
            >
              ล้างทั้งหมด
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {formulas.map((formula) => {
            const value = quantities[formula._id] ?? "";
            const error = inputErrors[formula._id];
            const selected = parseBatchKg(value) >= MIN_BATCH_KG && !error;
            return (
              <FormulaQuantityCard
                key={formula._id}
                formula={formula}
                value={value}
                error={error}
                selected={selected}
                onChange={(nextValue) => updateQuantity(formula._id, nextValue)}
                onStep={(delta) => stepQuantity(formula._id, value, delta)}
              />
            );
          })}
        </div>

        {formulas.length === 0 && (
          <div className="rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-8 text-center text-xs font-semibold text-slate-500">
            ยังไม่มีสูตรสำหรับคำนวณ
          </div>
        )}
      </Card>

      <section aria-labelledby="product-chemical-result-title" aria-live="polite">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="product-chemical-result-title" className="flex items-center gap-2 text-base font-black text-slate-800">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
              วัตถุดิบที่ต้องใช้
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">ปริมาณเป็นกรัม และเป็นการคำนวณแบบ preview ไม่ตัด stock</p>
          </div>
          {calculation.shortageCount > 0 && (
            <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
              ขาด {calculation.shortageCount} รายการ
            </span>
          )}
        </div>
        <CalculatorTable
          rows={calculation.rows}
          selectedFormulas={selectedFormulas}
          totalRequired={calculation.totalRequired}
          shortageCount={calculation.shortageCount}
        />
      </section>
    </div>
  );
}
