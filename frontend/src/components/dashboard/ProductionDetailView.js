"use client";

import React, { useState } from "react";
import api, { assetUrl as getFileUrl } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";
import { Card, Button } from "@heroui/react";
import { 
  CheckCircle2, Camera, Video, Trash2, Check, Loader2, AlertTriangle, Beaker, PackageOpen, ListTodo, Award, ClipboardList, ChevronRight, UploadCloud,
  Tag, Droplet, BadgeCheck, Barcode, Clock, Box, Sparkles, Play, Cpu
} from "lucide-react";

const cleanFormulaName = (name) => {
  if (!name) return "";
  return name.replace(/\s*(?:สูตรเฉพาะตัว|ปรับปรุง)\s+ของ\s+.+$/, "").replace(/^สูตรเฉพาะตัว\s*-\s*/, "");
};

// Every image stored in the DB goes through the 1 MB policy (see lib/imageCompress).

export default function ProductionDetailView({
  cust: initialCust,
  packagingItems = [],
  onBack,
  onUpdateStep
}) {
  const p = initialCust.orderedProducts?.[0] || {};
  const cust = {
    ...initialCust,
    productionStatus: p.productionStatus || initialCust.productionStatus,
    productionStep: p.productionStep || initialCust.productionStep,
    qc1PackagingPhoto: p.qc1PackagingPhoto !== undefined ? p.qc1PackagingPhoto : initialCust.qc1PackagingPhoto,
    qc1PumpPhoto: p.qc1PumpPhoto !== undefined ? p.qc1PumpPhoto : initialCust.qc1PumpPhoto,
    qc1StickerPhoto: p.qc1StickerPhoto !== undefined ? p.qc1StickerPhoto : initialCust.qc1StickerPhoto,
    qc1AssembledVideo: p.qc1AssembledVideo !== undefined ? p.qc1AssembledVideo : initialCust.qc1AssembledVideo,
    qcPackagingPhoto: p.qcPackagingPhoto !== undefined ? p.qcPackagingPhoto : initialCust.qcPackagingPhoto,
    qcPumpPhoto: p.qcPumpPhoto !== undefined ? p.qcPumpPhoto : initialCust.qcPumpPhoto,
    qcStickerPhoto: p.qcStickerPhoto !== undefined ? p.qcStickerPhoto : initialCust.qcStickerPhoto,
    qcAssembledVideo: p.qcAssembledVideo !== undefined ? p.qcAssembledVideo : initialCust.qcAssembledVideo,
    producedLotId: p.producedLotId !== undefined ? p.producedLotId : initialCust.producedLotId,
    packagingChecklist: p.packagingChecklist !== undefined ? p.packagingChecklist : initialCust.packagingChecklist,
    lotStampNo: p.lotStampNo !== undefined ? p.lotStampNo : initialCust.lotStampNo,
    lotStampMfg: p.lotStampMfg !== undefined ? p.lotStampMfg : initialCust.lotStampMfg,
    lotStampExp: p.lotStampExp !== undefined ? p.lotStampExp : initialCust.lotStampExp
  };
  const currentStep = cust.productionStep || 1;

  // Track if database photos have been cleared by the user in this session
  const [qc1PackagingCleared, setQc1PackagingCleared] = useState(false);
  const [qc1PumpCleared, setQc1PumpCleared] = useState(false);
  const [qc1StickerCleared, setQc1StickerCleared] = useState(false);
  const [qc1VideoCleared, setQc1VideoCleared] = useState(false);

  const [qcPackagingCleared, setQcPackagingCleared] = useState(false);
  const [qcPumpCleared, setQcPumpCleared] = useState(false);
  const [qcStickerCleared, setQcStickerCleared] = useState(false);
  const [qcVideoCleared, setQcVideoCleared] = useState(false);

  // Step 2 (QC 1) Uploads
  const [qc1PackagingFile, setQa1PackagingFile] = useState(null);
  const [qc1PumpFile, setQa1PumpFile] = useState(null);
  const [qc1StickerFile, setQa1StickerFile] = useState(null);
  const [qc1VideoFile, setQa1VideoFile] = useState(null);
  const [qc1VideoDuration, setQa1VideoDuration] = useState(0);
  const [qc1VideoError, setQa1VideoError] = useState("");

  // Step 3 & 4 Checklists — persisted in cust.packagingChecklist so they survive reloads
  const initialChecklist = (cust.packagingChecklist && typeof cust.packagingChecklist === "object") ? cust.packagingChecklist : {};
  const [check1, setCheck1] = useState(!!(initialChecklist.check1 && initialChecklist.check1.checked));
  const [check2, setCheck2] = useState(!!(initialChecklist.check2 && initialChecklist.check2.checked));
  const [check3, setCheck3] = useState(!!(initialChecklist.check3 && initialChecklist.check3.checked));
  const [check4, setCheck4] = useState(!!(initialChecklist.check4 && initialChecklist.check4.checked));
  const [check5, setCheck5] = useState(!!(initialChecklist.check5 && initialChecklist.check5.checked));
  const [check6, setCheck6] = useState(!!(initialChecklist.check6 && initialChecklist.check6.checked));
  const [check7, setCheck7] = useState(!!(initialChecklist.check7 && initialChecklist.check7.checked));
  const [check8, setCheck8] = useState(!!(initialChecklist.check8 && initialChecklist.check8.checked));

  // Step 4 lot-stamp fields (ยิง lot) — persisted so they survive reloads
  const [lotStampNo, setLotStampNo] = useState(cust.lotStampNo || "");
  const [lotStampMfg, setLotStampMfg] = useState(cust.lotStampMfg || "");
  const [lotStampExp, setLotStampExp] = useState(cust.lotStampExp || "");

  // Confirm modal for deleting an already-saved QC photo/video
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { label, doDelete }

  // Build the merged packagingChecklist object from the current checkbox flags.
  const buildChecklist = (overrides = {}) => {
    const flags = { check1, check2, check3, check4, check5, check6, check7, check8, ...overrides };
    const prev = (cust.packagingChecklist && typeof cust.packagingChecklist === "object") ? cust.packagingChecklist : {};
    const out = {};
    Object.keys(flags).forEach((k) => {
      if (flags[k]) {
        out[k] = { checked: true, at: (prev[k] && prev[k].at) || new Date().toISOString() };
      }
    });
    return out;
  };

  // Toggle a checklist item: update local state AND persist immediately so nothing is lost on reload.
  const toggleChecklist = (key, checked, setter) => {
    setter(checked);
    const merged = buildChecklist({ [key]: checked });
    if (onUpdateStep) {
      Promise.resolve(onUpdateStep({ packagingChecklist: merged })).catch(() => {});
    }
  };

  // Route a media-delete request through the confirm modal only when the file is already saved in the DB.
  const requestMediaDelete = (isSaved, label, doDelete) => {
    if (isSaved) {
      setDeleteConfirm({ label, doDelete });
    } else {
      doDelete();
    }
  };

  // Step 4 (QC 2) Uploads
  const [qcPackagingFile, setQaPackagingFile] = useState(null);
  const [qcPumpFile, setQaPumpFile] = useState(null);
  const [qcStickerFile, setQaStickerFile] = useState(null);
  const [qcVideoFile, setQaVideoFile] = useState(null);
  const [qcVideoDuration, setQaVideoDuration] = useState(0);
  const [qcVideoError, setQaVideoError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleVideoChange = (file) => {
    if (!file) {
      setQaVideoFile(null);
      setQaVideoDuration(0);
      setQaVideoError("");
      return;
    }
    
    setQaVideoError("");
    if (file.size > 10 * 1024 * 1024) {
      setQaVideoError("ขนาดไฟล์วิดีโอต้องไม่เกิน 10MB เพื่ออัปโหลดเข้า Database");
      setQaVideoFile(file);
      return;
    }
    
    const videoElement = document.createElement("video");
    videoElement.preload = "metadata";
    videoElement.src = URL.createObjectURL(file);
    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);
      const duration = videoElement.duration;
      setQaVideoDuration(duration);
      if (duration > 5) {
        setQaVideoError("คลิปวิดีโอความยาวต้องไม่เกิน 5 วินาที");
      }
      setQaVideoFile(file);
    };
  };

  const handleQa1VideoChange = (file) => {
    if (!file) {
      setQa1VideoFile(null);
      setQa1VideoDuration(0);
      setQa1VideoError("");
      return;
    }
    
    setQa1VideoError("");
    if (file.size > 10 * 1024 * 1024) {
      setQa1VideoError("ขนาดไฟล์วิดีโอต้องไม่เกิน 10MB เพื่ออัปโหลดเข้า Database");
      setQa1VideoFile(file);
      return;
    }
    
    const videoElement = document.createElement("video");
    videoElement.preload = "metadata";
    videoElement.src = URL.createObjectURL(file);
    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);
      const duration = videoElement.duration;
      setQa1VideoDuration(duration);
      if (duration <= 5) {
        setQa1VideoError("คลิปวิดีโอความยาวต้องมากกว่า 5 วินาที");
      }
      setQa1VideoFile(file);
    };
  };


  const uploadToCloudinary = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", await compressImage(file));
    const res = await api.post("/production/upload", formData);
    return res.data.secure_url;
  };

  // Helper check packaging stock
  const checkPackagingReady = (customer, items) => {
    if (!items || items.length === 0) return true;
    if (!customer.orderedProducts) return true;

    const products = Array.isArray(customer.orderedProducts) 
      ? customer.orderedProducts 
      : [customer.orderedProducts];

    for (const p of products) {
      const packName = p.packagingType || "";
      const qtyNeeded = parseInt(p.quantityPcs || p.quantity) || 0;
      if (qtyNeeded <= 0) continue;

      if (packName) {
        const matched = items.find(item => item.name === packName);
        if (matched) {
          if (matched.currentQuantity < qtyNeeded) return false;
        } else {
          return false;
        }
      } else {
        const packagingTypes = ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"];
        const customPack = items.find(item => 
          item.customer === customer.name && 
          (packagingTypes.includes(item.type?.name) || ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw)))
        );
        if (customPack) {
          if (customPack.currentQuantity < qtyNeeded) return false;
        }
      }
    }
    return true;
  };

  const checkLabelReady = (customer, items) => {
    if (!items || items.length === 0) return true;
    if (!customer.orderedProducts) return true;

    const products = Array.isArray(customer.orderedProducts) 
      ? customer.orderedProducts 
      : [customer.orderedProducts];

    for (const p of products) {
      const labelName = p.labelType || "";
      const qtyNeeded = parseInt(p.quantityPcs || p.quantity) || 0;
      if (qtyNeeded <= 0) continue;

      // If sticker status is already attached, no need to check stock
      if (p.stickerStatus === "ติดสติกเกอร์แล้ว") {
        continue;
      }

      if (labelName) {
        const matched = items.find(item => item.name === labelName);
        if (matched) {
          if (matched.currentQuantity < qtyNeeded) return false;
        } else {
          return false;
        }
      } else {
        const labelTypes = ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"];
        const customLabel = items.find(item => 
          item.customer === customer.name && 
          (labelTypes.includes(item.type?.name) || ["ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw)))
        );
        if (customLabel) {
          if (customLabel.currentQuantity < qtyNeeded) return false;
        }
      }
    }
    return true;
  };

  // Step Handlers
  const handleConfirmStep1 = async () => {
    setUploading(true);
    setUploadError("");
    try {
      if (onUpdateStep) {
        await onUpdateStep({
          productionStep: 2,
          productionStatus: "รอตรวจ QC รอบที่ 1"
        });
      }
    } catch (err) {
      setUploadError("เกิดข้อผิดพลาดในการยืนยันขั้นตอนที่ 1");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmStep2 = async () => {
    setUploading(true);
    setUploadError("");
    try {
      // Upload files to server
      const packagingUrl = qc1PackagingFile 
        ? await uploadToCloudinary(qc1PackagingFile) 
        : (qc1PackagingCleared ? "" : cust.qc1PackagingPhoto || "");
        
      const pumpUrl = qc1PumpFile 
        ? await uploadToCloudinary(qc1PumpFile) 
        : (qc1PumpCleared ? "" : cust.qc1PumpPhoto || "");
        
      const stickerUrl = qc1StickerFile 
        ? await uploadToCloudinary(qc1StickerFile) 
        : (qc1StickerCleared ? "" : cust.qc1StickerPhoto || "");
        
      const videoUrl = qc1VideoFile 
        ? await uploadToCloudinary(qc1VideoFile) 
        : (qc1VideoCleared ? "" : cust.qc1AssembledVideo || "");

      if (onUpdateStep) {
        await onUpdateStep({
          productionStep: 3,
          productionStatus: "รอยืนยัน",
          qc1PackagingPhoto: packagingUrl,
          qc1PumpPhoto: pumpUrl,
          qc1StickerPhoto: stickerUrl,
          qc1AssembledVideo: videoUrl
        });
      }
    } catch (err) {
      console.error("Step 2 Upload Error:", err);
      setUploadError("เกิดข้อผิดพลาดในการอัปโหลดไฟล์สำหรับ QC รอบแรก");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmStep3 = async () => {
    setUploading(true);
    setUploadError("");
    try {
      if (onUpdateStep) {
        await onUpdateStep({
          productionStep: 4,
          productionStatus: "กำลังผลิต",
          packagingChecklist: buildChecklist()
        });
      }
    } catch (err) {
      setUploadError("เกิดข้อผิดพลาดในการยืนยันขั้นตอนบรรจุภัณฑ์");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmStep4 = async () => {
    setUploading(true);
    setUploadError("");
    try {
      if (onUpdateStep) {
        await onUpdateStep({
          productionStep: 5,
          productionStatus: "รอตรวจ QC รอบที่ 2",
          packagingChecklist: buildChecklist(),
          lotStampNo: lotStampNo.trim(),
          lotStampMfg: lotStampMfg,
          lotStampExp: lotStampExp
        });
      }
    } catch (err) {
      setUploadError("เกิดข้อผิดพลาดในการยืนยันขั้นตอนติดสติกเกอร์ & ห่อหุ้ม");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmStep5 = async () => {
    setUploading(true);
    setUploadError("");
    try {
      const packagingUrl = qcPackagingFile 
        ? await uploadToCloudinary(qcPackagingFile) 
        : (qcPackagingCleared ? "" : cust.qcPackagingPhoto || "");
        
      const pumpUrl = qcPumpFile 
        ? await uploadToCloudinary(qcPumpFile) 
        : (qcPumpCleared ? "" : cust.qcPumpPhoto || "");
        
      const stickerUrl = qcStickerFile 
        ? await uploadToCloudinary(qcStickerFile) 
        : (qcStickerCleared ? "" : cust.qcStickerPhoto || "");
        
      const videoUrl = qcVideoFile 
        ? await uploadToCloudinary(qcVideoFile) 
        : (qcVideoCleared ? "" : cust.qcAssembledVideo || "");

      if (onUpdateStep) {
        await onUpdateStep({
          productionStep: 6,
          productionStatus: "รอลูกค้ายืนยัน",
          qcPackagingPhoto: packagingUrl,
          qcPumpPhoto: pumpUrl,
          qcStickerPhoto: stickerUrl,
          qcAssembledVideo: videoUrl
        });
      }
    } catch (err) {
      console.error("Step 5 Upload Error:", err);
      setUploadError("เกิดข้อผิดพลาดในการอัปโหลดไฟล์สำหรับ QC รอบสุดท้าย");
    } finally {
      setUploading(false);
    }
  };

  let orderedProductDesc = "-";
  if (cust.orderedProducts) {
    if (Array.isArray(cust.orderedProducts)) {
      orderedProductDesc = cust.orderedProducts.map(p => `${cleanFormulaName(p.formulaName)} (${p.quantityPcs || p.quantity || "-"} ชิ้น)`).join(", ");
    } else if (typeof cust.orderedProducts === "string") {
      orderedProductDesc = cleanFormulaName(cust.orderedProducts);
    } else if (typeof cust.orderedProducts === "object") {
      orderedProductDesc = `${cleanFormulaName(cust.orderedProducts.formulaName)} (${cust.orderedProducts.quantityPcs || cust.orderedProducts.quantity || "-"} ชิ้น)`;
    }
  }

    const getMatchedPackagingItem = () => {
    if (!packagingItems || packagingItems.length === 0) return null;
    const packagingTypes = ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"];
    return packagingItems.find(item => 
      item.customer === cust.name && 
      (packagingTypes.includes(item.type?.name) || ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw)))
    ) || packagingItems.find(item => 
      (item.customer === "ระบบ" || !item.customer) && 
      (packagingTypes.includes(item.type?.name) || ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw)))
    );
  };

  const getMatchedCapItem = () => {
    if (!packagingItems || packagingItems.length === 0) return null;
    const capTypes = ["ฝา", "หัวปั๊ม", "หัวปั้ม", "ฝาขวด"];
    return packagingItems.find(item => 
      item.customer === cust.name && 
      (item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || capTypes.some(kw => item.name?.includes(kw)))
    ) || packagingItems.find(item => 
      (item.customer === "ระบบ" || !item.customer) && 
      (item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || capTypes.some(kw => item.name?.includes(kw)))
    );
  };

  const getMatchedLabelItem = () => {
    if (!packagingItems || packagingItems.length === 0) return null;
    const labelTypes = ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"];
    return packagingItems.find(item => 
      item.customer === cust.name && 
      (labelTypes.includes(item.type?.name) || ["กล่อง", "ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw)))
    ) || packagingItems.find(item => 
      (item.customer === "ระบบ" || !item.customer) && 
      (labelTypes.includes(item.type?.name) || ["กล่อง", "ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw)))
    );
  };

  const checkCapReady = (customer, items) => {
    const matched = getMatchedCapItem();
    if (!matched) return true;
    let qtyNeeded = 0;
    if (customer.orderedProducts) {
      if (Array.isArray(customer.orderedProducts)) {
        qtyNeeded = customer.orderedProducts.reduce((sum, p) => sum + (parseInt(p.quantityPcs || p.quantity) || 0), 0);
      } else if (typeof customer.orderedProducts === "object") {
        qtyNeeded = parseInt(customer.orderedProducts.quantityPcs || customer.orderedProducts.quantity) || 0;
      }
    }
    if (qtyNeeded === 0) qtyNeeded = 30;
    return matched.currentQuantity >= qtyNeeded;
  };

  const getBulkChemicalsInfo = () => {
    if (!cust.orderedProducts) return { names: "-", totalLiters: 0 };
    let productsList = [];
    if (Array.isArray(cust.orderedProducts)) {
      productsList = cust.orderedProducts;
    } else if (typeof cust.orderedProducts === "object") {
      productsList = [cust.orderedProducts];
    }
    let totalLiters = 0;
    const names = productsList.map(p => {
      const name = cleanFormulaName(p.formulaName || p.name || "สารผสม");
      const qty = parseInt(p.quantityPcs || p.quantity || 0);
      const liters = (qty * 100) / 1000;
      totalLiters += liters;
      return `${name} (${liters.toFixed(1)} ลิตร)`;
    }).join(", ");
    return { names, totalLiters };
  };

const stepsList = [
    { title: "1. ยืนยันวัตถุดิบ", desc: "Chemical, Pack, Label" },
    { title: "2. QC รอบที่ 1", desc: "ตรวจขวดและหัวปั๊ม" },
    { title: "3. บรรจุภัณฑ์", desc: "บรรจุชิ้นงานลงขวด" },
    { title: "4. ติดสติกเกอร์ & ห่อหุ้ม", desc: "ติดสติกเกอร์,ยิง lot,ซีลถุง" },
    { title: "5. QC รอบที่ 2", desc: "ตรวจชิ้นงานสมบูรณ์" },
    { title: "6. เสร็จสิ้น", desc: "จัดส่งเสร็จสมบูรณ์" }
  ];

  return (
    <div className="text-left flex flex-col gap-6 select-none w-full">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-150 p-5 shadow-xs rounded-2xl gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>← ย้อนกลับ</span>
          </button>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              {cust.name}
              <span className={`text-[14px] font-extrabold px-3 py-0.5 rounded-full ${
                cust.productionStatus === "สำเร็จเสร็จสิ้น"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                  : cust.productionStatus?.includes("QC")
                    ? "bg-purple-50 text-purple-700 border-purple-200 animate-pulse"
                    : cust.productionStatus?.includes("กำลังผลิต")
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                {cust.productionStatus}
              </span>
            </h3>
            <p className="text-[15px] text-slate-400 font-semibold mt-0.5">อีเมล: {cust.email || "-"} | เบอร์โทร: {cust.phone || "-"} | สินค้าที่สั่ง: {orderedProductDesc}</p>
          </div>
        </div>
      </div>

      {/* Segmented Cards Steps Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
        {stepsList.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          
          return (
            <div 
              key={idx} 
              className={`relative flex flex-col p-3.5 rounded-2xl border-2 transition-all duration-300 ${
                isActive 
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg shadow-blue-100 translate-y-[-2px]" 
                  : isCompleted 
                    ? "bg-emerald-50/50 border-emerald-100 text-slate-700 hover:bg-emerald-50" 
                    : "bg-white border-slate-200/80 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[14px] font-extrabold px-2 py-0.5 rounded-lg ${
                  isActive 
                    ? "bg-white/20 text-white" 
                    : isCompleted 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-slate-100 text-slate-500"
                }`}>
                  สเต็ป {stepNum}
                </span>
                {isCompleted && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
                {isActive && <div className="h-2 w-2 rounded-full bg-white animate-ping" />}
              </div>
              <h4 className="font-extrabold text-xs">{step.title.replace(/^\d\.\s/, '')}</h4>
              <p className={`text-[13px] mt-0.5 font-medium ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Wizard Content Card */}
      <Card className="bg-white border border-slate-150 p-6 shadow-sm rounded-2xl min-h-[360px] flex flex-col justify-between">
        
        <div>
          {uploadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold text-xs flex items-center gap-2 mb-6">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Content Render based on currentStep */}
          
          {/* Step 1: ยืนยันวัตถุดิบ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  <span>1. ยืนยันความพร้อมของวัตถุดิบและบรรจุภัณฑ์</span>
                </h4>
                <p className="text-[15px] text-slate-400 mt-1 font-semibold">ตรวจสอบความพร้อมของสารเคมีผสม ขวด ฝาขวด และป้ายสติกเกอร์ เพื่อเริ่มต้นขั้นตอนการบรรจุ</p>
              </div>

              {/* Split into 2 unequal columns: Left takes 2/3 (BOM Bulk), Right takes 1/3 (Packaging Checklist) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left">
                
                {/* [LEFT COLUMN]: สารเคมี (BOM Bulk) - Spans 2 columns */}
                {(() => {
                  const bulkInfo = getBulkChemicalsInfo();
                  let productsList = [];
                  if (cust.orderedProducts) {
                    if (Array.isArray(cust.orderedProducts)) {
                      productsList = cust.orderedProducts;
                    } else if (typeof cust.orderedProducts === "object") {
                      productsList = [cust.orderedProducts];
                    }
                  }
                  return (
                    <div className="lg:col-span-2 flex flex-col justify-between gap-3 p-5 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/55 transition-all w-full group border-slate-100">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono">BOM BULK DETAILS</span>
                        <span className="text-[13px] font-extrabold text-green-700 bg-green-50 px-2.5 py-0.5 border border-green-200 rounded-lg">✓ พร้อมผสม</span>
                      </div>
                      
                      {/* Spacious list of substances with calculation breakdown */}
                      <div className="my-auto py-2 flex flex-col gap-2.5 w-full">
                        {productsList.map((p, idx) => {
                          const name = cleanFormulaName(p.formulaName || p.name || "สารผสม");
                          const qty = parseInt(p.quantityPcs || p.quantity || 0);
                          const liters = (qty * 100) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-3xs hover:bg-slate-100/50 transition-all">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-6 w-6 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                                  <Beaker className="h-3.5 w-3.5 text-green-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 truncate">{name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[14px] text-slate-400 font-extrabold">{qty} ขวด x 100ml =</span>
                                <span className="text-[15px] font-black text-green-700 bg-green-50 px-2 py-0.5 border border-green-150 rounded-lg font-mono">
                                  {liters.toFixed(1)} ลิตร
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-left mt-auto pt-2.5 border-t border-slate-100 flex justify-between items-center w-full">
                        <p className="text-[15px] font-extrabold text-slate-750">ปริมาณสารเคมีรวมทั้งหมด</p>
                        <p className="text-[15px] font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg font-mono">{bulkInfo.totalLiters.toFixed(1)} ลิตร</p>
                      </div>
                    </div>
                  );
                })()}

                {/* [RIGHT COLUMN]: เช็กลิสต์บรรจุภัณฑ์ (Packaging Checklist) - Spans 1 column */}
                {(() => {
                  const hasPack = checkPackagingReady(cust, packagingItems);
                  const matchedPack = getMatchedPackagingItem();
                  const hasCap = checkCapReady(cust, packagingItems);
                  const matchedCap = getMatchedCapItem();
                  const hasLabel = checkLabelReady(cust, packagingItems);
                  const matchedLabel = getMatchedLabelItem();
                  return (
                    <div className="flex flex-col justify-between p-5 bg-white border border-slate-100 rounded-xl shadow-2xs hover:bg-slate-50/55 transition-all w-full border-slate-100">
                      <div className="flex flex-col gap-4 w-full my-auto">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono mb-2 block uppercase">PACKAGING STOCK STATUS</span>
                        
                        {/* 1. ขวดบรรจุภัณฑ์ */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <PackageOpen className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[15px] font-extrabold text-slate-700">ขวดบรรจุภัณฑ์</p>
                              <p className="text-[13px] text-slate-400 font-semibold truncate">{matchedPack ? matchedPack.name : "ขวดเปล่าตาม SKU"}</p>
                            </div>
                          </div>
                          <span className={`text-[14px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 ${
                            hasPack ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }`}>
                            {hasPack ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* 2. ฝาขวด / หัวปั๊ม */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[15px] font-extrabold text-slate-700">ฝาขวด / หัวปั๊ม</p>
                              <p className="text-[13px] text-slate-400 font-semibold truncate">{matchedCap ? matchedCap.name : "ฝาหรือหัวกดปั๊ม"}</p>
                            </div>
                          </div>
                          <span className={`text-[14px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 ${
                            hasCap ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }`}>
                            {hasCap ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* 3. สติกเกอร์สินค้า */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[15px] font-extrabold text-slate-700">สติกเกอร์สินค้า</p>
                              <p className="text-[13px] text-slate-400 font-semibold truncate">{matchedLabel ? matchedLabel.name : "สติกเกอร์สำหรับข้างขวด"}</p>
                            </div>
                          </div>
                          <span className={`text-[14px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 ${
                            hasLabel ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }`}>
                            {hasLabel ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                      </div>

                      <div className="text-left mt-auto pt-2.5 border-t border-slate-100 flex justify-between items-center w-full">
                        <p className="text-[15px] font-extrabold text-slate-400">เช็คคลังบรรจุภัณฑ์อัตโนมัติ</p>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Flow gate: the production wizard must not start until BOM
                  confirm-production has run (chemicals deducted + FG lot created).
                  producedLotId is set by that confirm step. */}
              {!cust.producedLotId && (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-[15px] font-extrabold text-amber-700">ยังไม่ได้ยืนยันสั่งผลิตในหน้า BOM</p>
                    <p className="text-[14px] text-amber-600 font-semibold mt-0.5">
                      ต้องไปกด &quot;ยืนยันสั่งผลิต&quot; ในหน้า BOM ก่อน เพื่อตัดสต็อกวัตถุดิบเคมีและสร้างล็อตผลิต จึงจะเริ่มสายการผลิตได้ —{" "}
                      <a href="/admin/rnd" className="underline font-extrabold text-amber-700 hover:text-amber-800">ไปหน้า R&D</a>
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={uploading || !cust.producedLotId || !checkPackagingReady(cust, packagingItems) || !checkLabelReady(cust, packagingItems)}
                  onClick={handleConfirmStep1}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1.5 active:scale-98"
                >
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                  <span>ยืนยันวัตถุดิบครบถ้วนเพื่อเริ่มผลิต</span>
                </Button>
              </div>
            </div>
          )
          }{/* Step 2: QC รอบที่ 1 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span>2. ตรวจสอบคุณภาพขั้นแรก (QC รอบที่ 1)</span>
                </h4>
                <p className="text-[15px] text-slate-400 mt-1 font-semibold">อัปโหลดภาพถ่ายขวดบรรจุภัณฑ์และหัวกดปั๊ม (สำหรับสติกเกอร์จะมีหรือไม่ก็ได้) พร้อมแนบคลิปวิดีโอหลังประกอบชิ้นงาน (ความยาวต้องมากกว่า 5 วินาที) เพื่อผ่าน QC รอบแรก</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. รูปขวดบรรจุภัณฑ์ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">1. รูปถ่ายขวดบรรจุภัณฑ์สมบูรณ์ *</span>
                  {(qc1PackagingFile || (cust.qc1PackagingPhoto && !qc1PackagingCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qc1PackagingFile ? URL.createObjectURL(qc1PackagingFile) : getFileUrl(cust.qc1PackagingPhoto)} alt="Packaging" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qc1PackagingFile && !!cust.qc1PackagingPhoto && !qc1PackagingCleared,
                            "รูปถ่ายขวดบรรจุภัณฑ์ (QC รอบ 1)",
                            () => { setQa1PackagingFile(null); setQc1PackagingCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปขวดบรรจุภัณฑ์</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQa1PackagingFile(e.target.files[0]);
                          setQc1PackagingCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 2. รูปหัวปั๊ม */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">2. รูปถ่ายหัวกดปั๊มที่ประกอบ *</span>
                  {(qc1PumpFile || (cust.qc1PumpPhoto && !qc1PumpCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qc1PumpFile ? URL.createObjectURL(qc1PumpFile) : getFileUrl(cust.qc1PumpPhoto)} alt="Pump" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qc1PumpFile && !!cust.qc1PumpPhoto && !qc1PumpCleared,
                            "รูปถ่ายหัวกดปั๊ม (QC รอบ 1)",
                            () => { setQa1PumpFile(null); setQc1PumpCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปหัวปั๊มที่ติดแน่น</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQa1PumpFile(e.target.files[0]);
                          setQc1PumpCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 3. รูปสติกเกอร์ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">3. รูปถ่ายสติกเกอร์สินค้า (มีหรือไม่มีก็ได้)</span>
                  {(qc1StickerFile || (cust.qc1StickerPhoto && !qc1StickerCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qc1StickerFile ? URL.createObjectURL(qc1StickerFile) : getFileUrl(cust.qc1StickerPhoto)} alt="Sticker" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qc1StickerFile && !!cust.qc1StickerPhoto && !qc1StickerCleared,
                            "รูปถ่ายสติกเกอร์ (QC รอบ 1)",
                            () => { setQa1StickerFile(null); setQc1StickerCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปสติกเกอร์</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQa1StickerFile(e.target.files[0]);
                          setQc1StickerCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 4. คลิปวิดีโอ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">4. คลิปหลักฐาน (ยาวเกิน 5 วินาที) *</span>
                  {(qc1VideoFile || (cust.qc1AssembledVideo && !qc1VideoCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square group shadow-xs">
                      <video src={qc1VideoFile ? URL.createObjectURL(qc1VideoFile) : getFileUrl(cust.qc1AssembledVideo)} className="w-full h-full object-cover bg-black" controls />
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[13px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm ${
                          qc1VideoError ? "bg-red-500 text-white animate-pulse" : "bg-green-500 text-white"
                        }`}>
                          {qc1VideoError ? "แก้คลิป" : qc1VideoFile ? `✓ ${Math.round(qc1VideoDuration)}s` : "✓ บันทึกแล้ว"}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                        {qc1VideoError && <span className="text-[13px] text-red-350 font-extrabold text-center px-2">{qc1VideoError}</span>}
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qc1VideoFile && !!cust.qc1AssembledVideo && !qc1VideoCleared,
                            "คลิปวิดีโอหลักฐาน (QC รอบ 1)",
                            () => { setQa1VideoFile(null); setQa1VideoDuration(0); setQa1VideoError(""); setQc1VideoCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Video className="h-5 w-5 text-slate-500" />
                      <span>🎥 คลิปวิดีโอหลักฐาน</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          handleQa1VideoChange(e.target.files[0]);
                          setQc1VideoCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={
                    uploading ||
                    !(qc1PackagingFile || (cust.qc1PackagingPhoto && !qc1PackagingCleared)) ||
                    !(qc1PumpFile || (cust.qc1PumpPhoto && !qc1PumpCleared)) ||
                    !(qc1VideoFile || (cust.qc1AssembledVideo && !qc1VideoCleared)) ||
                    !!qc1VideoError
                  }
                  onClick={handleConfirmStep2}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98 ${
                    (qc1PackagingFile || (cust.qc1PackagingPhoto && !qc1PackagingCleared)) &&
                    (qc1PumpFile || (cust.qc1PumpPhoto && !qc1PumpCleared)) &&
                    (qc1VideoFile || (cust.qc1AssembledVideo && !qc1VideoCleared)) &&
                    !qc1VideoError
                      ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-100 cursor-pointer" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                  <span>{uploading ? "กำลังประมวลผล..." : "ส่งผลตรวจ QC รอบแรกและไปขั้นตอนถัดไป"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: บรรจุผลิตภัณฑ์ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-green-600" />
                  <span>3. บรรจุผลิตภัณฑ์</span>
                </h4>
                <p className="text-[15px] text-slate-400 mt-1 font-semibold">ตรวจสอบรายการตรวจสอบขั้นตอนการเตรียมขวดและสารเคมีสำหรับการบรรจุผลิตภัณฑ์ลงในขวด</p>
              </div>

              {cust.productionStatus === "รอยืนยัน" && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto animate-bounce">
                    <Play className="h-6 w-6 text-blue-600" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">สเต็ปนี้อยู่ในสถานะ: ยืนยันการผลิต</h5>
                  <p className="text-[15px] text-slate-500 font-semibold leading-relaxed">
                    ระบบตรวจสอบความพร้อมของวัตถุดิบและผลตรวจ QC รอบที่ 1 ผ่านเกณฑ์เรียบร้อยแล้ว กรุณากดยืนยันการผลิตด้านล่างเพื่อเริ่มทำการเบิกจ่ายและส่งต่อไปยังขั้นตอนเลือกเครื่องผลิตในคลัง
                  </p>
                  <Button
                    disabled={uploading}
                    onClick={async () => {
                      setUploading(true);
                      try {
                        if (onUpdateStep) {
                          await onUpdateStep({
                            productionStep: 3,
                            productionStatus: "เลือกเครื่องจักร"
                          });
                        }
                      } catch (err) {
                        setUploadError("เกิดข้อผิดพลาดในการกดยืนยันการผลิต");
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-150 transition-all cursor-pointer flex items-center gap-2 mx-auto active:scale-98"
                  >
                    {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Play className="h-4.5 w-4.5" />}
                    <span>ยืนยันเตรียมจัดลงคิวเครื่องจักร</span>
                  </Button>
                </div>
              )}

              {cust.productionStatus === "เลือกเครื่องจักร" && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto">
                    <Clock className="h-6 w-6 text-sky-600 animate-pulse" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">สถานะ: รอเลือกเครื่องจักรผลิต (Pending Machine Assignment)</h5>
                  <p className="text-[15px] text-slate-500 font-semibold leading-relaxed">
                    ใบสั่งผลิตนี้ได้รับการยืนยันความพร้อมและเข้าคิวรอผลิตแล้ว กรุณากลับไปที่หน้าแดชบอร์ดหลักของโรงงาน จากนั้นลากและวางออเดอร์ของลูกค้ารายนี้ใส่ในเครื่องจักรที่ต้องการ
                  </p>
                  <Button
                    onClick={onBack}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 mx-auto active:scale-95 cursor-pointer"
                  >
                    <span>กลับไปหน้าแดชบอร์ดหลัก</span>
                  </Button>
                </div>
              )}

              {cust.productionStatus === "กำลังผลิต" && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
                    <Cpu className="h-6 w-6 text-blue-600 animate-spin duration-3000" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">สถานะ: กำลังผลิตอยู่บนเครื่องจักร (Processing)</h5>
                  <p className="text-[15px] text-slate-500 font-semibold leading-relaxed">
                    ใบสั่งผลิตนี้ได้รับการจัดสรรลงเครื่องและกำลังอยู่ระหว่างขั้นตอนเดินเครื่องผสมสารเคมีในกระบวนการผลิต กรุณากดปุ่มเครื่องหมายถูกสีเขียว (✓) บนการ์ดเครื่องจักรหน้าแดชบอร์ดหลักเมื่อผสมเสร็จสิ้น
                  </p>
                  <Button
                    onClick={onBack}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 mx-auto active:scale-95 cursor-pointer"
                  >
                    <span>กลับไปหน้าแดชบอร์ดหลัก</span>
                  </Button>
                </div>
              )}

              {cust.productionStatus === "รอบรรจุ" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left">
                    {/* 1 */}
                    <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                      check1 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 1</span>
                        <input 
                          type="checkbox" 
                          checked={check1}
                          onChange={(e) => toggleChecklist("check1", e.target.checked, setCheck1)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <PackageOpen className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[15px] font-extrabold text-slate-700">1. เตรียมบรรจุภัณฑ์</p>
                        <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">จัดเตรียมขวด ปลอกหัวปั๊ม และทำความสะอาดฝาปิดทั้งหมด</p>
                      </div>
                    </label>

                    {/* 2 */}
                    <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                      check2 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 2</span>
                        <input 
                          type="checkbox" 
                          checked={check2}
                          onChange={(e) => toggleChecklist("check2", e.target.checked, setCheck2)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Tag className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[15px] font-extrabold text-slate-700">2. เตรียมสติกเกอร์พร้อมผลิต</p>
                        <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">ตรวจสอบความถูกต้องและจำนวนสติกเกอร์สินค้าของยี่ห้อนี้</p>
                      </div>
                    </label>

                    {/* 3 */}
                    <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                      check3 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 3</span>
                        <input 
                          type="checkbox" 
                          checked={check3}
                          onChange={(e) => toggleChecklist("check3", e.target.checked, setCheck3)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Beaker className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[15px] font-extrabold text-slate-700">3. เตรียมสาร</p>
                        <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">นำเนื้อสารผสม (Bulk Chemical) เข้าสู่เครื่องจ่ายบรรจุ</p>
                      </div>
                    </label>

                    {/* 4 */}
                    <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                      check4 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 4</span>
                        <input 
                          type="checkbox" 
                          checked={check4}
                          onChange={(e) => toggleChecklist("check4", e.target.checked, setCheck4)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Droplet className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[15px] font-extrabold text-slate-700">4. บรรจุผลิตภัณฑ์</p>
                        <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">บรรจุผลิตภัณฑ์ได้ครบถ้วนตามปริมาตร มล. และปิดหัวปั๊มแน่นหนา</p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <Button
                      disabled={uploading || !check1 || !check2 || !check3 || !check4}
                      onClick={handleConfirmStep3}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1.5 active:scale-98"
                    >
                      {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                      <span>บันทึกการบรรจุขวดและไปขั้นตอนติดสติกเกอร์</span>
                    </Button>
                  </div>
                </>
              )}

              {/* Fallback: an unexpected status still renders guidance instead of a blank card */}
              {!["รอยืนยัน", "เลือกเครื่องจักร", "กำลังผลิต", "รอบรรจุ"].includes(cust.productionStatus) && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">สถานะไม่ตรงกับขั้นตอนบรรจุ</h5>
                  <p className="text-[15px] text-slate-500 font-semibold leading-relaxed">
                    สถานะปัจจุบัน &quot;{cust.productionStatus || "-"}&quot; ไม่ตรงกับสเต็ปบรรจุผลิตภัณฑ์ กรุณากลับไปที่หน้าตารางหลักเพื่อตรวจสอบสถานะใบสั่งผลิตของลูกค้ารายนี้อีกครั้ง
                  </p>
                  <Button
                    onClick={onBack}
                    className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 mx-auto active:scale-95 cursor-pointer"
                  >
                    <span>กลับหน้าตารางหลัก</span>
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* Step 4: ติดสติกเกอร์ & ห่อหุ้ม */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-green-600" />
                  <span>4. ติดสติกเกอร์ & ห่อหุ้ม</span>
                </h4>
                <p className="text-[15px] text-slate-400 mt-1 font-semibold">ขั้นตอนดำเนินการติดสติกเกอร์บนขวด ยิงรหัสล็อตผลิต ซีลหดถุงพลาสติกแพ็คเกจ</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left">
                
                {/* 5 */}
                <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                  check5 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                }`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 1</span>
                    <input 
                      type="checkbox" 
                      checked={check5}
                      onChange={(e) => toggleChecklist("check5", e.target.checked, setCheck5)}
                      className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                    />
                  </div>
                  
                  <div className="my-auto py-1 flex items-center justify-center">
                    <BadgeCheck className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                  </div>

                  <div className="text-left mt-auto">
                    <p className="text-[15px] font-extrabold text-slate-700">1. ติดสติ๊กเกอร์</p>
                    <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">ติดสติกเกอร์แบรนด์เรียบเนียน ตรงส่วนกลางขวด</p>
                  </div>
                </label>

                {/* 6 */}
                <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                  check6 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                }`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 2</span>
                    <input 
                      type="checkbox" 
                      checked={check6}
                      onChange={(e) => toggleChecklist("check6", e.target.checked, setCheck6)}
                      className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                    />
                  </div>
                  
                  <div className="my-auto py-1 flex items-center justify-center">
                    <Barcode className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                  </div>

                  <div className="text-left mt-auto">
                    <p className="text-[15px] font-extrabold text-slate-700">2. ยิง lot</p>
                    <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">พ่นตัวเล็กรหัสล็อตวันที่ผลิต วันหมดอายุ (LOT/MFG/EXP)</p>
                  </div>
                </label>

                {/* 7 */}
                <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                  check7 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                }`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 3</span>
                    <input 
                      type="checkbox" 
                      checked={check7}
                      onChange={(e) => toggleChecklist("check7", e.target.checked, setCheck7)}
                      className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                    />
                  </div>
                  
                  <div className="my-auto py-1 flex items-center justify-center">
                    <Clock className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                  </div>

                  <div className="text-left mt-auto">
                    <p className="text-[15px] font-extrabold text-slate-700">3. พักของรอ ซีลถุง</p>
                    <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">จัดวางเรียงชิ้นงานเสร็จพักบนชั้นลำเลียงเพื่อเตรียมซีลถุง</p>
                  </div>
                </label>

                {/* 8 */}
                <label className={`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group ${
                  check8 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                }`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[14px] text-slate-400 font-extrabold font-mono">ข้อ 4</span>
                    <input 
                      type="checkbox" 
                      checked={check8}
                      onChange={(e) => toggleChecklist("check8", e.target.checked, setCheck8)}
                      className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                    />
                  </div>
                  
                  <div className="my-auto py-1 flex items-center justify-center">
                    <Box className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                  </div>

                  <div className="text-left mt-auto">
                    <p className="text-[15px] font-extrabold text-slate-700">4. ซีลถุง</p>
                    <p className="text-[14px] text-slate-400 font-semibold mt-1 leading-normal">หุ้มพลาสติกซินและอบความร้อนซีลหดปากถุงแน่นหนาสวยงาม</p>
                  </div>
                </label>

              </div>

              {/* ยิง lot: LOT / MFG / EXP fields (เลข LOT จำเป็นก่อนยืนยันขั้นตอนนี้) */}
              <div className="bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left space-y-3">
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-green-600" />
                  <span className="font-extrabold text-slate-700 text-xs">ข้อมูลการยิงล็อต (LOT / MFG / EXP)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[14px] font-extrabold text-slate-600 block">เลข LOT ที่ยิง *</label>
                    <input
                      type="text"
                      value={lotStampNo}
                      onChange={(e) => setLotStampNo(e.target.value)}
                      placeholder="เช่น LOT-20260713"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all ${
                        lotStampNo.trim() ? "border-slate-200 focus:border-green-500" : "border-red-300 focus:border-red-500"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[14px] font-extrabold text-slate-600 block">วันผลิต (MFG)</label>
                    <input
                      type="date"
                      value={lotStampMfg}
                      onChange={(e) => setLotStampMfg(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-green-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[14px] font-extrabold text-slate-600 block">วันหมดอายุ (EXP)</label>
                    <input
                      type="date"
                      value={lotStampExp}
                      onChange={(e) => setLotStampExp(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-green-500 transition-all"
                    />
                  </div>
                </div>
                {!lotStampNo.trim() && (
                  <p className="text-[14px] text-red-500 font-semibold">* กรุณากรอกเลข LOT ที่ยิงก่อนยืนยันขั้นตอนนี้</p>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={uploading || !check5 || !check6 || !check7 || !check8 || !lotStampNo.trim()}
                  onClick={handleConfirmStep4}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98 ${
                    check5 && check6 && check7 && check8 && lotStampNo.trim()
                      ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-150 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                  <span>ยืนยันการติดสติกเกอร์และหีบห่อเสร็จสิ้น (ไปตรวจ QC รอบที่ 2)</span>
                </Button>
              </div>
            </div>
          )}
          {/* Step 5: QC รอบที่ 2 */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span>5. ตรวจสอบคุณภาพขั้นสุดท้าย (QC รอบที่ 2)</span>
                </h4>
                <p className="text-[15px] text-slate-400 mt-1 font-semibold">อัปโหลดรูปถ่ายสินค้า สติกเกอร์ ผลิตภัณฑ์ พร้อมแนบคลิปวิดีโอรอบผลิตภัณฑ์ (ความยาวไม่เกิน 5 วินาที) เพื่อรอลูกค้ายืนยันและจัดส่งสินค้า</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. รูปสินค้า */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">1. รูปถ่ายสินค้าสำเร็จ *</span>
                  {(qcPackagingFile || (cust.qcPackagingPhoto && !qcPackagingCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qcPackagingFile ? URL.createObjectURL(qcPackagingFile) : getFileUrl(cust.qcPackagingPhoto)} alt="Packaging" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qcPackagingFile && !!cust.qcPackagingPhoto && !qcPackagingCleared,
                            "รูปถ่ายสินค้าสำเร็จ (QC รอบ 2)",
                            () => { setQaPackagingFile(null); setQcPackagingCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปถ่ายสินค้าสำเร็จ</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQaPackagingFile(e.target.files[0]);
                          setQcPackagingCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 2. รูปสติกเกอร์ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">2. รูปถ่ายสติกเกอร์บนขวด *</span>
                  {(qcStickerFile || (cust.qcStickerPhoto && !qcStickerCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qcStickerFile ? URL.createObjectURL(qcStickerFile) : getFileUrl(cust.qcStickerPhoto)} alt="Sticker" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qcStickerFile && !!cust.qcStickerPhoto && !qcStickerCleared,
                            "รูปถ่ายสติกเกอร์บนขวด (QC รอบ 2)",
                            () => { setQaStickerFile(null); setQcStickerCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปถ่ายสติกเกอร์บนขวด</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQaStickerFile(e.target.files[0]);
                          setQcStickerCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 3. รูปผลิตภัณฑ์ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">3. รูปถ่ายชิ้นงานผลิตภัณฑ์เต็มตัว *</span>
                  {(qcPumpFile || (cust.qcPumpPhoto && !qcPumpCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center aspect-square group shadow-xs">
                      <img src={qcPumpFile ? URL.createObjectURL(qcPumpFile) : getFileUrl(cust.qcPumpPhoto)} alt="Pump" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => requestMediaDelete(
                            !qcPumpFile && !!cust.qcPumpPhoto && !qcPumpCleared,
                            "รูปถ่ายชิ้นงานผลิตภัณฑ์ (QC รอบ 2)",
                            () => { setQaPumpFile(null); setQcPumpCleared(true); }
                          )}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Camera className="h-5 w-5 text-slate-500" />
                      <span>📸 รูปถ่ายผลิตภัณฑ์เต็มตัว</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setQaPumpFile(e.target.files[0]);
                          setQcPumpCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 4. คลิปวิดีโอ */}
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-700 text-[15px] block text-left">4. คลิปหลักฐาน (ยาวไม่เกิน 5 วินาที) *</span>
                  {(qcVideoFile || (cust.qcAssembledVideo && !qcVideoCleared)) ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square group shadow-xs">
                      <video src={qcVideoFile ? URL.createObjectURL(qcVideoFile) : getFileUrl(cust.qcAssembledVideo)} className="w-full h-full object-cover bg-black" controls />
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[13px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm ${
                          qcVideoError ? "bg-red-500 text-white animate-pulse" : "bg-green-500 text-white"
                        }`}>
                          {qcVideoError ? "แก้คลิป" : qcVideoFile ? `✓ ${Math.round(qcVideoDuration)}s` : "✓ บันทึกแล้ว"}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                        {qcVideoError && <span className="text-[13px] text-red-350 font-extrabold text-center px-2">{qcVideoError}</span>}
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => {
                            setQaVideoFile(null);
                            setQaVideoDuration(0);
                            setQaVideoError("");
                            setQcVideoCleared(true);
                          }}
                          className="p-2.5 bg-red-650 text-white rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 aspect-square w-full">
                      <Video className="h-5 w-5 text-slate-500" />
                      <span>🎥 คลิปวิดีโอหลักฐาน</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          handleVideoChange(e.target.files[0]);
                          setQcVideoCleared(false);
                        }}
                      />
                    </label>
                  )}
                </div>

              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={
                    uploading ||
                    !(qcPackagingFile || (cust.qcPackagingPhoto && !qcPackagingCleared)) ||
                    !(qcStickerFile || (cust.qcStickerPhoto && !qcStickerCleared)) ||
                    !(qcPumpFile || (cust.qcPumpPhoto && !qcPumpCleared)) ||
                    !(qcVideoFile || (cust.qcAssembledVideo && !qcVideoCleared)) ||
                    !!qcVideoError
                  }
                  onClick={handleConfirmStep5}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98 ${
                    (qcPackagingFile || (cust.qcPackagingPhoto && !qcPackagingCleared)) &&
                    (qcStickerFile || (cust.qcStickerPhoto && !qcStickerCleared)) &&
                    (qcPumpFile || (cust.qcPumpPhoto && !qcPumpCleared)) &&
                    (qcVideoFile || (cust.qcAssembledVideo && !qcVideoCleared)) &&
                    !qcVideoError
                      ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-150 cursor-pointer" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                  <span>{uploading ? "กำลังประมวลผล..." : "ส่งผลตรวจ QC รอบสุดท้ายและไปขั้นตอนถัดไป"}</span>
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 6: เสร็จสิ้น */}
          {currentStep === 6 && (
            <div className="space-y-6 text-center py-6">
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-base">ใบสั่งผลิตนี้เสร็จสมบูรณ์แล้ว!</h4>
                <p className="text-[15px] text-slate-400 font-semibold">บันทึกประวัติความพร้อมและรูปภาพรับประกันคุณภาพ QC บรรจุเรียบร้อยแล้วในฐานข้อมูล</p>
              </div>

              {cust.productionStatus === "รอลูกค้ายืนยัน" && (
                <div className="p-4 bg-purple-50 border border-purple-200 text-purple-800 rounded-2xl font-bold text-xs flex flex-col gap-1 items-center max-w-2xl mx-auto mb-6">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-purple-600 animate-pulse" />
                    <span>ขณะนี้ขั้นตอนผลิตเสร็จสมบูรณ์แล้ว อยู่ระหว่างรอลูกค้ายืนยันการรับสินค้า</span>
                  </span>
                  <span className="text-[14px] text-purple-400 font-semibold">(ท่านสามารถเปลี่ยนสถานะเป็น "ลูกค้ายืนยันแล้ว" พร้อมแนบรูปแชทได้ที่ปุ่ม 3 จุดในตารางหน้าหลัก)</span>
                </div>
              )}

              {/* Display Read-only galleries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto border-t border-slate-100 pt-6 text-left">
                
                {/* Column Left: QC 1 files */}
                <div className="space-y-4">
                  <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <ClipboardList className="h-4 w-4 text-green-600" />
                    รูปภาพการตรวจสอบรอบที่ 1
                  </h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">ขวดสำเร็จ</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qc1PackagingPhoto ? (
                          <img src={getFileUrl(cust.qc1PackagingPhoto)} alt="Packaging" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">หัวกดปั๊ม</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qc1PumpPhoto ? (
                          <img src={getFileUrl(cust.qc1PumpPhoto)} alt="Pump" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">สติกเกอร์</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qc1StickerPhoto ? (
                          <img src={getFileUrl(cust.qc1StickerPhoto)} alt="Sticker" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Right: QC 2 Final files */}
                <div className="space-y-4">
                  <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <Award className="h-4 w-4 text-green-550" />
                    รูปภาพการตรวจสอบรอบสุดท้าย
                  </h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">สินค้าสำเร็จ</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qcPackagingPhoto ? (
                          <img src={getFileUrl(cust.qcPackagingPhoto)} alt="Packaging" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">สติกเกอร์</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qcStickerPhoto ? (
                          <img src={getFileUrl(cust.qcStickerPhoto)} alt="Sticker" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-500">ผลิตภัณฑ์</span>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-16 flex items-center justify-center shadow-2xs">
                        {cust.qcPumpPhoto ? (
                          <img src={getFileUrl(cust.qcPumpPhoto)} alt="Pump" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[13px] text-slate-400">ไม่มีรูป</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Videos rendering in finished state */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6 border-t border-slate-100 pt-4 text-left">
                {cust.qc1AssembledVideo && (
                  <div className="space-y-1">
                    <span className="text-[13px] font-bold text-slate-500">วิดีโอยืนยันรอบแรก (ยาวเกิน 5 วินาที)</span>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 shadow-2xs">
                      <video src={getFileUrl(cust.qc1AssembledVideo)} className="w-full max-h-36 object-contain bg-black rounded-xl" controls />
                    </div>
                  </div>
                )}
                {cust.qcAssembledVideo && (
                  <div className="space-y-1">
                    <span className="text-[13px] font-bold text-slate-500">วิดีโอยืนยันรอบสุดท้าย (ยาวไม่เกิน 5 วินาที)</span>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 shadow-2xs">
                      <video src={getFileUrl(cust.qcAssembledVideo)} className="w-full max-h-36 object-contain bg-black rounded-xl" controls />
                    </div>
                  </div>
                )}
              </div>

              {cust.chatScreenshotProof && (
                <div className="max-w-md mx-auto border-t border-slate-100 pt-6 mt-6 text-left">
                  <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100 mb-3">
                    <ClipboardList className="h-4 w-4 text-rose-600" />
                    รูปภาพแชทยืนยันจากลูกค้า
                  </h5>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 shadow-2xs max-w-sm mx-auto">
                    <img src={getFileUrl(cust.chatScreenshotProof)} alt="Chat Proof" className="w-full object-contain max-h-64" />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-center gap-3">
                {/* Round-trip to the finished-goods lot this order produced. */}
                {cust.producedLotId && (
                  <a
                    href="/admin/stock"
                    className="px-8 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                  >
                    <PackageOpen className="h-4 w-4 text-emerald-600" /> ดูล็อตสินค้าสำเร็จรูป
                  </a>
                )}
                <Button
                  onClick={onBack}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-green-150 active:scale-95"
                >
                  ย้อนกลับหน้าตารางหลัก
                </Button>
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}