# Design spec — Stock overview page (คลังรวม)

**Brief (from user):** Add a new "Stock" page + sidebar entry. It is an OVERVIEW of ALL three
inventories — raw materials, packaging, finished goods — pulling REAL data from the backend.

## Files to create/edit (exactly these)
1. NEW `frontend/src/app/admin/stock/page.js` — client page, same pattern as `frontend/src/app/admin/fg/page.js`
   (auth-guard via localStorage token, fetch on mount, loading/error states, render `<StockView .../>`).
2. NEW `frontend/src/components/dashboard/StockView.js` — the overview UI ("use client").
3. EDIT `frontend/src/components/dashboard/DashboardLayout.js` — ONLY: (a) add one nav entry to the
   `navItems` array, (b) add one line to `getHeaderTitle()`, (c) add the icon import. Nothing else.

## Data (real endpoints, GET with Bearer token — verified shapes)
- Raw materials: `GET /api/bom/ingredients` -> `[{ _id, name, openingStock, supplier, pricePerKg }]`
- Packaging: `GET /api/packaging` -> `[{ _id, name, type, customer, initialQuantity, currentQuantity }]`
- Finished goods lots: `GET /api/fg/lots` -> `[{ _id, lotNo, mfgDate, expDate, quantity, customer, productId }]`
Fetch all three with `Promise.all`, same axios+config pattern as fg/page.js
(`apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"`).

## Sidebar entry (DashboardLayout.js navItems)
Insert right AFTER the `fg` item (Finished Goods), before `users`:
`{ id: "stock", label: "Stock", icon: Boxes, path: "/admin/stock" }`
Import `Boxes` from "lucide-react" (add to the existing lucide import). Active-state is automatic
(isActive uses `pathname.startsWith(item.path)`).
In `getHeaderTitle()` add: `if (pathname.startsWith("/admin/stock")) return "Stock";`

## StockView layout (light Eco-Tech theme — see _reference.md)
- Page header: H1 "Stock" + muted subtitle "คลังสินค้ารวม — วัตถุดิบ บรรจุภัณฑ์ และสินค้าสำเร็จรูป".
- KPI row — 3 white `rounded-2xl border-slate-200` cards, tiny uppercase label + big `font-mono` number:
  1. วัตถุดิบ/สารเคมี — count of ingredients (sub: รวมมูลค่า ~ sum openingStock*pricePerKg, ฿).
  2. บรรจุภัณฑ์ — count of packaging items (sub: sum currentQuantity ชิ้น).
  3. สินค้าสำเร็จรูป — count of FG lots (sub: sum quantity ชิ้น).
- A segmented tab control (reuse the segmented pattern already in the app) OR 3 stacked section cards —
  one per inventory, each a white card with a title + a table:
  - **วัตถุดิบ/สารเคมี**: คอลัมน์ ชื่อ | คงเหลือ (openingStock) | Supplier | ราคา/กก. (฿, font-mono).
  - **บรรจุภัณฑ์**: ชื่อ | ประเภท (type) | ลูกค้า | คงเหลือ (currentQuantity / initialQuantity).
  - **สินค้าสำเร็จรูป**: Lot No. | จำนวน (quantity) | ลูกค้า | MFG | EXP (format Thai/Buddhist date like fg page).
- A search `<Input>` (filter the active section by name/lot) is nice-to-have; keep simple.
- Reuse primitives in `frontend/src/components/ui/` (Card, Badge, Input, Select) — do not reinvent.
- Low-stock hint: if an ingredient openingStock is 0 or a packaging currentQuantity is 0, show a red/amber
  Badge; otherwise emerald "ปกติ". Keep it lightweight.

## States
- loading: skeleton like fg/page.js. empty: "ยังไม่มีข้อมูลในคลังนี้". error: red retry banner like fg/page.js.

## REVISION (redesign — user feedback): Hero + 4-tab widget bar
Rebuild StockView to look like the Packaging page. NO plain header, NO separate KPI card row.
- **Top = HeroBanner** (reuse `@/components/dashboard/HeroBanner`): `title="Stock"`,
  `subtitle="คลังสินค้ารวม — สาร บรรจุภัณฑ์ สินค้าตัวอย่าง และสินค้าสำเร็จรูป"`. No action buttons needed.
- **Widget/tab bar** directly under the hero — a horizontal segmented bar of EXACTLY 4 tabs, styled like the
  Packaging page tabs (white pill, active = solid green `bg-green-600 text-white`, icon + label + count in
  parentheses). Clicking a tab swaps ONLY the table below. Tabs (in order):
  1. **สาร ({ingredients.length})** — icon FlaskConical
  2. **บรรจุภัณฑ์ ({packagings.length})** — icon Package
  3. **สินค้าตัวอย่าง ({sampleProducts.length})** — icon Boxes
  4. **สินค้าสำเร็จรูป ({fgLots.length})** — icon Calendar
- A search `<Input>` filters the ACTIVE tab's table by name/lot. One table area below, content driven by active tab.
- **Add a 4th fetch** in `stock/page.js`: `GET /api/products?sample=true` -> `sampleProducts`
  (fields: name, sku, brand, category, currentQuantity, note). Pass to StockView.

### Table per tab (columns, mirror the source pages)
- **สาร** (from ingredients — like the BOM page chem table): ชื่อสาร | คงเหลือ (openingStock ก.) |
  สถานะ Badge (0 → red "หมดคลัง", low → amber "สต็อกต่ำ", else emerald "เพียงพอ") | Supplier | ราคา/กก. (pricePerKg ฿, font-mono).
- **บรรจุภัณฑ์** (from packagings — like Packaging page): ชื่อ | ประเภท (type?.name หรือ type) | ลูกค้า (customer) |
  คงเหลือ (currentQuantity / initialQuantity) | สถานะ Badge (0 → red "สินค้าหมด", <500 → amber "ใกล้หมด", else emerald "เพียงพอ").
- **สินค้าตัวอย่าง** (from sampleProducts — like Packaging สินค้าตัวอย่าง tab): ชื่อ + SKU | แบรนด์ (brand) |
  หมวดหมู่ (category) | คงเหลือ (currentQuantity) | หมายเหตุ (note).
- **สินค้าสำเร็จรูป** (from fgLots — like FG page): Lot No. | จำนวน (quantity ชิ้น) | ลูกค้า (customer) |
  MFG (mfgDate) | EXP (expDate) — dates as Thai Buddhist (e.g. "15 ก.ค. 2569") | สถานะ Badge.
- Each table: white `rounded-2xl border-slate-200`, header row `bg-slate-50`, numbers `font-mono`, empty →
  "ยังไม่มีข้อมูลในคลังนี้". Reuse `@/components/ui` Badge/Input.

### Overreach guard (STRICT)
- Edit ONLY `frontend/src/components/dashboard/StockView.js` and `frontend/src/app/admin/stock/page.js`.
- Do NOT touch DashboardLayout.js again, do NOT add extra tabs/nav items/features beyond the 4 tabs above.

## Acceptance
1. Sidebar shows a "Stock" item (Boxes icon) between Finished Goods and Users; clicking -> /admin/stock, item highlights.
2. Page loads real data from the 3 endpoints; 3 KPI cards show correct counts/sums.
3. Three sections/tabs list วัตถุดิบ, บรรจุภัณฑ์, สินค้าสำเร็จรูป with the columns above, real rows.
4. Light-theme consistent, reuses components/ui, header title = "Stock". No console/compile errors.
5. DashboardLayout.js change is limited to the nav entry + title line + icon import — nothing else touched.
