"use client";

import React, { useState, useEffect } from "react";
import { Button, Chip } from "@heroui/react";
import { 
  LayoutDashboard, FlaskConical, Package, Database, FileSpreadsheet, Download, 
  TrendingUp, Users, ShoppingBag, ArrowUpRight, AlertCircle, Sparkles, Plus, Play,
  Calendar, CheckCircle, Clock, Ban, ChevronRight, BarChart3, ShieldAlert, Factory, Wallet,
  AlertTriangle, Layers, Boxes, Activity, PackageX
} from "lucide-react";
import { loyaltyCount } from "./LoyaltyStars";

export default function CockpitView({
  ingredients = [],
  packaging = [],
  fgLots = [],
  leads = [],
  boardColumns = [],
  machines = [],
  handleExport,
  setActiveTab
}) {
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("สวัสดี, Naive Ops");

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('th-TH', options));

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "ตอนเช้า" : hour < 17 ? "ตอนบ่าย" : "ตอนเย็น";
    let name = "Naive Ops";
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored && (stored.name || stored.username)) name = stored.name || stored.username;
    } catch (e) {
      // ignore malformed user in storage
    }
    setGreeting(`สวัสดี${timeOfDay}, ${name}`);
  }, []);

  // Identify which board columns represent "won / closed" deals. Derived from
  // the live board config (label match) so renaming/reordering columns doesn't
  // silently break the KPIs; falls back to the legacy s11/s12 ids.
  // "ปิดการขายแล้ว" is won; "กำลังดีลเพื่อปิดการขาย" is NOT — it also contains the
  // words "ปิดการขาย", so the old pattern counted deals still being negotiated as
  // closed revenue. Anything still in progress is excluded explicitly.
  const IN_PROGRESS_RE = /กำลัง|เจรจา|ดีล(?!.*แล้ว)|follow|ติดตาม|negotiat/i;
  const isWonColumn = (c) => {
    const label = c?.label || "";
    if (IN_PROGRESS_RE.test(label)) return false;
    return /ปิด(การขาย|ดีล)|closed|won|สำเร็จ/i.test(label) || c?.id === "s11" || c?.id === "s12";
  };
  // Lost/cancelled columns, so failed revenue stops relying on a hard-coded "s12"
  // that does not exist on this board.
  const isLostColumn = (c) => /ไม่สนใจ|ยกเลิก|เสียดีล|lost|cancel|reject/i.test(c?.label || "") || c?.id === "s12";

  const wonColumnIds = (boardColumns || []).filter(isWonColumn).map(c => c.id);
  const wonIdSet = new Set(wonColumnIds.length ? wonColumnIds : ["s11"]);
  const lostIdSet = new Set((boardColumns || []).filter(isLostColumn).map(c => c.id));
  // A column cannot be both won and lost. The legacy "s12" fallback appeared on
  // both lists, so on any board that still has it the same money was counted as
  // closed revenue AND as a lost deal. Lost wins — a cancelled deal is not sales.
  lostIdSet.forEach(id => wonIdSet.delete(id));
  // Board order comes from the `order` field, not the array's arrival order. The
  // column with order 0 here is "ลูกค้าไม่สนใจ", not the new-lead column, so
  // reading boardColumns[0] silently picked the wrong one.
  const firstColId =
    ((boardColumns || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
      .find(c => !isWonColumn(c) && !isLostColumn(c))?.id) || "s1";

  // Compute stats
  const totalLeadsCount = leads.length;
  const wonLeads = leads.filter(l => wonIdSet.has(l.section));
  const activeLeads = leads.filter(l => !wonIdSet.has(l.section) && l.section !== firstColId);

  const wonDealsValue = wonLeads.reduce((sum, l) => sum + (parseFloat(l.estValue) || 0), 0);
  const activeDealsValue = activeLeads.reduce((sum, l) => sum + (parseFloat(l.estValue) || 0), 0);

  // Pipeline distribution: one bar per board column (in board order), so custom
  // columns are always represented and no lead ever silently vanishes.
  const orderedCols = (boardColumns || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const stageBars = (orderedCols.length ? orderedCols : [
    { id: "s1", label: "รายชื่อเป้าหมาย" },
  ]).map(c => ({
    name: c.label || c.id,
    count: leads.filter(l => l.section === c.id).length,
    color: wonIdSet.has(c.id) ? "bg-emerald-600" : (c.color ? "" : "bg-blue-500"),
    rawColor: wonIdSet.has(c.id) ? "" : c.color
  }));
  const maxStageCount = Math.max(...stageBars.map(s => s.count), 1);

  // Expiring lots in next 30 days
  const expiringLots = fgLots.filter(l => {
    const diffTime = new Date(l.expDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  // Financial Tracking Calculations
  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // ---- The three money cards ------------------------------------------------
  // ยอดทั้งหมด = ชำระแล้ว + กำลังชำระ, by construction. They used to be computed
  // from two different populations — "confirmed" meant a won column while
  // "unpaid" meant anything committed — which is how the card ended up claiming
  // ฿10,000 of orders with ฿157,750 outstanding against them.

  // A deal is real money once the customer commits: it reached a won column, was
  // confirmed, money changed hands, or a lot was actually produced for it. A
  // quoted estValue on a lead still sitting in "รายชื่อเป้าหมาย" is a hope.
  const isCommitted = (l) =>
    wonIdSet.has(l.section) ||
    l.isConfirmed === true ||
    String(l.payPct || "").trim() === "100%" ||
    parseNum(l.paidAmount) > 0 ||
    (Array.isArray(l.orderedProducts) && l.orderedProducts.some(p => p?.producedLotId || p?.isConfirmed));

  // Lost deals are not receivables and not revenue — excluded from all three.
  const committedDeals = (leads || []).filter(l => isCommitted(l) && !lostIdSet.has(l.section));

  const dealMoney = (l) => {
    const paid = parseNum(l.paidAmount);
    // A deposit larger than the quote means the quote was never updated; the
    // order is worth at least what was paid for it.
    const total = Math.max(parseNum(l.estValue), paid);
    return { totalVal: total, paidVal: paid, balanceVal: Math.max(0, total - paid) };
  };

  // ซ้าย: ยอดทั้งหมด
  const confirmedDeals = committedDeals;
  const totalConfirmedVal = committedDeals.reduce((s, l) => s + dealMoney(l).totalVal, 0);
  // กลาง: ลูกค้าชำระแล้ว — same population as the total above, so the percentage
  // below it is a real share of that total and can never exceed 100%.
  const totalPaidAmount = committedDeals.reduce((s, l) => s + dealMoney(l).paidVal, 0);
  const paidCustomers = committedDeals.filter(l => dealMoney(l).paidVal > 0);
  // ขวา: กำลังชำระ
  const unpaidCustomers = committedDeals
    .map(l => ({ ...l, ...dealMoney(l) }))
    .filter(l => l.balanceVal > 0)
    // Chase the loyal customers first; the outstanding amount only breaks ties.
    .sort((a, b) => (loyaltyCount(b) - loyaltyCount(a)) || (b.balanceVal - a.balanceVal));
  const totalUnpaidAmount = unpaidCustomers.reduce((sum, l) => sum + l.balanceVal, 0);
  const paidPct = totalConfirmedVal > 0
    ? Math.min(100, (totalPaidAmount / totalConfirmedVal) * 100)
    : 0;

  // Lost/cancelled deals. `l.status` is not a field on this collection, so the
  // old check fell through to `notes` and any note containing "ยกเลิก" — even
  // "ลูกค้าไม่ยกเลิกแล้ว" — marked the deal dead. `provinceStrike` is a flag
  // about the province, not about the deal. Both dropped: the board column is
  // the only place a deal is actually declared lost.
  const failedDeals = (leads || []).filter(l => lostIdSet.has(l.section));
  const totalFailedVal = failedDeals.reduce((sum, l) => sum + parseNum(l.estValue), 0);

  // A job that reached any of these is finished — it must not keep counting as
  // work in progress. "สำเร็จเสร็จสิ้น" was missing, so closed jobs stayed "on the
  // floor" forever and showed up under พร้อมส่ง.
  const HANDED_OVER = ["ส่งให้ลูกค้า", "ส่งเก็บเข้าคลัง", "สำเร็จเสร็จสิ้น"];
  const lineStatusOf = (p, order) => String(p?.productionStatus || order?.productionStatus || "").trim();
  const isLineOnFloor = (p, order) => {
    const st = lineStatusOf(p, order);
    return !!st && st !== "ยังไม่ผลิต" && st !== "ยังไม่พร้อม" && !HANDED_OVER.includes(st);
  };

  // Orders shown in the production status cards: everything still on the floor,
  // plus recently finished work. The old rule kept only rows touched in the last
  // 3 days, which hid the jobs that have been stuck the longest — exactly the
  // ones this panel exists to surface.
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const nowTime = Date.now();
  // Has this order ever entered production at all? A brand-new sales lead with no
  // product lines has not, and the "recently touched" rule below used to sweep
  // those in — four empty leads were being reported as รอเตรียมผลิต.
  const hasProductionHistory = (order) => {
    const lines = Array.isArray(order.orderedProducts) ? order.orderedProducts : [];
    return lines.some(p => {
      const st = lineStatusOf(p, order);
      return !!st && st !== "ยังไม่ผลิต" && st !== "ยังไม่พร้อม";
    });
  };
  const recentProductionOrders = (leads || []).filter(order => {
    const lines = Array.isArray(order.orderedProducts) ? order.orderedProducts : [];
    if (lines.some(p => isLineOnFloor(p, order))) return true;
    if (!hasProductionHistory(order)) return false;
    // Take the most recent of the three: statusChangedAt tracks the CRM column,
    // not the line, so a job finished today on a lead parked in its column since
    // last week would otherwise look stale and drop out.
    const times = [order.statusChangedAt, order.updatedAt, order.createdAt]
      .map(d => (d ? new Date(d).getTime() : NaN))
      .filter(t => !isNaN(t));
    if (!times.length) return false;
    return (nowTime - Math.max(...times)) <= THREE_DAYS_MS;
  });

  // With several lines on one order, the earliest stage is what the order is
  // really waiting on. Reading orderedProducts[0] alone reported an order as
  // delivered while its second product was still in QC.
  const STAGE_ORDER = ["waiting_prep", "in_production", "packaging", "qc", "ready"];

  const getOrderStatus = (o) => {
    if (!o) return "ยังไม่ผลิต";
    const lines = Array.isArray(o.orderedProducts) ? o.orderedProducts : [];
    const onFloor = lines.filter(p => isLineOnFloor(p, o));
    if (onFloor.length) return lineStatusOf(onFloor[0], o);
    if (lines.length && lines[0]?.productionStatus) return String(lines[0].productionStatus).trim();
    return (o.computedStatus || o.productionStatus || "ยังไม่ผลิต").trim();
  };

  const getOrderStep = (o) => {
    if (!o) return 1;
    const lines = Array.isArray(o.orderedProducts) ? o.orderedProducts : [];
    const steps = lines.map(p => Number(p?.productionStep)).filter(n => !isNaN(n));
    if (steps.length) return Math.min(...steps);
    return Number(o.productionStep || 1);
  };

  // Category of ONE status string.
  const categoryOfStatus = (status) => {
    if (
      status === "สำเร็จเสร็จสิ้น" ||
      status === "ส่งให้ลูกค้า" ||
      status === "ส่งเก็บเข้าคลัง" ||
      status === "พร้อมส่ง" ||
      status === "รอลูกค้ายืนยัน"
    ) {
      return "ready";
    }
    // Both QC rounds are QC. Round 1 used to be filed under "กำลังผลิต", which
    // left the QC card permanently at 0 and made a QC backlog read as a busy line.
    if (status.includes("QC")) {
      return "qc";
    }
    if (status === "รอบรรจุ" || status === "บรรจุ") {
      return "packaging";
    }
    if (
      status === "เลือกเครื่องจักร" ||
      status === "กำลังผลิต" ||
      status === "ผสมสูตร" ||
      status.includes("กำลังผลิต")
    ) {
      return "in_production";
    }
    return "waiting_prep";
  };

  // An order sits in the EARLIEST stage any of its lines is in — one product still
  // waiting to be packed means the order is not "ready", however far the others got.
  const getProductionCategory = (o) => {
    const lines = Array.isArray(o?.orderedProducts) ? o.orderedProducts : [];
    const cats = lines
      .filter(p => lineStatusOf(p, o))
      .map(p => categoryOfStatus(lineStatusOf(p, o)));
    if (!cats.length) return categoryOfStatus(getOrderStatus(o));
    return cats.reduce((a, b) => (STAGE_ORDER.indexOf(a) <= STAGE_ORDER.indexOf(b) ? a : b));
  };

  const statusCounts = {
    waiting_prep: 0,
    in_production: 0,
    packaging: 0,
    qc: 0,
    ready: 0
  };

  recentProductionOrders.forEach(o => {
    const cat = getProductionCategory(o);
    statusCounts[cat] = (statusCounts[cat] || 0) + 1;
  });

  // Shortage items for Left Box.
  // A flat "< 5000 g" flagged 65 of 88 chemicals and "< 500" flagged 53 of 63
  // packaging items — a warning on almost everything is a warning about nothing.
  // Each item is compared against its own reorder point when one is set, and the
  // flat number is only the fallback for items that have none.
  const FALLBACK_ING_MIN = 5000;   // grams
  const FALLBACK_PKG_MIN = 500;    // pieces
  const ingMin = (i) => {
    const v = Number(i?.minStock ?? i?.reorderPoint ?? i?.safetyStock);
    return Number.isFinite(v) && v > 0 ? v : FALLBACK_ING_MIN;
  };
  const pkgMin = (p) => {
    const v = Number(p?.minStock ?? p?.reorderPoint ?? p?.safetyStock);
    return Number.isFinite(v) && v > 0 ? v : FALLBACK_PKG_MIN;
  };
  // Sort by how short each item is relative to its own threshold, so the most
  // critical sits on top instead of merely the smallest number.
  const shortageIngredients = (ingredients || [])
    .filter(ing => (Number(ing.openingStock) || 0) < ingMin(ing))
    .sort((a, b) => (Number(a.openingStock) || 0) / ingMin(a) - (Number(b.openingStock) || 0) / ingMin(b));

  const shortagePackaging = (packaging || [])
    .filter(pkg => (Number(pkg.currentQuantity) || 0) < pkgMin(pkg))
    .sort((a, b) => (Number(a.currentQuantity) || 0) / pkgMin(a) - (Number(b.currentQuantity) || 0) / pkgMin(b));

  const totalShortageCount = shortageIngredients.length + shortagePackaging.length;

  // Machines & Production Queues for Right Box
  const DEFAULT_MACHINES = [
    { id: "m1", _id: "m1", name: "เครื่องผสมสูตร 1 (100L)", color: "bg-emerald-500", status: "active" },
    { id: "m2", _id: "m2", name: "เครื่องผสมสูตร 2 (500L)", color: "bg-blue-500", status: "active" },
    { id: "m3", _id: "m3", name: "เครื่องบรรจุขวดอัตโนมัติ", color: "bg-purple-500", status: "active" },
    { id: "m4", _id: "m4", name: "ไลน์ติดฉลาก & ยิง LOT", color: "bg-amber-500", status: "active" }
  ];

  const activeMachines = machines && machines.length > 0 ? machines : DEFAULT_MACHINES;

  const activeProdOrders = (leads || []).filter(order => {
    const st = getOrderStatus(order);
    return st === "กำลังผลิต" || st === "เลือกเครื่องจักร" || st === "รอตรวจ QC รอบที่ 1" || st === "รอบรรจุ";
  });

  // Scheduled run window for a queued job. Same field names and same 09:00–18:00
  // defaults the Production timeline uses, so the two screens never disagree
  // about when a machine is booked.
  const dayLabel = (raw) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d)) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const scheduleOf = (o) => {
    const p = (Array.isArray(o?.orderedProducts) ? o.orderedProducts[0] : o?.orderedProducts) || {};
    const start = p.scheduleStartTime || o.scheduleStartTime || "09:00";
    const end = p.scheduleEndTime || o.scheduleEndTime || "18:00";
    const startDate = p.scheduleStartDate || o.scheduleStartDate;
    const endDate = p.scheduleEndDate || o.scheduleEndDate || startDate;
    const from = dayLabel(startDate);
    const to = dayLabel(endDate);
    // A run booked across days has to say so — "09:00-18:00" alone would read as
    // today's shift when the job actually finishes tomorrow.
    const days = !from ? "" : (to && to !== from ? ` (${from} → ${to})` : ` (${from})`);
    return { time: `${start}-${end}`, days, scheduled: !!startDate };
  };

  return (
    <div className="flex flex-col gap-6 text-left select-none animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-emerald-800 to-green-700 text-white p-6 sm:p-8 shadow-xl shadow-green-950/10 border border-green-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 text-[14px] font-bold tracking-wider uppercase">
              <Sparkles className="h-3 w-3" /> ระบบบริการจัดการโรงงานอัจฉริยะ
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{greeting}</h1>
            <p className="text-xs text-emerald-100 font-medium flex items-center gap-1.5 opacity-90">
              <Calendar className="h-3.5 w-3.5 text-emerald-300" /> {currentDate || "กำลังโหลด..."}
            </p>
          </div>
          
          {/* Quick Actions & Export Panel */}
          <div className="flex flex-wrap gap-2.5 shrink-0 bg-black/10 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
            <Button
              size="sm"
              onPress={() => setActiveTab("production")}
              className="bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Play className="h-4 w-4 text-emerald-400" /> สายการผลิต
            </Button>
            <Button
              size="sm"
              onPress={() => setActiveTab("fg")}
              className="bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Package className="h-4 w-4 text-sky-400" /> คลังสินค้าสำเร็จรูป
            </Button>
            <Button
              size="sm"
              onPress={() => handleExport("excel")}
              className="bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Export Excel
            </Button>
            <Button 
              size="sm" 
              onPress={() => handleExport("csv")} 
              className="bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-blue-400" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Production Status Section Wrapper with 5 Status Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs space-y-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-3xs">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                สถานการณ์ผลิต
              </h2>
              <p className="text-xs text-slate-400 font-bold">
                ภาพรวมสถานะกระบวนการผลิตทั้ง 5 ขั้นตอน
              </p>
            </div>
          </div>
          <Chip size="sm" variant="flat" className="bg-emerald-500/10 text-emerald-700 font-black border border-emerald-200/80">
            ⏱️ งานที่ยังอยู่ในไลน์ + ที่เพิ่งเสร็จใน 3 วัน ({recentProductionOrders.length} รายการ)
          </Chip>
        </div>

        {/* 5 Production Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Card 1: รอเตรียมผลิต */}
          <div 
            onClick={() => setActiveTab("production")}
            className="cursor-pointer bg-slate-50/70 hover:bg-amber-50/60 rounded-2xl p-4 border border-slate-200 hover:border-amber-300 transition-all duration-200 shadow-3xs hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[15px] text-slate-500 font-black tracking-wider block">1. รอเตรียมผลิต</span>
              <div className="h-8 w-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{statusCounts.waiting_prep}</span>
              <Chip size="sm" className="bg-amber-500/10 text-amber-700 font-extrabold text-[14px] border border-amber-200">รอคิว</Chip>
            </div>
            <p className="text-[14px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200/60">รอยืนยัน / เลือกเครื่อง</p>
          </div>

          {/* Card 2: กำลังผลิต */}
          <div 
            onClick={() => setActiveTab("production")}
            className="cursor-pointer bg-slate-50/70 hover:bg-blue-50/60 rounded-2xl p-4 border border-slate-200 hover:border-blue-300 transition-all duration-200 shadow-3xs hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[15px] text-slate-500 font-black tracking-wider block">2. กำลังผลิต</span>
              <div className="h-8 w-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center border border-blue-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{statusCounts.in_production}</span>
              <Chip size="sm" className="bg-blue-500/10 text-blue-700 font-extrabold text-[14px] border border-blue-200">กำลังผสม</Chip>
            </div>
            <p className="text-[14px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200/60">ดำเนินการในไลน์ผลิต</p>
          </div>

          {/* Card 3: รอบรรจุ */}
          <div 
            onClick={() => setActiveTab("production")}
            className="cursor-pointer bg-slate-50/70 hover:bg-purple-50/60 rounded-2xl p-4 border border-slate-200 hover:border-purple-300 transition-all duration-200 shadow-3xs hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[15px] text-slate-500 font-black tracking-wider block">3. รอบรรจุ</span>
              <div className="h-8 w-8 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center border border-purple-200 group-hover:scale-105 transition-transform">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{statusCounts.packaging}</span>
              <Chip size="sm" className="bg-purple-500/10 text-purple-700 font-extrabold text-[14px] border border-purple-200">บรรจุภัณฑ์</Chip>
            </div>
            <p className="text-[14px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200/60">กรอกขวด / สติ๊กเกอร์</p>
          </div>

          {/* Card 4: รอ QC */}
          <div 
            onClick={() => setActiveTab("production")}
            className="cursor-pointer bg-slate-50/70 hover:bg-orange-50/60 rounded-2xl p-4 border border-slate-200 hover:border-orange-300 transition-all duration-200 shadow-3xs hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[15px] text-slate-500 font-black tracking-wider block">4. รอ QC</span>
              <div className="h-8 w-8 rounded-xl bg-orange-100/80 text-orange-700 flex items-center justify-center border border-orange-200 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{statusCounts.qc}</span>
              <Chip size="sm" className="bg-orange-500/10 text-orange-700 font-extrabold text-[14px] border border-orange-200">ตรวจคุณภาพ</Chip>
            </div>
            <p className="text-[14px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200/60">ตรวจ QC 1 & QC 2</p>
          </div>

          {/* Card 5: พร้อมส่ง */}
          <div 
            onClick={() => setActiveTab("production")}
            className="cursor-pointer bg-slate-50/70 hover:bg-emerald-50/60 rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-all duration-200 shadow-3xs hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[15px] text-slate-500 font-black tracking-wider block">5. พร้อมส่ง</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition-transform">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{statusCounts.ready}</span>
              <Chip size="sm" className="bg-emerald-500/10 text-emerald-700 font-extrabold text-[14px] border border-emerald-200">เสร็จสิ้น</Chip>
            </div>
            <p className="text-[14px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200/60">ส่งเข้าคลัง / ลูกค้า</p>
          </div>
        </div>
      </div>

      {/* 2.5 Side-by-Side Production Operational Grid (Left: ของขาดสำหรับคิวผลิต | Right: คิวการผลิตวันนี้) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Box: ของขาดสำหรับคิวผลิต (Shortage Box) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200 space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-3xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                    ของขาดสำหรับคิวผลิต
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    วัตถุดิบเคมี บรรจุภัณฑ์ และสินค้าที่ขาดแคลนในคิวผลิต
                  </p>
                </div>
              </div>
              <Chip size="sm" variant="flat" className="bg-amber-500/10 text-amber-700 font-black border border-amber-200/80">
                ⚠️ ขาดแคลน {shortageIngredients.length + shortagePackaging.length} รายการ
              </Chip>
            </div>

            {/* List Content */}
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
              {/* Chemical Ingredients Shortage */}
              <div className="space-y-2.5">
                <span className="text-[14px] text-slate-400 uppercase font-black tracking-wider block">
                  🧪 วัตถุดิบเคมีที่ต่ำเกณฑ์ (ต่ำกว่า 5 กก.)
                </span>
                {shortageIngredients.slice(0, 3).map(ing => (
                  <div key={ing._id} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[180px]">{ing.name}</h4>
                      <p className="text-[14px] text-slate-400 font-bold">
                        คงเหลือ: <span className="font-mono text-amber-600">{ing.openingStock.toLocaleString()} g</span>
                      </p>
                    </div>
                    <Chip size="sm" className="bg-amber-500/10 text-amber-700 font-bold text-[14px] border border-amber-200 shrink-0">
                      ต้องเติมด่วน
                    </Chip>
                  </div>
                ))}
                {shortageIngredients.length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-xs italic">
                    ✅ ไม่มีสารเคมีขาดแคลน
                  </div>
                )}
              </div>

              {/* Packaging & Stock Shortage */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[14px] text-slate-400 uppercase font-black tracking-wider block">
                  📦 บรรจุภัณฑ์ & สต็อกสินค้าใกล้หมด (ต่ำกว่า 500 ชิ้น)
                </span>
                {shortagePackaging.slice(0, 3).map(pkg => (
                  <div key={pkg._id} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[180px]">{pkg.name || pkg.itemName || "บรรจุภัณฑ์"}</h4>
                      <p className="text-[14px] text-slate-400 font-bold">
                        คงเหลือ: <span className="font-mono text-orange-600">{(pkg.currentQuantity || 0).toLocaleString()} ชิ้น</span>
                      </p>
                    </div>
                    <Chip size="sm" className="bg-orange-500/10 text-orange-700 font-bold text-[14px] border border-orange-200 shrink-0">
                      วิกฤตสต็อก
                    </Chip>
                  </div>
                ))}
                {shortagePackaging.length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-xs italic">
                    ✅ บรรจุภัณฑ์ในคลังพอเพียง
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-center">
            <Button size="sm" variant="flat" color="warning" className="font-extrabold w-full cursor-pointer rounded-2xl" onPress={() => setActiveTab("stock")}>
              เช็ครายการวัตถุดิบและสต็อกสินค้าทั้งหมด <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>

        {/* Right Box: คิวการผลิตวันนี้ (Machine & Production Queue Box) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200 space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-3xs">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                    คิวการผลิตวันนี้
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    ลำดับคิวงานผลิตและสถานะเครื่องจักรในระบบ
                  </p>
                </div>
              </div>
              <Chip size="sm" variant="flat" className="bg-emerald-500/10 text-emerald-700 font-black border border-emerald-200/80">
                ⚙️ {activeProdOrders.length} คิวงานผลิต
              </Chip>
            </div>

            {/* Machine Queue List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activeMachines.map(m => {
                const macId = m._id || m.id;
                const queuedOrders = activeProdOrders.filter(o => {
                  const itemMacId = o.orderedProducts?.[0]?.scheduleMachineId || o.scheduleMachineId;
                  return itemMacId === macId || itemMacId === m.name || (Array.isArray(m.queue) && m.queue.some(q => q.orderId === o._id));
                });

                return (
                  <div key={macId} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${m.color || "bg-emerald-500"}`} />
                        <h4 className="font-extrabold text-slate-800 text-xs">{m.name}</h4>
                      </div>
                      <Chip size="sm" variant="flat" className={queuedOrders.length > 0 ? "bg-emerald-500/10 text-emerald-700 font-bold text-[13px]" : "bg-slate-100 text-slate-500 text-[13px]"}>
                        {queuedOrders.length > 0 ? `เดินเครื่อง (${queuedOrders.length} คิว)` : "ว่าง"}
                      </Chip>
                    </div>

                    {queuedOrders.length > 0 ? (
                      <div className="space-y-1.5 pt-1 pl-4 border-l-2 border-slate-200">
                        {queuedOrders.map(o => {
                          const sch = scheduleOf(o);
                          return (
                            <div key={o._id} className="flex justify-between items-start gap-2 text-[15px] font-bold">
                              <span className="text-slate-700 truncate max-w-[190px]">
                                {o.name} ({o.orderedProducts?.[0]?.formulaName || "สินค้า"})
                              </span>
                              {/* Slot time only. The QC status used to sit here too,
                                  but this panel answers "which machine, when" —
                                  the QC stage is what the 5 status cards above are for. */}
                              <span className={`shrink-0 font-mono text-[14px] ${sch.scheduled ? "text-slate-700" : "text-slate-400 font-medium italic"}`}>
                                <Clock className="h-2.5 w-2.5 inline-block mb-0.5 mr-0.5" />
                                {sch.scheduled ? `${sch.time}${sch.days}` : "ยังไม่ระบุเวลา"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[14px] text-slate-400 font-medium italic pl-4">
                        ยังไม่มีคิวผลิตที่มอบหมายบนเครื่องนี้
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-center">
            <Button size="sm" variant="flat" color="success" className="font-extrabold w-full cursor-pointer rounded-2xl" onPress={() => setActiveTab("production")}>
              จัดคิวและดูสายการผลิตทั้งหมด <Play className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>

      </div>

      {/* 3. Sales CRM Pipeline Stage Section (Simple Compact Cards Grid) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs hover:shadow-md transition-shadow duration-200 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              ภาพรวมกระบวนการขาย (Sales CRM Pipeline Stage)
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              สรุปจำนวนและสัดส่วนลูกค้าในแต่ละสเต็ปบนบอร์ด CRM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-700 font-black border border-blue-200">
              📊 ทั้งหมด {totalLeadsCount} รายการ
            </Chip>
            <Button size="sm" variant="light" color="primary" className="font-extrabold cursor-pointer text-xs" onPress={() => setActiveTab("sales")}>
              เปิดดูบอร์ด CRM
            </Button>
          </div>
        </div>

        {/* Simple Compact Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {stageBars.map((stage, i) => {
            const percentage = totalLeadsCount > 0 ? (stage.count / totalLeadsCount) * 100 : 0;
            const hasItems = stage.count > 0;

            return (
              <div 
                key={i} 
                className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-2 text-left ${
                  hasItems 
                    ? "bg-slate-50/90 hover:bg-slate-100/90 border-slate-300 shadow-3xs" 
                    : "bg-slate-50/40 border-slate-200/50 opacity-60"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${stage.color || "bg-blue-500"}`} style={{ backgroundColor: stage.rawColor || undefined }} />
                  <span className={`font-mono text-xs font-black ${hasItems ? "text-blue-600" : "text-slate-400"}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className={`text-xl font-black font-mono block ${hasItems ? "text-slate-800" : "text-slate-400"}`}>
                    {stage.count} <span className="text-[14px] font-bold text-slate-400 font-sans">รายการ</span>
                  </span>
                  <h4 className={`text-xs font-extrabold truncate line-clamp-1 ${hasItems ? "text-slate-700" : "text-slate-400"}`} title={stage.name}>
                    {stage.name}
                  </h4>
                </div>
              </div>
            );
          })}
          {stageBars.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 italic text-xs font-semibold">
              ยังไม่มีคอลัมน์บนบอร์ด CRM
            </div>
          )}
        </div>
      </div>

      {/* 4. Financial Tracking Section (การเงินที่ต้องติดตาม) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs space-y-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-3xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                การเงินที่ต้องติดตาม
              </h2>
              <p className="text-xs text-slate-400 font-bold">
                สรุปยอดเงินยืนยัน ยอดสุ่มเสี่ยง Fail และติดตามลูกค้ารายที่ค้างชำระ
              </p>
            </div>
          </div>
          <Chip size="sm" variant="flat" className="bg-amber-500/10 text-amber-700 font-black border border-amber-200/80">
            💳 กำลังชำระรวม ฿{totalUnpaidAmount.toLocaleString()} ({unpaidCustomers.length} ราย)
          </Chip>
        </div>

        {/* 3 Summary Boxes: Left = ยอดรวมทั้งหมด, Middle = รับชำระแล้ว, Right = ค้างชำระ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Box 1 (Left): ยอดรวมทั้งหมด */}
          <div className="bg-slate-50/70 hover:bg-emerald-50/50 rounded-2xl p-5 border border-slate-200 hover:border-emerald-300 transition-all duration-200 shadow-3xs">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[14px] text-slate-400 uppercase font-black tracking-wider block">ยอดทั้งหมด</span>
                <span className="text-[15px] text-slate-500 font-bold mt-0.5 block">มูลค่าคำสั่งซื้อของดีลที่ยืนยันแล้ว</span>
              </div>
              <div className="h-9 w-9 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">฿{totalConfirmedVal.toLocaleString()}</span>
              <Chip size="sm" className="bg-emerald-500/10 text-emerald-700 font-extrabold border border-emerald-200">ยอดสั่งซื้อรวม</Chip>
            </div>
            <div className="border-t border-slate-200/60 pt-3 mt-3 flex justify-between text-[14px] text-slate-400 font-bold">
              <span>{confirmedDeals.length} ดีล</span>
              <span className="text-emerald-600">มูลค่าคำสั่งซื้อทั้งหมด</span>
            </div>
          </div>

          {/* Box 2 (Middle): รับชำระแล้ว */}
          <div className="bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl p-5 border border-slate-200 hover:border-blue-300 transition-all duration-200 shadow-3xs">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[14px] text-slate-400 uppercase font-black tracking-wider block">ลูกค้าชำระแล้ว</span>
                <span className="text-[15px] text-slate-500 font-bold mt-0.5 block">ยอดรับชำระเข้าบัญชีแล้ว</span>
              </div>
              <div className="h-9 w-9 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center border border-blue-200">
                <Wallet className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono">฿{totalPaidAmount.toLocaleString()}</span>
              <Chip size="sm" className="bg-blue-500/10 text-blue-700 font-extrabold border border-blue-200">Paid Amount</Chip>
            </div>
            <div className="border-t border-slate-200/60 pt-3 mt-3 flex justify-between text-[14px] text-slate-400 font-bold">
              <span>{paidCustomers.length} ราย · {paidPct.toFixed(0)}% ของยอดทั้งหมด</span>
              <span className="text-blue-600">รับชำระสำเร็จ</span>
            </div>
          </div>

          {/* Box 3 (Right): ค้างชำระ */}
          <div className="bg-slate-50/70 hover:bg-amber-50/50 rounded-2xl p-5 border border-slate-200 hover:border-amber-300 transition-all duration-200 shadow-3xs">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[14px] text-slate-400 uppercase font-black tracking-wider block">ลูกค้ากำลังชำระ</span>
                <span className="text-[15px] text-slate-500 font-bold mt-0.5 block">ยอดคงค้างรอติดตามเก็บเงิน</span>
              </div>
              <div className="h-9 w-9 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center border border-amber-200">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600 tracking-tight font-mono">฿{totalUnpaidAmount.toLocaleString()}</span>
              <Chip size="sm" className="bg-amber-500/10 text-amber-700 font-extrabold border border-amber-200">Outstanding</Chip>
            </div>
            <div className="border-t border-slate-200/60 pt-3 mt-3 flex justify-between text-[14px] text-slate-400 font-bold">
              <span>{unpaidCustomers.length} ราย · {(100 - paidPct).toFixed(0)}% ของยอดทั้งหมด</span>
              <span className="text-amber-600">ต้องติดตามเก็บเงิน</span>
            </div>
          </div>
        </div>

        {/* Customer Unpaid Outstanding List Table */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายชื่อลูกค้าที่ค้างชำระต่างๆ (UNPAID CUSTOMERS LIST)</h3>
              <p className="text-[14px] text-slate-400 font-semibold mt-0.5">ลูกค้าที่มีมูลค่าประเมินสูงกว่ายอดเงินรับชำระ</p>
            </div>
            <Button size="sm" variant="light" color="primary" className="font-extrabold cursor-pointer text-xs" onPress={() => setActiveTab("sales")}>
              เปิดบอร์ด CRM ติดตามเงิน
            </Button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto">
            {unpaidCustomers.map(cust => (
              <div key={cust._id} className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-800 text-xs">{cust.name}</h4>
                    {cust.brand && <span className="text-[14px] text-slate-400 font-bold">({cust.brand})</span>}
                    <span className="text-[13px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                      {cust.phone || cust.province || "ลูกค้าค้างชำระ"}
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-400 font-bold">
                    มูลค่าสั่งซื้อทั้งหมด: <span className="font-mono text-slate-700">฿{cust.totalVal.toLocaleString()}</span> | ชำระแล้ว: <span className="font-mono text-emerald-600">฿{cust.paidVal.toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="block text-[13px] text-slate-400 font-black uppercase tracking-wider">ยอดค้างชำระ</span>
                    <span className="font-mono text-sm font-black text-amber-600">
                      ฿{cust.balanceVal.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    color="warning"
                    className="font-bold text-[15px] rounded-xl shrink-0"
                    onPress={() => setActiveTab("sales")}
                  >
                    ติดตามชำระเงิน
                  </Button>
                </div>
              </div>
            ))}

            {unpaidCustomers.length === 0 && (
              <div className="py-8 text-center text-slate-400 italic text-xs font-semibold bg-white">
                🎉 ไม่มีลูกค้ารายใดค้างชำระเงินในขณะนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
