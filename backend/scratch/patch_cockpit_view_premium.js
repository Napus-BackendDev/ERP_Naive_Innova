import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/CockpitView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Replace the entire contents of CockpitView.js with a premium, visually stunning dashboard
const newCockpitView = `"use client";

import React, { useState, useEffect } from "react";
import { Button, Chip } from "@heroui/react";
import { 
  LayoutDashboard, FlaskConical, Package, Database, FileSpreadsheet, Download, 
  TrendingUp, Users, ShoppingBag, ArrowUpRight, AlertCircle, Sparkles, Plus, Play,
  Calendar, CheckCircle, Clock, Ban, ChevronRight, BarChart3, ShieldAlert
} from "lucide-react";

export default function CockpitView({
  totalSalesVal,
  lowIngredientsCount,
  lowPackagingCount,
  ingredients = [],
  packaging = [],
  fgLots = [],
  leads = [],
  handleExport,
  setActiveTab
}) {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('th-TH', options));
  }, []);

  // Compute stats
  const totalLeadsCount = leads.length;
  const wonLeads = leads.filter(l => l.section === "s11" || l.section === "s12");
  const activeLeads = leads.filter(l => l.section !== "s11" && l.section !== "s12" && l.section !== "s1");
  
  const wonDealsValue = wonLeads.reduce((sum, l) => sum + (parseFloat(l.estValue) || 0), 0);
  const activeDealsValue = activeLeads.reduce((sum, l) => sum + (parseFloat(l.estValue) || 0), 0);
  
  // Pipeline stages distribution
  const stages = {
    inquiry: leads.filter(l => l.section === "s2" || l.section === "s3" || l.section === "s4").length,
    sample: leads.filter(l => l.section === "s5" || l.section === "s6" || l.section === "s7").length,
    negotiate: leads.filter(l => l.section === "s8" || l.section === "s9" || l.section === "s10").length,
    won: wonLeads.length
  };
  
  const maxStageCount = Math.max(stages.inquiry, stages.sample, stages.negotiate, stages.won, 1);

  // Expiring lots in next 30 days
  const expiringLots = fgLots.filter(l => {
    const diffTime = new Date(l.expDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  return (
    <div className="flex flex-col gap-6 text-left select-none animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-emerald-800 to-green-700 text-white p-6 sm:p-8 shadow-xl shadow-green-950/10 border border-green-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
              <Sparkles className="h-3 w-3" /> ระบบบริการจัดการโรงงานอัจฉริยะ
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">สวัสดีตอนบ่าย, Naive Ops</h1>
            <p className="text-xs text-emerald-100 font-medium flex items-center gap-1.5 opacity-90">
              <Calendar className="h-3.5 w-3.5 text-emerald-300" /> {currentDate || "กำลังโหลด..."}
            </p>
          </div>
          
          {/* Quick Actions & Export Panel */}
          <div className="flex flex-wrap gap-2.5 shrink-0 bg-black/10 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
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

      {/* 2. Primary KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Won Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">ยอดขายปิดดีลแล้ว</span>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">มัดจำครบ (s11)</span>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">฿{wonDealsValue.toLocaleString()}</span>
            <Chip size="sm" className="bg-emerald-500/10 text-emerald-700 font-extrabold border border-emerald-200">Won</Chip>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-[10px] text-slate-400 font-bold">
            <span>ดีลในมือ: ฿{activeDealsValue.toLocaleString()}</span>
            <span className="text-slate-500">ทั้งหมด {totalLeadsCount} ดีล</span>
          </div>
        </div>

        {/* Card 2: Low Chemical Ingredients */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">สารเคมีต่ำเกณฑ์</span>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">ต่ำกว่า 5 กิโลกรัม</span>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <FlaskConical className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-black tracking-tight ${lowIngredientsCount > 0 ? "text-amber-600" : "text-slate-800"}`}>
              {lowIngredientsCount} <span className="text-xs font-bold text-slate-500">สูตรเคมี</span>
            </span>
            <Chip size="sm" className={lowIngredientsCount > 0 ? "bg-amber-500/10 text-amber-700 font-extrabold border border-amber-200" : "bg-slate-50 text-slate-500 font-extrabold border border-slate-200"}>
              {lowIngredientsCount > 0 ? "ต้องเติมด่วน" : "ปกติ"}
            </Chip>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3 text-[10px] text-slate-400 font-bold flex justify-between">
            <span>ทั้งหมด {ingredients.length} วัตถุดิบ</span>
            <span className="text-amber-500">แจ้งเตือนเปิดสต็อก</span>
          </div>
        </div>

        {/* Card 3: Low Packaging */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">บรรจุภัณฑ์ใกล้หมด</span>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">ต่ำกว่า 500 ชิ้น</span>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-black tracking-tight ${lowPackagingCount > 0 ? "text-orange-600" : "text-slate-800"}`}>
              {lowPackagingCount} <span className="text-xs font-bold text-slate-500">ประเภท</span>
            </span>
            <Chip size="sm" className={lowPackagingCount > 0 ? "bg-orange-500/10 text-orange-700 font-extrabold border border-orange-200" : "bg-slate-50 text-slate-500 font-extrabold border border-slate-200"}>
              {lowPackagingCount > 0 ? "วิกฤตสต็อก" : "ปกติ"}
            </Chip>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3 text-[10px] text-slate-400 font-bold flex justify-between">
            <span>ทั้งหมด {packaging.length} ประเภท</span>
            <span className="text-orange-500">FEFO Alert</span>
          </div>
        </div>

        {/* Card 4: Expiring Lots */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">ล็อตใกล้หมดอายุ</span>
              <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">ภายใน 30 วัน</span>
            </div>
            <div className="h-9 w-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Database className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-black tracking-tight ${expiringLots.length > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {expiringLots.length} <span className="text-xs font-bold text-slate-500">ล็อตผลิต</span>
            </span>
            <Chip size="sm" className={expiringLots.length > 0 ? "bg-rose-500/10 text-rose-700 font-extrabold border border-rose-200" : "bg-slate-50 text-slate-500 font-extrabold border border-slate-200"}>
              {expiringLots.length > 0 ? "หมดอายุเร็วๆ นี้" : "ไม่มี"}
            </Chip>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3 text-[10px] text-slate-400 font-bold flex justify-between">
            <span>จากล็อตคงเหลือ {fgLots.length} ล็อต</span>
            <span className="text-rose-500">FEFO Checker</span>
          </div>
        </div>
      </div>

      {/* 3. Double Column Operational Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Section: Sales Pipeline and Status List (7 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Sales Stage Bar Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">ภาพรวมกระบวนการขาย (Sales CRM Pipeline Stage)</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">แบ่งตามการ์ดลูกค้าบนบอร์ดแบ่งกลุ่มงาน</p>
              </div>
              <Button size="sm" variant="light" color="primary" className="font-extrabold cursor-pointer" onPress={() => setActiveTab("sales")}>
                ดูบอร์ด CRM
              </Button>
            </div>
            
            <div className="space-y-4 pt-2">
              {[
                { name: "เพียงแค่คุย / เสนอราคาเริ่มต้น (Inquiry)", count: stages.inquiry, color: "bg-slate-400" },
                { name: "การผลิตสูตรและตัวอย่างส่งตรวจ (Sample)", count: stages.sample, color: "bg-blue-500" },
                { name: "เจรจาต่อรอง/เตรียมสั่งผลิตจริง (Negotiate)", count: stages.negotiate, color: "bg-amber-500" },
                { name: "ปิดดีลสำเร็จ / ส่งมอบสินค้าแล้ว (Won)", count: stages.won, color: "bg-emerald-600" }
              ].map((stage, i) => {
                const percentage = totalLeadsCount > 0 ? (stage.count / totalLeadsCount) * 100 : 0;
                return (
                  <div key={i} className="space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{stage.name}</span>
                      <span className="font-mono">{stage.count} รายการ ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CRM Leads Focus */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex-grow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">ดีลลูกค้าและสินค้าที่สั่ง ล่าสุด (Sales Leads Overview)</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">รายการลูกค้าและสถานะที่อยู่ใน Pipeline</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {leads.slice(0, 5).map(lead => {
                  const items = Array.isArray(lead.orderedProducts) ? lead.orderedProducts : [];
                  return (
                    <div key={lead._id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-800 text-xs">{lead.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold">({lead.province || "ไม่ระบุจังหวัด"})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {items.map((item, idx) => (
                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200">
                              {item.formulaName} (x{item.quantityPcs} ชิ้น)
                            </span>
                          ))}
                          {items.length === 0 && (
                            <span className="text-[9px] text-slate-400 font-medium italic">ไม่มีรายการสั่งสินค้า (เพียงแค่คุย)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">มูลค่าประเมิน</span>
                          <span className="font-mono text-xs font-black text-emerald-600">
                            {lead.estValue ? `฿${lead.estValue.toLocaleString()}` : "฿0"}
                          </span>
                        </div>
                        <Chip 
                          size="sm" 
                          className={`font-bold ${
                            lead.section === "s11" || lead.section === "s12" 
                              ? "bg-green-500/10 text-green-700 border border-green-200" 
                              : "bg-blue-500/10 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {lead.section === "s11" || lead.section === "s12" ? "สำเร็จ" : "กำลังดำเนินการ"}
                        </Chip>
                      </div>
                    </div>
                  );
                })}
                {leads.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs font-semibold">
                    ไม่มีรายการลูกค้าในระบบ
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-4 text-center">
              <Button size="sm" variant="flat" color="success" className="font-extrabold w-full cursor-pointer rounded-2xl" onPress={() => setActiveTab("sales")}>
                ดูรายการลูกค้าทั้งหมดในบอร์ด CRM <ArrowUpRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section: Inventory Warnings & Finished Goods FEFO (5 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Critical Ingredients List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">วัตถุดิบเคมีที่ต้องเติมด่วน</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">สารเคมีในคลังที่คงเหลือต่ำกว่า 5 กก. (5,000 ก.)</p>
                </div>
              </div>
              
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {ingredients
                  .filter(ing => ing.openingStock < 5000)
                  .sort((a, b) => a.openingStock - b.openingStock)
                  .slice(0, 5)
                  .map(ing => {
                    const ratio = Math.min((ing.openingStock / 5000) * 100, 100);
                    return (
                      <div key={ing._id} className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700 truncate max-w-[140px]" title={ing.name}>{ing.name}</span>
                          <span className={`font-mono ${ing.openingStock < 1000 ? "text-rose-600 font-black" : "text-amber-600"}`}>
                            {ing.openingStock.toLocaleString()} ก.
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${ing.openingStock < 1000 ? "bg-rose-500" : "bg-amber-500"}`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {ingredients.filter(ing => ing.openingStock < 5000).length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs font-semibold">
                    ✅ คลังสารเคมีปกติ ไม่มีต่ำเกณฑ์
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-4">
              <Button size="sm" variant="flat" color="warning" className="font-extrabold w-full cursor-pointer rounded-2xl" onPress={() => setActiveTab("bom")}>
                ดูรายการวัตถุดิบผสมทั้งหมด <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </div>

          {/* Finished Goods Expiring FEFO Checker */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">เช็คอายุล็อตสินค้าในคลัง</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">สินค้าสำเร็จรูป (Finished Goods) ที่มีเวลาเหลือน้อย</p>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {fgLots
                  .map(lot => {
                    const daysLeft = Math.ceil((new Date(lot.expDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return { ...lot, daysLeft };
                  })
                  .sort((a, b) => a.daysLeft - b.daysLeft)
                  .slice(0, 5)
                  .map(lot => (
                    <div key={lot._id} className="p-3 bg-slate-50 hover:bg-slate-100/50 transition-colors border border-slate-200/50 rounded-2xl flex items-center justify-between gap-3 text-left">
                      <div className="space-y-0.5 truncate flex-grow">
                        <h4 className="font-extrabold text-slate-800 text-xs truncate">{lot.name}</h4>
                        <span className="block font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lot: {lot.lotNo}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <Chip 
                          size="sm" 
                          className={`font-black ${
                            lot.daysLeft <= 0 
                              ? "bg-rose-500/10 text-rose-700 border border-rose-200" 
                              : lot.daysLeft <= 30 
                                ? "bg-amber-500/10 text-amber-700 border border-amber-200" 
                                : "bg-green-500/10 text-green-700 border border-green-200"
                          }`}
                        >
                          {lot.daysLeft <= 0 ? "EXPIRED" : `${lot.daysLeft} วัน`}
                        </Chip>
                      </div>
                    </div>
                  ))}
                {fgLots.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs font-semibold">
                    ไม่มีล็อตสินค้าสำเร็จรูปในคลัง
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-4">
              <Button size="sm" variant="flat" color="danger" className="font-extrabold w-full cursor-pointer rounded-2xl" onPress={() => setActiveTab("database")}>
                เช็คคลังและอายุล็อตสินค้า <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}`;

if (code !== newCockpitView) {
  code = newCockpitView;
  console.log("CockpitView.js content completely updated to premium dashboard design!");
} else {
  console.log("CockpitView.js content matches already!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Patched successfully!");
