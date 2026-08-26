# Impl spec — R&D page: tab widgets styled like the Stock page

**Goal (user):** Make the R&D page's top tab widgets look like the Stock page's tabs — big bordered
CARD tabs (icon + label on the left, a round count badge on the right, green 2px border when active),
instead of the current compact horizontal pills.

## File — `frontend/src/components/dashboard/RndView.js`
Replace the current "Widget tab bar" block (the `<div className="flex gap-2 overflow-x-auto ...">` that
maps `TABS` into compact pill buttons, ~L246-269) with the Stock-style card grid below. Everything it
uses (`TABS` array of `{id,label,icon}`, `active`, `setActive`, `counts[t.id]`) is already in scope — keep them.

```jsx
{/* Widget tab bar — Stock-style cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
  {TABS.map((t) => {
    const Icon = t.icon;
    const isActive = active === t.id;
    return (
      <button
        key={t.id}
        onClick={() => setActive(t.id)}
        className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
          isActive
            ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
            : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "text-green-600 scale-110" : "text-slate-400"}`} />
          <span className={`text-xs md:text-sm tracking-tight ${isActive ? "font-black" : "font-bold text-slate-600"}`}>
            {t.label}
          </span>
        </div>
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-mono font-extrabold shrink-0 ml-2 ${
          isActive ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
        }`}>
          {counts[t.id]}
        </div>
      </button>
    );
  })}
</div>
```

## Constraints
- Only replace the tab-bar block. Do NOT touch the tab CONTENT below it, the HeroBanner, or logic.
- 6 tabs → a 3-column grid (2 rows) on large screens; stacks on mobile. Matches Stock's card look exactly
  (same classes: `rounded-2xl`, `border-2 border-green-600` active, count circle `h-7 w-7`).
- Light theme; reuse the exact class strings above so it visually matches StockView.

## Acceptance
1. R&D page's 6 tabs render as large cards in a responsive grid (like Stock), not compact pills.
2. Active tab shows the green 2px border + tinted bg + scaled icon; count sits in a round badge on the right
   (green filled when active, slate when not).
3. Clicking a card still switches tab content exactly as before. No console errors.
