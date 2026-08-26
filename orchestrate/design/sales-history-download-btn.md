# Impl spec — Production-history card: per-row "download document" button

**Goal (user):** Each production-history row gets a clickable button at the END of the row (after the
product/qty/"เสร็จแล้ว" badge) that downloads a document (ใบสั่งผลิต) for that specific item.

## File — `frontend/src/components/dashboard/SalesCrmView.js` (the existing history card only)
Edit the grouped-by-day history card ("ประวัติใบสั่งผลิตที่เสร็จแล้ว") inside the EDIT drawer.

### 1. Download handler (add inside the component, e.g. near other handlers)
```js
// Generate + download a simple production-order document for one history item (client-side, no backend).
const downloadProductionDoc = (item, dayLabel) => {
  const lines = [
    "ใบสั่งผลิต (ผลิตเสร็จแล้ว)",
    "================================",
    `ลูกค้า: ${selectedLead?.name || "-"}`,
    `สินค้า: ${item.formulaName || "-"}`,
    `เลขล็อต (Lot): ${item.lotNo || "-"}`,
    `จำนวน: ${(item.quantity || 0).toLocaleString()} ${item.unit || ""}`,
    `วันที่ผลิต: ${dayLabel || ""} ${item.time ? item.time + " น." : ""}`.trim(),
    "สถานะ: เสร็จแล้ว",
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ใบสั่งผลิต_${item.lotNo || "doc"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

### 2. Add the button to each item row
In each history item row, AFTER the `● เสร็จแล้ว` badge (inside the right-side `flex items-center gap-2 shrink-0`
group), add a small icon button:
```jsx
<button
  type="button"
  onClick={() => downloadProductionDoc(item, fmtDay(group.date))}
  title="ดาวน์โหลดเอกสารใบสั่งผลิต"
  className="p-1.5 rounded-lg bg-slate-50 hover:bg-green-50 text-slate-500 hover:text-green-600 border border-slate-200 hover:border-green-200 transition-colors cursor-pointer shrink-0"
>
  <Download className="h-3.5 w-3.5" />
</button>
```
- `Download` from `lucide-react` — add to the existing import if not already present.
- `fmtDay` and `group.date` are already in scope inside the card map; `item` is the row object.

## Constraints
- Frontend only. The document is generated client-side (a .txt for now — placeholder format, easy to swap
  for a real PDF/template later). No backend, no DB.
- Light theme; button must not disrupt the row layout (stays at the far right, after the badge).
- Read-only otherwise — clicking downloads; nothing is mutated.

## Acceptance
1. Every history row shows a small download (⬇) button at its far right, after the "เสร็จแล้ว" badge.
2. Clicking it downloads `ใบสั่งผลิต_<lotNo>.txt` containing that item's customer/product/lot/qty/date/status.
3. Layout stays clean (grouped-by-day design unchanged otherwise); no console errors.
