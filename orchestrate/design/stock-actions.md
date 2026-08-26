# Spec — Stock tables: Action column (+ / − / แก้ไข / ลบ)

Add an **Action column** (last column) to ALL 4 tables in `frontend/src/components/dashboard/StockView.js`,
each with 4 buttons: **+ (รับเข้า)**, **− (เบิกออก)**, **แก้ไข (edit)**, **ลบ (delete)**. Wire to REAL endpoints.
After any successful mutation, call the existing `onRefresh()` prop to reload data.

## Endpoint contracts (Bearer token; apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api")
### สาร (ingredients)
- + / - : `POST /bom/ingredients/tx`  body `{ itemId, type: "in"|"out", amount, note? }` (adjusts openingStock)
- แก้ไข : `PUT /bom/ingredients/:id`  body `{ name, openingStock, supplier, pricePerKg }`
- ลบ   : `DELETE /bom/ingredients/:id`
### บรรจุภัณฑ์ (packaging)
- + / - : `POST /packaging/tx`  body `{ itemId, type: "in"|"out", amount }` (adjusts currentQuantity)
- แก้ไข : `PUT /packaging/:id`  body `{ name, customer, initialQuantity, currentQuantity, note }`
- ลบ   : `DELETE /packaging/:id`
### สินค้าตัวอย่าง (products) — NOTE: no tx endpoint, no DELETE yet
- + / - : `PUT /products/:id` with updated `currentQuantity` (read row.currentQuantity, add/subtract the amount, PUT the new value; clamp at 0)
- แก้ไข : `PUT /products/:id`  body `{ name, sku, brand, category, currentQuantity, note }`
- ลบ   : `DELETE /products/:id`  <- **ADD this backend route** (see backend task)
### สินค้าสำเร็จรูป (fgLots)
- + / - : `POST /fg/recv` (in) and `POST /fg/issue` (out). READ the handlers in
  `backend/src/features/fg/fg.routes.js` (~L91 recv, ~L173 issue) to match the exact body they expect
  (lot identifier + quantity). Send what they require.
- แก้ไข : `PUT /fg/lots/:id`  body `{ lotNo, quantity, customer, mfgDate, expDate }`  <- **ADD this backend route**
- ลบ   : `DELETE /fg/lots/:id`

## Backend tasks (add the 2 missing routes — edit ONLY these 2 files)
1. `backend/src/features/products/products.routes.js` — add `router.delete("/:id", ...)` that deletes the
   Product by _id (admin filter like the other routes in that file). Mirror the style of the existing PUT /:id.
2. `backend/src/features/fg/fg.routes.js` — add `router.put("/lots/:id", ...)` that updates a ProductLot by _id
   with `{ lotNo, quantity, customer, mfgDate, expDate }`. Mirror the style of `DELETE /lots/:id`.

## Frontend UI (StockView.js only)
- Action column header "จัดการ", right-aligned. 4 icon buttons per row (lucide): Plus (green), Minus (amber),
  Pencil (slate), Trash2 (red) — small `h-8 w-8 rounded-lg border` buttons like the Packaging/FG pages.
- **+ / -**: `window.prompt("จำนวนรับเข้า (หน่วย)")` / `("จำนวนเบิกออก")` -> parse number > 0 -> call the tx/PUT/recv/issue
  endpoint -> onRefresh(). Ignore if cancelled/invalid.
- **แก้ไข**: open a small edit Modal (reuse `@/components/ui/Modal` + `Input`) pre-filled with that row's editable
  fields (per table, per contracts above) -> Save -> PUT -> close + onRefresh().
- **ลบ**: `window.confirm("ยืนยันลบรายการนี้?")` -> DELETE -> onRefresh().
- Keep light theme, keep all existing columns (image thumbnail, data, badges). Do NOT change tabs/search/zoom-modal.

## Scope guard (STRICT)
Edit ONLY: `StockView.js`, `products.routes.js`, `fg.routes.js`. Do NOT touch any other file, do NOT add
extra features/columns/tabs. If a backend route already exists, don't duplicate it.

## Acceptance
1. Every row in all 4 tables has +, -, แก้ไข, ลบ.
2. +/- changes the stock number (visible after refresh); edit saves changes; delete removes the row — all persisted to DB.
3. New backend routes: DELETE /products/:id and PUT /fg/lots/:id work.
4. No console/compile errors; only the 3 allowed files changed.
