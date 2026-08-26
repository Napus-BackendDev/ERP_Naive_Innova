# Naive MES UI QA Report

Date: 2026-07-30  
Environment: Development, isolated local frontend/backend and in-memory MongoDB  
Production data touched: No

## Coverage

- 15 business workflows tested through the UI.
- 50 role-route access cases: 5 roles x 10 modules.
- 10 transitions inside the production lifecycle.
- 5 mobile pages checked at 375 x 812.
- Total: 65 UI test cases, plus the production sub-steps.

Roles:

- Admin
- Sales
- R&D
- Production
- Stock

Modules:

- Dashboard
- Sales
- R&D
- Production
- Stock
- Users
- Customer Log
- Activity Logs
- Support
- Settings

## Critical Findings

### P0: Cross-role workflow is blocked by per-user ownership

Sales successfully created `QA Formula Customer` with a formula-development
request. After logging in as R&D, the incoming request count remained zero.
Production also saw zero incoming orders created by Sales.

The same end-to-end order only worked when one Production account entered Sales,
R&D, Production, and Stock itself. Non-admin queries scope records to the current
user's `ownerId`, so different employees cannot hand work to each other.

Relevant code:

- `backend/src/features/sales/sales.routes.js:103`
- `backend/src/features/bom/bom.routes.js:15`
- `backend/src/features/production/production.routes.js:457`
- `backend/src/features/fg/fg.routes.js:20`

Recommended model: scope operational data by `organizationId` or `workspaceId`;
store `createdBy`, `assignedTo`, and department separately.

### P0: Roles do not protect operational modules

All five roles saw all eight navigation items and opened every tested module.
Sales created Stock data. Production created Sales orders and R&D formulas.
Only User Management APIs correctly returned 403 to non-admin users.

Relevant code:

- `frontend/src/components/dashboard/DashboardLayout.js:72`
- `backend/src/middleware/auth.js:31`
- `backend/src/features/users/user.routes.js:8`

### P0: Invalid email/password logs in as Admin

`wrong@invalid.local` with a deliberately incorrect password successfully logged
in as Mock Admin. The form values are not sent for authentication; the submit
action calls the public development mock-login endpoint.

Relevant code:

- `backend/src/features/auth/auth.routes.js:39`
- `frontend/src/app/login/page.js`

## High Findings

### P1: Stock price unit is multiplied 1,000 times

Stock asks for price per kilogram. Entering 250 displayed 250,000 baht in the
table. R&D instead asks for price per gram while using the same `pricePerKg`
field. This is an active unit mismatch.

Relevant code:

- `frontend/src/components/dashboard/StockView.js:410`
- `frontend/src/components/dashboard/StockView.js:1178`
- `frontend/src/components/dashboard/IngredientManagerModal.js:50`
- `frontend/src/components/dashboard/RndView.js:491`

### P1: Customer Log reports the completed order as pending

The order reached Final QC, was placed into FG, and created a 10-unit lot.
Customer Log still displayed `รอยืนยัน`; completed count remained zero.
The page reads the parent customer status while line-level production status
continues to change.

Relevant code:

- `backend/src/features/customerLog/customerLog.routes.js:113`
- `frontend/src/app/admin/customer-log/page.js:57`

### P1: QC evidence is optional in three production steps

Labeling, LOT coding, and sealing each displayed an evidence upload control, but
the UI allowed advancing without any image. In-Process QC and Final QC correctly
blocked until an image was attached.

### P1: Audit trail misses Stock and R&D changes

The test created two BOM formulas, three ingredients/sample items, and deducted
stock. Activity Logs showed:

- Sales: 4
- Production: 12
- R&D: 0
- Stock: 0

Stock/BOM creation and stock movement are therefore not traceable from the UI.

### P1: R&D confirmation message disagrees with actual routing

The confirmation says the order will go to Production's preparation tab.
After confirmation it appeared directly in the production-line tab.

## UX Findings

### P2: Mobile role tabs are hard to read

At 375 px, R&D and Production use two fixed columns. Long Thai labels wrap into
narrow vertical stacks. There is no horizontal page overflow, but scanning is
difficult.

Relevant code:

- `frontend/src/components/dashboard/RndView.js:1400`
- `frontend/src/components/dashboard/ProductionView.js:2337`

### P2: Permission error is too generic

Non-admin users can open User Management and see the add-user button, then receive
`โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่`. The UI should hide the module or show a clear
403 permission message.

## Passed Workflows

- Sample SKU was saved and displayed as `SMP-SALES-001`.
- Creating a sample deal with quantity 3 reduced stock from 10 to 7.
- Changing that deal from sample to normal order did not restore stock.
- R&D ingredient and 1,000 g BOM creation succeeded.
- Material calculation correctly required 900 g for 10 x 90 ml.
- Starting production reduced material from 5,000 g to 4,100 g.
- Machine creation and scheduling succeeded.
- In-Process QC enforced pass selection and photo evidence.
- Filling, labeling, LOT coding, and sealing transitions completed.
- Final QC enforced photo evidence.
- Warehousing created FG lot `LOT-20260730-3327`, quantity 10.
- Admin created a new Stock user.
- Support request submission succeeded.
- Dashboard, Sales, R&D, Production, and Stock had no page-level horizontal
  overflow at 375 x 812.
- No browser console errors were recorded in the final pass.

## Database Risks

- `ownerId = userId` prevents collaboration and encourages shared Admin accounts.
- Stock/status operations cross several documents without one database
  transaction; concurrent saves can leave partial updates.
- Parent and ordered-product statuses can diverge, as demonstrated by Customer Log.
- Missing Stock/R&D audit events weakens traceability and incident recovery.

## Evidence

- `01-admin-dashboard.png`
- `02-sales-sample-stock-remains-7.png`
- `03-rnd-bom-created.png`
- `04-production-fg-lot-10.png`
- `mobile-dashboard.png`
- `mobile-sales.png`
- `mobile-rnd.png`
- `mobile-production.png`
- `mobile-stock.png`
