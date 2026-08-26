# Spec — R&D "qc" tab: split into card list + QC detail panel (checklist + photos + confirm)

## Goal
Today the `qc` tab in `RndView.js` renders `OrderStage` full-width (`lg:col-span-12`) with no detail
panel — clicking a card does nothing useful. Make `qc` behave like `received`: clicking a card splits
the layout **left (card list) / right (QC detail panel)**. The right panel lets the R&D user tick a
QC checklist, upload photo evidence, then confirm "ผ่าน QC" which advances the order to
`productionStatus: "สำเร็จเสร็จสิ้น"`, `productionStep: 6` — landing it in the `done` tab automatically
via the existing `stageOf()` regex (`/สำเร็จ|เสร็จ/`).

## Files touched
- `frontend/src/components/dashboard/RndView.js` — ONLY file to edit. No backend changes needed (the
  PUT `/production/orders/:id/status` endpoint already accepts an arbitrary body merged onto the order/
  product — see `handleConfirmOrder` at L389-413 for the exact pattern to copy). No new UI primitives.

## Flow
1. User is on R&D page, clicks the "QC / ส่งลูกค้าทดลอง" tab (`active === "qc"`).
2. Left column shows the existing `OrderStage` card list (unchanged cards/behavior) — now at
   `lg:col-span-5` instead of `lg:col-span-12`.
3. User clicks a card → `setSelectedItem(item)` (already wired via `onItemClick={setSelectedItem}`,
   no change needed there).
4. Right column (`lg:col-span-7`) appears, showing a new **QC detail panel** for `selectedItem`, replacing
   the current `!["producing","qc","done"].includes(active)` guard that currently hides it for qc.
5. Panel top→bottom: (a) order summary strip, (b) QC checklist (mock, all items must be checked),
   (c) photo evidence upload (≥1 photo required), (d) full-width confirm button, disabled until both
   conditions met.
6. User checks all 6 checklist boxes, uploads at least 1 photo (button enables as soon as thresholds are
   met — no need to wait for both to change same render).
7. Click "ยืนยันผ่าน QC" → PUT status update with QC payload → alert success → `setSelectedItem(null)` →
   `onRefresh()`. Item disappears from `qc` tab list, reappears in `done` tab (stageOf reclassifies it),
   `done` card shows QC timestamp via existing `showQcTimestamp` prop.

## Wireframe — qc tab, item selected

```
┌─ Search bar (unchanged, full width) ────────────────────────────────────────┐
└───────────────────────────────────────────────────────────────────────────┘
┌─ LEFT lg:col-span-5 ─────────────┐ ┌─ RIGHT lg:col-span-7 ──────────────────┐
│ [OrderStage card list, qc stage] │ │ QC ลูกค้าทดลอง              ล้างการเลือก │
│  ┌─────────────────────────────┐ │ │─────────────────────────────────────── │
│  │ ลูกค้า: xxx      [QC status] │ │ │ ┌ Order summary (2x2 grid, white) ───┐ │
│  │ 🧪 formula name              │ │ │ │ ลูกค้า | แบรนด์                     │ │
│  │ [meta strip]                 │ │ │ │ สูตรสั่งผลิต | จำนวนที่สั่ง          │ │
│  └─────────────────────────────┘ │ │ └────────────────────────────────────┘ │
│  ... (selected = green border)   │ │                                        │
│                                   │ │ ┌ QC CHECKLIST (mock) ───────────────┐ │
│                                   │ │ │ ☑ สี/กลิ่นตรงตามสูตร               │ │
│                                   │ │ │ ☑ เนื้อสัมผัส/ความหนืด             │ │
│                                   │ │ │ ☐ ค่า pH อยู่ในเกณฑ์                │ │
│                                   │ │ │ ☐ ไม่แยกชั้น/ตกตะกอน               │ │
│                                   │ │ │ ☐ การบรรจุ/ปริมาตรถูกต้อง          │ │
│                                   │ │ │ ☐ ฉลาก-บรรจุภัณฑ์เรียบร้อย         │ │
│                                   │ │ │ (2/6 ผ่านเกณฑ์)                    │ │
│                                   │ │ └────────────────────────────────────┘ │
│                                   │ │ ┌ QC PHOTO EVIDENCE ──────────────────┐│
│                                   │ │ │ ภาพสินค้า        ภาพผลทดสอบ         ││
│                                   │ │ │ [thumb/upload]   [thumb/upload]     ││
│                                   │ │ └──────────────────────────────────── ││
│                                   │ │ ┌────────────────────────────────────┐ │
│                                   │ │ │   [ยืนยันผ่าน QC]  (disabled/green) │ │
│                                   │ │ └────────────────────────────────────┘ │
└───────────────────────────────────┘ └────────────────────────────────────────┘
```

