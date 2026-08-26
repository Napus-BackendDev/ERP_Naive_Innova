# Design spec — Sales CRM: per-column collapse (minimize each column individually)

**SUPERSEDES the old global horizontal/vertical toggle (that button is removed).**

**Brief (from user):** No single button that flips the WHOLE board. Instead each column is collapsible
on its own: click a control on a column to collapse just that column from the default (expanded,
horizontal, cards visible) into a **narrow vertical bar that HIDES its cards** to save horizontal space.
Click again to expand it back. Columns collapse independently.

## Base already prepared (by boss)
- State added: `const [collapsedCols, setCollapsedCols] = useState({});` (map `{ [colId]: true }`).
- `ChevronDown` added to the `lucide-react` import (use `ChevronDown` for expanded, `ChevronRight` for
  collapsed — add `ChevronRight` to the import too).
- Global `boardVertical` toggle + its button were removed; board container and column width are back to
  their original classes.

## File
`frontend/src/components/dashboard/SalesCrmView.js`. The column is rendered in `localColumns.map(...)`;
the column wrapper `<div>` is at ~L966, its className `w-[300px] flex-shrink-0 flex flex-col rounded-2xl
border transition-all duration-200 max-h-full ...`. Column Header is ~L985-1113 (grip + title + zap |
count badge + 3-dots menu). Cards Container starts ~L1114.

Define once inside the map, after `const isColBeingDragged = ...` (~L964):
`const isCollapsed = !!collapsedCols[col.id];`
And a toggle helper (inline is fine):
`const toggleCollapse = (e) => { e.stopPropagation(); setCollapsedCols(p => ({ ...p, [col.id]: !p[col.id] })); };`

## Behavior
### Column width (wrapper ~L966)
Make width conditional on `isCollapsed`:
- expanded: `w-[300px] flex-shrink-0`
- collapsed: `w-14 flex-shrink-0` (narrow bar)
Keep everything else (`flex flex-col rounded-2xl border transition-all duration-200 max-h-full`, the
drag handlers, the `borderTop` color style) UNCHANGED so the column color + reordering still work.

### Collapse toggle button (in the header)
Add a small icon button in the header's right-side action group (the `<div className="flex items-center
gap-1.5 shrink-0">` at ~L1010, next to the count badge / before the 3-dots), styled like the 3-dots
button (`text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-0.5 rounded-lg`). Icon =
`ChevronDown` when expanded, `ChevronRight` when collapsed. `onClick={toggleCollapse}`, title
"ย่อคอลัมน์"/"ขยายคอลัมน์".

### Collapsed rendering
When `isCollapsed`:
- Render a COMPACT header only: the collapse toggle (to expand), the count badge, and the column label
  shown VERTICALLY (`[writing-mode:vertical-rl] rotate-180` or `[writing-mode:vertical-lr]`), truncated,
  so the user still knows which column it is. Stack them vertically, centered (`flex flex-col items-center
  gap-2 py-3`). The whole bar can also be click-to-expand.
- Do NOT render the Cards Container (the card list + "เพิ่มดีลใหม่" add button) at all — that's the space saving.
- Keep the `borderTop` color visible.
When expanded: render exactly as today (full header + cards). Minimize churn — wrap the existing
Cards Container in `{!isCollapsed && ( ... )}` and branch the header content on `isCollapsed`.

## Rules / states
- Default = all expanded (current behavior). Client-side only; nothing persisted, no API.
- Each column independent; collapsing one must not affect others.
- Drag-to-reorder columns and drag cards must still work for expanded columns; collapsed columns can stay
  draggable (grip optional in collapsed state).
- Light-theme consistent; reuse existing button styles. No console errors.

## Acceptance
1. Each column shows a collapse chevron in its header.
2. Clicking it shrinks THAT column to a narrow vertical bar with its cards hidden; label readable vertically; count still shown.
3. Clicking again restores the full column with cards. Other columns unaffected.
4. Column color stripe + drag reorder still work. No global board-flip button exists anymore.
