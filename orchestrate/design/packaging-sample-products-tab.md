# Impl spec — Packaging page: "สินค้าตัวอย่าง" tab (sample products)

**Goal (user):** Add a new tab "สินค้าตัวอย่าง" on the Packaging page. It lists sample finished products
(one per BOM formula, ~11). Data is ALREADY generated + persisted in the DB and served by the backend.
Show them in the SAME table (same columns) as the other packaging tabs.

## Backend — DONE (do not touch)
- `GET /api/products?sample=true` → returns the sample products array. Each item:
  `{ _id, name, formulaName, color, sku, brand, category, size, initialQuantity, currentQuantity, note, isSample:true }`
- Already seeded (11 rows) via `POST /api/products/generate-samples`.

## Frontend change 1 — `frontend/src/app/admin/packaging/page.js`
1. Add state: `const [sampleProducts, setSampleProducts] = useState([]);`
2. In `fetchData`, add to the `Promise.all` a 4th request `axios.get(`${apiUrl}/products?sample=true`, config)`
   and `setSampleProducts(res.data || []);` (name the destructured var e.g. `resSamples`).
   If it fails, it must NOT break the page — wrap so the other data still loads (or just let the existing
   catch handle it; acceptable).
3. Pass `sampleProducts={sampleProducts}` into `<PackagingView ... />`.

## Frontend change 2 — `frontend/src/components/dashboard/PackagingView.js`
1. Add `sampleProducts = []` to the destructured component props.
2. **Map samples to the table row shape** (so all existing filters/columns just work). Near the top of the
   component (after props), add:
   ```js
   const sampleRows = (sampleProducts || []).map((p) => ({
     _id: p._id,
     name: p.name,
     sku: p.sku || "",
     customer: p.brand || "นาอีฟ",
     type: { _id: "sample", name: p.category || "สินค้าตัวอย่าง" },
     currentQuantity: typeof p.currentQuantity === "number" ? p.currentQuantity : 0,
     note: p.note || (p.size ? `ขนาด ${p.size}` : ""),
     image: "",
     isSample: true
   }));
   ```
3. **Make the active-tab data account for the sample tab.** Line ~109:
   `const activeTabItems = activeTab === "sample" ? sampleRows : packaging.filter(p => classifyItem(p) === activeTab);`
4. **Add the tab button** after the "อื่นๆ" tab button (~L847-852), same styling as the others:
   ```jsx
   <button
     onClick={() => setActiveTab("sample")}
     className={"flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "sample" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
   >
     สินค้าตัวอย่าง ({sampleRows.length} รายการ)
   </button>
   ```
5. **Add the render branch** in the IIFE (~L873-903, after the `other` branch):
   ```js
   } else if (activeTab === "sample") {
     activeTitle = "สินค้าตัวอย่าง";
     activeIcon = <Package className="h-4.5 w-4.5 text-green-600 shrink-0" />;
     activeCount = sampleRows.length;
     activeTableItems = sampleRows;
     emptyMsg = "ยังไม่มีสินค้าตัวอย่าง";
   }
   ```
   (also make sure any `sortedPackaging`-based filtering that feeds the table uses `activeTableItems` for the
   sample tab — the samples are NOT in `packaging`/`sortedPackaging`, so the sample tab must render from
   `sampleRows`, then apply the same search/customer/category/status filters to it.)
6. **Guard the action buttons** in `renderPackagingTable` (~L671-716): the +/- / edit / delete buttons call
   packaging handlers (`setSelectedAdjustItem`, `setEditingItem`, `handleDeleteClick`) that operate on
   PackagingItem ids — invalid for sample products. When `pkg.isSample`, render a plain read-only
   `<span className="text-slate-300">-</span>` in the Actions cell instead of the four buttons.

## Constraints
- Light theme, reuse existing table/tab styles. No new visual language.
- Do NOT alter the other tabs' behavior. Sample tab is read-only (view + filter + search only).
- The status pill (ปกติ/ใกล้หมด/หมด) is derived from `currentQuantity` by the existing table — leave that logic;
  it works for samples as-is.

## Acceptance
1. Packaging page shows a 6th tab "สินค้าตัวอย่าง (11 รายการ)".
2. Clicking it lists the 11 sample products with columns: ชื่อ/SKU, แบรนด์(นาอีฟ), หมวดหมู่(สินค้าตัวอย่าง),
   สต็อก, สถานะ, หมายเหตุ.
3. Search + the customer/category/status dropdowns still work on this tab; no crash.
4. No +/- / edit / delete buttons on sample rows (read-only dash), other tabs unchanged.
5. No console errors; light-theme consistent.
