# Design spec — Sales detail drawer: inline "move stage" selector

**Brief (from user):** In Sales CRM, when the user opens a lead's detail ("ดูรายละเอียด" → the right-side
drawer), add a Kanban **stage/column selector** so they can move the card to another column WITHOUT
leaving the drawer / changing page. Place it **directly below the "ที่อยู่ผู้รับ/จัดส่งสินค้า" box.**

## Where (exact)
- File: `frontend/src/components/dashboard/SalesCrmView.js`
- The address block in the EDIT DRAWER is the `<div className="flex flex-col gap-1">` at ~L1300–1308
  (label "ที่อยู่ผู้รับ/จัดส่งสินค้า" + `<textarea name="address">`).
- Insert the new selector **immediately after that block closes (after ~L1308), before the parent
  `</div>` at ~L1309** — so it sits right under the address field, still inside the customer-details column.
- NOTE: there is a SECOND address block in the CREATE modal (~L1625). Do NOT touch that one — only the
  drawer/edit one that renders when `drawerOpen && selectedLead`.

## What to build
A labeled stage selector, reusing the existing primitive `@/components/ui/Select`
(`frontend/src/components/ui/Select.js`; import it if not already imported):
- **label**: `ย้ายสถานะ (Stage)`
- **options**: `boardColumns.map(c => ({ value: c.id, label: c.label }))` (both are in scope as props)
- **value**: `selectedLead.section`
- **icon**: a lucide icon already used here (e.g. `Columns3` / `ArrowRightLeft` — pick one that's imported or add the import)
- **onChange**: when a new column id is chosen:
  1. call `handleMoveLead(selectedLead._id, e.target.value)` (already in scope — does the PUT + optimistic board update)
  2. also `setSelectedLead(prev => ({ ...prev, section: e.target.value }))` so the select reflects the new
     value immediately AND a later form "Save" won't revert section.

## Visual / states
- Match the light theme + surrounding form controls (the Select primitive already does: `bg-white
  border-slate-200 rounded-lg text-xs font-semibold`, green focus). Full width, same column width as address.
- If `boardColumns` is empty → render nothing (or a disabled select). No crash.
- Moving is instant/optimistic; on API failure `handleMoveLead` already reverts `leads` — keep that behavior.
- Do NOT close the drawer on change (user wants to stay).

## REVISION 2 (user feedback): move on "Save Changes", NOT instantly
The stage dropdown must only STAGE a pending choice; the actual move happens when the user clicks
**Save Changes** — not on select change.
- Add state: `const [editStage, setEditStage] = useState("");` (near the other edit* useState, ~L410-440).
- In the "Synchronize Edit states when selectedLead changes" effect (inside `if (selectedLead)`, ~L468),
  add `setEditStage(selectedLead.section || "");`.
- The `Select`: `value={editStage}`, `onChange={(e) => setEditStage(e.target.value)}` — remove the
  immediate `handleMoveLead` and `setSelectedLead` calls from onChange entirely.
- In the edit submit handler (`payload` built ~L766-778, before `handleUpdateLead` at ~L783): if
  `editStage && editStage !== selectedLead.section`, enrich `payload` with the move using the SAME rules
  as page.js `handleMoveLead` (boardColumns is in scope):
  ```js
  if (editStage && editStage !== selectedLead.section) {
    const targetCol = boardColumns.find(c => c.id === editStage);
    const targetIsTargetList = targetCol && targetCol.label === "รายชื่อเป้าหมาย";
    payload.section = editStage;
    payload.previousSection = targetIsTargetList
      ? (selectedLead.section === editStage ? (selectedLead.previousSection || "") : (selectedLead.section || ""))
      : "";
    const targetIsClosedWon = targetCol && (targetCol.label === "ปิดการขาย" || targetCol.label === "Closed Won" || targetCol.id === "s11");
    payload.isReturningCustomer = selectedLead.isReturningCustomer || targetIsClosedWon || false;
    payload.statusChangedAt = new Date().toISOString();
  }
  ```
  `handleUpdateLead` then persists it in the SAME single PUT and the board reflects the new column.

## Acceptance
1. Opening a lead's detail drawer shows a "ย้ายสถานะ (Stage)" dropdown right under the address box.
2. Dropdown lists every board column; current column preselected.
3. Choosing another column moves the card there (visible on the board behind) without closing the drawer or navigating.
4. Reopening/saving the lead keeps the new stage (no revert).
5. Only the drawer is affected; the create-modal address block is unchanged. Light-theme consistent, reuses `Select`.
