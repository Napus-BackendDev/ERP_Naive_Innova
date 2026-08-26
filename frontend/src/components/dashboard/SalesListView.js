"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Search, ArrowUpDown, Maximize2, X, Check
} from "lucide-react";
import LoyaltyStars, { loyaltyCount } from "./LoyaltyStars";

// ---------------------------------------------------------------------------
// Asana-style list view of the sales board.
//
// Same leads as the Kanban, laid out as one table grouped by stage: collapsible
// sections, a sticky header, inline editing, and per-group "add" rows. The
// columns are exactly the ones in the CSV import/export template, so what is
// on screen and what a salesperson opens in Excel line up field for field.
// ---------------------------------------------------------------------------

const ORDER_TYPES = [
  { value: "lot", label: "สั่งผลิตล็อต" },
  { value: "sample", label: "สั่งสินค้าตัวอย่าง" },
  { value: "inquiry", label: "สอบถามข้อมูล" }
];
const orderTypeLabel = (v) => ORDER_TYPES.find(o => o.value === v)?.label || "สอบถามข้อมูล";

const parseNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]+/g, ""));
  return isNaN(n) ? 0 : n;
};
const money = (v) => {
  const n = parseNum(v);
  return n ? n.toLocaleString() : "";
};

// Text cell that turns into an input on click and commits on blur or Enter.
// Escape restores the stored value — a mistyped cell must never be savable by
// simply clicking elsewhere.
function EditableCell({ value, onSave, placeholder = "—", align = "left", type = "text", width }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => { setDraft(value == null ? "" : String(value)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    if (String(value ?? "") !== draft) onSave(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === "Escape") { setEditing(false); }
        }}
        className={`w-full px-2 py-1 bg-white border border-green-500 rounded-md text-xs font-semibold text-slate-800 outline-none ${align === "right" ? "text-right" : ""}`}
        style={width ? { width } : undefined}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title="คลิกเพื่อแก้ไข"
      className={`w-full px-2 py-1 rounded-md text-xs font-semibold truncate cursor-text hover:bg-slate-100 transition-colors ${
        value ? "text-slate-700" : "text-slate-300"
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      {value ? String(value) : placeholder}
    </button>
  );
}

// "แหล่งที่มา" — the stage the lead currently sits in, shown as a chip and
// changeable in place. Moving a card no longer means switching to the board and
// dragging it across fourteen columns.
function StageCell({ lead, columns, onMove }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const current = columns.find(c => c.id === lead.section);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="max-w-full inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[15px] font-bold truncate hover:brightness-95 transition-all cursor-pointer"
        style={{
          borderColor: (current?.color || "#cbd5e1") + "66",
          background: (current?.color || "#94a3b8") + "1a",
          color: current?.color || "#64748b"
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: current?.color || "#94a3b8" }} />
        <span className="truncate">{current?.label || "ไม่ระบุ"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1">
          {columns.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setOpen(false); if (c.id !== lead.section) onMove(c.id); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[15px] font-bold text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                c.id === lead.section ? "text-green-700 bg-green-50/60" : "text-slate-600"
              }`}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color || "#3b82f6" }} />
              <span className="truncate flex-1">{c.label}</span>
              {c.id === lead.section && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesListView({
  leads = [],
  columns = [],
  onOpenLead,
  onCreateInSection,
  onUpdateLead
}) {
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "", dir: "asc" });

  // Open on the new-lead column only. With fourteen stages expanded the screen
  // is mostly empty group headers and the one list that gets worked every day is
  // pushed below the fold. Seeded once, when the columns first arrive — after
  // that whatever the user opens or closes is theirs to keep.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !columns.length) return;
    seeded.current = true;
    const keepOpen = (c) => c.id === "s1" || /เป้าหมาย|ผู้ติดต่อใหม่|^lead$/i.test(c.label || "");
    const next = {};
    columns.forEach(c => { if (!keepOpen(c)) next[c.id] = true; });
    setCollapsed(next);
  }, [columns]);

  const patch = (lead, fields) => onUpdateLead && onUpdateLead(lead._id, fields);

  const toggleSort = (key) => {
    setSort(s => s.key !== key ? { key, dir: "asc" } : (s.dir === "asc" ? { key, dir: "desc" } : { key: "", dir: "asc" }));
  };

  const q = query.trim().toLowerCase();
  const matches = (l) => !q || [l.name, l.phone, l.address, l.notes, l.brand]
    .some(v => String(v || "").toLowerCase().includes(q));

  // Rows are grouped by the stage they sit in; a lead whose section no longer
  // exists would otherwise disappear silently, so it lands in a trailing
  // "ไม่ระบุ Stage" group instead.
  const groups = useMemo(() => {
    const known = new Set(columns.map(c => c.id));
    const byId = {};
    columns.forEach(c => { byId[c.id] = []; });
    const orphans = [];
    leads.filter(matches).forEach(l => {
      if (known.has(l.section)) byId[l.section].push(l);
      else orphans.push(l);
    });

    // Default order: most stars first. A repeat buyer outranks a name that
    // merely sorts earlier in the alphabet, so the rows worth the salesperson's
    // time sit at the top of every group. Clicking a column header overrides it.
    const byStars = (a, b) => loyaltyCount(b) - loyaltyCount(a);
    const sortRows = (rows) => {
      if (!sort.key) return [...rows].sort(byStars);
      const dir = sort.dir === "asc" ? 1 : -1;
      const num = sort.key === "estValue" || sort.key === "paidAmount";
      return [...rows].sort((a, b) => {
        const cmp = num
          ? (parseNum(a[sort.key]) - parseNum(b[sort.key])) * dir
          : String(a[sort.key] || "").localeCompare(String(b[sort.key] || ""), "th") * dir;
        return cmp !== 0 ? cmp : byStars(a, b);
      });
    };

    const out = columns.map(c => ({ id: c.id, label: c.label, color: c.color, rows: sortRows(byId[c.id] || []) }));
    if (orphans.length) out.push({ id: "__orphan", label: "ไม่ระบุ Stage", color: "#94a3b8", rows: sortRows(orphans) });
    return out;
  }, [leads, columns, q, sort]);

  const shownCount = groups.reduce((n, g) => n + g.rows.length, 0);

  const SortHead = ({ label, k, className = "" }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer ${className}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sort.key === k ? "text-green-600" : "text-slate-300"}`} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-700">รายการดีลทั้งหมด</span>
          <span className="text-[14px] font-bold text-slate-400">
            {q ? `พบ ${shownCount} จาก ${leads.length} รายการ` : `${leads.length} รายการ`}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อ เบอร์ ที่อยู่ หรือหมายเหตุ..."
            className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-green-500 w-full sm:w-72 shadow-2xs"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-50 text-[14px] uppercase tracking-wider text-slate-500 font-black">
            <tr className="border-b border-slate-200">
              <th className="px-2 py-2.5 w-9" />
              <th className="px-3 py-2.5 min-w-[210px]"><SortHead label="ชื่อลูกค้า" k="name" /></th>
              <th className="px-3 py-2.5 min-w-[150px]">แหล่งที่มา</th>
              <th className="px-3 py-2.5 min-w-[120px]"><SortHead label="แบรนด์" k="brand" /></th>
              <th className="px-3 py-2.5 min-w-[130px]"><SortHead label="เบอร์โทรศัพท์" k="phone" /></th>
              <th className="px-3 py-2.5 min-w-[150px]">ประเภทออเดอร์</th>
              <th className="px-3 py-2.5 min-w-[110px] text-right"><SortHead label="มูลค่า" k="estValue" className="justify-end w-full" /></th>
              <th className="px-3 py-2.5 min-w-[110px] text-right"><SortHead label="ชำระแล้ว" k="paidAmount" className="justify-end w-full" /></th>
              <th className="px-3 py-2.5 min-w-[160px]">ที่อยู่</th>
              <th className="px-3 py-2.5 min-w-[170px]">หมายเหตุ</th>
            </tr>
          </thead>

          {groups.map(group => {
            const isOpen = !collapsed[group.id];
            return (
              <tbody key={group.id} className="border-b border-slate-100">
                {/* Group header */}
                <tr className="bg-slate-50/60">
                  <td colSpan={10} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setCollapsed(c => ({ ...c, [group.id]: isOpen }))}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: group.color || "#3b82f6" }} />
                      <span className="text-xs font-black text-slate-800 group-hover:text-green-700 transition-colors">{group.label}</span>
                      <span className="text-[14px] font-bold text-slate-400 bg-slate-200/60 rounded-full px-1.5 py-0.5">{group.rows.length}</span>
                    </button>
                  </td>
                </tr>

                {isOpen && group.rows.map(l => {
                  const done = l.isContacted === true;
                  return (
                  <tr key={l._id} className={`border-t border-slate-100 transition-colors group/row ${done ? "bg-green-50/40" : "hover:bg-green-50/30"}`}>
                    {/* Tick = "คุยสำเร็จแล้ว". Marks the conversation done without
                        moving the deal — the stage is a separate axis. */}
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        title={done ? "คุยสำเร็จแล้ว — กดเพื่อยกเลิก" : "ทำเครื่องหมายว่าคุยสำเร็จแล้ว"}
                        onClick={() => patch(l, { isContacted: !done, contactedAt: done ? null : new Date().toISOString() })}
                        className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          done
                            ? "bg-green-600 border-green-600 text-white"
                            : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500"
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <div className={`flex-1 min-w-0 ${done ? "line-through decoration-slate-400 opacity-60" : ""}`}>
                          <EditableCell value={l.name} placeholder="ไม่ระบุชื่อ" onSave={(v) => patch(l, { name: v })} />
                        </div>
                        <LoyaltyStars lead={l} size="xs" />
                        {/* Opens the same drawer the board cards use — everything
                            the list cannot edit inline lives in there. */}
                        <button
                          type="button"
                          title="เปิดรายละเอียด"
                          onClick={() => onOpenLead && onOpenLead(l)}
                          className="shrink-0 p-1 rounded-md text-slate-300 opacity-0 group-hover/row:opacity-100 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <StageCell lead={l} columns={columns} onMove={(id) => patch(l, { section: id })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <EditableCell value={l.brand} onSave={(v) => patch(l, { brand: v })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <EditableCell value={l.phone} onSave={(v) => patch(l, { phone: v })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={l.orderType || "inquiry"}
                        onChange={(e) => patch(l, { orderType: e.target.value })}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 border border-transparent focus:border-green-500 focus:bg-white rounded-md text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-colors"
                      >
                        {ORDER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5 font-mono">
                      <EditableCell value={money(l.estValue)} align="right" onSave={(v) => patch(l, { estValue: String(parseNum(v)) })} />
                    </td>
                    <td className="px-3 py-1.5 font-mono">
                      <EditableCell value={money(l.paidAmount)} align="right" onSave={(v) => patch(l, { paidAmount: String(parseNum(v)) })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <EditableCell value={l.address} onSave={(v) => patch(l, { address: v })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <EditableCell value={l.notes} onSave={(v) => patch(l, { notes: v })} />
                    </td>
                  </tr>
                  );
                })}

                {isOpen && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={10} className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => onCreateInSection && onCreateInSection(group.id === "__orphan" ? "" : group.id)}
                        className="flex items-center gap-1.5 pl-5 text-[15px] font-bold text-slate-400 hover:text-green-600 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> เพิ่มดีลใหม่
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>

        {shownCount === 0 && (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            {q ? `ไม่พบดีลที่ตรงกับ "${query}"` : "ยังไม่มีดีลในระบบ"}
          </div>
        )}
      </div>
    </div>
  );
}
