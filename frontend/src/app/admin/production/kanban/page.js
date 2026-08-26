"use client";

import React, { useEffect, useState } from "react";
import api, { assetUrl as getFileUrl } from "@/lib/api";
import {
  Layers, PackageOpen, Tag, Sparkles, Loader2, ArrowLeft, RefreshCw, ClipboardList, CheckCircle2, ChevronRight, Monitor, AlertTriangle
} from "lucide-react";

// Inline Visual Mockups using SVGs
const BottleSVG = () => (
  <svg className="w-16 h-20 text-blue-400 mx-auto" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="10" width="30" height="20" rx="3" fill="#3B82F6" opacity="0.4" stroke="#3B82F6" strokeWidth="2"/>
    <path d="M35 30C35 30 15 42 15 65V125C15 136 24 145 35 145H65C76 145 85 136 85 125V65C85 42 65 30 65 30H35Z" fill="url(#bottleGrad)" stroke="#3B82F6" strokeWidth="3"/>
    <rect x="25" y="65" width="50" height="60" rx="4" fill="#FFFFFF" fillOpacity="0.08" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3"/>
    <defs>
      <linearGradient id="bottleGrad" x1="50" y1="30" x2="50" y2="145" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1D4ED8"/>
        <stop offset="1" stopColor="#3B82F6" stopOpacity="0.15"/>
      </linearGradient>
    </defs>
  </svg>
);

const PumpSVG = () => (
  <svg className="w-16 h-20 text-indigo-400 mx-auto" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="15" width="30" height="15" rx="2" fill="#4F46E5" stroke="#6366F1" strokeWidth="2"/>
    <path d="M55 20H85V32H55V20Z" fill="#6366F1" rx="2"/>
    <path d="M50 30V65" stroke="#818CF8" strokeWidth="6" strokeLinecap="round"/>
    <path d="M25 65H75V85C25 85 25 95 35 95H65C75 95 75 85 75 85V65Z" fill="#3730A3" stroke="#4F46E5" strokeWidth="2"/>
    <path d="M50 95V140" stroke="#818CF8" strokeWidth="4"/>
  </svg>
);

