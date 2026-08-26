# Impl spec — history row: PDF production-order document + document icon

**Goal (user):** (1) The per-row download should produce a **PDF that looks like a real ใบสั่งผลิต**
(mock/simulated). (2) Change the button icon from the download arrow to a **document (file) icon**.

**Approach (no new libraries):** build a styled HTML "ใบสั่งผลิต" in a new window and auto-trigger
`window.print()` → the user picks "Save as PDF". This renders Thai correctly and looks like a document.

## File — `frontend/src/components/dashboard/SalesCrmView.js`
### 1. Replace the existing `downloadProductionDoc` function body with a print-to-PDF version:
```js
// Open a styled "ใบสั่งผลิต" document in a new window and trigger print (Save as PDF). No libs, Thai-safe.
const downloadProductionDoc = (item, dayLabel) => {
  const c = selectedLead || {};
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบสั่งผลิต ${esc(item.lotNo || "")}</title>
  <style>
   *{box-sizing:border-box;font-family:'Sarabun','TH Sarabun New',system-ui,sans-serif}
   body{margin:0;padding:32px;color:#0f172a}
   .sheet{max-width:720px;margin:auto}
   .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10b981;padding-bottom:12px}
   .brand{font-size:22px;font-weight:800;color:#10b981;line-height:1.1}
   .brand small{display:block;font-size:10px;color:#64748b;font-weight:700;letter-spacing:1.5px;margin-top:3px}
   h1{font-size:18px;margin:0;text-align:right}
   .meta{font-size:12px;color:#475569;text-align:right;margin-top:6px;line-height:1.5}
   .sec{margin-top:22px}
   .sec h2{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin:0 0 6px;border-bottom:1px solid #f1f5f9;padding-bottom:3px}
   .row{font-size:13px;margin:3px 0}
   table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
   th{background:#f8fafc;text-align:left;padding:9px;border-bottom:2px solid #e2e8f0;font-size:11px;color:#475569}
   td{padding:9px;border-bottom:1px solid #f1f5f9}
   .num{font-variant-numeric:tabular-nums;font-weight:600}
   .badge{display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700}
   .foot{margin-top:56px;display:flex;justify-content:space-around}
   .sign{border-top:1px dashed #cbd5e1;padding-top:6px;text-align:center;width:200px;font-size:12px;color:#64748b}
   @media print{body{padding:0}}
  </style></head><body><div class="sheet">
   <div class="head">
     <div class="brand">Naive Ops<small>NAIVE INNOVA · ECO-TECH ERP</small></div>
     <div><h1>ใบสั่งผลิต</h1><div class="meta">เลขที่: ${esc(item.lotNo || "-")}<br>วันที่ผลิต: ${esc(dayLabel || "-")} ${esc(item.time ? item.time + " น." : "")}</div></div>
   </div>
   <div class="sec"><h2>ข้อมูลลูกค้า</h2>
     <div class="row"><b>${esc(c.name || "-")}</b></div>
     <div class="row">โทร: ${esc(c.phone || "-")}</div>
     <div class="row">ที่อยู่: ${esc(c.address || "-")}</div>
   </div>
   <div class="sec"><h2>รายการผลิต</h2>
     <table><thead><tr><th>สินค้า / สูตร</th><th>เลขล็อต</th><th>จำนวน</th><th>สถานะ</th></tr></thead>
     <tbody><tr><td><b>${esc(item.formulaName || "-")}</b></td><td>${esc(item.lotNo || "-")}</td><td class="num">${(item.quantity || 0).toLocaleString()} ${esc(item.unit || "")}</td><td><span class="badge">● เสร็จแล้ว</span></td></tr></tbody></table>
   </div>
   <div class="foot"><div class="sign">ผู้สั่งผลิต</div><div class="sign">ผู้ตรวจสอบ (QC)</div></div>
  </div>
  <scr`+`ipt>window.onload=function(){setTimeout(function(){window.print();},350);};</scr`+`ipt>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("กรุณาอนุญาต popup เพื่อบันทึกเอกสารเป็น PDF"); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
};
```
(Note: the `<script>` tag is split as `<scr"+"ipt>` so it doesn't break the JSX/JS parse. Keep that.)

### 2. Change the button icon from `Download` to a document icon (`FileText`)
- In the history-row button, replace `<Download className="h-3.5 w-3.5" />` with `<FileText className="h-3.5 w-3.5" />`.
- Import `FileText` from `lucide-react` (add to the existing import). Leave `Download` imported (still used elsewhere).
- Update the button `title` to `"บันทึกใบสั่งผลิตเป็น PDF"`.

## Constraints
- Frontend only, no libraries, no backend/DB. Thai text must render (uses system Thai font in the print doc).
- Keep the grouped-by-day history design otherwise unchanged; light theme.

## Acceptance
1. Each history row's button now shows a document/file icon (not a down-arrow).
2. Clicking it opens a styled "ใบสั่งผลิต" document (brand header, customer info, item table, "เสร็จแล้ว"
   badge, signature lines) and triggers the print dialog so the user can Save as PDF.
3. No console errors; layout unchanged otherwise.
