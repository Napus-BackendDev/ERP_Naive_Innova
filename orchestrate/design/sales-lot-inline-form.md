# Design spec — Sales "สั่งสินค้า (lot)" inline 4-group order form

**Brief (user):** When order type = **สั่งสินค้า (lot)** in the Sales detail drawer (and create modal),
show the full product details INLINE, grouped into 4 sections — instead of hiding them behind the "..."
(ตั้งค่าข้อมูลสินค้าโดยละเอียด) modal. Remove the "..." modal; surface everything in place.

## User's 4 groups → data map (most fields already exist on each lot line item)
Lot line items live in `editLotItems` / `createLotItems`; each item's fields are defined in
`emptyLotItem()` (~L75) and the current detailed-spec modal (~L2082). Sources:
- Bottles (`packOptions`) & stickers (`labelOptions`) both come from `packagings` (packagingitems) which
  ALREADY have `.image` and `.currentQuantity`. Scents = `uniqueScents`. Nozzles = `uniqueNozzles`.

**Group 1 — เรื่องของสินค้า**
- สินค้าที่ลูกค้าผลิต → `item.formulaName` (select from `formulas` + "ผลิตสูตรเอง")
- ประเภทของสูตร → `item.customerFormulaType` ("สูตรตามโรงงาน" / "ปรับสูตร")
- กลิ่นที่เลือก → `item.scentId`+`item.scentType` (CreatableSelect `uniqueScents`, onCreate=onCreateScent)
- แบรนด์ลูกค้า → lead-level `brand` (already an input at top of drawer; show/reuse, don't duplicate the source of truth)

**Group 2 — ขวด และ หัวฉีด**
- ขวด (ชื่อ + รูป) → `item.packagingType`+`item.packagingItemId` (CreatableSelect `packOptions`); show the
  matched packagingitem's `.image` as a small thumbnail next to the select.
- หัวฉีด (ชื่อ + รูป) → `item.nozzleId`+`item.nozzleType`; show matched nozzle's `.image` thumbnail (NEW field, see Phase A).
- จำนวนขวด → `item.bottleCount` (mirrors `quantityPcs`). จำนวนหัวฉีด → NEW `item.nozzleCount`.
- ปริมาณขวด (ml) → `item.bottleSize`. ปริมาณที่บรรจุ (ml) → `item.fillVolume`.
- มีขวดพร้อม → AUTO badge from matched packagingitem `.currentQuantity` (green "มีในสต็อก N" if >0 else amber "ไม่มีในสต็อก"). Read-only, derived — not a manual checkbox.
- มีหัวฉีดพร้อม → AUTO badge from matched nozzle `.currentQuantity` (NEW field). Same rule.

**Group 3 — สติ๊กเกอร์**
- สติกเกอร์ (ชื่อ + รูป) → `item.labelType`+`item.labelItemId` (CreatableSelect `labelOptions`); show matched item's `.image` thumbnail.
- สถานะสติกเกอร์ → `item.stickerStatus` ("รอสติกเกอร์" / "ติดสติกเกอร์แล้ว")
- ผู้สั่งสติกเกอร์ → `item.stickerOrderer` ("Naive" / "เราสั่ง"/ลูกค้าสั่งเอง)

**Group 4 — ยิง LOT** (keep existing logic verbatim)
- ตำแหน่งยิง LOT → `item.printLocation` ("ยิงใต้ขวด" / "ยิงบนฉลาก")
- เลข LOT → existing auto-gen: `generateLotNo(prefix, mfgDate)` with `prefixConfigs`, `item.notifyLot`
  toggles manual entry. DO NOT change lot-number logic — reuse exactly as the spec modal does (~L2373).

## Phases
**Phase A — backend (nozzle gains image + stock).** Add `image: {type:String}` and
`currentQuantity: {type:Number, default:0}` (+ `initialQuantity`) to `backend/src/features/catalog/nozzle.model.js`.
Update `nozzles.routes.js` so POST/PUT accept & persist them and GET returns them. (packagingitems already have both.)

**Phase B — frontend Sales (the inline form).** In `SalesCrmView.js`, replace the compact lot line +
"..." trigger with an inline 4-group panel PER lot item, in BOTH the edit drawer (`editOrderType==="lot"`,
~L1423) and the create modal (`createOrderType==="lot"`, ~L1708). Reuse the exact controls already in the
spec modal (CreatableSelect / SearchableSelect / inputs) + the field handlers (`updateEditLotItem` /
`updateCreateLotItem` / the modal's `handleFieldChange` pattern). Add image thumbnails + auto stock badges.
Remove `openSpecModal` usage and the "..." button; the detailed-spec modal (~L2082) can be deleted since it's fully inlined.
Keep light theme; group each section under a `text-[10px] uppercase` header like the modal already does.

**Phase C — คลัง/master UI.** In the Packaging/catalog page, let the user set a nozzle's image + stock
(so nozzle images/`currentQuantity` actually get populated). Bottles/stickers already support image+stock there.

## Acceptance
1. Selecting "สั่งสินค้า" shows all 4 groups inline; no "..." modal needed.
2. Bottle/nozzle/sticker each show a thumbnail from the master item's image (placeholder if none).
3. "มีขวดพร้อม/มีหัวฉีดพร้อม" auto-reflect the master `currentQuantity` (not manual).
4. LOT number still auto-generates exactly as before.
5. Works in BOTH edit drawer and create modal; saving persists every field; light-theme consistent.
6. No regression to develop/sample order types.
