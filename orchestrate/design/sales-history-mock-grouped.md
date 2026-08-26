# Impl spec — Production-history card: grouped-by-day design + MOCK preview data

**Goal (user):** Preview how the "ประวัติใบสั่งผลิตที่เสร็จแล้ว" card looks WITH data. Group entries by
**day**, and within a day show each order's **time**. Feed it MOCK data (frontend only — NO DB writes).
This is a DESIGN PREVIEW; keep the mock clearly marked and easy to swap for real data later.

## File — `frontend/src/components/dashboard/SalesCrmView.js` (edit the existing history card only)
The card added earlier (label "ประวัติใบสั่งผลิตที่เสร็จแล้ว", inside the EDIT drawer, between the
"การเลือกสินค้า" section and the "หมายเหตุ" block) — REPLACE its body with the grouped design below.

### 1. Mock data (add a clearly-commented constant near the top of the component, or just above the card)
```js
// TEMP PREVIEW DATA — mock production history so we can see the grouped design.
// Swap for real `productLots` mapping once real completed orders exist. Safe to delete.
const MOCK_PRODUCTION_HISTORY = [
  { id: "m1", date: "2026-07-15", time: "09:15", formulaName: "Bio-Shampoo",        lotNo: "BS-150726-A", quantity: 300, unit: "ขวด" },
  { id: "m2", date: "2026-07-15", time: "14:40", formulaName: "Wound Healing Gel 1kg", lotNo: "WH-150726-B", quantity: 150, unit: "กระปุก" },
  { id: "m3", date: "2026-07-12", time: "10:30", formulaName: "Nano Spray",          lotNo: "NS-120726-A", quantity: 200, unit: "ขวด" },
  { id: "m4", date: "2026-07-12", time: "16:05", formulaName: "Hair Coat",           lotNo: "HC-120726-C", quantity: 120, unit: "ขวด" },
  { id: "m5", date: "2026-07-05", time: "11:00", formulaName: "Milk Shampoo",        lotNo: "MS-050726-A", quantity: 250, unit: "ขวด" },
];
```

### 2. Data source (real wins; mock only for preview when empty)
Inside the card IIFE, build a normalized list:
```js
const realRows = (productLots || [])
  .filter(l => (l.orderId && ((l.orderId._id || l.orderId) === selectedLead._id)) ||
               (l.customer && selectedLead.name && l.customer === selectedLead.name))
  .map(l => ({
    id: l._id,
    date: l.mfgDate ? new Date(l.mfgDate).toISOString().slice(0,10) : "",
    time: l.createdAt ? new Date(l.createdAt).toTimeString().slice(0,5) : "",
    formulaName: l.formulaName || "-",
    lotNo: l.lotNo, quantity: l.quantity || 0, unit: l.unit || "ชิ้น"
  }));
const rows = realRows.length ? realRows : MOCK_PRODUCTION_HISTORY;
// group by day, newest day first; within a day newest time first
const groups = Object.values(rows.reduce((acc, r) => {
  (acc[r.date] = acc[r.date] || { date: r.date, items: [] }).items.push(r);
  return acc;
}, {})).sort((a, b) => new Date(b.date) - new Date(a.date));
groups.forEach(g => g.items.sort((a, b) => (b.time || "").localeCompare(a.time || "")));
const totalCount = rows.length;
const fmtDay = (d) => d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";
```

### 3. Rendered design (light theme, read-only)
- Card wrapper: `bg-white p-4 rounded-2xl border border-slate-200 space-y-3`.
- Header row: `ClipboardList` icon (green) + `ประวัติใบสั่งผลิตที่เสร็จแล้ว ({totalCount})`, bottom border.
- For each `group` (a day):
  - **Day header**: a small row — left: date pill
    `<span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{fmtDay(group.date)}</span>`,
    right: `<span className="text-[9px] text-slate-400 font-bold">{group.items.length} ใบ</span>`.
    Put them in `flex items-center justify-between`.
  - **Timeline of items** under the day, left-indented with a vertical guide line
    (`className="pl-3 border-l-2 border-slate-100 ml-1 space-y-2 pt-1"`). Each item row:
    ```jsx
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-mono font-bold text-green-600 shrink-0 w-10">{item.time} น.</span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-slate-800 truncate">{item.formulaName}</span>
          <span className="text-[10px] text-slate-400 font-mono">Lot: {item.lotNo}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono font-semibold text-slate-700">{item.quantity.toLocaleString()} {item.unit}</span>
        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">● เสร็จแล้ว</span>
      </div>
    </div>
    ```
- Keep the empty-state check only if `rows.length === 0` (won't trigger now because mock is the fallback).

## Constraints
- Frontend only. NO backend calls, NO DB writes.
- Mock constant clearly commented as temporary/deletable.
- Light theme, read-only, consistent with the drawer.

## Acceptance
1. Opening a lead detail drawer shows the history card populated with the mock data.
2. Entries are grouped under day headers (15 ก.ค. 2569, 12 ก.ค. 2569, 05 ก.ค. 2569), newest day first.
3. Within each day, rows show time (น.), product, lot, qty, and a "เสร็จแล้ว" badge; newest time first.
4. Real `productLots` (when a lead has them) still take priority over the mock. No console errors.
