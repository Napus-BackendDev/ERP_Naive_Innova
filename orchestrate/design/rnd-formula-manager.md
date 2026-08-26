# Spec — R&D: reuse BOM's formula-management modal (button + modal, exact)

**User ask:** In the R&D page, BOM tab ("สูตรคำนวณ BOM"), add a button that opens the SAME formula-
management modal as the BOM Calculator page — the "จัดการสูตรผลิต B.O.M." modal listing formulas with
**คัดลอก (copy) / แก้ไขสูตร (edit) / ลบสูตร (delete) / สร้างสูตรใหม่ (create)**, and the create/edit
formula modal ("สร้างสูตรผสมผลิต B.O.M. ใหม่"). Must look and behave EXACTLY like BOM (verbatim design).

## Approach: self-contained shared component (do NOT modify BomCalculatorView.js)
Create `frontend/src/components/dashboard/FormulaManager.js` by COPYING the exact code from
`frontend/src/components/dashboard/BomCalculatorView.js`. Zero changes to BomCalculatorView.

### What to copy from BomCalculatorView.js (verbatim — replicate design/logic exactly)
- The formula-form state block (`manageFormulasModalOpen`, `formulaModalOpen`, `editingFormula`,
  `formulaName`, `formulaColor`, `formulaIngredients`, `formulaNotes`, `formulaProcedures`,
  `openDropdownIdx`, `dropdownSearchQuery`, `openGroupDropdownIdx`, `formulaSearchQuery`,
  `formulaError`, `formulaSubmitting`) — around lines 664-678.
- Helpers: `getAvailableGroups` (~680-703) and `cleanFormulaName` (~14-17).
- All formula handlers: open-create, the copy handler (`setFormulaName(\`คัดลอก ${f.name}\`)` ~940-966),
  `addFormulaIngredientRow`/`removeFormulaIngredientRow` (~968-975), the ingredient-row update/phase
  handlers, procedures/notes add-remove handlers, and `handleSaveFormula` (~1040-1060). Copy every
  handler the two modals reference.
- The create/edit formula modal JSX: `{formulaModalOpen && ( ... )}` (~1991-2382), including the color-
  theme palette, ingredient rows with order/qty/phase dropdowns, mixing-steps, notes, and the total-
  weight validation footer.
- The manage-formulas list modal JSX: `{manageFormulasModalOpen && ( ... )}` (~2383-~2500), with the
  create/copy/edit/delete row actions.
- Copy the exact Tailwind classes and Thai text — do not restyle.

### Component API (FormulaManager.js)
- Props: `{ formulas = [], ingredients = [], onCreateFormula, onUpdateFormula, onDeleteFormula }`.
- The save handler must call `onCreateFormula(data)` (create/copy) or `onUpdateFormula(editingFormula._id, data)`
  (edit) exactly as BomCalculatorView does (~1055-1057); delete calls `onDeleteFormula(f._id)`.
- Render a trigger button (green, `<Layers/>` or `<Plus/>` icon, label "จัดการสูตรผลิต B.O.M.") that opens
  the manage modal, plus both modals. Import lucide icons it needs (Plus, Edit2, Trash2, X, Search,
  Layers, ChevronDown, Minus, etc.) and any UI primitives the copied JSX uses.

### Wire into R&D (only these files besides the new component)
1. `frontend/src/components/dashboard/RndView.js` — the `BomMatrix` component (BOM tab): add the
   `<FormulaManager formulas={formulas} ingredients={ingredients} onCreateFormula onUpdateFormula
   onDeleteFormula />` button in the header row (next to the search / stats). Thread the three
   handler props from `RndView`'s props down into `BomMatrix`.
2. `frontend/src/app/admin/rnd/page.js` — add `handleCreateFormula` / `handleUpdateFormula` /
   `handleDeleteFormula` EXACTLY like `frontend/src/app/admin/bom/page.js` (lines 169-209):
   POST `/bom/formulas`, PUT `/bom/formulas/:id`, DELETE `/bom/formulas/:id`, then update local
   `formulas` state. Pass them into `<RndView ... />`.

### Acceptance
1. R&D → BOM tab shows a "จัดการสูตรผลิต B.O.M." button.
2. Clicking it opens the SAME manage modal as BOM (list of 11 formulas, each with คัดลอก/แก้ไข/ลบ + สร้างสูตรใหม่).
3. สร้างใหม่/แก้ไข/คัดลอก open the create/edit modal identical to BOM; saving creates/updates a formula
   via the API and the R&D matrix reflects it.
4. BomCalculatorView.js is UNCHANGED. No console/compile errors. Light theme intact.
