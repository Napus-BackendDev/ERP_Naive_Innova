# Design spec — Sample order: link to sample-product stock + per-item quantity

**Brief (user):** In the "ตัวอย่างสินค้า" (sample) order type, don't just checkbox true/false — each selected
sample also needs a **quantity** (how many). And the selectable list must come from OUR **sample-product
stock** (the trial products), linked together.

## Data available (already plumbed)
- `sampleProducts` prop is now in scope in SalesCrmView (fetched from `GET /api/products?sample=true`).
  Each: `{_id, name, formulaName, size, currentQuantity, color, sku, ...}` — `currentQuantity` = stock on hand.
- Selection state: `createSelectedSamples` / `editSelectedSamples` (currently `string[]` of formula names),
  saved to `orderedProducts` (a schema-less Mixed field on the lead — object[] persists fine).

## Change the selection shape → object[]
Each selected sample becomes: `{ productId, name, formulaName, size, quantity }`.
- `toggleCreateSample(p)` / `toggleEditSample(p)`: receive the sampleProduct; if already selected (match by
  `productId===p._id`) remove it, else add `{ productId: p._id, name: p.name, formulaName: p.formulaName, size: p.size || "", quantity: 1 }`.
- Add `setCreateSampleQty(productId, qty)` / `setEditSampleQty(productId, qty)`: update that item's `quantity`
  (min 1, numeric). 
- Edit-sync (`setEditSelectedSamples(selectedLead.orderedProducts...)`, ~L526): back-compat — if an entry is a
  string (legacy), convert to `{ productId: (matched sampleProduct._id || ""), name: str, formulaName: str, size: "", quantity: 1 }`; if object, keep as-is.
- Submit already does `orderedProducts = selectedSamples` — no change needed (now stores objects).

## Render (BOTH edit ~L1603 and create ~L1993 sample blocks)
Map over `sampleProducts` (NOT `formulas`). For each product row:
- checkbox tile (reuse the existing CheckSquare/Square styling) showing `p.name` + a small muted `p.size`.
- a stock badge: green "คงเหลือ {currentQuantity}" if >0, else amber "หมดสต๊อก".
- WHEN selected: show a compact number `<input>` (min=1) bound to that item's `quantity`
  (value from the selected entry, onChange → setSampleQty). Label it "จำนวน (ชิ้น)".
- If `quantity > currentQuantity`: show a tiny amber warning "เกินสต๊อก (มี {currentQuantity})". (Do NOT block
  saving — soft warning only; no auto stock deduction in this pass.)
- Empty state: if `sampleProducts.length === 0`, show muted hint "ยังไม่มีสินค้าตัวอย่างในคลัง (ไปที่ Stock เพื่อสร้าง)".

## Out of scope (state clearly, do later if asked)
- No automatic stock DEDUCTION on save yet — this pass only links the list to stock + records quantity.

## Acceptance
1. Sample list is sourced from sample-product stock, each row shows remaining stock.
2. Selecting a sample reveals a quantity input; quantity persists on save and reload.
3. Over-stock shows a soft amber warning but still saves.
4. Legacy leads whose `orderedProducts` were plain names still open without crashing (converted to qty 1).
5. Works in both edit drawer and create modal; light-theme consistent.
