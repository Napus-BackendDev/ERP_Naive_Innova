# Naive Ops — Design Reference (ground truth)

Captured from the RUNNING app (localhost:3000) on 2026-07-15 by boss. This is the canonical
visual reference for ui-ux-designer, codex-builder, ui-reviewer, ux-reviewer. Trust THIS over
`design.md` / `system.md` (which describe an old dark theme that is NOT what ships).

Regenerate: start backend (`node backend/src/index.js`) → `POST /api/auth/mock-login` (no password,
seeds a Mock Admin) → inject returned `token`+`user` into localStorage → open `/admin/*`.

## Brand + theme tokens (from frontend/src/app/globals.css — authoritative)
- Product name: **Naive Ops** · tagline **ECO-TECH ERP** · logo = green leaf mark.
- Font: **Inter** (system-ui fallback). UI language = **Thai**; dates = Buddhist year (e.g. "15 กรกฎาคม 2569").
- `--color-primary: #10b981` (emerald/green-600), `--color-on-primary: #ffffff`
- `--color-background: #f8fafc` (page bg) · `--foreground: #0f172a` (slate-900 text)
- `--color-on-surface-variant: #475569` (muted slate-600 labels)
- Card bg `rgba(255,255,255,0.8)` · border `rgba(226,232,240,0.8)` (slate-200)
- Secondary accent = blue `#3b82f6` (fixed rgba 0.15 tint for chips)
- `.glass-panel`: white 0.8 + `backdrop-blur(12px)` + 1px slate border + radius 12px
- Scrollbars: thin 6px, track `#f1f5f9`, thumb `#cbd5e1`.
- Tailwind v4 + HeroUI + lucide-react. Reusable primitives: `frontend/src/components/ui/`
  (Badge, Button, Card, Input, Modal, Select, SearchableSelect) — REUSE, don't reinvent.

## App shell (every /admin page)
- **Left sidebar** (fixed, white, ~220px): leaf logo + "Naive Ops / ECO-TECH ERP" header; vertical nav
  with lucide icon + Thai/EN label; ACTIVE item = solid green pill (`bg-primary` white text, rounded).
  Bottom = user chip (avatar circle + name + role) with logout icon.
- Nav order (real): Dashboard · Sales CRM · BOM Calculator · Packaging · Production ·
  Finished Goods (Expiry) · Users · Database · Activity Logs (มันทึกคุกค่า) · Support · Settings.
- **Top bar**: hamburger (collapse sidebar) on left, bell/notification icon on right, otherwise empty.
- **Content**: page bg `#f8fafc`, generous padding, cards are `bg-white rounded-2xl border-slate-200 shadow-sm`.

## Component patterns observed (reuse these; don't invent new looks)
- **Page header block**: bold H1 (slate-900) + one-line muted Thai subtitle; primary actions top-right
  as green solid button (`+ เพิ่ม…`) and secondary outline buttons (นำเข้า/ส่งออก, Export).
- **Hero banner** (dashboard only): full-width green gradient card, white text, greeting + date +
  inline quick-action chips (สายการผลิต, Export Excel/CSV).
- **KPI stat card**: white rounded-2xl; tiny uppercase-tracked label top; big number in **font-mono**;
  small status Badge (e.g. green "Won", red "วิกฤตสต็อก"); muted sub-metric line at bottom.
  Numbers use ฿ / units; alert states colored red/amber.
- **Kanban board** (Sales CRM, Production Dispatch): horizontal scrollable columns; each column has a
  colored TOP border (red = ลูกค้าไม่สนใจ, blue = นัดหมาย, green = เป้าหมาย), count badge, and
  "+ เพิ่มดีลใหม่" ghost add-row; cards = white with title + ⭐ + muted meta + right-aligned ฿ value.
- **Status pills**: rounded, soft-tint bg + saturated text — emerald (ok/won), amber (warn), red (critical/FEFO alert).
- **Form rows** (BOM): left = ingredient with colored dot + Thai name, right = numeric input + unit suffix (ก./กก.).

## States to always design (ux-reviewer checks these)
- loading, empty ("กรอกจำนวน… เพื่อ…"), error, success, disabled, and confirm on destructive.
- Empty columns/lists show a dashed ghost "+ add" affordance, not a blank void.

## Known data caveats (see memory)
- ONE overloaded `User` collection = auth users + sales leads + production orders. A "customer card"
  in Sales CRM and a "production order" are the same underlying doc — design around this.
- BOM has a known unit 1000x mismatch bug; status-log can throw. Don't design flows that assume they're fixed.
