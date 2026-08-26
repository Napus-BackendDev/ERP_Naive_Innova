# Impl spec — Production page: R&D-style 4-stage widget bar + stage order cards

**Goal (user):** Redesign the Production page to follow the R&D page's look — a **widget bar of 4 stage
tabs** (R&D card style), and below it the orders for the active stage shown as R&D-style cards. Clicking a
card must still open the EXISTING production detail/status wizard (keep all functionality).

**Reference design:** `frontend/src/components/dashboard/RndView.js` — its tab cards (Stock-style) and its
`OrderStage` order cards. Match that visual language.

**BOUNDED CHANGE — do NOT rewrite the whole file.** Only: (a) replace the 5 KPI stat cards with the 4
stage widget cards, (b) insert one stage order-card list panel right after them, (c) add small helpers.
Leave the HeroBanner, the Dispatch Center + Equipment Lineup grid, the existing order table, and ALL modals
(status/detail/machine) UNTOUCHED below. Keep every existing state variable and handler.

## File — `frontend/src/components/dashboard/ProductionView.js`

### 1. Add helpers + state (near the other useState/consts, before the `return (` at ~L999)
```js
const PROD_TABS = [
  { id: "received", label: "ใบสั่งผลิตเตรียมพัสดุ",                 icon: ClipboardList },
  { id: "line",     label: "สายการผลิต",                          icon: Factory },
  { id: "pack",     label: "บรรจุ / ติดสติ๊กเกอร์ / ยิง LOT / ซีลขวด", icon: Boxes },
  { id: "finish",   label: "ผลิตสินค้าสำเร็จ / Final QC / รอส่งลูกค้า", icon: CheckCircle2 },
];
// Map an order to one of the 4 workflow stages by its production status (user-confirmed mapping).
const prodStageOf = (c) => {
  const st = c?.productionStatus || "";
  if (st === "สำเร็จเสร็จสิ้น" || st === "รอตรวจ QC รอบที่ 2") return "finish";
  if (st === "รอบรรจุ" || st === "รอตรวจ QC รอบที่ 1") return "pack";
  if (st === "เลือกเครื่องจักร" || st === "กำลังผลิต") return "line";
  return "received"; // ยังไม่ผลิต / ยังไม่พร้อม / รอยืนยัน / default
};
const [stageTab, setStageTab] = useState("received");
const stageOrders = customersWithPrecomputes.filter((c) => prodStageOf(c) === stageTab);
```
- Ensure `ClipboardList, Factory, Boxes, CheckCircle2` are imported from `lucide-react` (add any missing).
  `customersWithPrecomputes` already exists (has `computedStatus`).

### 2. Replace the 5 KPI stat cards block (the `<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">`
that holds the 5 `setStatusFilter` cards, ~L1009-1081) with this R&D-style 4-card widget bar:
```jsx
{/* Widget bar — 4 production stages (R&D card style) */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
  {PROD_TABS.map((t) => {
    const Icon = t.icon;
    const isActive = stageTab === t.id;
    const count = customersWithPrecomputes.filter((c) => prodStageOf(c) === t.id).length;
    return (
      <button
        key={t.id}
        onClick={() => setStageTab(t.id)}
        className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
          isActive
            ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
            : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isActive ? "text-green-600 scale-110" : "text-slate-400"}`} />
          <span className={`text-[11px] md:text-xs tracking-tight text-left ${isActive ? "font-black" : "font-bold text-slate-600"}`}>
            {t.label}
          </span>
        </div>
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-mono font-extrabold shrink-0 ml-2 ${
          isActive ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
        }`}>
          {count}
        </div>
      </button>
    );
  })}
</div>

{/* Stage order cards — click opens the existing status/detail wizard */}
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
  {stageOrders.length === 0 ? (
    <div className="flex flex-col items-center justify-center text-center py-14">
      <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
        <Inbox className="h-7 w-7 text-emerald-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">ยังไม่มีใบสั่งผลิตในขั้นตอนนี้</h3>
      <p className="text-xs text-slate-500 mt-1">ใบสั่งผลิตในขั้น "{PROD_TABS.find((t) => t.id === stageTab)?.label}" จะแสดงที่นี่</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {stageOrders.map((c) => (
        <div
          key={c._id}
          onClick={() => openStatusModal(c)}
          className="rounded-2xl border border-slate-200 bg-white hover:border-green-400 hover:shadow-xs transition-all p-4 flex flex-col gap-2.5 cursor-pointer text-left select-none active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
              <div className="text-sm font-black text-slate-800 truncate mt-0.5">{c.name || "ไม่ระบุชื่อ"}</div>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-150">
              {c.computedStatus || c.productionStatus || "-"}
            </span>
          </div>
          <div className="text-[10.5px] flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-xl border bg-slate-50 border-slate-100 text-slate-500 font-medium">
            {c.brand && <span>แบรนด์: <span className="text-slate-800 font-bold">{c.brand}</span></span>}
            <span>ขั้นตอน: <span className="font-mono text-slate-800 font-bold">{c.productionStep || 1}/6</span></span>
            {c.producedQty != null && <span>ผลิตแล้ว: <span className="font-mono text-slate-800 font-bold">{fmt(c.producedQty)}</span></span>}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```
- `Inbox` and `fmt` — import/reuse if present; `fmt` is likely already defined in this file (used elsewhere). If not, use `(c.producedQty || 0).toLocaleString()` inline.
- `openStatusModal` already exists (~L55) — reuse it as the click handler so the wizard/actions work unchanged.

### 3. Do NOT touch anything else
Leave the Dispatch Center + Equipment Lineup grid, the existing order table, and all modals below exactly
as they are. `statusFilter` and the old table keep working (they're just no longer the primary widget bar).

## Acceptance
1. Production page shows a 4-card widget bar (R&D card style): ใบสั่งผลิตเตรียมพัสดุ / สายการผลิต /
   บรรจุ·สติ๊กเกอร์·LOT·ซีล / ผลิตสำเร็จ·Final QC·รอส่ง — each with a live count, green active border.
2. Below it, the active stage's orders render as cards; clicking a card opens the existing status/detail wizard.
3. Empty stages show an empty state. Everything else on the page (dispatch/equipment/modals) still works.
4. No console errors; light-theme consistent with R&D.
