# Production Line ("สายการผลิต") — Simplify Scheduling UI

Target file: `frontend/src/components/dashboard/ProductionView.js`, `stageTab === "line"` branch
(currently ~L2693–2987), `openScheduleModal`/`schedForm` (~L798–896), schedule modal markup (~L3495–3584).

Reference: `orchestrate/design/_reference.md` (light Eco-Tech theme — obey, don't reinvent).

## 0. Diagnosis → decisions (read this before the wireframe)

| Problem (boss) | Root cause | Decision |
|---|---|---|
| Two mental models (buckets vs. grid) | Both claim ownership of "where is this order" | **ONE source of truth: the machine grid.** The left panel is demoted to a thin **"unassigned tray"** — its only job is "not yet placed." The moment an order is placed, it disappears from the tray and exists only on the grid. No more "เข้าคิวผลิตแล้ว" bucket (redundant with the grid). |
| Modal ≠ result location | Assign action (modal) and result (grid) are spatially separate | **Delete the centered modal.** Assignment happens by **drag-and-drop** from tray chip → grid day-cell (or click-to-arm + click-cell fallback). The block appears in the exact cell you interacted with. |
| queueNo vs. calendar day (2 orderings) | Both fields editable independently, no rule for which wins | **Calendar day wins. queueNo is derived, not entered.** Within one machine+day, stacking order (top→bottom) of blocks = queue order. Reordering = drag a stacked mini-block up/down. `scheduleQueueNo` is still written to the DB (backward compatible) but is **never a form field** — no operator ever types a number again. |
| Capacity bar always 0% (hours, but scheduling is per-day) | Metric measures the wrong unit | **Replace "168 ชม. / 0%" bar with day-occupancy dots**: one dot per visible day column, filled = has a job, empty = free. Honest, matches how scheduling actually works. |
| "ห้าม: <long list>" dominates card | Negative framing, unbounded list length | **Flip to positive + collapse:** "✅ ผลิตได้ N สูตร" (or "ผลิตได้ทุกสูตร"), one line, full names on hover/tap only. |
| IN-PROCESS QC bucket (currently empty, `0`) mixed into scheduling buckets | `prodStageOf()` maps status `รอตรวจ QC รอบที่ 1` into the same `"line"` stage as schedulable orders — real, can't relocate without a data-model change (out of scope) | **Keep them in this stage tab (unavoidable) but visually demote them out of the scheduling flow**: a single collapsed banner chip, not a bucket with its own column. They render as **locked/muted blocks** on the grid (already scheduled, not draggable), never re-enter the tray. |

Net effect: **one visual system** (the grid), **one ordering rule** (day position + stack order), **one honest metric** (day dots), **one place to assign** (drag onto the grid, or click chip → click cell).

## 1. Flow

1. Operator opens Production → "สายการผลิต" tab (`stageTab === "line"`).
2. Sees the grid (source of truth) with an unassigned tray above it.
3. To assign an order to a machine:
   - **Drag** the order chip from the tray onto the target day-cell of the desired machine row → drops there → chip vanishes from tray, block appears in that cell. Done. No modal.
   - **No-mouse fallback**: click the chip ("แตะเพื่อจัดคิว") → chip enters an armed/highlighted state, valid grid cells glow green-dashed, disallowed-formula cells show red hatch → click target cell → same result. Esc or click chip again cancels.
4. New block auto-selected for 3s shows an inline **duration stepper** (+1 วัน / +2 วัน / เต็มสัปดาห์) directly on the block — extend/shrink span without leaving the grid.
5. If a day-cell already has a block on that machine, the new block **stacks** underneath it (both visible, small drag-handle `≡` to reorder — reordering = the only way to change queue order).
6. If the chosen machine cannot run the order's formula, the drop is rejected inline (red toast anchored at the cell: "🚫 เครื่องนี้ผลิต [สูตร] ไม่ได้") — chip stays in the tray, nothing is written.
7. To unassign: drag a block back onto the tray strip, or click it → "นำออกจากคิว" in its hover actions (small `×`).
8. QC-stage orders (already past scheduling) appear as **muted, non-draggable** blocks on the grid with a "🧪 QC" badge — clicking opens the existing status modal (`openStatusModal`), same as today's gear icon.

## 2. Wireframe

### 2.1 Top-level layout (replaces the current 40/60 two-column split)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  รอจัดคิวเข้าเครื่องจักร (3)                              🧪 กำลังตรวจ QC (2) ›  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                     │
│  │ Naive Co │ │ Aroma Co │ │ Bloom Co │   ← horizontal-scroll chip tray     │
│  │ Hair Coat│ │ Milk Sh. │ │ Hair Coat│      (draggable; click = arm mode)  │
│  └──────────┘ └──────────┘ └──────────┘                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ไทม์ไลน์เครื่องจักร            วันที่: [__/__] มุมมอง: [รายสัปดาห์▾] +เครื่องจักร │
│  ● งานผลิต   ◌ ว่าง   ⬦ คิวชน (ช่วงงานทับกัน)                                │
│  ┌───────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐              │
│  │ เครื่องจักร │ จ.13 │ อ.14 │ พ.15 │ พฤ.16│ ศ.17 │ ส.18 │ อา.19│              │
│  ├───────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤              │
│  │ M01        │[Naive│      │  ว่าง │  ว่าง │  ว่าง │  ว่าง │  ว่าง │              │
│  │ Auto-01    │ Co]  │      │      │      │      │      │      │              │
│  │ ✅ผลิตได้2  │ ●●◌◌◌◌◌ 2/7 วัน มีงาน                              │              │
│  ├───────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤              │
│  │ M02        │ ว่าง │[Aroma│[Aroma│  ว่าง │  ว่าง │  ว่าง │  ว่าง │              │
│  │ Semi-02    │      │ Co] ≡│ Co,  │      │      │      │      │              │
│  │            │      │      │span2]│      │      │      │      │              │
│  │ ✅ผลิตได้ทุกสูตร │ ◌●●◌◌◌◌ 2/7 วัน มีงาน                              │              │
│  ├───────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤              │
│  │ M03        │ ว่าง │ ว่าง │[🧪QC │ ว่าง │ ว่าง │ ว่าง │ ว่าง │  ← muted,     │
│  │ Filling-03 │      │      │Bloom]│      │      │      │      │    locked    │
│  │ ✅ผลิตได้3  │ ◌◌●◌◌◌◌ 1/7 วัน มีงาน                              │              │
│  └───────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tray chip (draggable) — replaces bucket rows

```
┌────────────────────────────┐
│ Naive Co · Hair Coat        │   ← name · formula, 1 line, truncate
│ 12,000 ชิ้น        ⠿ ลาก    │   ← qty + drag-handle hint
└────────────────────────────┘
```
- `draggable=true`, `onDragStart` sets payload `{orderId}`.
- Click (non-drag, e.g. touch) → arm mode: chip gets green ring + "คลิกช่องที่ต้องการ" caption; grid cells become clickable targets.
- Tap chip again / Esc → disarm.

### 2.3 Grid day-cell states

```
EMPTY (droppable)             OCCUPIED (1 job)              OCCUPIED (stacked, 2 jobs)
┌ ─ ─ ─ ─ ─ ┐                 ┌───────────────┐             ┌───────────────┐
│   ว่าง     │                 │ ผลิต: Naive Co │             │ ≡ Naive Co     │
│           │                 │ Hair Coat      │             ├───────────────┤
└ ─ ─ ─ ─ ─ ┘                 │ [+1] [+2] [7ว] │ ← stepper   │ ≡ Aroma Co     │
                               │  (first 3s)    │             └───────────────┘
DRAG-OVER (valid)             DISALLOWED (drop rejected)     QC-LOCKED (read-only)
┌ ═ ═ ═ ═ ═ ┐ green dashed    ┌▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┐ red hatch    ┌───────────────┐
│  วางที่นี่  │                 │ 🚫 ห้ามสูตรนี้  │             │ 🧪 QC · Bloom  │
└ ═ ═ ═ ═ ═ ┘                 └───────────────┘             │ (คลิกดูสถานะ)  │
                                                              └───────────────┘
```

### 2.4 Machine row header (replaces the hours/percent block)

```
M01
Auto-01
✅ ผลิตได้ 2 สูตร  (hover → tooltip: Hair Coat, Milk Shampoo)
●●◌◌◌◌◌  2/7 วันมีงาน
```
- Dots = one per visible column in the current view (7 for weekly, N for monthly/daily).
- Dot fill: green = has ≥1 job that day, red ring = conflict (overlapping multi-day spans), gray dashed = empty.
- No hour math, no % anywhere.

## 3. States

- **Loading** (machines/orders fetching): grid shows 3 skeleton rows (shimmer `bg-slate-100` blocks), tray shows 3 skeleton chips. No interaction until loaded.
- **Empty tray** ("รอจัดคิวเข้าเครื่องจักร (0)"): collapse the tray strip to one line: "ไม่มีใบสั่งผลิตรอจัดคิว 🎉" — don't reserve empty chip slots.
- **Empty grid / no machines**: keep existing empty-state pattern (`+ เพิ่มเครื่องจักรเครื่องแรก` CTA) — unchanged, it already matches the reference system.
- **Empty machine row (no jobs this period)**: all 7 cells show dashed "ว่าง" ghost cells (unchanged visual, already correct).
- **Drag-over valid cell**: green dashed ring + "วางที่นี่" — immediate visual feedback before drop.
- **Drag-over disallowed cell** (formula not allowed on that machine): red diagonal hatch, cursor `not-allowed`, no "วางที่นี่" text.
- **Drop success**: block fades/scales in (`animate-in zoom-in-95`), stays highlighted (green ring) for ~1.5s, then settles to normal `work` styling. Tray chip removed with a quick fade.
- **Drop rejected** (disallowed formula, or backend save fails): chip animates back to tray (shake), inline red toast at the cell: "🚫 เครื่องนี้ผลิต [สูตร] ไม่ได้" (disallowed) or "บันทึกไม่สำเร็จ ลองอีกครั้ง" (network/error) — auto-dismiss 3s.
- **Reorder in-progress** (dragging a stacked mini-block): stack items shift with a placeholder gap, drop commits new `scheduleQueueNo` order for that machine+day.
- **Conflict** (overlapping multi-day spans on same machine): both blocks render with red-dashed border + "⬦ คิวชน" badge; still functional, not blocking — operator must manually resolve (drag one elsewhere).
- **QC-locked block**: muted (slate, not green), no drag handle, no delete `×`; click → opens existing `openStatusModal`.
- **Save error on span-resize stepper**: stepper button shows spinner briefly; on failure, span reverts, small red text under block: "ปรับช่วงเวลาไม่สำเร็จ".
- **Destructive**: removing an assigned order (drag back to tray, or `×` on a block) needs no confirm dialog — it's reversible (drag it right back), but show a 3s "เลิกทำ" (undo) toast instead of a blocking confirm modal.

## 4. Components — reuse vs. new

**Reuse (no new primitives needed):**
- `components/ui/Card.js` — machine row container, tray strip container.
- `components/ui/Badge.js` — "🧪 QC" badge, "⬦ คิวชน" badge, day-occupancy summary badge.
- `components/ui/Button.js` — duration-stepper buttons (+1/+2/เต็มสัปดาห์), "+ เพิ่มเครื่องจักร".
- `components/ui/Select.js` — view switcher (รายเดือน/รายสัปดาห์/รายวัน), unchanged.
- `components/ui/Modal.js` — **only** for "+ เพิ่มเครื่องจักร" (machine profile create/edit), which stays a real modal since it's a form, not an in-place assignment. The scheduling modal (`scheduleModalOrder`/`schedForm`, ~L3495–3584) is **deleted**.
- Native `title` attribute — sufficient for the "✅ ผลิตได้ N สูตร" hover tooltip; no new Tooltip/Popover component needed. (No `Popover`/`Tooltip` primitive exists in `components/ui/` today — confirmed by search — so don't invent one; native title attr covers this one hover case.)

**New, but scoped as local JSX inside `ProductionView.js` (not new `components/ui/` primitives, so no reuse violation):**
- Drag-and-drop handlers (`onDragStart`/`onDragOver`/`onDrop`) on tray chip and grid cell — plain HTML5 DnD, no library needed given existing app has no DnD dependency (check `package.json` before adding one; prefer none).
- Inline duration-stepper (small button row rendered inside a block on hover/first-3s) — one-off, not reusable elsewhere.
- Day-occupancy dot row — small inline component, could be extracted to `components/ui/` later if reused elsewhere, but not required now.

## 5. Data / fields

> ### ⚠️ BOSS AMENDMENT (overrides this section) — approved 2026-07-16
>
> The spec below said "no schema changes" and kept `scheduleStartDay` (a floating
> 0–6 weekday index). **Rejected.** That index is the root bug: it is not anchored
> to a real week, so an order scheduled "จันทร์" re-renders on Monday of *whatever*
> week the user scrolls to (`timelineColumns` recomputes from `timelineBaseDate`,
> ProductionView.js:589–625, while the stored index never moves). A schedule you
> cannot trust is worse than no schedule.
>
> **Store REAL DATES. This is the single source of truth for placement:**
>
> | Field | Type | Purpose |
> |---|---|---|
> | `scheduleMachineId` | String | which machine row |
> | `scheduleStartDate` | String `YYYY-MM-DD` | **first day — real date** |
> | `scheduleEndDate` | String `YYYY-MM-DD` | last day (= start for single-day) |
> | `scheduleQueueNo` | Number | stack order within machine+date — **derived on drop, never typed** |
>
> - **ADD** `scheduleStartDate` / `scheduleEndDate` to `orderProductSchema`
>   (backend/src/features/customers/customer.model.js). They are already written by
>   some code paths and survive only via `strict:false` — make them real fields.
> - **DROP** `scheduleStartDay` / `scheduleEndDay` / `scheduleView` from the write
>   path. Keep reading them ONLY as a migration fallback (see below), never write.
> - **MIGRATE** existing scheduled orders: resolve their floating day-index against
>   the week they were created in → concrete date. Back up first.
> - The grid maps a block to a column by comparing `scheduleStartDate` to that
>   column's real date — so the block stays on its true day in every view.
>
> **All three views stay** (รายวัน / รายสัปดาห์ / รายเดือน) — boss decision, contrary
> to open question #1. Placement is per-DAY in every view; the views only change the
> zoom of the columns:
> - **รายสัปดาห์** — 7 columns = the 7 real dates of the viewed week (drop target = that date).
> - **รายเดือน** — columns = weeks; dropping targets the first date of that week.
> - **รายวัน** — columns = hours of ONE real date; drop targets that date (the hour
>   column is presentation only; do NOT persist an hour — there is no duration data
>   to make hours meaningful, see the capacity finding).

| Field | Used for | Change from today |
|---|---|---|
| `scheduleMachineId` | which machine row the block renders on | unchanged, set on drop |
| ~~`scheduleStartDay`~~ → `scheduleStartDate` | which day-column the block starts at | **now a real date**, set on drop (was: manual `<select>` in modal) |
| ~~`scheduleEndDay`~~ → `scheduleEndDate` | span length (duration stepper) | **now a real date**, set via the on-block stepper (+1/+2/เต็มสัปดาห์) |
| ~~`scheduleView`~~ | — | **no longer persisted** — a real date needs no view context |
| `scheduleQueueNo` | stack order within the same machine+date | **now derived**, not typed. Written on drop = `max(existing queueNo for that machine+date) + 1`; rewritten for all affected items on reorder-drag. Never rendered as an editable input again. |

Order-side fields already read for the tray chip: `name` (customer/brand), `singleOrderedProduct.formulaName`, `singleOrderedProduct.quantityPcs`. QC-lock detection reuses existing `computedStatus`/`productionStatus` regex (`/QC|ตรวจ/i`) already in the codebase (`lineBucketOf`, ~L2703–2708) — keep that helper, just repurpose its `"qc"` branch to mark blocks **muted/locked** on the grid instead of populating a separate bucket column.

Machine model fields unchanged: `allowedFormulas`, `disallowedFormulas`, `name`, `id`. Only the **rendering** of the forbidden-list flips to a collapsed positive-framed summary (client-side string logic only, e.g. `allowed.length ? "✅ ผลิตได้ ${allowed.length} สูตร" : "✅ ผลิตได้ทุกสูตร"`, full names via `title`).

## 6. Explicitly DELETE from current UI

1. Left "ใบสั่งผลิตในไลน์" panel's 3-bucket layout (`BUCKETS` array + `lineBucketOf`, ~L2702–2798) — replaced by the single-line horizontal tray (unassigned only) + collapsed QC banner-chip.
2. The green "จัดคิว" / "ตั้งเวลา/คิว" button per row (~L2742–2748) — replaced by drag/click-to-arm on the tray chip itself.
3. The entire "จัดคิวผลิตเข้าเครื่องจักร" centered modal (~L3495–3584), including:
   - the "เครื่องจักร" `<select>` (replaced by drop-target machine row)
   - the "เริ่ม"/"จบ" day `<select>` pair (replaced by drop-target day + on-block duration stepper)
   - **the "ลำดับคิว (คิวที่)" numeric `<input>` entirely** — this is the field causing the queueNo/calendar conflict; delete it, never re-add a manual queue-number input.
4. `schedForm` state and `openScheduleModal`/`handleSaveSchedule` as modal-openers (logic is repurposed into `onDrop`/`onCellClick` handlers, not a modal submit).
5. The "ความจุ 168 ชม. / ใช้ไป 0 ชม. / 0%" block per machine (~L2965–2974), including the `usedHours`/`capacity`/`pct` calculation tied to nonexistent hour data — replaced by the day-occupancy dot row.
6. The long inline "🚫 ห้าม: <full list>" text block (~L2954–2963) — replaced by the collapsed "✅ ผลิตได้ N สูตร" one-liner with hover tooltip.
7. `queueNo` badge bubble on tray rows (green numbered circle, ~L2734–2736) — no longer meaningful once queueNo is derived from grid stack position, not shown on the tray (it's shown as stack position on the grid instead, via the `≡` handles).

## 7. Open questions (for boss/user before build)

1. **Daily (hourly) view**: scheduling granularity is fundamentally per-day (confirmed by the capacity-metric bug). Recommend: keep "รายวัน" as a **read-only** view (no drag/drop, view existing blocks only) until there's real start/end-time data, OR drop the "รายวัน" option from the view switcher for this tab entirely. Needs a call — not blocking the rest of this spec.
2. **HTML5 drag-and-drop vs. a DnD library**: no DnD dependency currently in `frontend/package.json` (not checked exhaustively — codex-builder should confirm before implementing). Recommend plain HTML5 DnD (`draggable`, `onDragOver`, `onDrop`) to avoid adding a dependency; acceptable given single-axis (tray→cell, and within-cell stack reorder) drag needs.
3. **Undo toast vs. confirm dialog** for unassigning: spec picks "undo toast" (lower friction, matches "5-second understanding" goal) — confirm this is acceptable, since the `_reference.md` house style calls for confirm-on-destructive; unassigning isn't data-destructive (just un-scheduling), so toast-undo is proposed as the exception.

## 8. Acceptance checklist

- [ ] Left panel shows exactly one thing: unassigned-order tray (horizontal chips), no more 3-bucket vertical list.
- [ ] QC-stage orders no longer render inside the tray/bucket UI; they appear only as muted, non-draggable blocks directly on the grid.
- [ ] Assigning an order to a machine+day requires zero modals: drag chip → drop on cell, or click chip → click cell.
- [ ] No UI surface anywhere lets a user type a queue number; `scheduleQueueNo` is written by the app based on stack position.
- [ ] Reordering same-day/same-machine jobs is done by dragging the stacked mini-block, and persists a new `scheduleQueueNo` order.
- [ ] Each machine row shows a day-occupancy dot row and a plain-language summary ("2/7 วันมีงาน"); no hour count, no percentage bar anywhere.
- [ ] "ผลิตได้ N สูตร" (or "ผลิตได้ทุกสูตร") renders as one line per machine card; full formula names only appear on hover/tap, never inline by default.
- [ ] Dropping an order on a machine that disallows its formula is rejected with an inline red message at the cell; nothing is saved; chip returns to the tray.
- [ ] Dropping a second order on an already-occupied cell stacks both (does not overwrite); both remain visible and clickable.
- [ ] Multi-day-span orders can be created by extending a freshly-dropped block via the on-block duration stepper (+1/+2/เต็มสัปดาห์), without opening any modal.
- [ ] Overlapping multi-day spans on the same machine are visually flagged "⬦ คิวชน" per existing legend, distinct from normal stacking.
- [ ] All states in §3 (loading/empty/error/drag-over/drop-success/drop-rejected/conflict/QC-locked) are implemented and visually distinct.
- [ ] "+ เพิ่มเครื่องจักร" flow (machine profile modal) is unchanged — still uses `components/ui/Modal.js`.
- [ ] No new entries added to `components/ui/` unless a genuine reuse case emerges later (day-occupancy dots and duration stepper stay local to `ProductionView.js` for this pass).