const LabelSVG = () => (
  <svg className="w-16 h-20 text-emerald-400 mx-auto" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="15" width="80" height="120" rx="8" fill="url(#labelGrad)" stroke="#10B981" strokeWidth="3"/>
    <circle cx="50" cy="65" r="22" fill="#047857" opacity="0.3"/>
    <rect x="25" y="105" width="50" height="10" rx="2" fill="#10B981"/>
    <rect x="35" y="120" width="30" height="6" rx="1.5" fill="#10B981" opacity="0.5"/>
    <defs>
      <linearGradient id="labelGrad" x1="50" y1="15" x2="50" y2="135" gradientUnits="userSpaceOnUse">
        <stop stopColor="#064E3B"/>
        <stop offset="1" stopColor="#10B981" stopOpacity="0.2"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function KanbanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueItems, setQueueItems] = useState([]);
  const [packagingItems, setPackagingItems] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const [prodOrdersRes, pkgRes] = await Promise.all([
        api.get("/production/orders"),
        api.get("/packaging")
      ]);

      // Filter out only active orders whose status is "กำลังผลิต"
      const producingOrders = (prodOrdersRes.data || []).filter(c =>
        c.productionStatus === "กำลังผลิต"
      );

      // Determine the queue ordering from the machines API (source of truth).
      // Each machine has an ordered queue of { orderId, addedAt }; machines are
      // already sorted by their display order, so concatenating their queues
      // yields the overall production lineup. Fall back to localStorage if the
      // machines request fails.
      let orderIds = [];
      try {
        const machinesRes = await api.get("/machines");
        (machinesRes.data || []).forEach(machine => {
          (machine.queue || []).forEach(entry => {
            if (entry && entry.orderId) orderIds.push(entry.orderId);
          });
        });
      } catch (machineErr) {
        console.error("Failed to load machines queue, falling back to localStorage:", machineErr);
        const savedOrder = localStorage.getItem("mes_production_queue_order");
        if (savedOrder) {
          try {
            orderIds = JSON.parse(savedOrder);
          } catch (parseErr) {
            console.error("Failed to parse saved queue order in Kanban view:", parseErr);
          }
        }
      }

      if (Array.isArray(orderIds) && orderIds.length > 0) {
        producingOrders.sort((a, b) => {
          const idxA = orderIds.indexOf(a._id);
          const idxB = orderIds.indexOf(b._id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }

      setQueueItems(producingOrders);
      setPackagingItems(pkgRes.data || []);
    } catch (error) {
      console.error("Error loading Kanban data:", error);
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClose = () => {
    window.close();
    // window.close() silently fails when the tab was opened via a normal link
    // (not window.open). If the window is still here after a moment, navigate back.
    setTimeout(() => {
      window.location.href = "/admin/production";
    }, 300);
  };


  const getMatchedPackagingItem = (cust) => {
    let size = "100ml";
    if (cust.orderedProducts) {
      let p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
      if (p && p.size) size = p.size;
    }
    const kw = size.toLowerCase().includes("100") ? "100ml" : size.toLowerCase().includes("250") ? "250ml" : "50ml";
    return packagingItems.find(item =>
      item.type?.name === "บรรจุภัณฑ์" &&
      item.name?.toLowerCase().includes(kw)
    );
  };

  const getMatchedCapItem = (cust) => {
    return packagingItems.find(item =>
      item.type?.name === "ฝา/หัวปั้ม" ||
      item.name?.includes("ฝา") ||
      item.name?.includes("หัวปั๊ม")
    );
  };

  const getMatchedLabelItem = (cust) => {
    return packagingItems.find(item =>
      (item.type?.name === "ฉลาก" || item.type?.name === "สติกเกอร์") &&
      item.name?.toLowerCase().includes(cust.name?.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-sm font-bold text-slate-500">กำลังโหลดจอมอนิเตอร์คิวผลิต...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 select-none font-sans">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-6 rounded-2xl gap-4 mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Monitor className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-slate-800 flex items-center gap-2.5">
              <span>จอมอนิเตอร์คิวผลิต (Production Queue Monitor)</span>
              <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-0.5 rounded-full font-mono font-bold">
                {queueItems.length} คิวงานกำลังผลิต
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">หน้าจอแสดงผลอย่างเดียว (อ่านอย่างเดียว) สำหรับพนักงานผลิตขวดและสติกเกอร์ - แสดงลำดับคิวและสเปกวัสดุพร้อมรูปภาพประกอบ</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </div>

      {/* Error banner (H1) */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span>ลองใหม่</span>
          </button>
        </div>
      )}

      {/* Main Grid View of Queues */}
      {!error && queueItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-600 text-base">ไม่มีงานในสถานะกำลังผลิต</h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            ระบบยังไม่มีใบสั่งผลิตในสถานะ "กำลังผลิต" ในปัจจุบันกรุณาเปลี่ยนสถานะใบสั่งผลิตในหน้าแดชบอร์ดหลักเพื่อส่งเข้าหน้าคิวการผลิตนี้
          </p>
        </div>
      ) : !error ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {queueItems.map((cust, idx) => {
            let productsList = [];
            if (cust.orderedProducts) {
              if (Array.isArray(cust.orderedProducts)) {
                productsList = cust.orderedProducts;
              } else if (typeof cust.orderedProducts === "object") {
                productsList = [cust.orderedProducts];
              }
            }

            const qtyNeeded = productsList.reduce((sum, p) => sum + (parseInt(p.quantityPcs || p.quantity) || 0), 0);
            const formulaNames = productsList.map(p => p.formulaName || p.name).join(", ") || "ไม่ระบุสูตร";

            const matchedPack = getMatchedPackagingItem(cust);
            const matchedCap = getMatchedCapItem(cust);
            const matchedLabel = getMatchedLabelItem(cust);

            // Determine What to do next instructions
            let nextInstruction = "";
            if (cust.productionStep === 3) {
              nextInstruction = "👉 ถัดไป: นำเนื้อสารบรรจุลงขวดและติดตั้งหัวปั๊ม/ปิดฝาขวดให้แน่นหนา";
            } else if (cust.productionStep === 4) {
              nextInstruction = "👉 ถัดไป: ดำเนินการติดสติกเกอร์สินค้า ยิงรหัสล็อต (Lot/EXP) และหดซีลแพ็คเกจ";
            } else {
              nextInstruction = "👉 ถัดไป: เตรียมส่งต่อฝ่ายประกันคุณภาพ (QC รอบที่ 2) ตรวจสอบความเรียบร้อย";
            }

            return (
              <div
                key={cust._id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all gap-5"
              >
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[15px] font-mono px-3 py-1 rounded-full">
                      คิวที่ {idx + 1}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-2 truncate max-w-[200px]">{cust.name}</h3>
                    <p className="text-[15px] text-slate-500 font-semibold">สูตร: {formulaNames}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[14px] bg-slate-50 border border-slate-200 text-slate-700 font-black font-mono px-2.5 py-1 rounded-lg">
                      สั่งผลิต {qtyNeeded} ชิ้น
                    </span>
                    <span className="block text-[14px] text-emerald-600 font-extrabold mt-2 font-mono">
                      สเต็ปการผลิต {cust.productionStep}/6
                    </span>
                  </div>
                </div>

                {/* 3 Visual Components Side-by-Side */}
                <div className="grid grid-cols-3 gap-3.5 my-2">

                  {/* 1. ขวด */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col items-center gap-3 text-center min-w-0">
                    <div className="h-20 flex items-center justify-center">
                      <BottleSVG />
                    </div>
                    <div className="w-full">
                      <p className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">1. ขวดบรรจุภัณฑ์</p>
                      <p className="text-[14px] text-slate-700 font-black truncate mt-1" title={matchedPack ? matchedPack.name : "ขวด PET"}>
                        {matchedPack ? matchedPack.name : "ขวดมาตรฐาน"}
                      </p>
                    </div>
                  </div>

                  {/* 2. ฝา */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col items-center gap-3 text-center min-w-0">
                    <div className="h-20 flex items-center justify-center">
                      <PumpSVG />
                    </div>
                    <div className="w-full">
                      <p className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">2. ฝา / หัวปั๊ม</p>
                      <p className="text-[14px] text-slate-700 font-black truncate mt-1" title={matchedCap ? matchedCap.name : "ฝามาตรฐาน"}>
                        {matchedCap ? matchedCap.name : "หัวปั๊มมาตรฐาน"}
                      </p>
                    </div>
                  </div>

                  {/* 3. สติกเกอร์ (Mockup or uploaded design thumbnail) */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col items-center gap-3 text-center min-w-0">
                    <div className="h-20 w-full flex items-center justify-center overflow-hidden">
                      {matchedLabel && (matchedLabel.imageUrl || matchedLabel.image) ? (
                        <img
                          src={getFileUrl(matchedLabel.imageUrl || matchedLabel.image)}
                          className="h-full w-auto object-contain rounded border border-slate-200"
                          alt="Design Preview"
                        />
                      ) : (
                        <LabelSVG />
                      )}
                    </div>
                    <div className="w-full">
                      <p className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">3. สติกเกอร์สินค้า</p>
                      <p className="text-[14px] text-slate-700 font-black truncate mt-1" title={matchedLabel ? matchedLabel.name : "สติกเกอร์"}>
                        {matchedLabel ? matchedLabel.name : "สติกเกอร์มาตรฐาน"}
                      </p>
                    </div>
                  </div>

                </div>

                {/* What to do next instruction bar */}
                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl text-left border-l-4 border-l-emerald-600 mt-2">
                  <span className="text-[13px] font-black text-emerald-600 block uppercase tracking-wider mb-1 font-mono">OPERATOR INSTRUCTION</span>
                  <p className="text-[15px] text-slate-600 font-bold leading-normal">{nextInstruction}</p>
                </div>

              </div>
            );
          })}
        </div>
      ) : null}

    </div>
  );
}