Empty state (no card selected, qc tab active): right column shows the reused
`FlaskConical` + "เลือกงานฝั่งซ้ายเพื่อตรวจ QC" empty pattern (same shape as the existing
`selectedItem ? ... : <EmptyState-style block>` fallback at L785-791, just swap the title/hint text).

## Component / state changes (exact)

### New local state (inside `RndView` component, near existing `selectedItem` etc., ~L385-387)
```js
const [qcChecklist, setQcChecklist] = useState({});   // { [itemKey]: boolean }
const [qcPhotos, setQcPhotos] = useState({});          // { productPhoto: url, testResultPhoto: url }
const [qcUploading, setQcUploading] = useState({});    // { productPhoto: bool, testResultPhoto: bool }
const [qcSubmitting, setQcSubmitting] = useState(false);
```
Reset these three (`setQcChecklist({})`, `setQcPhotos({})`, `setQcUploading({})`) whenever `selectedItem`
changes to a *different* item — add a `useEffect(() => { setQcChecklist({}); setQcPhotos({}); }, [selectedItem?.id])`
right after the state declarations, or reset inline inside `onItemClick` for the qc tab only. Simplest:
add the `useEffect` — it's the low-risk option and matches React idiom already used elsewhere in the file
(useMemo pattern is present; useEffect import must be added: `import React, { useMemo, useState, useEffect } from "react";`).

### MOCK_QC_CHECKLIST constant (module scope, near `TABS`/`stageOf`, ~L44)
```js
// MOCK — hardcoded QC checklist. Will later be driven by a QC-config feature (per-formula/customer).
const MOCK_QC_CHECKLIST = [
  { key: "colorSmell",   label: "สี/กลิ่นตรงตามสูตร" },
  { key: "texture",      label: "เนื้อสัมผัส/ความหนืด" },
  { key: "ph",           label: "ค่า pH อยู่ในเกณฑ์" },
  { key: "separation",   label: "ไม่แยกชั้น/ตกตะกอน" },
  { key: "fillVolume",   label: "การบรรจุ/ปริมาตรถูกต้อง" },
  { key: "labelPack",    label: "ฉลาก-บรรจุภัณฑ์เรียบร้อย" },
];

// QC photo evidence slots — mock config, same spirit as MOCK_QC_CHECKLIST above.
const QC_PHOTO_SLOTS = [
  { key: "productPhoto",    label: "ภาพสินค้า" },
  { key: "testResultPhoto", label: "ภาพผลทดสอบ" },
];
```

