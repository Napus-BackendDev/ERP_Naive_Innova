# Impl spec — Sales detail drawer: "ประวัติใบสั่งผลิตที่เสร็จแล้ว" (completed production history)

**Goal (user):** In the Sales CRM lead detail DRAWER, add a read-only card listing this customer's
COMPLETED production orders — what they ordered before and that it's finished. Place it BELOW the
"การเลือกสินค้า" (product selection) section, ABOVE the "หมายเหตุ" (notes) section.

## Data model (already understood — no backend change)
- A completed production order → a `ProductLot` exists. `GET /api/fg/lots` returns all lots (owner-scoped),
  each with: `{ _id, orderId (populated {_id,name,brand} or null), formulaName, lotNo, mfgDate, expDate,
  quantity, unit, customer, status, source }`.
- Link a lot to the current lead by EITHER `lot.orderId?._id === selectedLead._id` (precise) OR
  `lot.customer === selectedLead.name` (covers older orders). A lot existing = that order was produced/finished.

## File 1 — `frontend/src/app/admin/sales/page.js`
1. Add state: `const [productLots, setProductLots] = useState([]);`
2. In `fetchLeads`, add a request to the existing `Promise.all`: `axios.get(`${apiUrl}/fg/lots`, config)`
   (destructure e.g. `resLots`) and `setProductLots(resLots.data || []);`. Must not break the page on failure.
3. Pass `productLots={productLots}` into `<SalesCrmView ... />`.

## File 2 — `frontend/src/components/dashboard/SalesCrmView.js`
1. Add `productLots = []` to the destructured component props.
2. In the EDIT DRAWER (the block that renders when `drawerOpen && selectedLead`), locate the
   **"การเลือกสินค้า" section**: the `<div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">`
   that holds the order-type segmented controls + the lot/sample/develop/inquiry panels. Immediately AFTER
   that section's closing `</div>`, and BEFORE the **"หมายเหตุ"** block (a `<label>หมายเหตุ</label>` +
   `<textarea name="notes" defaultValue={selectedLead.notes...}>`), insert the history card below.
   (Edit the EDIT drawer only — NOT the create modal, which has its own notes block.)
3. History card (read-only, light theme, match the other sections):
   ```jsx
   {(() => {
     const leadLots = (productLots || [])
       .filter(l =>
         (l.orderId && ((l.orderId._id || l.orderId) === selectedLead._id)) ||
         (l.customer && selectedLead.name && l.customer === selectedLead.name)
       )
       .sort((a, b) => new Date(b.mfgDate || 0) - new Date(a.mfgDate || 0));
     return (
       <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200">
         <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
           <ClipboardList className="h-3.5 w-3.5 text-green-600" />
           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
             ประวัติใบสั่งผลิตที่เสร็จแล้ว ({leadLots.length})
           </span>
         </div>
         {leadLots.length === 0 ? (
           <p className="text-[11px] text-slate-400 py-2 text-center">ยังไม่มีประวัติการผลิตที่เสร็จ</p>
         ) : (
           <div className="flex flex-col divide-y divide-slate-100">
             {leadLots.map(l => (
               <div key={l._id} className="flex items-center justify-between gap-2 py-2">
                 <div className="flex flex-col text-left min-w-0">
                   <span className="text-xs font-bold text-slate-800 truncate">{l.formulaName || "-"}</span>
                   <span className="text-[10px] text-slate-400 font-mono">
                     Lot: {l.lotNo} · {l.mfgDate ? new Date(l.mfgDate).toLocaleDateString("th-TH") : "-"}
                   </span>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                   <span className="text-xs font-mono font-semibold text-slate-700">
                     {(l.quantity || 0).toLocaleString()} {l.unit || "ชิ้น"}
                   </span>
                   <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                     ● เสร็จแล้ว
                   </span>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>
     );
   })()}
   ```
4. Ensure `ClipboardList` is imported from `lucide-react` (add to the existing lucide import if missing).

## Constraints
- Read-only. No mutation. Light theme, consistent with the drawer's other cards.
- Edit drawer only. Do not alter the create modal or other sections.

## Acceptance
1. Opening a lead detail drawer shows a "ประวัติใบสั่งผลิตที่เสร็จแล้ว (N)" card below การเลือกสินค้า, above หมายเหตุ.
2. It lists that customer's completed lots (product, lot no, date, qty, "เสร็จแล้ว" badge), newest first.
3. Customers with no completed production show "ยังไม่มีประวัติการผลิตที่เสร็จ".
4. No console errors; light-theme consistent; nothing else changed.