### uploadQcPhoto handler (near `handleConfirmOrder`, ~L389)
Copy the exact `uploadToCloudinary` pattern from `ProductionDetailView.js` L198-212 (POST FormData to
`/production/upload`, return `res.data.secure_url`):
```js
const uploadQcPhoto = async (slotKey, file) => {
  if (!file) return;
  const token = localStorage.getItem("token");
  if (!token) return;
  setQcUploading((prev) => ({ ...prev, [slotKey]: true }));
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${apiUrl}/production/upload`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
    });
    setQcPhotos((prev) => ({ ...prev, [slotKey]: res.data.secure_url }));
  } catch (error) {
    console.error("QC photo upload failed:", error);
    alert("อัปโหลดรูปไม่สำเร็จ: " + (error.response?.data?.error || error.message));
  } finally {
    setQcUploading((prev) => ({ ...prev, [slotKey]: false }));
  }
};
```

### handleConfirmQc handler (near `handleConfirmOrder`, ~L413)
```js
const handleConfirmQc = async (item) => {
  const token = localStorage.getItem("token");
  if (!token) return;
  setQcSubmitting(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const config = { headers: { Authorization: `Bearer ${token}` } };
  try {
    await axios.put(
      `${apiUrl}/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`,
      {
        productionStatus: "สำเร็จเสร็จสิ้น",
        productionStep: 6,
        rndQcChecklist: qcChecklist,
        rndQcPhotos: Object.values(qcPhotos).filter(Boolean),
        rndQcAt: new Date().toISOString(),
      },
      config
    );
    alert("ยืนยันผ่าน QC เรียบร้อยแล้ว!");
    setSelectedItem(null);
    if (onRefresh) onRefresh();
  } catch (error) {
    console.error("Failed to confirm QC:", error);
    alert("เกิดข้อผิดพลาดในการยืนยัน QC: " + (error.response?.data?.error || error.message));
  } finally {
    setQcSubmitting(false);
  }
};
```

### Derived flags (inside component body, near other `useMemo`s)
```js
const qcAllChecked = MOCK_QC_CHECKLIST.every((c) => qcChecklist[c.key]);
const qcHasPhoto = Object.values(qcPhotos).some(Boolean);
const qcCanConfirm = qcAllChecked && qcHasPhoto && !qcSubmitting;
```

### JSX insertion points

**A. Left column width** — L553, the `className` template literal already special-cases
`["producing","qc","done"]` to force `lg:col-span-12`. Remove `"qc"` from that array so `qc` falls back
to `lg:col-span-5` like `received`:
```js
className={`${["producing", "done"].includes(active) ? "lg:col-span-12" : "lg:col-span-5"} flex flex-col gap-3 min-h-[300px]`}
```

**B. Right column guard** — L602, `{!["producing", "qc", "done"].includes(active) && ( ... )}` currently
hides the right panel for `qc`. Remove `"qc"` from this array too:
```js
{!["producing", "done"].includes(active) && (
<div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-slate-50/50 p-6 flex flex-col gap-5 min-h-[450px]">
```

**C. Panel body branches on `active`.** Inside that same right-column `<div>`, the current content
(header "วัตถุดิบสารเคมีที่ต้องใช้ตามแผนผลิต" + ingredient/formula detail + bottom confirm button block,
L604-793) is the `received`-tab content. Wrap it so `qc` renders a DIFFERENT body while `received`
keeps its current one:

```jsx
<div className="pb-3 border-b border-slate-200 flex items-center justify-between">
  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
    {active === "qc" ? "ตรวจสอบคุณภาพ (QC) ก่อนส่งมอบ" : "วัตถุดิบสารเคมีที่ต้องใช้ตามแผนผลิต"}
  </h3>
  {selectedItem && (
    <button onClick={() => setSelectedItem(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-650 transition-colors">
      ล้างการเลือก
    </button>
  )}
</div>

{selectedItem ? (
  active === "qc" ? (
    <QcDetailPanel
      item={selectedItem}
      checklist={qcChecklist}
      onToggleCheck={(key) => setQcChecklist((prev) => ({ ...prev, [key]: !prev[key] }))}
      photos={qcPhotos}
      uploading={qcUploading}
      onUploadPhoto={uploadQcPhoto}
      canConfirm={qcCanConfirm}
      submitting={qcSubmitting}
      onConfirm={() => handleConfirmQc(selectedItem)}
    />
  ) : (
    /* existing received-tab JSX unchanged, L620-784 */
  )
) : (
  active === "qc" ? (
    <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400 my-auto">
      <FlaskConical className="h-10 w-10 text-slate-300 stroke-1 mb-3 animate-pulse" />
      <p className="text-xs font-bold text-slate-600">เลือกงานฝั่งซ้ายเพื่อตรวจ QC</p>
      <p className="text-[10.5px] text-slate-400 mt-1.5">เลือกรายการจากลิสต์ด้านซ้ายเพื่อเริ่มกรอกผล QC</p>
    </div>
  ) : (
    /* existing empty-state JSX unchanged, L786-790 */
  )
)}
```

### New component: `QcDetailPanel` (add above `export default function RndView`, near `OrderStage`)
This is the one genuinely-new piece of UI (justified: no existing component combines an order summary +
checkbox checklist + photo upload grid + gated confirm button). Everything inside it reuses existing
Tailwind class patterns already used elsewhere in this same file (order summary card = copy the `grid
grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs` block from L623-640;
checkbox rows and photo tiles are new but styled with the same tokens: `rounded-xl border-slate-200`,
`text-[9px] uppercase tracking-wider text-slate-400` labels, `bg-green-600` confirm button).

```jsx
function QcDetailPanel({ item, checklist, onToggleCheck, photos, uploading, onUploadPhoto, canConfirm, submitting, onConfirm }) {
  const checkedCount = MOCK_QC_CHECKLIST.filter((c) => checklist[c.key]).length;
  return (
    <div className="space-y-5 text-left flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Order summary — same shape as received-tab summary */}
        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
            <p className="text-xs font-black text-slate-800 mt-0.5">{item.order.name || "ไม่ระบุชื่อ"}</p>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์</span>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{item.order.brand || "-"}</p>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">สูตรสั่งผลิต</span>
            <p className="text-xs font-extrabold text-green-700 mt-0.5">🧪 {item.product.formulaName}</p>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">จำนวนที่สั่ง</span>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{item.product.quantityPcs ? `${(item.product.quantityPcs).toLocaleString()} ชิ้น` : "-"}</p>
          </div>
        </div>

        {/* QC CHECKLIST — MOCK config, will later come from a QC-config feature */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายการตรวจสอบ QC</h4>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              checkedCount === MOCK_QC_CHECKLIST.length
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>{checkedCount}/{MOCK_QC_CHECKLIST.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_QC_CHECKLIST.map((c) => (
              <label key={c.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!checklist[c.key]}
                  onChange={() => onToggleCheck(c.key)}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <span className={`text-xs font-semibold ${checklist[c.key] ? "text-slate-800" : "text-slate-500"}`}>{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* QC PHOTO EVIDENCE */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 mb-3 border-b border-slate-100">
            รูปภาพหลักฐาน QC
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {QC_PHOTO_SLOTS.map((slot) => {
              const url = photos[slot.key];
              const isUploading = uploading[slot.key];
              return (
                <div key={slot.key} className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{slot.label}</span>
                  <label className={`relative flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
                    url ? "border-green-300 bg-green-50/30" : "border-slate-200 bg-slate-50 hover:border-green-300 hover:bg-green-50/20"
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => onUploadPhoto(slot.key, e.target.files?.[0])}
                    />
                    {isUploading ? (
                      <span className="text-[10px] font-bold text-slate-400 animate-pulse">กำลังอัปโหลด...</span>
                    ) : url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={url} alt={slot.label} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">+ อัปโหลดรูป</span>
                    )}
                  </label>
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
          <p className="text-[10px] text-slate-400 font-medium text-center mt-2">
            ต้องติ๊กครบทุกข้อและอัปโหลดรูปอย่างน้อย 1 รูปก่อนยืนยัน
          </p>
        )}
      </div>
    </div>
  );
}
```

## API contract
`PUT ${apiUrl}/production/orders/${item.order._id}/status?productIndex=${item.productIndex}`
Headers: `Authorization: Bearer <token>`
Body:
```json
{
  "productionStatus": "สำเร็จเสร็จสิ้น",
  "productionStep": 6,
  "rndQcChecklist": { "colorSmell": true, "texture": true, "ph": true, "separation": true, "fillVolume": true, "labelPack": true },
  "rndQcPhotos": ["https://res.cloudinary.com/.../productPhoto.jpg", "https://.../testResultPhoto.jpg"],
  "rndQcAt": "2026-07-15T10:30:00.000Z"
}
```
This mirrors `handleConfirmOrder`'s existing PUT — same URL shape, same auth, extra fields simply pass
through since the endpoint already accepts/merges arbitrary status-update fields (confirmed by
`handleConfirmOrder` sending only `productionStatus`/`productionStep` today with no schema validation
blocking extra keys). If the reviewer finds the backend strips unknown fields, `rndQcChecklist`/
`rndQcPhotos`/`rndQcAt` will simply not persist — non-blocking for this spec (out of scope per below),
but `stageOf()` will still correctly move the order to `done` via `productionStatus` alone.

Photo upload: `POST ${apiUrl}/production/upload` — FormData `{ file }`, Bearer token, response
`res.data.secure_url` (exact copy of `ProductionDetailView.js` L198-212).

## States
- **Loading** (per-photo-slot): while `uploading[slotKey]` is true, tile shows "กำลังอัปโหลด..." pulsing
  text, file input disabled, no thumbnail yet.
- **Empty** (no card selected in qc tab): `FlaskConical` icon + "เลือกงานฝั่งซ้ายเพื่อตรวจ QC" (per spec brief).
- **Empty** (checklist/photos not yet filled): confirm button disabled (slate, not-allowed cursor) with
  helper text "ต้องติ๊กครบทุกข้อและอัปโหลดรูปอย่างน้อย 1 รูปก่อนยืนยัน" under it.
- **Error** (photo upload fails): `alert()` with server error message (matches existing error pattern in
  file), tile reverts to empty/re-uploadable state, `uploading[slotKey]` reset to false.
- **Error** (confirm PUT fails): `alert()` with server error message, panel stays open with checklist/
  photos intact so user can retry without re-uploading.
- **Success**: `alert("ยืนยันผ่าน QC เรียบร้อยแล้ว!")` → `setSelectedItem(null)` → `onRefresh()` → item
  vanishes from qc list, reappears in done tab.
- **Disabled**: confirm button `disabled` until `qcAllChecked && qcHasPhoto`; also disabled (with
  "กำลังยืนยัน...") while `qcSubmitting` true to prevent double-submit.
- **Destructive-confirm**: none — this flow has no delete/destroy action, so no confirm-dialog needed.

## Done-tab QC timestamp wiring
`showQcTimestamp` (used only on the `done` tab, L596) reads `o.qcCompletedAt || o.statusChangedAt ||
o.updatedAt` (L146) — it does NOT currently read `rndQcAt`. Per the brief this is a note, not a required
change: **out of scope for this spec** to rewire `fmtDateTime` args, since `rndQcAt` is a new field whose
backend persistence isn't guaranteed (see API contract note above). If a future spec confirms
`rndQcAt` persists reliably, update L146 to
`fmtDateTime(o.rndQcAt || o.qcCompletedAt || o.statusChangedAt || o.updatedAt)` to prefer it.

## Out of scope
- Backend changes (no route/schema edits — this spec assumes the existing status PUT endpoint accepts
  extra body fields; confirm during build/review whether they persist).
- Building a real QC-config feature (the checklist stays a hardcoded `MOCK_QC_CHECKLIST` constant).
- Editing/removing an already-uploaded QC photo before confirm (no "x" remove button — re-upload to
  the same slot to replace, since `onUploadPhoto` overwrites `photos[slotKey]`).
- Wiring `done`-tab's `showQcTimestamp` to `rndQcAt` (documented above, left as a follow-up).
- Any change to `producing` or `done` tab layouts/behavior.
- Cloudinary/upload backend itself — reusing the existing `/production/upload` route as-is.

## Acceptance
1. `qc` tab: with no card selected, left list is `lg:col-span-5` (not full width) and right panel shows
   the QC empty state (FlaskConical + "เลือกงานฝั่งซ้ายเพื่อตรวจ QC").
2. Clicking a qc-stage card selects it (green border on card, matches `received`-tab selection look) and
   populates the right panel with that item's order summary, checklist, and photo slots.
3. Checklist starts fully unchecked for a newly-selected item (checking one item never leaks state from a
   previously-selected item — verified by the `qcChecklist`/`qcPhotos` reset on `selectedItem.id` change).
4. Checking all 6 checklist boxes updates the counter "6/6" and turns it emerald.
5. Uploading a photo in either slot shows an uploading state, then a thumbnail preview from the returned
   Cloudinary URL; uploading again in the same slot replaces the thumbnail.
6. Confirm button ("ยืนยันผ่าน QC") is disabled (slate, not-allowed) until ALL 6 checklist items are
   checked AND at least 1 photo is uploaded; helper text shows while disabled.
7. Clicking the enabled confirm button PUTs to
   `/production/orders/:id/status?productIndex=N` with `productionStatus: "สำเร็จเสร็จสิ้น"`,
   `productionStep: 6`, plus `rndQcChecklist`, `rndQcPhotos`, `rndQcAt` — then alerts success, clears
   selection, calls `onRefresh()`.
8. After refresh, the confirmed item disappears from the `qc` tab and appears in the `done` tab (via
   existing `stageOf()` regex match on the updated `productionStatus`).
9. `producing` and `done` tabs are visually/behaviorally unchanged (still full-width `OrderStage`, no
   right panel).
10. No console/compile errors; only `frontend/src/components/dashboard/RndView.js` is modified.
