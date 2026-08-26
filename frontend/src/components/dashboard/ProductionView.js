"use client";

import React, { useState, useEffect, useMemo } from "react";
import api, { assetUrl as getFileUrl } from "@/lib/api";
import { compressImage, compressImageToBase64 } from "@/lib/imageCompress";
import { openProductionSpecDoc } from "@/lib/productionSpecDoc";
import IngredientPlanTable from "./IngredientPlanTable";
import CreatableSelect from "./CreatableSelect";
import AsyncButton from "@/components/ui/AsyncButton";
import { Card, Button } from "@heroui/react";
import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, Package, GripVertical,
  Cpu, Plus, Trash, ArrowUp, ArrowDown, PlusCircle, Check, FlaskConical,
  Factory, Boxes, Inbox, Printer, Settings, MessageSquare
} from "lucide-react";

const cleanFormulaName = (name) => {
  if (!name) return "";
  return name.replace(/\s*(?:สูตรเฉพาะตัว|ปรับปรุง)\s+ของ\s+.+$/, "").replace(/^สูตรเฉพาะตัว\s*-\s*/, "");
};

const formatBlockTimeAndDate = (startDate, endDate, startTime, endTime) => {
  if (!startDate) return "-";
  const sd = new Date(startDate);
  const ed = new Date(endDate || startDate);
  const startFmt = `${sd.getDate().toString().padStart(2, '0')}/${(sd.getMonth() + 1).toString().padStart(2, '0')}`;
  const endFmt = `${ed.getDate().toString().padStart(2, '0')}/${(ed.getMonth() + 1).toString().padStart(2, '0')}`;
  const sTime = startTime || "09:00";
  const eTime = endTime || "18:00";

  return `${sTime}-${eTime} (${startFmt} ถึง ${endFmt})`;
};

const formatTimelineWorkDate = (date) => {
  if (!date) return "-";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "-";
  return `${value.getDate().toString().padStart(2, "0")}/${(value.getMonth() + 1).toString().padStart(2, "0")}/${value.getFullYear()}`;
};

const isIncomingQcOrder = (order) => /incoming|รอตรวจ\s*QC\s*รอบที่\s*1/i.test(`${order?.computedStatus || ""} ${order?.productionStatus || ""}`);

// Handed-over orders leave the production floor for good: the record lives on in
// the customer log (บันทึกลูกค้า) / FG lots, but the card is gone from Production.
const CLOSED_STATUSES = ["ส่งให้ลูกค้า", "ส่งเก็บเข้าคลัง"];

import HeroBanner from "./HeroBanner";


// Every image stored in the DB goes through the 1 MB policy (see lib/imageCompress).
import { useRouter } from "next/navigation";

const DAY_LABELS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

// The 7 timeline columns per view — a schedule's start/end index maps to these.
const VIEW_SLOTS = {
  weekly: DAY_LABELS,
  daily: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
  monthly: ["สัปดาห์ 1", "สัปดาห์ 2", "สัปดาห์ 3", "สัปดาห์ 4", "สัปดาห์ 5", "สัปดาห์ 6", "สัปดาห์ 7"],
};
const slotLabels = (view) => VIEW_SLOTS[view] || VIEW_SLOTS.weekly;
const VIEW_UNIT = { weekly: "วัน", daily: "ช่วงเวลา", monthly: "สัปดาห์" };

export default function ProductionView({
  formulas = [],
  ingredients = [],
  skus = [],
  customers = [],
  machines = [],
  onConfirmProduction,
  onUpdateCustomerStatus,
  onScheduleOrder,
  onCreateMachine,
  onUpdateMachine,
  onDeleteMachine
}) {
  const router = useRouter();

  // States for Tab 1: ใบสั่งผลิตเตรียมพัสดุ (received)
  const [receivedSearch, setReceivedSearch] = useState("");
  const [finishSearch, setFinishSearch] = useState("");
  const [timelineView, setTimelineView] = useState("daily");
  const [timelineBaseDate, setTimelineBaseDate] = useState(() => {
    // Local parts, not toISOString(): in UTC+7 the latter rolls back to
    // yesterday for any local time before 07:00.
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [viewImageModal, setViewImageModal] = useState({ open: false, url: "", title: "" });
  // Ship-to-customer dialog: the courier box is only known at dispatch, so it is
  // picked (and its stock cut) here rather than at prep time with the other packaging.
  const [shipTarget, setShipTarget] = useState(null);
  const [shipBoxId, setShipBoxId] = useState("");
  const [shipBoxQty, setShipBoxQty] = useState("1");
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [shipError, setShipError] = useState("");
  const [selectedReceivedOrderId, setSelectedReceivedOrderId] = useState(null);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [handoffModal, setHandoffModal] = useState({ open: false, customerName: "" });
  const [activeMixingFormula, setActiveMixingFormula] = useState(null);

  const handleSelectReceivedOrder = (orderId) => {
    setSelectedReceivedOrderId(orderId);
    setCheck1(false);
    setCheck2(false);
    setCheck3(false);
  };

  const handleConfirmPreparation = async (order) => {
    setConfirming(true);
    try {
      // Update production status to step 3 / line — the backend deducts packaging
      // off the back of this status change.
      const payload = {
        productionStatus: "กำลังผลิต",
        productionStep: 3
      };
      if (onUpdateCustomerStatus) {
        await onUpdateCustomerStatus(order._id, payload);
      }
      setSelectedReceivedOrderId(null);
      setHandoffModal({
        open: true,
        customerName: order.name || "ไม่ระบุชื่อ"
      });
    } catch (error) {
      console.error("Error confirming preparation:", error);
      alert("เกิดข้อผิดพลาดในการยืนยันเตรียมพัสดุ/BOM: " + (error.response?.data?.message || error.response?.data?.error || error.message));
    } finally {
      setConfirming(false);
    }
  };

  const getProductDetails = (order) => {
    const p = Array.isArray(order.orderedProducts) ? order.orderedProducts[0] : order.orderedProducts;
    return p;
  };

  const resolveFormula = (product) => {
    if (!product) return null;
    return (product.formulaId && formulas.find(f => String(f._id) === String(product.formulaId))) ||
      formulas.find(f => f.name === product.formulaName) || null;
  };

  // Resolve the exact catalog item the customer picked in Sales, by stored id first
  // (packagingItemId / labelItemId), falling back to name/keyword only when absent.
  const findById = (items, id) => (id ? items.find(item => String(item._id) === String(id)) : null);

  const getPackagingStockInfo = (order, items) => {
    const p = getProductDetails(order);
    const qtyNeeded = parseInt(p?.quantityPcs || p?.quantity || p?.bottleCount) || 0;
    const packName = p?.packagingType || "";

    // Find bottle/tube — prefer the exact selected PackagingItem by id.
    let matchedBottle = findById(items, p?.packagingItemId);
    if (!matchedBottle && packName) {
      matchedBottle = items.find(item => item.name === packName);
    }
    if (!matchedBottle) {
      const packagingTypes = ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"];
      matchedBottle = items.find(item =>
        (item.customer === order.name || item.customer === order.brand) &&
        (packagingTypes.includes(item.type?.name) || ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw)))
      );
    }
    if (!matchedBottle) {
      matchedBottle = items.find(item => ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw)));
    }

    // Nozzles were migrated into the packaging catalog, so nozzleId now points at
    // a PackagingItem — resolve it there FIRST; that record carries the real stock.
    // (The legacy `nozzles` catalog is empty, so the old findById(nozzleItems, ...)
    // always missed and stock fell through to a blind keyword scan that matched an
    // unrelated item — e.g. "ขวดลูกกลิ้ง 10ml+ฝา+จุก" — showing the wrong quantity.)
    const nozzleFromPackaging = findById(items, p?.nozzleId);
    const selNozzle = nozzleFromPackaging || findById(nozzleItems, p?.nozzleId);

    let matchedPump = nozzleFromPackaging;
    if (!matchedPump && p?.nozzleType) {
      matchedPump = items.find(item => item.name === p.nozzleType);
    }
    if (!matchedPump) {
      matchedPump = items.find(item =>
        (item.customer === order.name || item.customer === order.brand) &&
        ["ฝา", "ปั๊ม", "หัวฉีด", "หัวสเปรย์", "ดรอปเปอร์"].some(kw => item.name?.includes(kw))
      );
    }
    // NOTE: no blind catalog-wide keyword fallback here on purpose — matching any
    // item whose name merely contains "ฝา" pulls another customer's stock.

    return {
      bottle: {
        name: matchedBottle ? matchedBottle.name : (packName || "ขวดบรรจุภัณฑ์ (ไม่ระบุ)"),
        qtyNeeded,
        available: matchedBottle ? matchedBottle.currentQuantity : 0,
        isReady: matchedBottle ? matchedBottle.currentQuantity >= qtyNeeded : false,
        found: !!matchedBottle,
        image: matchedBottle ? matchedBottle.image : null
      },
      pump: {
        name: selNozzle?.name || p?.nozzleType || (matchedPump ? matchedPump.name : "ฝา / หัวฉีด / หัวปั๊ม"),
        qtyNeeded,
        available: matchedPump ? matchedPump.currentQuantity : 0,
        isReady: matchedPump ? matchedPump.currentQuantity >= qtyNeeded : false,
        found: !!matchedPump || !!selNozzle,
        image: selNozzle?.image || (matchedPump ? matchedPump.image : null)
      }
    };
  };

  const getLabelStockInfo = (order, items) => {
    const p = getProductDetails(order);
    const qtyNeeded = parseInt(p?.quantityPcs || p?.quantity || p?.bottleCount) || 0;
    const labelName = p?.labelType || "";

    // Prefer the exact selected label (a PackagingItem) by id.
    let matchedLabel = findById(items, p?.labelItemId);
    if (!matchedLabel && labelName) {
      matchedLabel = items.find(item => item.name === labelName);
    }
    if (!matchedLabel) {
      const labelTypes = ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"];
      matchedLabel = items.find(item =>
        (item.customer === order.name || item.customer === order.brand) &&
        (labelTypes.includes(item.type?.name) || ["ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw)))
      );
    }
    if (!matchedLabel) {
      matchedLabel = items.find(item => ["ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw)));
    }

    return {
      name: matchedLabel ? matchedLabel.name : (labelName || "ฉลาก / สติกเกอร์ล็อตสินค้า"),
      qtyNeeded,
      available: matchedLabel ? matchedLabel.currentQuantity : 0,
      isReady: matchedLabel ? matchedLabel.currentQuantity >= qtyNeeded : false,
      found: !!matchedLabel,
      image: matchedLabel ? matchedLabel.image : null
    };
  };

  const getIngredientsStockInfo = (order, formulasList, ingredientsList) => {
    const p = getProductDetails(order);
    const formulaName = p?.formulaName || "";
    const formula = (p?.formulaId && formulasList.find(f => String(f._id) === String(p.formulaId))) ||
      formulasList.find(f => f.name === formulaName);
    
    if (!formula) return { found: false, list: [], formulaName: formulaName || "ยังไม่มีสูตร" };

    const qtyPcs = parseInt(p?.quantityPcs || p?.quantity) || 0;
    let fillVol = 100;
    if (p?.fillVolume) {
      const parsed = parseFloat(p.fillVolume);
      if (!isNaN(parsed)) fillVol = parsed;
    }
    const totalGramsNeeded = qtyPcs * fillVol;

    const list = (formula.ingredients || []).map(ing => {
      const ratio = parseFloat(ing.ratio) || 0;
      const requiredGrams = totalGramsNeeded * ratio;
      
      const matched = ingredientsList.find(item => 
        item.name?.toLowerCase().trim() === ing.name?.toLowerCase().trim() ||
        item.name?.toLowerCase().includes(ing.name?.toLowerCase()) ||
        ing.name?.toLowerCase().includes(item.name?.toLowerCase())
      );

      const availableGrams = matched ? (Number(matched.currentQuantity) || 0) : 0;

      return {
        name: ing.name,
        phase: ing.phase || "A",
        ratio,
        requiredGrams,
        availableGrams,
        isReady: availableGrams >= requiredGrams,
        found: !!matched
      };
    });

    return {
      found: true,
      formulaName: formula.name,
      procedures: formula.procedures || [],
      note: Array.isArray(formula.note) ? formula.note : (formula.note ? [formula.note] : []),
      // Batch size behind requiredGrams — the worksheet labels its column with it
      // so the operator can tell the real weigh-out from the per-1kg recipe.
      batchKg: totalGramsNeeded / 1000,
      list
    };
  };

  // Status Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [chatFile, setChatFile] = useState(null);
  const [chatError, setChatError] = useState("");
  const [modalUploading, setModalUploading] = useState(false);

  const openStatusModal = (cust) => {
    setSelectedCust(cust);
    setNewStatus(cust.computedStatus || cust.productionStatus);
    setChatFile(null);
    setChatError("");
    setIsModalOpen(false); // reset
    setTimeout(() => {
      setIsModalOpen(true);
    }, 50);
  };

  const handleSaveStatus = async () => {
    if ((newStatus === "ลูกค้ายืนยันแล้ว" || newStatus === "สำเร็จเสร็จสิ้น") && !chatFile && (!selectedCust || !selectedCust.chatScreenshotProof)) {
      setChatError("กรุณาอัปโหลดรูปภาพแชทเป็นหลักฐานในการยืนยัน");
      return;
    }

    setModalUploading(true);
    try {
      let chatProofUrl = selectedCust.chatScreenshotProof || "";
      if (chatFile) {
        chatProofUrl = await compressImageToBase64(chatFile);
      }

      const payload = {
        productionStatus: newStatus,
        chatScreenshotProof: chatProofUrl
      };

      // Set production steps matching the status
      if (newStatus === "สำเร็จเสร็จสิ้น") {
        payload.productionStep = 6;
      } else if (newStatus === "ลูกค้ายืนยันแล้ว" || newStatus === "รอลูกค้ายืนยัน") {
        payload.productionStep = 6;
      } else if (newStatus === "รอตรวจ QC รอบที่ 2") {
        payload.productionStep = 5;
      } else if (newStatus === "กำลังผลิต" || newStatus === "กำลังผลิต (บรรจุ)" || newStatus === "กำลังผลิต (ติดฉลาก)") {
        payload.productionStep = 3;
      } else if (newStatus === "รอตรวจ QC รอบที่ 1") {
        payload.productionStep = 2;
      } else if (newStatus === "รอยืนยัน" || newStatus === "ยังไม่ผลิต") {
        payload.productionStep = 1;
      }

      if (onUpdateCustomerStatus) {
        await onUpdateCustomerStatus(selectedCust._id, payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setChatError("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    } finally {
      setModalUploading(false);
    }
  };
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailCust, setSelectedDetailCust] = useState(null);

  const openViewDetailModal = (cust) => {
    setSelectedDetailCust(cust);
    setIsDetailModalOpen(true);
  };

  const [packagingItems, setPackagingItems] = useState([]);
  const [nozzleItems, setNozzleItems] = useState([]);
  const [tableTab, setTableTab] = useState("active"); // "active" or "completed"
  
  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "not-ready", "pending-conf", "qc1", "producing", "qc2", "completed"
  const [sortBy, setSortBy] = useState("name-asc"); // "name-asc", "name-desc", "step-asc", "step-desc"
  const [stageTab, setStageTab] = useState("received");

  // Fetch packaging items on mount
  useEffect(() => {
    const fetchPackaging = async () => {
      try {
        const [pkgRes, nozRes] = await Promise.all([
          api.get("/packaging"),
          api.get("/nozzles"),
        ]);
        setPackagingItems(pkgRes.data || []);
        setNozzleItems(nozRes.data || []);
      } catch (err) {
        console.error("Error loading packaging/nozzles:", err);
      }
    };
    fetchPackaging();
  }, []);

  const orderedCustomers = useMemo(() => {
    const list = [];
    customers.forEach(c => {
      // Sample orders are stock withdrawals completed by Sales. They do not
      // require formulation, scheduling, production, or QC.
      if (c.orderType === "sample") return;

      const isLotOrder = c.orderType === "lot";
      const hasProducts = c.orderedProducts && Array.isArray(c.orderedProducts) && c.orderedProducts.length > 0;

      if (hasProducts) {
        c.orderedProducts.forEach((p, idx) => {
          if (c.orderType === "develop" || p.isDevelopment) {
            return; // Skip custom formulation development items — kept exclusively within R&D module
          }
          const step = p.productionStep || c.productionStep || 1;
          if (step < 2) {
            return; // Skip if not confirmed by R&D yet
          }
          if (CLOSED_STATUSES.includes(p.productionStatus || c.productionStatus)) {
            return; // Handed over (delivered / warehoused) — closed, lives in the customer log now
          }
          list.push({
            ...c,
            _id: `${c._id}-${idx}`,
            originalId: c._id,
            productIndex: idx,
            singleOrderedProduct: p,
            orderedProducts: [p],
            productionStatus: p.productionStatus || c.productionStatus,
            productionStep: step,
            // Per-product packaging/QC state — backend writes these to
            // orderedProducts.<idx>.*, so the flattened view must read the
            // product's value (falling back to the order-level default),
            // otherwise the pack sub-step cards never advance.
            packagingSubStep: p.packagingSubStep || c.packagingSubStep,
            qcPackagingPhoto: p.qcPackagingPhoto || c.qcPackagingPhoto,
            qcPumpPhoto: p.qcPumpPhoto || c.qcPumpPhoto,
            qcStickerPhoto: p.qcStickerPhoto || c.qcStickerPhoto,
            qcLotPhoto: p.qcLotPhoto || c.qcLotPhoto,
            qcSealingPhoto: p.qcSealingPhoto || c.qcSealingPhoto,
            qcAssembledVideo: p.qcAssembledVideo || c.qcAssembledVideo,
            qcFinalPhoto: p.qcFinalPhoto || c.qcFinalPhoto,
            // R&D Incoming-QC evidence — shown as slot 1 on the Final QC card.
            // Brand lives on the ordered line (the Sales spec modal writes it
            // there); the deal-level field was removed and is empty on every
            // record, so reading c.brand alone showed "-" everywhere.
            brand: p.brand || c.brand || "",
            qc1BulkPhoto: p.qc1BulkPhoto || c.qc1BulkPhoto,
            rndQcPhotos: (Array.isArray(p.rndQcPhotos) && p.rndQcPhotos.length) ? p.rndQcPhotos : c.rndQcPhotos,
            rndQcChecklist: p.rndQcChecklist || c.rndQcChecklist,
            rndQcAt: p.rndQcAt || c.rndQcAt,
            // Per-product BOM/stock state. These MUST come from the line item:
            // reading producedLotId off the order made every product after the
            // first look "already confirmed", so its lot was never created.
            producedLotId: p.producedLotId || null,
            isConfirmed: p.isConfirmed ?? c.isConfirmed,
            isStockDeducted: p.isStockDeducted ?? c.isStockDeducted,
            consumedPackaging: (Array.isArray(p.consumedPackaging) && p.consumedPackaging.length) ? p.consumedPackaging : c.consumedPackaging
          });
        });
      } else if (c.orderedProducts && typeof c.orderedProducts === "object" && c.orderedProducts.formulaName) {
        const p = c.orderedProducts;
        if (c.orderType === "develop" || p.isDevelopment) {
          return;
        }
        const step = p.productionStep || c.productionStep || 1;
        if (step >= 2 && !CLOSED_STATUSES.includes(p.productionStatus || c.productionStatus)) {
          list.push({
            ...c,
            _id: `${c._id}-0`,
            originalId: c._id,
            productIndex: 0,
            singleOrderedProduct: p,
            orderedProducts: [p],
            productionStatus: p.productionStatus || c.productionStatus,
            productionStep: step,
            packagingSubStep: p.packagingSubStep || c.packagingSubStep,
            qcPackagingPhoto: p.qcPackagingPhoto || c.qcPackagingPhoto,
            qcPumpPhoto: p.qcPumpPhoto || c.qcPumpPhoto,
            qcStickerPhoto: p.qcStickerPhoto || c.qcStickerPhoto,
            qcLotPhoto: p.qcLotPhoto || c.qcLotPhoto,
            qcSealingPhoto: p.qcSealingPhoto || c.qcSealingPhoto,
            qcAssembledVideo: p.qcAssembledVideo || c.qcAssembledVideo,
            qcFinalPhoto: p.qcFinalPhoto || c.qcFinalPhoto,
            // R&D Incoming-QC evidence — shown as slot 1 on the Final QC card.
            // Brand lives on the ordered line (the Sales spec modal writes it
            // there); the deal-level field was removed and is empty on every
            // record, so reading c.brand alone showed "-" everywhere.
            brand: p.brand || c.brand || "",
            qc1BulkPhoto: p.qc1BulkPhoto || c.qc1BulkPhoto,
            rndQcPhotos: (Array.isArray(p.rndQcPhotos) && p.rndQcPhotos.length) ? p.rndQcPhotos : c.rndQcPhotos,
            rndQcChecklist: p.rndQcChecklist || c.rndQcChecklist,
            rndQcAt: p.rndQcAt || c.rndQcAt,
            // Per-product BOM/stock state. These MUST come from the line item:
            // reading producedLotId off the order made every product after the
            // first look "already confirmed", so its lot was never created.
            producedLotId: p.producedLotId || null,
            isConfirmed: p.isConfirmed ?? c.isConfirmed,
            isStockDeducted: p.isStockDeducted ?? c.isStockDeducted,
            consumedPackaging: (Array.isArray(p.consumedPackaging) && p.consumedPackaging.length) ? p.consumedPackaging : c.consumedPackaging
          });
        }
      } else if (isLotOrder || c.section === "s11") {
        const step = c.productionStep || 1;
        if (step >= 2 && !CLOSED_STATUSES.includes(c.productionStatus)) {
          list.push({
            ...c,
            _id: `${c._id}-0`,
            originalId: c._id,
            productIndex: 0,
            singleOrderedProduct: null,
            orderedProducts: [],
            productionStatus: c.productionStatus,
            productionStep: step
          });
        }
      }
    });

    // Sort by createdAt ascending (คนที่มาก่อน = เก่าสุด, อยู่บนสุด; คนที่มาทีหลัง = ใหม่สุด, ไล่ลงไปข้างล่าง)
    return list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return (a._id || "").localeCompare(b._id || "");
    });
  }, [customers]);

  const [queueItems, setQueueItems] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [viewingFormula, setViewingFormula] = useState(null);
  const [formulaModalOrder, setFormulaModalOrder] = useState(null);
  const [confirmingProdDone, setConfirmingProdDone] = useState(false);

  // Machines Scheduler State
  // `machines` is a prop fed from /api/machines — the DB is the only source.
  const getAssignedMachineId = (c) => {
    if (!c) return undefined;
    return c.singleOrderedProduct?.scheduleMachineId || c.scheduleMachineId;
  };

  const getUnassignedOrders = () => {
    return queueItems.filter(c => 
      (c.productionStatus === "เลือกเครื่องจักร" || c.productionStatus === "กำลังผลิต") && 
      !getAssignedMachineId(c)
    );
  };
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  // null = the modal is adding a machine; a machine object = editing that machine.
  const [editingMachine, setEditingMachine] = useState(null);

  // Add/Edit Machine form states
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineImage, setNewMachineImage] = useState("");
  const [newMachineAllowed, setNewMachineAllowed] = useState([]);
  const [newMachineDisallowed, setNewMachineDisallowed] = useState([]);
  const [machineDeleteTarget, setMachineDeleteTarget] = useState(null);
  const [deletingMachine, setDeletingMachine] = useState(false);
  const [machineDeleteError, setMachineDeleteError] = useState("");

  // Courier boxes live in the packaging catalog under the "ไปรษณีย์" type; the
  // name check is a fallback for items typed as plain บรรจุภัณฑ์.
  const shippingBoxOptions = React.useMemo(() => (packagingItems || []).filter((i) => {
    const t = (i.type?.name || i.category || "").toLowerCase();
    return t.includes("ไปรษณีย์") || (i.name || "").includes("กล่อง");
  }), [packagingItems]);

  // Inline "add a new courier box" from the ship dialog — mirrors the Sales spec
  // modal's create flow (image + opening stock), and forces the "ไปรษณีย์" type so
  // the new item lands in the right Stock category AND matches this picker's filter.
  const handleCreateShippingBox = async (name, extras) => {
    let image = "";
    if (extras?.file) {
      const fd = new FormData();
      fd.append("file", await compressImage(extras.file));
      // No explicit Content-Type: the browser must set the multipart boundary itself.
      const up = await api.post("/production/upload", fd);
      image = up.data.secure_url || "";
    }
    // Reuse the existing category when there is one, else create it.
    let type = null;
    try {
      const list = (await api.get("/packaging-types")).data || [];
      type = list.find((t) => (t.name || "").trim() === "ไปรษณีย์")?._id
        || (await api.post("/packaging-types", { name: "ไปรษณีย์" })).data?._id
        || null;
    } catch (err) {
      console.error("Failed to resolve packaging type:", err);
    }
    const res = await api.post("/packaging", {
      name,
      customer: "ระบบ",
      image,
      currentQuantity: parseInt(extras?.qty) || 0,
      type
    });
    setPackagingItems((prev) => (prev.some((p) => p._id === res.data._id) ? prev : [...prev, res.data]));
    return res.data;
  };

  const openShipDialog = (order) => {
    setShipTarget(order);
    setShipBoxId("");
    // One box per finished piece is the usual case; the operator can override.
    const p = getProductDetails(order);
    setShipBoxQty(String(parseInt(p?.quantityPcs || p?.quantity) || 1));
    setShipError("");
  };

  const confirmShipToCustomer = async () => {
    if (!shipTarget || !onUpdateCustomerStatus) return;
    const box = shippingBoxOptions.find((i) => String(i._id) === String(shipBoxId));
    const qty = parseInt(shipBoxQty) || 0;
    if (!box) { setShipError("กรุณาเลือกกล่องไปรษณีย์"); return; }
    if (qty <= 0) { setShipError("จำนวนกล่องต้องมากกว่า 0"); return; }
    setShipSubmitting(true);
    setShipError("");
    try {
      await onUpdateCustomerStatus(shipTarget._id, {
        productionStatus: "ส่งให้ลูกค้า",
        shippingBox: { itemId: box._id, qty }
      });
      setShipTarget(null);
    } catch (err) {
      setShipError("ส่งสินค้าไม่สำเร็จ: " + (err.response?.data?.error || err.message));
    } finally {
      setShipSubmitting(false);
    }
  };

  const openAddMachine = () => {
    setEditingMachine(null);
    setNewMachineName("");
    setNewMachineImage("");
    setNewMachineAllowed([]);
    setNewMachineDisallowed([]);
    setIsMachineModalOpen(true);
  };

  // Gear on a machine row → same modal, prefilled, saving through onUpdateMachine.
  const openEditMachine = (m) => {
    setEditingMachine(m);
    setNewMachineName(m?.name || "");
    setNewMachineImage(m?.image || "");
    setNewMachineAllowed(m?.allowedFormulas || []);
    setNewMachineDisallowed(m?.disallowedFormulas || []);
    setIsMachineModalOpen(true);
  };
  const [selectedScheduleOrder, setSelectedScheduleOrder] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ machineId: "", startDate: "", endDate: "", startTime: "09:00", endTime: "18:00" });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Assigning an order to a machine IS the schedule — it persists through
  // onScheduleOrder (PUT /production/orders/:id/schedule), not a local map.
  const handleAssignMachine = (cardId, machineId) => {
    if (!onScheduleOrder) return;
    return onScheduleOrder(cardId, { scheduleMachineId: machineId });
  };

  // One handler for both modes: create a new machine, or save edits to the machine
  // opened from its row gear (editingMachine).
  const handleAddMachine = async () => {
    if (!newMachineName.trim()) return;
    const disallowed = formulas.map(f => f.name).filter(name => !newMachineAllowed.includes(name));
    const payload = {
      name: newMachineName.trim(),
      image: newMachineImage,
      allowedFormulas: newMachineAllowed,
      disallowedFormulas: disallowed,
    };
    try {
      if (editingMachine) {
        if (!onUpdateMachine) return;
        await onUpdateMachine(editingMachine._id || editingMachine.id, payload);
      } else {
        if (!onCreateMachine) return;
        await onCreateMachine({ ...payload, order: machines.length });
      }
    } catch (err) {
      alert(err?.response?.data?.error || err?.response?.data?.message ||
        (editingMachine ? "แก้ไขเครื่องจักรไม่สำเร็จ" : "เพิ่มเครื่องจักรไม่สำเร็จ"));
      return;
    }

    setEditingMachine(null);
    setNewMachineName("");
    setNewMachineImage("");
    setNewMachineAllowed([]);
    setNewMachineDisallowed([]);
    setIsMachineModalOpen(false);
  };

  // Calculate dynamic timeline columns based on selection view and base date
  const timelineColumns = useMemo(() => {
    const base = new Date(timelineBaseDate);
    if (isNaN(base.getTime())) return { labels: DAY_LABELS, dates: [] };

    if (timelineView === "daily") {
      const labels = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
      return { labels, dates: Array(labels.length).fill(base) };
    }

    if (timelineView === "monthly") {
      const month = base.getMonth();
      const year = base.getFullYear();
      const labels = ["สัปดาห์ 1", "สัปดาห์ 2", "สัปดาห์ 3", "สัปดาห์ 4", "สัปดาห์ 5", "สัปดาห์ 6", "สัปดาห์ 7"];
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(year, month, 1 + i * 4);
        dates.push(d);
      }
      return { labels, dates };
    }

    // Weekly view: Monday to Sunday of the week containing timelineBaseDate
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(base.setDate(diff));

    const thDayLabels = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
    const labels = [];
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      labels.push(`${thDayLabels[i]} ${d.getDate()}`);
      dates.push(d);
    }
    return { labels, dates };
  }, [timelineBaseDate, timelineView]);

  // Determine dynamic placement and spanning of a job in the current visible grid
  const getJobPosition = (job) => {
    if (job.startDate) {
      const cleanDate = (date) => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        return d;
      };

      const jobStart = cleanDate(job.startDate);
      const jobEnd = cleanDate(job.endDate || job.startDate);

      if (timelineView === "daily") {
        // Compare on the local calendar day — toISOString() shifts to UTC and in
        // UTC+7 a local-midnight column reported the previous day.
        const viewDate = cleanDate(timelineColumns.dates[0]);
        if (jobStart <= viewDate && jobEnd >= viewDate) {
          const jobStartFull = new Date(job.startDate + "T" + (job.startTime || "00:00"));
          const jobEndFull = new Date((job.endDate || job.startDate) + "T" + (job.endTime || "23:59"));
          const startHour = jobStartFull.getHours();
          const endHour = jobEndFull.getHours();

          const slots = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
          let startSlot = -1;
          let endSlot = -1;

          for (let i = 0; i < slots.length; i++) {
            if (startHour >= slots[i] && (i === slots.length - 1 || startHour < slots[i + 1])) {
              startSlot = i;
            }
            const endSearchHour = endHour - 0.5;
            if (endSearchHour >= slots[i] && (i === slots.length - 1 || endSearchHour < slots[i + 1])) {
              endSlot = i;
            }
          }
          if (startSlot === -1) startSlot = 0;
          if (endSlot === -1) endSlot = slots.length - 1;
          if (endSlot < startSlot) endSlot = startSlot;

          return { day: startSlot, span: endSlot - startSlot + 1 };
        }
        return null;
      }

      let startIdx = -1;
      let endIdx = -1;

      for (let i = 0; i < timelineColumns.dates.length; i++) {
        const colDate = cleanDate(timelineColumns.dates[i]);
        if (jobStart <= colDate && jobEnd >= colDate) {
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
      }

      if (startIdx === -1) return null;
      return { day: startIdx, span: endIdx - startIdx + 1 };
    }

    if ((job.view || "weekly") === timelineView) {
      return { day: job.day ?? 0, span: job.span ?? 1 };
    }
    return null;
  };

  // Order-derived timeline blocks: every order line with a saved weekly schedule
  // becomes a work block on its machine row (day = startDay, span = end-start+1).
  const scheduleBlocks = useMemo(() => {
    return orderedCustomers
      // In-Process QC is outside of machine production and must never occupy a timeline slot.
      .filter((c) => !isIncomingQcOrder(c))
      .map((c) => {
        const p = c.singleOrderedProduct || {};
        const machineId = p.scheduleMachineId || c.scheduleMachineId;
        if (!machineId) return null;

        const startDate = p.scheduleStartDate || c.scheduleStartDate;
        const endDate = p.scheduleEndDate || c.scheduleEndDate || startDate;
        const startTime = p.scheduleStartTime || c.scheduleStartTime || "08:00";
        const endTime = p.scheduleEndTime || c.scheduleEndTime || "20:00";

        const startDay = 0;
        const endDay = 0;

        // format display text
        let timeTextStr = "";
        if (startDate) {
          const sd = new Date(startDate);
          const ed = new Date(endDate);
          const startFmt = `${sd.getDate()}/${sd.getMonth() + 1}`;
          const endFmt = `${ed.getDate()}/${ed.getMonth() + 1}`;
          timeTextStr = startDate === endDate ? `${startFmt} (${startTime})` : `${startFmt}–${endFmt}`;
        } else {
          const labels = slotLabels(timelineView);
          const s = Math.min(6, Math.max(0, startDay ?? 0));
          const e = Math.min(6, Math.max(0, endDay ?? s));
          timeTextStr = s === e ? labels[s] : `${labels[s]}–${labels[e]}`;
        }

        return {
          id: `sched_${c._id}`,
          fromOrder: true,
          orderCard: c,
          machineId,
          view: "weekly",
          startDate,
          endDate,
          startTime,
          endTime,
          day: startDay,
          span: startDay !== null && endDay !== null ? Math.max(1, endDay - startDay + 1) : 1,
          type: "work",
          label: `ผลิต: ${c.name || "ลูกค้า"}`,
          detail: c.singleOrderedProduct?.formulaName || "",
          timeText: timeTextStr,
          hours: 0,
        };
      })
      .filter(Boolean);
  }, [orderedCustomers, timelineView]);

  // An order under QC is locked in place — its block can't be dragged elsewhere.
  const isQcLocked = (c) => /QC|ตรวจ/i.test(c?.computedStatus || c?.productionStatus || "");

  // Real conflict detection: two blocks whose date ranges overlap on the SAME
  // machine. The legend has always advertised "คิวชน" but nothing ever checked it,
  // so two orders could silently occupy one machine on one day.
  const conflictIds = useMemo(() => {
    const clashing = new Set();
    const byMachine = {};
    scheduleBlocks.forEach((b) => {
      if (!b.startDate) return;
      (byMachine[b.machineId] = byMachine[b.machineId] || []).push(b);
    });
    Object.values(byMachine).forEach((list) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const aEnd = a.endDate || a.startDate;
          const bEnd = b.endDate || b.startDate;
          // ISO dates compare lexically
          if (a.startDate <= bEnd && b.startDate <= aEnd) {
            clashing.add(a.id);
            clashing.add(b.id);
          }
        }
      }
    });
    return clashing;
  }, [scheduleBlocks]);

  // ---- Schedule an order directly on the machine timeline (backend-persisted) ----
  const [armedOrder, setArmedOrder] = useState(null);
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  // True while the dragged card came from the "ยังไม่ได้เข้าเครื่อง" tray, which is
  // what makes it snap to the view's first slot on drop.
  const [draggedFromTray, setDraggedFromTray] = useState(false);
  const [dragOverCell, setDragOverCell] = useState(null);
  // Pointer-driven drag for tray chips. HTML5 drag-and-drop proved unreliable here
  // (it silently refuses to start in some setups), so the tray → timeline path uses
  // raw pointer events instead: press a chip, move over a machine row, release.
  const [pointerDrag, setPointerDrag] = useState(null); // { order, x, y, overMachineId }
  const [scheduleError, setScheduleError] = useState("");
  const [highlightedBlockId, setHighlightedBlockId] = useState(null);
  // Id of the block whose right-edge handle is being dragged to stretch its span.
  const [resizingBlockId, setResizingBlockId] = useState(null);

  const openScheduleModal = (order) => {
    const product = order?.singleOrderedProduct || {};
    const assignedMachineId = product.scheduleMachineId || order?.scheduleMachineId || "";
    const startDate = product.scheduleStartDate || order?.scheduleStartDate || timelineBaseDate;
    setScheduleForm({
      machineId: assignedMachineId,
      startDate,
      endDate: product.scheduleEndDate || order?.scheduleEndDate || startDate,
      startTime: product.scheduleStartTime || order?.scheduleStartTime || "09:00",
      endTime: product.scheduleEndTime || order?.scheduleEndTime || "18:00"
    });
    setScheduleError("");
    setSelectedScheduleOrder(order);
  };

  const saveScheduleFromModal = async () => {
    if (!selectedScheduleOrder || !scheduleForm.machineId || !scheduleForm.startDate || !scheduleForm.endDate) {
      setScheduleError("กรุณาเลือกเครื่องจักร วันเริ่ม และวันจบ");
      return;
    }
    if (scheduleForm.endDate < scheduleForm.startDate) {
      setScheduleError("วันจบต้องไม่ก่อนวันเริ่ม");
      return;
    }

    const machine = machines.find((item) => item.id === scheduleForm.machineId);
    if (!machine || !isMachineAllowed(machine, selectedScheduleOrder)) {
      setScheduleError("เครื่องจักรนี้ไม่รองรับสูตรของงานนี้");
      return;
    }

    const queueNo = scheduleBlocks.filter((block) =>
      block.machineId === scheduleForm.machineId
      && block.startDate === scheduleForm.startDate
      && block.orderCard?._id !== selectedScheduleOrder._id
    ).length + 1;

    setSavingSchedule(true);
    try {
      await onScheduleOrder?.(selectedScheduleOrder._id, {
        scheduleMachineId: scheduleForm.machineId,
        scheduleStartDate: scheduleForm.startDate,
        scheduleEndDate: scheduleForm.endDate,
        scheduleStartTime: scheduleForm.startTime,
        scheduleEndTime: scheduleForm.endTime,
        scheduleQueueNo: queueNo
      });
      setSelectedScheduleOrder(null);
    } catch (error) {
      setScheduleError(error.response?.data?.error || error.message || "บันทึกคิวไม่สำเร็จ");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Open the formula-detail modal for a scheduled block: resolve the stable ID
  // first and keep name matching only for legacy orders.
  const openBlockFormula = (order) => {
    const product = order?.singleOrderedProduct || (Array.isArray(order?.orderedProducts) ? order.orderedProducts[0] : null);
    const fname = order?.singleOrderedProduct?.formulaName
      || (Array.isArray(order?.orderedProducts) ? order.orderedProducts[0]?.formulaName : "")
      || "";
    const match = resolveFormula(product) || formulas.find(
      (f) => f.name === fname || cleanFormulaName(f.name) === cleanFormulaName(fname)
    );
    setViewingFormula(match || { name: fname || "ไม่ระบุสูตร", bom: {}, phases: {}, procedures: [], note: [] });
    setFormulaModalOrder(order || null);
  };

  // Open the full formula-detail modal (phase-grouped chemicals + procedures +
  // notes) directly from a formula name — used by the prep-panel button so it
  // shows the rich breakdown instead of the procedures-only mini modal.
  const openFormulaByName = (fname) => {
    const match = formulas.find(
      (f) => f.name === fname || cleanFormulaName(f.name) === cleanFormulaName(fname)
    );
    setViewingFormula(match || { name: fname || "ไม่ระบุสูตร", bom: {}, phases: {}, procedures: [], note: [] });
    setFormulaModalOrder(null);
  };

  const closeFormulaModal = () => {
    setViewingFormula(null);
    setFormulaModalOrder(null);
  };

  // "ยืนยันผลิตเสร็จสิ้น" from the formula modal → move the order into In-Process QC
  // ("รอตรวจ QC รอบที่ 1"): stays in the production line stage's QC bucket AND
  // surfaces in R&D's "Inprocess QC / ส่งสูตรให้ลูกค้าทดลอง" tab for the next step.
  const handleConfirmProductionFromModal = async () => {
    const order = formulaModalOrder;
    if (!order) { closeFormulaModal(); return; }
    setConfirmingProdDone(true);
    try {
      if (onUpdateCustomerStatus) {
        await onUpdateCustomerStatus(order._id, { productionStatus: "รอตรวจ QC รอบที่ 1" });
      }
      closeFormulaModal();
    } catch (error) {
      alert("ยืนยันผลิตเสร็จสิ้นไม่สำเร็จ: " + (error.response?.data?.error || error.message));
    } finally {
      setConfirmingProdDone(false);
    }
  };

  // "YYYY-MM-DD" from the date's LOCAL parts. toISOString() would convert to UTC
  // first, so in UTC+7 a local midnight (e.g. the monthly view's 1 ก.ค. 00:00)
  // reported the previous day — every such placement landed one day early.
  const dateKey = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  };
  // Whether a machine may run the order's formula. Mirrors the timeline gating
  // (lines ~1178): an allow-list (when it's a real subset) is a whitelist, and
  // the disallow-list always blocks. Was allow-list only — disallowed slipped
  // through, so the schedule modal happily queued a forbidden machine.
  const isMachineAllowed = (machine, order) => {
    const formula = order?.singleOrderedProduct?.formulaName || "";
    if (!formula) return true;
    const allowed = machine.allowedFormulas || [];
    const disallowed = machine.disallowedFormulas || [];
    if (allowed.length > 0 && allowed.length < formulas.length && !allowed.includes(formula)) return false;
    if (disallowed.includes(formula)) return false;
    return true;
  };
  // First slot of the current view — where a brand-new job always lands:
  //   รายวัน      → 09:00 of the viewed day (first hour column)
  //   รายสัปดาห์  → วันจันทร์ of the viewed week (first day column)
  //   รายเดือน    → สัปดาห์ที่ 1 of the viewed month (first week column)
  // timelineColumns already builds those columns, so column 0 IS the first slot.
  const firstSlot = () => ({
    date: timelineColumns.dates[0],
    time: timelineView === "daily" ? (timelineColumns.labels[0] || "09:00") : "09:00"
  });

  // `snapToFirst` is passed by the caller, not inferred from the order's data:
  // a job coming from the "ยังไม่ได้เข้าเครื่อง" tray always lands on the view's
  // first slot, while dragging an existing block keeps the cell it was dropped
  // on (that IS the move). Reading it off scheduleStartDate looked equivalent but
  // silently mis-fired whenever the in-memory copy was a step behind the DB.
  const scheduleOrderAtCell = async (order, machine, date, snapToFirst = false) => {
    if (!order || !machine) return;
    if (!isMachineAllowed(machine, order)) {
      setScheduleError(`🚫 เครื่องนี้ผลิต ${order.singleOrderedProduct?.formulaName || "สูตรนี้"} ไม่ได้`);
      return;
    }

    const p = order.singleOrderedProduct || {};
    const origStart = p.scheduleStartDate || order.scheduleStartDate;
    const origEnd = p.scheduleEndDate || order.scheduleEndDate;

    const slot = snapToFirst ? firstSlot() : null;
    const targetDate = slot ? slot.date : date;
    if (!targetDate) return;

    let durationMs = 0;
    if (origStart && origEnd) {
      durationMs = new Date(origEnd).getTime() - new Date(origStart).getTime();
    }

    const startDate = dateKey(targetDate);
    const endDate = dateKey(new Date(new Date(targetDate).getTime() + durationMs));
    
    const nextQueue = scheduleBlocks.filter((block) => block.machineId === machine.id && block.startDate === startDate).length + 1;
    try {
      await onScheduleOrder?.(order._id, {
        scheduleMachineId: machine.id,
        scheduleStartDate: startDate,
        scheduleEndDate: endDate,
        scheduleQueueNo: nextQueue,
        // A new job starts at the view's first slot (09:00 in the daily view);
        // a moved one keeps the times it already had.
        scheduleStartTime: slot ? slot.time : (p.scheduleStartTime || order.scheduleStartTime || "09:00"),
        scheduleEndTime: p.scheduleEndTime || order.scheduleEndTime || "18:00",
      });
      setArmedOrder(null);
      setHighlightedBlockId(`sched_${order._id}`);
      setTimeout(() => setHighlightedBlockId(null), 1500);
    } catch (error) {
      setScheduleError("บันทึกคิวผลิตไม่สำเร็จ: " + (error.response?.data?.error || error.message));
    }
  };

  // Tray chip pointer-drag: follow the cursor, highlight the machine row underneath,
  // and on release drop the job onto that machine (always at the view's first slot).
  useEffect(() => {
    if (!pointerDrag) return;

    // Resolve by rect containment rather than elementFromPoint: hit-testing is
    // defeated by any overlay above the row (and by odd viewport states), while
    // the row's own geometry is always right.
    const machineAt = (x, y) => {
      const rows = document.querySelectorAll("[data-machine-row]");
      for (const row of rows) {
        const r = row.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return row.getAttribute("data-machine-row");
        }
      }
      return null;
    };

    const onMove = (e) => {
      setPointerDrag((d) => d && ({ ...d, x: e.clientX, y: e.clientY, overMachineId: machineAt(e.clientX, e.clientY) }));
    };

    const onUp = (e) => {
      const machineId = machineAt(e.clientX, e.clientY);
      const order = pointerDrag.order;
      setPointerDrag(null);
      if (!machineId || !order) return;
      const machine = machines.find((m) => m.id === machineId);
      // snapToFirst: a job from the tray always lands on the view's first slot.
      if (machine) scheduleOrderAtCell(order, machine, timelineColumns.dates?.[0], true);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pointerDrag, machines, timelineColumns, scheduleBlocks]);

  const updateBlockDuration = async (block, days) => {
    const start = new Date(`${block.startDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);
    await onScheduleOrder?.(block.orderCard._id, {
      scheduleMachineId: block.machineId,
      scheduleStartDate: block.startDate,
      scheduleEndDate: dateKey(end),
      scheduleQueueNo: block.orderCard.singleOrderedProduct?.scheduleQueueNo || block.orderCard.scheduleQueueNo || 1,
    });
  };

  const updateBlockSpan = async (block, targetCellIndex, targetCellDate) => {
    const p = block.orderCard.singleOrderedProduct || {};
    const updates = {
      scheduleMachineId: block.machineId,
      scheduleStartDate: block.startDate,
      scheduleEndDate: block.endDate || block.startDate,
      scheduleStartTime: block.startTime || "09:00",
      scheduleEndTime: block.endTime || "18:00",
      scheduleQueueNo: p.scheduleQueueNo || block.orderCard.scheduleQueueNo || 1
    };

    if (timelineView === "daily") {
      const slots = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const endHour = slots[Math.min(slots.length - 1, Math.max(0, targetCellIndex))] + 1;
      updates.scheduleEndTime = `${String(endHour).padStart(2, "0")}:00`;
    } else {
      if (targetCellDate) {
        updates.scheduleEndDate = dateKey(targetCellDate);
      }
    }

    try {
      await onScheduleOrder?.(block.orderCard._id, updates);
    } catch (error) {
      setScheduleError("อัปเดตระยะเวลาผลิตไม่สำเร็จ: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteMachine = async (id) => {
    if (onDeleteMachine) {
      await onDeleteMachine(id);
    }
    
    // Clear any orders pointing at this machine
    for (const c of orderedCustomers) {
      if (getAssignedMachineId(c) === id && onScheduleOrder) {
        await onScheduleOrder(c._id, { scheduleMachineId: '' });
      }
    }
  };

  const openMachineDeleteConfirm = (machine) => {
    const id = machine?._id || machine?.id;
    if (!id) return;

    const assignedCount = orderedCustomers.filter(
      (customer) => getAssignedMachineId(customer) === id
    ).length;

    setMachineDeleteError("");
    setMachineDeleteTarget({
      id,
      name: machine.name || "-",
      assignedCount,
      queueCount: Math.max(
        Array.isArray(machine.queue) ? machine.queue.length : 0,
        Array.isArray(machineQueues[id]) ? machineQueues[id].length : 0
      ),
    });
  };

  const confirmMachineDelete = async () => {
    if (!machineDeleteTarget || deletingMachine) return;

    setDeletingMachine(true);
    setMachineDeleteError("");
    try {
      await handleDeleteMachine(machineDeleteTarget.id);
      setMachineDeleteTarget(null);
      setEditingMachine(null);
      setIsMachineModalOpen(false);
    } catch (error) {
      setMachineDeleteError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "ลบเครื่องจักรไม่สำเร็จ"
      );
    } finally {
      setDeletingMachine(false);
    }
  };

  // New Machine Lineup states and helpers
  const [machineQueues, setMachineQueues] = useState({});
  const [addingToMachine, setAddingToMachine] = useState(null);

  // Lineup Drag and Drop State
  const [draggedLineupItem, setDraggedLineupItem] = useState(null);
  const [hoveredMachineId, setHoveredMachineId] = useState(null);

  const handleLineupDragStart = (e, machineId, index) => {
    setDraggedLineupItem({ machineId, index });
  };

  const handleLineupDragOver = (e, machineId, index) => {
    e.preventDefault();
    if (!draggedLineupItem) return;
    
    // Case 1: Dragging from unassigned box into a machine queue
    if (draggedLineupItem.machineId === "unassigned" && machineId !== "unassigned") {
      const unassignedOrders = getUnassignedOrders();
      const orderId = unassignedOrders[draggedLineupItem.index]?._id;
      if (!orderId) return;

      // Check formula constraints
      const cust = unassignedOrders[draggedLineupItem.index];
      const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
      const fName = p ? (p.formulaName || p.name) : "สารผสม";
      const mach = machines.find(m => m.id === machineId);
      if (mach) {
        let isForbidden = false;
        if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
          if (!mach.allowedFormulas.includes(fName)) isForbidden = true;
        }
        if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
          isForbidden = true;
        }
        if (isForbidden) return;
      }

      if (cust.productionStatus !== "กำลังผลิต") {
        if (onUpdateCustomerStatus) {
          onUpdateCustomerStatus(orderId, {
            productionStatus: "กำลังผลิต",
            productionStep: 3
          });
        }
      }

      // Insert at hover position
      const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
      if (!queue.includes(orderId)) {
        queue.splice(index, 0, orderId);
      }
      
      const updatedQueues = { ...machineQueues, [machineId]: queue };
      saveMachineQueues(updatedQueues);
      setDraggedLineupItem({ machineId, index });
      return;
    }

    // Case 2: Cross-machine drag and drop (dragging from Machine A to Machine B)
    if (draggedLineupItem.machineId !== machineId && draggedLineupItem.machineId !== "unassigned") {
      const sourceQueue = machineQueues[draggedLineupItem.machineId] || [];
      const orderId = sourceQueue[draggedLineupItem.index];
      if (!orderId) return;

      // Check formula constraints
      const cust = queueItems.find(c => c._id === orderId);
      if (!cust) return;
      const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
      const fName = p ? (p.formulaName || p.name) : "สารผสม";
      const mach = machines.find(m => m.id === machineId);
      if (mach) {
        let isForbidden = false;
        if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
          if (!mach.allowedFormulas.includes(fName)) isForbidden = true;
        }
        if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
          isForbidden = true;
        }
        if (isForbidden) return; // Block drop if formula is not allowed
      }

      // Remove from source queue
      const updatedSourceQueue = sourceQueue.filter(id => id !== orderId);

      // Add to target queue at index
      const targetQueue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
      if (!targetQueue.includes(orderId)) {
        targetQueue.splice(index, 0, orderId);
      }

      const updatedQueues = { 
        ...machineQueues, 
        [draggedLineupItem.machineId]: updatedSourceQueue, 
        [machineId]: targetQueue 
      };
      saveMachineQueues(updatedQueues);
      setDraggedLineupItem({ machineId, index });
      return;
    }

    // Case 3: Standard reordering within same machine
    if (draggedLineupItem.machineId === machineId && draggedLineupItem.index !== index) {
      const queue = [...(machineQueues[machineId] || [])];
      const dragIdx = draggedLineupItem.index;
      const hoverIdx = index;
      
      const draggedId = queue[dragIdx];
      queue.splice(dragIdx, 1);
      queue.splice(hoverIdx, 0, draggedId);
      
      const updated = { ...machineQueues, [machineId]: queue };
      setMachineQueues(updated);
      setDraggedLineupItem({ machineId, index: hoverIdx });
    }
  };

  const handleLineupDropEmpty = (e, machineId) => {
    e.preventDefault();
    if (!draggedLineupItem) return;
    
    const sourceMachineId = draggedLineupItem.machineId;
    const sourceIdx = draggedLineupItem.index;
    
    let orderId = null;
    if (sourceMachineId === "unassigned") {
      const unassignedOrders = getUnassignedOrders();
      orderId = unassignedOrders[sourceIdx]?._id;
    } else {
      const sourceQueue = machineQueues[sourceMachineId] || [];
      orderId = sourceQueue[sourceIdx];
    }
    
    if (!orderId) return;

    // Check formula constraints
    const cust = queueItems.find(c => c._id === orderId);
    if (!cust) return;
    const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
    const fName = p ? (p.formulaName || p.name) : "สารผสม";
    const mach = machines.find(m => m.id === machineId);
    if (mach) {
      let isForbidden = false;
      if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
        if (!mach.allowedFormulas.includes(fName)) isForbidden = true;
      }
      if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
        isForbidden = true;
      }
      if (isForbidden) {
        alert(`⚠️ สูตร ${fName} ไม่อนุญาตให้ผลิตบนเครื่องนี้!`);
        return;
      }
    }

    if (onUpdateCustomerStatus) {
      onUpdateCustomerStatus(orderId, {
        productionStatus: "กำลังผลิต",
        productionStep: 3
      });
    }

    // Update queues
    const updatedQueues = { ...machineQueues };
    
    // Remove from source queue
    if (sourceMachineId !== "unassigned") {
      updatedQueues[sourceMachineId] = (updatedQueues[sourceMachineId] || []).filter(id => id !== orderId);
    }
    
    // Add to target queue (append to the end of the lineup)
    const targetQueue = updatedQueues[machineId] ? [...updatedQueues[machineId]] : [];
    if (!targetQueue.includes(orderId)) {
      targetQueue.push(orderId);
    }
    updatedQueues[machineId] = targetQueue;
    
    saveMachineQueues(updatedQueues);
    setDraggedLineupItem(null);
  };

  const handleLineupDragEnd = () => {
    if (draggedLineupItem) {
    }
    setDraggedLineupItem(null);
    setHoveredMachineId(null);
  };

  // Derive machineQueues from persisted schedules
  useEffect(() => {
    const updatedQueues = {};
    machines.forEach(m => {
      if (!updatedQueues[m.id]) {
        updatedQueues[m.id] = [];
      }
      
      const assigned = queueItems
        .filter(c => getAssignedMachineId(c) === m.id)
        .map(c => c._id);
        
      updatedQueues[m.id] = assigned;
    });

    setMachineQueues(updatedQueues);
  }, [machines, queueItems]);

  const saveMachineQueues = (updated) => {
    setMachineQueues(updated);
  };

  const moveQueueItem = (machineId, index, direction) => {
    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
    if (queue.length === 0) return;
    
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= queue.length) return;
    
    const temp = queue[index];
    queue[index] = queue[targetIdx];
    queue[targetIdx] = temp;
    
    const updated = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updated);
  };

  const addToMachineQueue = (machineId, orderId) => {
    if (onUpdateCustomerStatus) {
      onUpdateCustomerStatus(orderId, {
        productionStatus: "กำลังผลิต",
        productionStep: 3
      });
    }

    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
    if (!queue.includes(orderId)) {
      queue.push(orderId);
    }
    
    const updatedQueues = { ...machineQueues };
    Object.keys(updatedQueues).forEach(mId => {
      if (mId === machineId) {
        updatedQueues[mId] = queue;
      } else {
        updatedQueues[mId] = (updatedQueues[mId] || []).filter(id => id !== orderId);
      }
    });
    
    saveMachineQueues(updatedQueues);
    setAddingToMachine(null);
  };

  const removeFromMachineQueue = (machineId, orderId) => {
    if (onScheduleOrder) onScheduleOrder(orderId, { scheduleMachineId: "" });

    const queue = (machineQueues[machineId] || []).filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updatedQueues);
  };

  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอบรรจุ",
        productionStep: 3
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };

  const handleDropToUnassigned = async (e) => {
    e.preventDefault();
    if (!draggedLineupItem || draggedLineupItem.machineId === "unassigned") return;

    const sourceMachineId = draggedLineupItem.machineId;
    const sourceIdx = draggedLineupItem.index;
    const sourceQueue = machineQueues[sourceMachineId] || [];
    const orderId = sourceQueue[sourceIdx];

    if (!orderId) return;

    // 2. Remove from machine queue
    const queue = sourceQueue.filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [sourceMachineId]: queue };
    saveMachineQueues(updatedQueues);

    // 3. Update database status back to "เลือกเครื่องจักร"
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "เลือกเครื่องจักร",
        productionStep: 3
      });
    }

    setDraggedLineupItem(null);
  };
  

  // Initialize queue items from active customers
  useEffect(() => {
    const activeCustomers = orderedCustomers.filter(c => 
      c.productionStatus === "กำลังผลิต" || 
      c.productionStatus === "รอยืนยัน" || 
      c.productionStatus === "เลือกเครื่องจักร" || 
      c.productionStatus === "รอบรรจุ" ||
      c.productionStatus === "รอตรวจ QC รอบที่ 1" ||
      c.productionStatus === "รอตรวจ QC รอบที่ 2"
    );
    
    setQueueItems([...activeCustomers].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB || (a._id || "").localeCompare(b._id || "");
    }));
  }, [orderedCustomers]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...queueItems];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setQueueItems(items);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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

  // Compute calculated values for items
  const customersWithPrecomputes = useMemo(() => {
    return orderedCustomers.map(cust => {
      const isBomConfirmed = cust.productionStatus !== "ยังไม่ผลิต" || (cust.productionStep && cust.productionStep > 1);
      const isPackagingReady = checkPackagingReady(cust, packagingItems);
      const isLabelReady = checkLabelReady(cust, packagingItems);
      const isPackReady = isPackagingReady && isLabelReady;
      
      let computedStatus = "ยังไม่พร้อม";
      const step = cust.productionStep || 1;
      
      if (cust.productionStatus === "สำเร็จเสร็จสิ้น") {
        computedStatus = "สำเร็จเสร็จสิ้น";
      } else if (step === 1) {
        computedStatus = (isBomConfirmed && isPackReady) ? "รอยืนยัน" : "ยังไม่พร้อม";
      } else {
        computedStatus = cust.productionStatus;
      }

      return {
        ...cust,
        isBomConfirmed,
        isPackagingReady,
        isLabelReady,
        isPackReady,
        computedStatus
      };
    });
  }, [orderedCustomers, packagingItems]);

  const activeTableCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => c.productionStatus !== "สำเร็จเสร็จสิ้น");
  }, [customersWithPrecomputes]);

  const completedCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => c.productionStatus === "สำเร็จเสร็จสิ้น");
  }, [customersWithPrecomputes]);

  // Finished Goods Dock filter (contains "รอบรรจุ", Step 5 QC 2, and completed Step 6)
  const finishedGoodsCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => 
      c.productionStatus === "รอบรรจุ" ||
      c.productionStatus === "รอตรวจ QC รอบที่ 2" ||
      c.productionStatus === "สำเร็จเสร็จสิ้น"
    );
  }, [customersWithPrecomputes]);

  // Statistics widgets counts
  const stats = useMemo(() => {
    const total = customersWithPrecomputes.length;
    const notReady = customersWithPrecomputes.filter(c => c.computedStatus === "ยังไม่พร้อม").length;
    const pendingConf = customersWithPrecomputes.filter(c => c.computedStatus === "รอยืนยัน").length;
    const activeProduction = customersWithPrecomputes.filter(c => 
      c.computedStatus === "รอตรวจ QC รอบที่ 1" || 
      c.computedStatus === "กำลังผลิต (บรรจุ)" || 
      c.computedStatus === "กำลังผลิต" || 
      c.computedStatus === "กำลังผลิต (ติดฉลาก)" || c.computedStatus === "รอตรวจ QC รอบที่ 2"
    ).length;
    const completed = customersWithPrecomputes.filter(c => c.computedStatus === "สำเร็จเสร็จสิ้น").length;

    return { total, notReady, pendingConf, activeProduction, completed };
  }, [customersWithPrecomputes]);

  // Step counts for Chart
  const stepCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0]; // steps 1 to 6
    customersWithPrecomputes.forEach(c => {
      const step = c.productionStep || 1;
      if (step >= 1 && step <= 6) {
        counts[step - 1]++;
      }
    });
    return counts;
  }, [customersWithPrecomputes]);

  // Filter & Sort Logic
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customersWithPrecomputes];

    // Table tab filter (active vs completed)
    if (tableTab === "active") {
      result = result.filter(c => c.productionStatus !== "สำเร็จเสร็จสิ้น");
    } else {
      result = result.filter(c => c.productionStatus === "สำเร็จเสร็จสิ้น");
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.email?.toLowerCase().includes(q)
      );
    }

    // Status filter dropdown
    if (statusFilter !== "all") {
      result = result.filter(c => {
        if (statusFilter === "not-ready") return c.computedStatus === "ยังไม่พร้อม";
        if (statusFilter === "pending-conf") return c.computedStatus === "รอยืนยัน";
        if (statusFilter === "qc1") return c.computedStatus === "รอตรวจ QC รอบที่ 1";
        if (statusFilter === "ready-mach") return c.computedStatus === "เลือกเครื่องจักร";
        if (statusFilter === "ready-pack") return c.computedStatus === "รอบรรจุ";
        if (statusFilter === "producing") return c.computedStatus === "กำลังผลิต (บรรจุ)" || c.computedStatus === "กำลังผลิต (ติดฉลาก)" || c.computedStatus === "กำลังผลิต";
        if (statusFilter === "qc2") return c.computedStatus === "รอตรวจ QC รอบที่ 2";
        if (statusFilter === "pending-cust") return c.computedStatus === "รอลูกค้ายืนยัน";
        if (statusFilter === "cust-confirmed") return c.computedStatus === "ลูกค้ายืนยันแล้ว";
        if (statusFilter === "completed") return c.computedStatus === "สำเร็จเสร็จสิ้น";
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name, "th");
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name, "th");
      }
      if (sortBy === "step-asc") {
        return (a.productionStep || 1) - (b.productionStep || 1);
      }
      if (sortBy === "step-desc") {
        return (b.productionStep || 1) - (a.productionStep || 1);
      }
      return 0;
    });

    return result;
  }, [customersWithPrecomputes, searchQuery, statusFilter, sortBy, tableTab]);

  // Dynamic status badge rendering
  const renderStatusBadge = (cust) => {
    const status = cust.computedStatus;

    if (status === "สำเร็จเสร็จสิ้น") {
      return (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[14px] font-bold">
          ✓ จัดส่งเสร็จสมบูรณ์
        </span>
      );
    }
    if (status === "รอยืนยัน") {
      return (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[14px] font-bold">
          รอยืนยัน
        </span>
      );
    }
    if (status === "ยังไม่พร้อม") {
      return (
        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[14px] font-bold">
          ยังไม่พร้อม
        </span>
      );
    }
    if (status === "รอตรวจ QC รอบที่ 1") {
      return (
        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[14px] font-bold animate-pulse">
          รอตรวจ QC รอบที่ 1
        </span>
      );
    }
    if (status === "กำลังผลิต" || status === "กำลังผลิต (บรรจุ)" || status === "กำลังผลิต (ติดฉลาก)") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[14px] font-bold">
          กำลังผลิต
        </span>
      );
    }
    if (status === "เลือกเครื่องจักร") {
      return (
        <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[14px] font-bold">
          เลือกเครื่องจักร
        </span>
      );
    }
    if (status === "รอบรรจุ") {
      return (
        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[14px] font-bold">
          รอบรรจุ
        </span>
      );
    }
    if (status === "รอตรวจ QC รอบที่ 2") {
      return (
        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[14px] font-bold animate-pulse">
          รอตรวจ QC รอบที่ 2
        </span>
      );
    }
    if (status === "รอลูกค้ายืนยัน") {
      return (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-250 rounded-lg text-[14px] font-bold animate-pulse">
          รอลูกค้ายืนยัน
        </span>
      );
    }
    if (status === "ลูกค้ายืนยันแล้ว") {
      return (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded-lg text-[14px] font-bold">
          ลูกค้ายืนยันแล้ว
        </span>
      );
    }
    if (status === "กำลังผลิต (บรรจุ)") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[14px] font-bold">
          กำลังบรรจุภัณฑ์
        </span>
      );
    }
    if (status === "กำลังผลิต (ติดฉลาก)" || status === "กำลังผลิต") {
      return (
        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-[14px] font-bold">
          กำลังติดสติกเกอร์ & ห่อหุ้ม
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[14px] font-bold">
        {status}
      </span>
    );
  };

  const chartMax = Math.max(...stepCounts, 1);

  const PROD_TABS = [
    { id: "received", label: "ใบสั่งผลิตเตรียมพัสดุ",                 icon: ClipboardList },
    { id: "line",     label: "สายการผลิต",                          icon: Factory },
    { id: "pack",     label: "บรรจุ / ติดสติ๊กเกอร์ / ยิง LOT / ซีลขวด", icon: Boxes },
    { id: "finish",   label: "ผลิตสินค้าสำเร็จ / Final QC / รอส่งลูกค้า", icon: CheckCircle2 },
  ];
  // Map an order to one of the 4 workflow stages by its production status (user-confirmed mapping).
  const prodStageOf = (c) => {
    const st = c?.productionStatus || "";
    if (st === "สำเร็จเสร็จสิ้น" || st === "รอตรวจ QC รอบที่ 2" || st === "ส่งให้ลูกค้า" || st === "ส่งเก็บเข้าคลัง") return "finish";
    if (st === "รอบรรจุ") return "pack";
    if (st === "เลือกเครื่องจักร" || st === "กำลังผลิต" || st === "รอตรวจ QC รอบที่ 1") return "line";
    return "received"; // ยังไม่ผลิต / ยังไม่พร้อม / รอยืนยัน / default
  };
  const stageOrders = customersWithPrecomputes.filter((c) => prodStageOf(c) === stageTab);

  const renderPackCard = (c, nextStep, btnText) => {
    const p = Array.isArray(c.orderedProducts) ? c.orderedProducts[0] : c.orderedProducts;
    const formulaName = p?.formulaName || p?.productName || p?.name || "ยังไม่มีสูตร";
    const quantityPcs = (p?.quantityPcs || p?.quantity || 0).toLocaleString();
    const bottleSize = p?.bottleSize ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.bottleSize) ? p.bottleSize : `${p.bottleSize} ml`) : "-";
    const fillVolume = p?.fillVolume ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.fillVolume) ? p.fillVolume : `${p.fillVolume} ml`) : "-";

    const packInfo = getPackagingStockInfo(c, packagingItems);
    const bottleImg = packInfo.bottle.image ? getFileUrl(packInfo.bottle.image) : null;
    const pumpImg = packInfo.pump.image ? getFileUrl(packInfo.pump.image) : null;

    const currentSubStep = c.packagingSubStep || "filling";

    const handleAdvance = async (e) => {
      e.stopPropagation();
      try {
        let payload = {};
        if (nextStep === "complete") {
          // Sealing done → hand off to the finish tab in Final-QC-pending state,
          // NOT straight to done. Operator confirms Final QC there → สำเร็จเสร็จสิ้น.
          payload = {
            productionStatus: "รอตรวจ QC รอบที่ 2",
            productionStep: 5
          };
        } else {
          payload = {
            packagingSubStep: nextStep
          };
        }
        if (onUpdateCustomerStatus) {
          await onUpdateCustomerStatus(c._id, payload);
        }
      } catch (error) {
        console.error("Error advancing packaging step:", error);
      }
    };

    const handleGoBackToQC = async (e) => {
      e.stopPropagation();
      try {
        const payload = {
          productionStatus: "รอตรวจ QC รอบที่ 1",
          productionStep: 2
        };
        if (onUpdateCustomerStatus) {
          await onUpdateCustomerStatus(c._id, payload);
        }
      } catch (error) {
        console.error("Error returning to QC:", error);
      }
    };

    const isFilling = currentSubStep === "filling";
    const isLabeling = currentSubStep === "labeling";
    const isLot = currentSubStep === "lot";
    const isSealing = currentSubStep === "sealing";

    return (
      <div
        key={c._id}
        className="rounded-xl border border-slate-200 bg-white hover:shadow-3xs transition-all p-4 flex flex-col gap-2.5 text-left select-none relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
            <div className="text-xs font-black text-slate-800 truncate mt-0.5">{c.name || "ไม่ระบุชื่อ"}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="shrink-0 text-[13px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
              {c.brand || "ไม่มีแบรนด์"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openStatusModal(c);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
              title="ตั้งค่า/อัปเดตสถานะ"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-100 my-0.5" />

        {isFilling ? (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="col-span-2">
                <span className="text-[13px] text-slate-400 font-bold uppercase block">🧪 สูตรการผลิต</span>
                <span className="font-extrabold text-slate-700 block truncate">🧪 {formulaName}</span>
              </div>

              {/* Bottle Section */}
              <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center">
                <div
                  onClick={(e) => {
                    e.stopPropagation(); // the card itself opens the status modal
                    if (bottleImg) setViewImageModal({ open: true, url: bottleImg, title: `ขวดบรรจุภัณฑ์: ${packInfo.bottle.name}` });
                  }}
                  className={`h-10 w-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${bottleImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                >
                  {bottleImg ? (
                    <>
                      <img src={bottleImg} alt="ขวด" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Search className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </>
                  ) : (
                    <Package className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">ขวดบรรจุภัณฑ์</span>
                  <span className="font-black text-slate-700 block truncate text-[14px]" title={packInfo.bottle.name}>{packInfo.bottle.name}</span>
                </div>
              </div>

              {/* Cap / Pump Section */}
              <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pumpImg) setViewImageModal({ open: true, url: pumpImg, title: `ฝา / หัวฉีด: ${packInfo.pump.name}` });
                  }}
                  className={`h-10 w-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${pumpImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                >
                  {pumpImg ? (
                    <>
                      <img src={pumpImg} alt="ฝา" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Search className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </>
                  ) : (
                    <Boxes className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">ฝา / หัวฉีด</span>
                  <span className="font-black text-slate-700 block truncate text-[14px]" title={packInfo.pump.name}>{packInfo.pump.name}</span>
                </div>
              </div>

              {/* 3-segment Specification Row */}
              <div className="col-span-2 grid grid-cols-3 gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-center">
                <div className="border-r border-slate-200 last:border-none">
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">🧴 ขนาดขวด</span>
                  <span className="font-extrabold text-slate-800 text-[14px] mt-0.5 block">{bottleSize}</span>
                </div>
                <div className="border-r border-slate-200 last:border-none">
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">💧 ปริมาตรบรรจุจริง</span>
                  <span className="font-extrabold text-slate-800 text-[14px] mt-0.5 block">{fillVolume}</span>
                </div>
                <div>
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">📊 จำนวนทั้งหมด</span>
                  <span className="font-extrabold text-slate-800 text-[14px] mt-0.5 block font-mono">{quantityPcs} ชิ้น</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGoBackToQC}
                className="flex-1 py-1.5 text-[13px] font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ย้อนกลับไป In-Process QC ↩</span>
              </button>
              <button
                type="button"
                onClick={handleAdvance}
                className="flex-1 py-1.5 text-[13px] font-black bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>{btnText}</span>
              </button>
            </div>
          </div>
        ) : isLabeling ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="col-span-2">
                <span className="text-[13px] text-slate-400 font-bold uppercase block">🧪 สูตรการผลิต</span>
                <span className="font-extrabold text-slate-700 block truncate">🧪 {formulaName}</span>
              </div>

              {/* Left Column: Sticker Design / Specs */}
              {(() => {
                const labelInfo = getLabelStockInfo(c, packagingItems);
                const labelImg = labelInfo.image ? getFileUrl(labelInfo.image) : null;
                return (
                  <>
                    <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (labelImg) setViewImageModal({ open: true, url: labelImg, title: `แบบสติ๊กเกอร์: ${labelInfo.name}` });
                        }}
                        className={`h-10 w-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${labelImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                      >
                        {labelImg ? (
                          <>
                            <img src={labelImg} alt="ฉลาก" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Search className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </>
                        ) : (
                          <Tag className="h-5 w-5 text-slate-350" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] text-slate-400 font-bold uppercase block">แบบสติ๊กเกอร์</span>
                        <span className="font-black text-slate-700 block truncate text-[14px]" title={labelInfo.name}>{labelInfo.name}</span>
                      </div>
                    </div>

                    {/* Specs (Size, Buyer) */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col justify-center gap-1">
                      <div>
                        <span className="text-[13px] text-slate-400 font-bold uppercase block">📏 ขนาดกว้าง x ยาว</span>
                        <span className="font-extrabold text-slate-700 text-[14px]">
                          {p?.stickerWidth || "-"} x {p?.stickerHeight || "-"} ซม.
                        </span>
                      </div>
                      <div>
                        <span className="text-[13px] text-slate-400 font-bold uppercase block">👤 ผู้สั่งพิมพ์</span>
                        <span className="font-bold text-slate-700 text-[14px] truncate block">{p?.stickerOrderer || "-"}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Sticker Upload Verification */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-[14px]">
              <span className="text-[13px] text-slate-400 font-bold uppercase block">📸 อัปโหลดรูปภาพหลักฐานงานติดสติกเกอร์</span>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs">
                  {c.qcStickerPhoto ? (
                    <img src={getFileUrl(c.qcStickerPhoto)} alt="รูปติดสติ๊กเกอร์" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-slate-350" />
                  )}
                </div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-2 text-[13px] font-black bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs active:scale-95 text-center"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                  <span>{c.qcStickerPhoto ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปหลักฐาน"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      e.stopPropagation();
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImageToBase64(file);
                          if (onUpdateCustomerStatus) {
                            await onUpdateCustomerStatus(c._id, { qcStickerPhoto: base64 });
                          }
                        } catch (err) {
                          console.error("Failed to upload sticker photo:", err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <AsyncButton
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onUpdateCustomerStatus) {
                    await onUpdateCustomerStatus(c._id, { packagingSubStep: "filling" });
                  }
                }}
                className="flex-1 py-1.5 text-[13px] font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ย้อนกลับไปบรรจุ ↩</span>
              </AsyncButton>
              <button
                type="button"
                onClick={handleAdvance}
                className="flex-1 py-1.5 text-[13px] font-black bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>{btnText}</span>
              </button>
            </div>
          </div>
        ) : isLot ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="col-span-2">
                <span className="text-[13px] text-slate-400 font-bold uppercase block">🧪 สูตรการผลิต</span>
                <span className="font-extrabold text-slate-700 block truncate">🧪 {formulaName}</span>
              </div>

              {/* Left Column: Lot Details */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center gap-1.5">
                <div>
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">🔢 เลขล็อตสินค้า</span>
                  <span className="font-mono font-black text-slate-700 text-[15px]">
                    {/* lotStampNo is a per-product field (set by BOM confirm on
                        orderedProducts[idx]); reading it off the order document
                        was always empty, so an auto lot showed "ยังไม่ได้กำหนด". */}
                    {p?.lotStampNo || c.lotStampNo || "ยังไม่ได้กำหนดเลขล็อต"}
                  </span>
                </div>
              </div>

              {/* Right Column: Lot Position */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center gap-1.5">
                <div>
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">📍 ตำแหน่งจริงล็อต</span>
                  {/* Same per-product vs order-level mismatch: the sales spec stores
                      the stamp position on the product line as printLocation. */}
                  <span className="font-bold text-slate-750 text-[14px] block truncate" title={p?.printLocation || c.lotPosition || "ก้นขวดด้านล่าง"}>
                    📌 {p?.printLocation || c.lotPosition || "ก้นขวดด้านล่าง"}
                  </span>
                </div>
              </div>
            </div>

            {/* Lot Upload Verification */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-[14px]">
              <span className="text-[13px] text-slate-400 font-bold uppercase block">📸 อัปโหลดรูปภาพตำแหน่งที่พิมพ์ล็อต (พิมพ์จริง)</span>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs">
                  {c.qcLotPhoto ? (
                    <img src={getFileUrl(c.qcLotPhoto)} alt="รูปตำแหน่งยิงล็อต" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-slate-350" />
                  )}
                </div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-2 text-[13px] font-black bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs active:scale-95 text-center"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                  <span>{c.qcLotPhoto ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปหลักฐาน"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      e.stopPropagation();
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImageToBase64(file);
                          if (onUpdateCustomerStatus) {
                            await onUpdateCustomerStatus(c._id, { qcLotPhoto: base64 });
                          }
                        } catch (err) {
                          console.error("Failed to upload lot photo:", err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <AsyncButton
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onUpdateCustomerStatus) {
                    await onUpdateCustomerStatus(c._id, { packagingSubStep: "labeling" });
                  }
                }}
                className="flex-1 py-1.5 text-[13px] font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ย้อนกลับไปสติกเกอร์ ↩</span>
              </AsyncButton>
              <button
                type="button"
                onClick={handleAdvance}
                className="flex-1 py-1.5 text-[13px] font-black bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ยิง LOT สำเร็จ ➔</span>
              </button>
            </div>
          </div>
        ) : isSealing ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="col-span-2">
                <span className="text-[13px] text-slate-400 font-bold uppercase block">🧪 สูตรการผลิต</span>
                <span className="font-extrabold text-slate-700 block truncate">🧪 {formulaName}</span>
              </div>

              {/* Left Column: Sealing Quantity */}
              <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[13px] text-slate-400 font-bold uppercase block">📊 จำนวนขวดที่ซีล</span>
                  <span className="font-mono font-black text-slate-800 text-[15px] block mt-0.5">
                    {quantityPcs} ชิ้น
                  </span>
                </div>
              </div>
            </div>

            {/* Sealing Upload Verification */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-[14px]">
              <span className="text-[13px] text-slate-400 font-bold uppercase block">📸 อัปโหลดรูปภาพขวดที่ซีลสำเร็จ</span>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs">
                  {c.qcSealingPhoto ? (
                    <img src={getFileUrl(c.qcSealingPhoto)} alt="รูปขวดที่ซีลแล้ว" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-slate-350" />
                  )}
                </div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-2 text-[13px] font-black bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs active:scale-95 text-center"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                  <span>{c.qcSealingPhoto ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพหลักฐาน"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      e.stopPropagation();
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImageToBase64(file);
                          if (onUpdateCustomerStatus) {
                            await onUpdateCustomerStatus(c._id, { qcSealingPhoto: base64 });
                          }
                        } catch (err) {
                          console.error("Failed to upload sealing photo:", err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <AsyncButton
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onUpdateCustomerStatus) {
                    await onUpdateCustomerStatus(c._id, { packagingSubStep: "lot" });
                  }
                }}
                className="flex-1 py-1.5 text-[13px] font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ย้อนกลับไปยิง lot ↩</span>
              </AsyncButton>
              <button
                type="button"
                onClick={handleAdvance}
                className="flex-1 py-1.5 text-[13px] font-black bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center gap-1 shadow-3xs active:scale-95"
              >
                <span>ซีลขวด สำเร็จ ➔</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-end gap-3">
            <div className="min-w-0">
              <span className="text-[13px] text-slate-400 font-bold uppercase block">สูตร / ขนาด</span>
              <span className="text-[14px] font-extrabold text-slate-700 truncate block">🧪 {formulaName}</span>
              <span className="text-[14px] text-slate-500 font-medium block mt-0.5">
                ขนาด: <span className="font-mono text-slate-800 font-bold">{bottleSize}</span> · จำนวน: <span className="font-mono text-slate-800 font-extrabold">{quantityPcs} ชิ้น</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleAdvance}
              className="px-2.5 py-1.5 text-[13px] font-black bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 border-none shadow-3xs cursor-pointer active:scale-95 shrink-0"
            >
              <span>{btnText}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none text-left w-full">
      
      <HeroBanner
        title="Production"
        subtitle="ระบบควบคุมสถานะลำดับคิว ใบสั่งผลิต กระบวนการบรรจุขวด และการติดสติกเกอร์ในไลน์ผลิต"
        onImport={() => window.open("/admin/production/kanban", "_blank")}
        importLabel="Kanban Board ↗"
      />

      {/* Widget bar — 4 production stages (R&D card style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {PROD_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = stageTab === t.id;
          const count = customersWithPrecomputes.filter((c) => prodStageOf(c) === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setStageTab(t.id)}
              className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isActive ? "text-green-600 scale-110" : "text-slate-400"}`} />
                <span className={`text-[15px] md:text-xs tracking-tight text-left ${isActive ? "font-black" : "font-bold text-slate-600"}`}>
                  {t.label}
                </span>
              </div>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
                isActive ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage order cards — click opens the existing status/detail wizard */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        {stageTab === "received" ? (
          <div className="flex flex-col gap-5 text-left w-full">
            {/* Search bar inside the Data Table of Order Stages */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อลูกค้า หรือแบรนด์..."
                value={receivedSearch}
                onChange={(e) => setReceivedSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 transition-colors font-bold"
              />
            </div>

            {/* Grid Layout: Left (One-by-One Cards) vs Right (Details Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customer Cards */}
              <div className="lg:col-span-5 flex flex-col gap-3 min-h-[300px]">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">ใบสั่งผลิตเตรียมพัสดุ</h4>
                  <span className="text-[14px] text-slate-400 font-bold">จำนวน: {stageOrders.length} รายการ</span>
                </div>

                {stageOrders.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/20">
                    <Inbox className="h-8 w-8 text-slate-300 mb-1" />
                    <p className="text-[14px] text-slate-500 font-bold">ไม่มีใบสั่งผลิตที่ต้องเตรียมพัสดุ</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stageOrders
                      .filter((c) => {
                        const term = receivedSearch.toLowerCase();
                        return (
                          (c.name || "").toLowerCase().includes(term) ||
                          (c.brand || "").toLowerCase().includes(term)
                        );
                      })
                      .map((c) => {
                        const isSelected = selectedReceivedOrderId === c._id;
                        const p = Array.isArray(c.orderedProducts) ? c.orderedProducts[0] : c.orderedProducts;
                        const formulaName = p?.formulaName || p?.productName || p?.name || "ยังไม่มีสูตร";
                        const bottleSize = p?.bottleSize ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.bottleSize) ? p.bottleSize : `${p.bottleSize} ml`) : "-";
                        const fillVolume = p?.fillVolume ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.fillVolume) ? p.fillVolume : `${p.fillVolume} ml`) : "-";
                        const quantityPcs = (p?.quantityPcs || p?.quantity || 0).toLocaleString();
                        
                        return (
                          <div
                            key={c._id}
                            onClick={() => handleSelectReceivedOrder(c._id)}
                            className={`rounded-2xl border transition-all p-5 flex flex-col gap-3 cursor-pointer text-left select-none active:scale-[0.99] ${
                              isSelected
                                ? "bg-green-50/10 border-2 border-green-600 shadow-sm scale-[1.01]"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                                <div className="text-sm font-black text-slate-800 truncate mt-0.5">{c.name || "ไม่ระบุชื่อ"}</div>
                              </div>
                              <span className="shrink-0 text-[14px] font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-150">
                                {c.computedStatus || c.productionStatus || "รอยืนยัน"}
                              </span>
                            </div>

                            <div className="border-t border-dashed border-slate-100 my-0.5" />

                            <div className="flex flex-col">
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สูตรผลิต / แบรนด์: <span className="text-slate-700 font-extrabold">{c.brand || "-"}</span></span>
                              <div className="flex justify-between items-center gap-4 mt-0.5">
                                <div className="text-xs font-extrabold text-slate-700 truncate">
                                  🧪 {formulaName}
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-1.5 text-[14px] font-bold text-slate-500 flex-wrap justify-end">
                                  <span>ขนาดขวด <span className="text-slate-800 font-mono">{bottleSize}</span></span>
                                  <span className="text-slate-300">·</span>
                                  <span>ใส่จริง <span className="text-slate-800 font-mono">{fillVolume}</span></span>
                                  <span className="text-slate-300">·</span>
                                  <span>จำนวน <span className="text-slate-800 font-mono">{quantityPcs} ชิ้น</span></span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Right Column: Details & Checklist */}
              <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-slate-50/50 p-6 flex flex-col gap-5 min-h-[450px]">
                {(() => {
                  const selectedOrder = stageOrders.find((c) => c._id === selectedReceivedOrderId);
                  if (!selectedOrder) {
                    return (
                      <div className="flex flex-col items-center justify-center text-center py-24 my-auto text-slate-400">
                        <ClipboardList className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-xs font-black">กรุณาเลือกใบสั่งผลิตฝั่งซ้ายเพื่อตรวจสอบพัสดุ</p>
                      </div>
                    );
                  }
                  const p = Array.isArray(selectedOrder.orderedProducts) ? selectedOrder.orderedProducts[0] : selectedOrder.orderedProducts;
                  const formulaName = p?.formulaName || p?.productName || p?.name || "ยังไม่มีสูตร";

                  return (
                    <div className="flex flex-col h-full justify-between gap-6 text-left">
                      <div className="space-y-5">
                        {/* Title Header */}
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            📋 ใบงานจัดเตรียมผลิตและบรรจุภัณฑ์
                          </h4>
                          <span className="text-[14px] text-slate-400 font-mono font-bold">
                            #{selectedOrder._id?.slice(-8).toUpperCase() || "N/A"}
                          </span>
                        </div>

                        {/* Customer Order Info */}
                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{selectedOrder.name || "ไม่ระบุชื่อ"}</p>
                          </div>
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedOrder.brand || "-"}</p>
                          </div>
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สูตรผลิต</span>
                            <p className="text-xs font-extrabold text-green-700 mt-0.5">🧪 {formulaName}</p>
                          </div>
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">สถานะผลิต</span>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{selectedOrder.computedStatus || selectedOrder.productionStatus || "รอยืนยัน"}</p>
                          </div>
                        </div>

                        {/* Customer's finished-product photo (uploaded in Sales spec) */}
                        {(() => {
                          const prodImg = getProductDetails(selectedOrder)?.productImageUrl;
                          if (!prodImg) return null;
                          const url = getFileUrl(prodImg);
                          return (
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                              <img
                                src={url}
                                alt="product"
                                className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-zoom-in"
                                onClick={() => setViewImageModal({ open: true, url, title: "รูปภาพสินค้า" })}
                              />
                              <span className="text-[14px] text-slate-500 font-bold">รูปภาพสินค้าจากลูกค้า</span>
                            </div>
                          );
                        })()}

                        {/* Simplified Packaging & Formula Details Card */}
                        {(() => {
                          const packInfo = getPackagingStockInfo(selectedOrder, packagingItems);
                          const labelInfo = getLabelStockInfo(selectedOrder, packagingItems);
                          const ingInfo = getIngredientsStockInfo(selectedOrder, formulas, ingredients);
                          
                          const bottleImg = packInfo.bottle.image ? getFileUrl(packInfo.bottle.image) : null;
                          const pumpImg = packInfo.pump.image ? getFileUrl(packInfo.pump.image) : null;
                          const labelImg = labelInfo.image ? getFileUrl(labelInfo.image) : null;

                          return (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 text-left">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h5 className="text-[15px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📦 พัสดุและสูตรผลิตสำหรับจัดเตรียม</span>
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => openProductionSpecDoc({
                                    item: getProductDetails(selectedOrder) || {},
                                    customer: selectedOrder,
                                    packagings: packagingItems,
                                    formulas
                                  })}
                                  className="px-3 py-1.5 text-[14px] font-black bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>พิมพ์ใบงาน (Print)</span>
                                </button>
                              </div>

                              <div className="flex flex-col gap-4">
                                {/* บรรจุภัณฑ์หลัก */}
                                <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 gap-4 shadow-3xs hover:border-slate-300 transition-colors">
                                  <div className="min-w-0 text-left">
                                    <span className="text-[13px] text-slate-400 font-extrabold uppercase block">ขวด / บรรจุภัณฑ์หลัก</span>
                                    <span className="text-xs font-black text-slate-700 mt-1 block truncate" title={packInfo.bottle.name}>
                                      📦 {packInfo.bottle.name}
                                    </span>
                                    <span className="text-[14px] text-slate-500 font-bold block mt-0.5">
                                      ต้องการ: <span className="font-mono text-slate-800 font-extrabold">{packInfo.bottle.qtyNeeded}</span> ชิ้น
                                      {" · "}
                                      <span className="text-slate-500">ในคลัง: <span className="font-mono text-slate-800 font-extrabold">{packInfo.bottle.available}</span> ชิ้น</span>
                                    </span>
                                    <div className="mt-1.5 flex items-center">
                                      {packInfo.bottle.isReady ? (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          ✓ มีของ (พร้อมผลิต)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                          ✗ ของไม่พอ (ขาดอีก {packInfo.bottle.qtyNeeded - packInfo.bottle.available} ชิ้น)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    onClick={() => bottleImg && setZoomedImage(bottleImg)}
                                    className={`h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${bottleImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                                  >
                                    {bottleImg ? (
                                      <>
                                        <img src={bottleImg} alt="ขวด" className="h-full w-full object-cover" />
                                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                          <Search className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                      </>
                                    ) : (
                                      <Box className="h-6 w-6 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* หัวปั๊ม / ฝา */}
                                <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 gap-4 shadow-3xs hover:border-slate-300 transition-colors">
                                  <div className="min-w-0 text-left">
                                    <span className="text-[13px] text-slate-400 font-extrabold uppercase block">ฝา / หัวปั๊ม / หัวฉีด</span>
                                    <span className="text-xs font-black text-slate-700 mt-1 block truncate" title={packInfo.pump.name}>
                                      🔘 {packInfo.pump.name}
                                    </span>
                                    <span className="text-[14px] text-slate-500 font-bold block mt-0.5">
                                      ต้องการ: <span className="font-mono text-slate-800 font-extrabold">{packInfo.pump.qtyNeeded}</span> ชิ้น
                                      {" · "}
                                      <span className="text-slate-500">ในคลัง: <span className="font-mono text-slate-800 font-extrabold">{packInfo.pump.available}</span> ชิ้น</span>
                                    </span>
                                    <div className="mt-1.5 flex items-center">
                                      {packInfo.pump.isReady ? (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          ✓ มีของ (พร้อมผลิต)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                          ✗ ของไม่พอ (ขาดอีก {packInfo.pump.qtyNeeded - packInfo.pump.available} ชิ้น)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    onClick={() => pumpImg && setZoomedImage(pumpImg)}
                                    className={`h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${pumpImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                                  >
                                    {pumpImg ? (
                                      <>
                                        <img src={pumpImg} alt="ฝา" className="h-full w-full object-cover" />
                                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                          <Search className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                      </>
                                    ) : (
                                      <PackageOpen className="h-6 w-6 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* ฉลากสินค้า */}
                                <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 gap-4 shadow-3xs hover:border-slate-300 transition-colors">
                                  <div className="min-w-0 text-left">
                                    <span className="text-[13px] text-slate-400 font-extrabold uppercase block">ฉลากสินค้า / สติ๊กเกอร์แบรนด์</span>
                                    <span className="text-xs font-black text-slate-700 mt-1 block truncate" title={labelInfo.name}>
                                      🏷️ {labelInfo.name}
                                    </span>
                                    <span className="text-[14px] text-slate-500 font-bold block mt-0.5">
                                      ต้องการ: <span className="font-mono text-slate-800 font-extrabold">{labelInfo.qtyNeeded}</span> ใบ
                                      {" · "}
                                      <span className="text-slate-500">ในคลัง: <span className="font-mono text-slate-800 font-extrabold">{labelInfo.available}</span> ใบ</span>
                                    </span>
                                    <div className="mt-1.5 flex items-center">
                                      {labelInfo.isReady ? (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          ✓ มีของ (พร้อมผลิต)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[13px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                          ✗ ของไม่พอ (ขาดอีก {labelInfo.qtyNeeded - labelInfo.available} ใบ)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    onClick={() => labelImg && setZoomedImage(labelImg)}
                                    className={`h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${labelImg ? "cursor-zoom-in hover:border-green-400" : ""}`}
                                  >
                                    {labelImg ? (
                                      <>
                                        <img src={labelImg} alt="ฉลาก" className="h-full w-full object-cover" />
                                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                          <Search className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                      </>
                                    ) : (
                                      <Tag className="h-6 w-6 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* สูตรเคมีที่ใช้ผลิต — แสดงในหน้าเลย (ไม่มี modal) */}
                                <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-3">
                                  <div className="min-w-0 text-left">
                                    <span className="text-[13px] text-slate-400 font-extrabold uppercase block">สูตรเคมีที่ใช้ผลิต</span>
                                    <span className="text-sm font-black text-slate-800 mt-0.5 block truncate">
                                      🧪 {cleanFormulaName(ingInfo.formulaName || formulaName)}
                                    </span>
                                  </div>

                                  {ingInfo.found ? (
                                    <>
                                      {/* สารเคมี แยกตาม Phase */}
                                      <div className="space-y-2">
                                        <h6 className="text-[14px] font-black text-slate-600 flex items-center gap-1.5">
                                          <Layers className="h-3.5 w-3.5 text-green-600" />
                                          {ingInfo.batchKg > 0
                                            ? `สารเคมีที่ใช้ (ล็อตนี้ ${ingInfo.batchKg.toLocaleString(undefined, { maximumFractionDigits: 3 })} กก.)`
                                            : "สารเคมีที่ใช้ (ต่อ 1 กก.)"}
                                        </h6>
                                        {/* Same table R&D uses, minus the stock column:
                                            by this stage the chemicals were already
                                            deducted at BOM confirm, so a sufficiency
                                            mark here would be stale. */}
                                        <IngredientPlanTable
                                          rows={(ingInfo.list || []).map((ing) => ({
                                            name: ing.name,
                                            phase: ing.phase,
                                            gramsPerKg: (Number(ing.ratio) || 0) * 1000,
                                            required: ing.requiredGrams || 0
                                          }))}
                                        />
                                      </div>

                                      {/* วิธีทำ */}
                                      <div className="space-y-1.5">
                                        <h6 className="text-[14px] font-black text-slate-600 flex items-center gap-1.5">
                                          <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                                          วิธีการและขั้นตอนการผสม
                                        </h6>
                                        {ingInfo.procedures && ingInfo.procedures.filter(s => s && s.trim()).length > 0 ? (
                                          <div className="space-y-1.5">
                                            {ingInfo.procedures.filter(s => s && s.trim()).map((step, i) => (
                                              <div key={i} className="flex gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                                                <span className="h-4 w-4 rounded-full bg-blue-100 text-blue-800 text-[13px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                                <p className="text-[14px] text-slate-600 font-semibold leading-relaxed">{step}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-[14px] text-slate-400 font-semibold italic pl-1">ไม่มีข้อมูลขั้นตอนในระบบ</p>
                                        )}
                                      </div>

                                      {/* หมายเหตุ */}
                                      {ingInfo.note && ingInfo.note.filter(n => n && n.trim()).length > 0 && (
                                        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg space-y-1">
                                          <span className="text-[13px] font-extrabold text-amber-800 flex items-center gap-1 uppercase tracking-wider">
                                            <AlertTriangle className="h-3 w-3" />
                                            หมายเหตุคำแนะนำ
                                          </span>
                                          <ul className="list-disc pl-4 text-[14px] text-amber-700 font-semibold space-y-0.5 leading-relaxed">
                                            {ingInfo.note.filter(n => n && n.trim()).map((n, i) => <li key={i}>{n}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-[14px] text-slate-400 font-semibold italic">ยังไม่มีสูตรเคมีในระบบสำหรับรายการนี้</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* หมายเหตุลูกค้าของ sale */}
                        {selectedOrder?.notes && (
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 mb-4">
                            <span className="text-[13px] font-extrabold text-blue-800 flex items-center gap-1.5 uppercase tracking-wider">
                              <MessageSquare className="h-3.5 w-3.5" />
                              หมายเหตุลูกค้าของ Sale
                            </span>
                            <p className="text-[14px] text-blue-700 font-semibold leading-relaxed whitespace-pre-wrap">
                              {selectedOrder.notes}
                            </p>
                          </div>
                        )}

                        {String(getProductDetails(selectedOrder)?.notes || "").trim() && (
                          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1 mb-4">
                            <span className="text-[13px] font-extrabold text-indigo-800 flex items-center gap-1.5 uppercase tracking-wider">
                              <MessageSquare className="h-3.5 w-3.5" />
                              หมายเหตุจากใบสั่งผลิต Sale
                            </span>
                            <p className="text-[14px] text-indigo-700 font-semibold leading-relaxed whitespace-pre-wrap">
                              {getProductDetails(selectedOrder)?.notes}
                            </p>
                          </div>
                        )}

                        {/* 3 Checklist Items */}
                        <div className="space-y-3">
                          <h5 className="text-[14px] font-black text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-200">
                            📝 ยืนยันการดำเนินงานของผู้ปฎิบัติงาน (โปรดระบุเพื่อยืนยันส่งผลิต)
                          </h5>
                          
                          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/30 transition-all cursor-pointer text-xs font-bold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={check1}
                              onChange={(e) => setCheck1(e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <span>1. ตรวจสอบสารพร้อมผลิตแล้ว</span>
                          </label>

                          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/30 transition-all cursor-pointer text-xs font-bold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={check2}
                              onChange={(e) => setCheck2(e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <span>2. ตรวจสอบ ขวดและหัวฉีด พร้อมแล้ว</span>
                          </label>

                          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/30 transition-all cursor-pointer text-xs font-bold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={check3}
                              onChange={(e) => setCheck3(e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <span>3. ตรวจสอบ สติ๊กเกอร์ พร้อมแล้ว</span>
                          </label>
                        </div>
                      </div>

                      {/* No chemical-confirm here: R&D already deducted the raw
                          materials and created the lot when it confirmed the
                          formula. This panel only deducts PACKAGING. */}
                      <div className="border-t border-slate-200/80 pt-4 flex justify-end">
                        <button
                          disabled={!(check1 && check2) || confirming}
                          onClick={() => handleConfirmPreparation(selectedOrder)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                            check1 && check2
                              ? "bg-green-600 hover:bg-green-700 text-white active:scale-95 border-none"
                              : "bg-slate-100 text-slate-400 border-none cursor-not-allowed"
                          }`}
                        >
                          {confirming ? (
                            <span className="animate-pulse">กำลังดำเนินการ...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>ยืนยันการเตรียมพัสดุและส่งเข้าไลน์ผลิต</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : stageTab === "pack" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
            {/* Box 1: บรรจุขวด */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  🧴 1. บรรจุขวด (Filling)
                </h4>
                <span className="text-[14px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">
                  {stageOrders.filter(c => !c.packagingSubStep || c.packagingSubStep === "filling").length} รายการ
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
                {stageOrders.filter(c => !c.packagingSubStep || c.packagingSubStep === "filling").length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-semibold italic">ไม่มีคิวบรรจุขวด</div>
                ) : (
                  stageOrders.filter(c => !c.packagingSubStep || c.packagingSubStep === "filling").map(c => renderPackCard(c, "labeling", "ส่งไปติดสติกเกอร์ ➔"))
                )}
              </div>
            </div>

            {/* Box 2: ติดสติกเกอร์ */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  🏷️ 2. ติดสติกเกอร์ (Labeling)
                </h4>
                <span className="text-[14px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">
                  {stageOrders.filter(c => c.packagingSubStep === "labeling").length} รายการ
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
                {stageOrders.filter(c => c.packagingSubStep === "labeling").length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-semibold italic">ไม่มีคิวติดสติกเกอร์</div>
                ) : (
                  stageOrders.filter(c => c.packagingSubStep === "labeling").map(c => renderPackCard(c, "lot", "ส่งไปยิง LOT ➔"))
                )}
              </div>
            </div>

            {/* Box 3: ยิง LOT */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  🔢 3. ยิง LOT สินค้า (Lot Coding)
                </h4>
                <span className="text-[14px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">
                  {stageOrders.filter(c => c.packagingSubStep === "lot").length} รายการ
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
                {stageOrders.filter(c => c.packagingSubStep === "lot").length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-semibold italic">ไม่มีคิวยิง LOT</div>
                ) : (
                  stageOrders.filter(c => c.packagingSubStep === "lot").map(c => renderPackCard(c, "sealing", "ส่งไปซีลขวด ➔"))
                )}
              </div>
            </div>

            {/* Box 4: ซีลขวด */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  🔒 4. ซีลขวด / แพ็คสำเร็จ (Sealing)
                </h4>
                <span className="text-[14px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">
                  {stageOrders.filter(c => c.packagingSubStep === "sealing").length} รายการ
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
                {stageOrders.filter(c => c.packagingSubStep === "sealing").length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-semibold italic">ไม่มีคิวซีลขวด</div>
                ) : (
                  stageOrders.filter(c => c.packagingSubStep === "sealing").map(c => renderPackCard(c, "complete", "ส่งตรวจ QC สำเร็จ ➔"))
                )}
              </div>
            </div>
          </div>
        ) : stageOrders.length === 0 && stageTab !== "line" ? (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีใบสั่งผลิตในขั้นตอนนี้</h3>
            <p className="text-xs text-slate-500 mt-1">ใบสั่งผลิตในขั้น "{PROD_TABS.find((t) => t.id === stageTab)?.label}" จะแสดงที่นี่</p>
          </div>
        ) : stageTab === "line" ? (
          <div className="flex flex-col gap-4 items-stretch">
            {/* Unassigned tray — the ONLY job of this strip is "not placed yet".
                The grid below owns everything else. (This replaces the old
                3-bucket panel, which competed with the grid for the same truth:
                รอเข้าคิว / เข้าคิวแล้ว / In-Process QC all restated what the grid
                already showed.) */}
            {(() => {
              const LINE_BUCKETS = [
                {
                  id: "unassigned",
                  label: "ยังไม่ได้เข้าเครื่อง",
                  hint: "ลากไปวางบนช่องวันของเครื่องด้านล่าง",
                  empty: "✅ จัดเข้าเครื่องครบทุกใบแล้ว",
                  items: stageOrders.filter((c) => !getAssignedMachineId(c) && !isQcLocked(c)),
                  draggable: true,
                  cardBg: "bg-slate-50/60 border border-slate-200/80 shadow-3xs p-4 flex flex-col gap-2.5 rounded-2xl",
                  titleColor: "text-slate-700 font-extrabold",
                  badgeBg: "bg-slate-200/80 text-slate-700",
                  emptyBg: "border border-dashed border-slate-200 bg-slate-50/30 text-slate-400"
                },
                {
                  id: "queued",
                  label: "รอคิว",
                  hint: "จัดเข้าเครื่องแล้ว รอถึงคิวผลิต",
                  empty: "— ไม่มีงานรอคิว",
                  items: stageOrders.filter((c) => getAssignedMachineId(c) && !isQcLocked(c)),
                  draggable: true,
                  cardBg: "bg-green-50/40 border border-green-200/60 shadow-3xs p-4 flex flex-col gap-2.5 rounded-2xl",
                  titleColor: "text-green-700 font-extrabold",
                  badgeBg: "bg-green-100 text-green-800",
                  emptyBg: "border border-dashed border-green-200/50 bg-green-50/20 text-green-500/70"
                },
                {
                  id: "qc",
                  label: "รอ In-Process QC",
                  hint: "รอผลตรวจ ย้ายไม่ได้",
                  empty: "— ไม่มีงานรอ QC",
                  items: stageOrders.filter((c) => isQcLocked(c)),
                  draggable: false,
                  cardBg: "bg-red-50/40 border border-red-200/60 shadow-3xs p-4 flex flex-col gap-2.5 rounded-2xl",
                  titleColor: "text-red-700 font-extrabold",
                  badgeBg: "bg-red-100 text-red-800",
                  emptyBg: "border border-dashed border-red-200/50 bg-red-50/20 text-red-500/70"
                }
              ];
              return (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {LINE_BUCKETS.map((b) => {
                      const isUnassigned = b.id === "unassigned";
                      const isQueued = b.id === "queued";
                      const isQc = b.id === "qc";
                      return (
                        <div
                          key={b.id}
                          onDragOver={isUnassigned ? (e) => { if (draggedOrderId) e.preventDefault(); } : undefined}
                          onDrop={isUnassigned ? (e) => {
                            e.preventDefault();
                            const order = orderedCustomers.find((c) => c._id === draggedOrderId);
                            setDraggedOrderId(null);
                            if (order && getAssignedMachineId(order)) {
                              onScheduleOrder?.(order._id, {
                                scheduleMachineId: "", scheduleStartDate: "", scheduleEndDate: "", scheduleQueueNo: null
                              });
                            }
                          } : undefined}
                          className={`${b.cardBg} transition-all duration-200 ${
                            isUnassigned && draggedOrderId
                              ? "border-dashed border-2 border-amber-500 bg-amber-50/60 shadow-md scale-[1.01]"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-100/50 pb-2 mb-1.5">
                            <span className={`text-[14px] font-black uppercase tracking-wider ${b.titleColor}`}>{b.label}</span>
                            <span className={`text-[13px] font-bold rounded-full px-2 py-0.5 font-mono ${b.badgeBg}`}>{b.items.length}</span>
                          </div>
                          {isUnassigned && draggedOrderId && (
                            <div className="text-[14px] font-black text-amber-800 bg-amber-100 border border-amber-250 rounded-xl py-2 px-3 text-center animate-bounce flex items-center justify-center gap-1.5 mb-2 select-none">
                              <span>⤾ ปล่อยตรงนี้เพื่อคืนคิว (ลากกลับ)</span>
                            </div>
                          )}
                          {b.items.length === 0 ? (
                            <div className={`rounded-xl py-4 text-center text-[13px] font-bold ${b.emptyBg}`}>
                              {b.empty}
                            </div>
                          ) : (
                            // ~2.5 cards tall (card ≈ 61px + 6px gap): the half-card
                            // peeking at the bottom is the cue that there is more to
                            // scroll rather than a list that just ends.
                            <div className="flex flex-col gap-1.5 max-h-[168px] overflow-y-auto pr-1">
                              {b.items.map((c) => {
                                const armed = armedOrder?._id === c._id;
                                const mIdx = machines.findIndex((m) => m.id === getAssignedMachineId(c));
                                const machineCode = mIdx >= 0 ? `M${String(mIdx + 1).padStart(2, "0")}` : null;
                                const startDate = c.singleOrderedProduct?.scheduleStartDate || c.scheduleStartDate || "";
                                const startTime = c.singleOrderedProduct?.scheduleStartTime || c.scheduleStartTime || "09:00";
                                const endTime = c.singleOrderedProduct?.scheduleEndTime || c.scheduleEndTime || "18:00";
                                
                                if (isUnassigned) {
                                  return (
                                    <div
                                      key={c._id}
                                      draggable={b.draggable}
                                      onDragStart={(e) => {
                                        if (!b.draggable) return;
                                        setDraggedOrderId(c._id);
                                        setDraggedFromTray(true);
                                        // Firefox/Chrome only start a native HTML5 drag once
                                        // dataTransfer carries data — without this the drag
                                        // never fires and only tap-to-place worked.
                                        e.dataTransfer.setData("text/plain", c._id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onDragEnd={() => { setDraggedOrderId(null); setDraggedFromTray(false); setDragOverCell(null); }}
                                      onPointerDown={(e) => {
                                        // Ignore the จัดคิว button and non-primary buttons.
                                        if (!b.draggable || e.button !== 0 || e.target.closest("button")) return;
                                        e.preventDefault();
                                        setPointerDrag({ order: c, x: e.clientX, y: e.clientY, overMachineId: null });
                                      }}
                                      onClick={() => b.draggable && setArmedOrder(armed ? null : c)}
                                      title="ลากไปวางบนแถวเครื่องจักร หรือแตะเพื่อเลือกแล้วแตะช่องวัน"
                                      className={`rounded-xl border px-3 py-2 flex flex-col gap-1.5 text-left select-none text-[15px] bg-white transition-all hover:shadow-xs cursor-grab active:cursor-grabbing ${
                                        armed ? "border-green-500 bg-green-50/50 ring-2 ring-green-200" : "border-slate-200"
                                      }`}
                                    >
                                      {/* Row 1: name left, action right */}
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-extrabold text-slate-800 truncate">{c.name || "ไม่ระบุชื่อ"}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openScheduleModal(c);
                                          }}
                                          className="text-[13px] font-black px-2 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap shrink-0"
                                        >
                                          จัดคิว
                                        </button>
                                      </div>
                                      {/* Row 2: formula + qty left (no machine/time yet) */}
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[14px] px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded-full font-bold border border-yellow-200/60 truncate" title={c.singleOrderedProduct?.formulaName}>
                                          {c.singleOrderedProduct?.formulaName || "-"}
                                        </span>
                                        <span className="text-[14px] px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full font-bold border border-blue-200/60 whitespace-nowrap shrink-0">
                                          {c.singleOrderedProduct?.quantityPcs || 0} ชิ้น
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (isQueued) {
                                  return (
                                    <div
                                      key={c._id}
                                      draggable={b.draggable}
                                      onDragStart={(e) => {
                                        if (!b.draggable) return;
                                        setDraggedOrderId(c._id);
                                        e.dataTransfer.setData("text/plain", c._id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onDragEnd={() => { setDraggedOrderId(null); setDragOverCell(null); }}
                                      onClick={() => b.draggable && setArmedOrder(armed ? null : c)}
                                      title="ลากเพื่อย้ายเครื่อง/วัน หรือคลิกแก้ไขคิว"
                                      className={`rounded-xl border px-3 py-2 flex flex-col gap-1.5 text-left select-none text-[15px] bg-white transition-all hover:shadow-xs cursor-grab active:cursor-grabbing ${
                                        armed ? "border-green-500 bg-green-50/50 ring-2 ring-green-200" : "border-slate-200"
                                      }`}
                                    >
                                      {/* Row 1: name left, action right */}
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-extrabold text-slate-800 truncate">{c.name || "ไม่ระบุชื่อ"}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openScheduleModal(c);
                                          }}
                                          className="text-[13px] font-black px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap shrink-0"
                                        >
                                          แก้ไขคิว
                                        </button>
                                      </div>
                                      {/* Row 2: formula + qty left, machine + schedule right */}
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="text-[14px] px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded-full font-bold border border-yellow-200/60 truncate" title={c.singleOrderedProduct?.formulaName}>
                                            {c.singleOrderedProduct?.formulaName || "-"}
                                          </span>
                                          <span className="text-[14px] px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full font-bold border border-blue-200/60 whitespace-nowrap shrink-0">
                                            {c.singleOrderedProduct?.quantityPcs || 0} ชิ้น
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[14px] px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-200/60 whitespace-nowrap">
                                            {machineCode}
                                          </span>
                                          <span className="text-[13px] px-2 py-0.5 bg-slate-50 text-slate-700 rounded-full font-bold border border-slate-200/60 whitespace-nowrap">
                                            {formatBlockTimeAndDate(startDate, c.singleOrderedProduct?.scheduleEndDate || c.scheduleEndDate || startDate, startTime, endTime)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // QC column (Right)
                                return (
                                  <div
                                    key={c._id}
                                    className="rounded-xl border border-slate-200 bg-slate-50 opacity-80 px-3 py-2 flex flex-col gap-1.5 text-left select-none text-[15px]"
                                  >
                                    {/* Row 1: name left, action right */}
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-extrabold text-slate-800 truncate">{c.name || "ไม่ระบุชื่อ"}</span>
                                      <button
                                        type="button"
                                        disabled
                                        className="text-[13px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed whitespace-nowrap opacity-60 shrink-0"
                                      >
                                        แก้ไขคิว
                                      </button>
                                    </div>
                                    {/* Row 2: formula + qty left, machine + schedule right */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[14px] px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded-full font-bold border border-yellow-200/60 truncate" title={c.singleOrderedProduct?.formulaName}>
                                          {c.singleOrderedProduct?.formulaName || "-"}
                                        </span>
                                        <span className="text-[14px] px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full font-bold border border-blue-200/60 whitespace-nowrap shrink-0">
                                          {c.singleOrderedProduct?.quantityPcs || 0} ชิ้น
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[14px] px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-200/60 whitespace-nowrap">
                                          {machineCode}
                                        </span>
                                        <span className="text-[13px] px-2 py-0.5 bg-slate-50 text-slate-700 rounded-full font-bold border border-slate-200/60 whitespace-nowrap">
                                          {formatBlockTimeAndDate(startDate, c.singleOrderedProduct?.scheduleEndDate || c.scheduleEndDate || startDate, startTime, endTime)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Machine grid — the single source of truth for placement */}
            <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
              
              {/* Timeline Header controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-col">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-green-600" />
                    <span>ไทม์ไลน์เครื่องจักร</span>
                  </h4>
                  <span className="text-[14px] text-slate-400 font-bold mt-0.5">เลือกชมมุมมองวันที่ &gt;&gt;&gt; รายเดือน, รายสัปดาห์, รายวัน</span>
                </div>
                
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end sm:justify-start">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[14px] font-bold text-slate-600 focus-within:border-green-500 transition-colors">
                    <span className="text-slate-400 font-extrabold">วันที่:</span>
                    <input 
                      type="date"
                      value={timelineBaseDate}
                      onChange={(e) => setTimelineBaseDate(e.target.value)}
                      className="bg-transparent border-none text-[14px] font-bold text-slate-700 outline-none cursor-pointer p-0 w-[100px]"
                    />
                  </div>
                  <select 
                    value={timelineView}
                    onChange={(e) => setTimelineView(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold px-2.5 py-1.5 text-slate-600 outline-none cursor-pointer hover:border-slate-350 transition-colors"
                  >
                    <option value="weekly">ปรับมุมมอง: รายสัปดาห์</option>
                    <option value="daily">รายวัน</option>
                    <option value="monthly">รายเดือน</option>
                  </select>
                  <button
                    onClick={openAddMachine}
                    className="text-[14px] font-black px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-green-400 hover:text-green-700 transition-colors whitespace-nowrap cursor-pointer active:scale-95 shadow-3xs"
                  >
                    + เพิ่มเครื่องจักร
                  </button>
                </div>
              </div>

              {/* Legends */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] font-extrabold text-slate-500 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-500/20 border border-green-600 inline-block" />
                  <span>งานผลิต</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-50 border border-red-500 border-dashed inline-block" />
                  <span>คิวชน</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-dashed border-slate-300 bg-white inline-block" />
                  <span>รอวางแผน / ว่าง</span>
                </div>
              </div>

              {/* Timeline Scrollable Grid Container. Height is capped at roughly
                  two and a half machine rows so a long machine list stops pushing
                  the rest of the page down — the extra rows scroll instead. */}
              <div className="w-full max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-50/10">
                <div className="min-w-[850px]">

                  {/* Grid Header days of the week. Columns follow the view's real
                      slot count — the daily view has 10 hour columns, and a
                      hard-coded repeat(7) wrapped them onto a second row.
                      Sticky so the dates stay readable while scrolling machines. */}
                  <div
                    style={{ gridTemplateColumns: `160px repeat(${timelineColumns.labels.length}, minmax(0, 1fr))` }}
                    className="grid sticky top-0 z-20 bg-slate-50 text-[14px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-center py-2.5 items-center"
                  >
                    <div className="text-left pl-4 font-black text-slate-700 text-[13px]">รายชื่อเครื่องจักร</div>
                    {timelineColumns.labels.map((lbl, idx) => {
                      const isSat = timelineView === "weekly" && idx === 5;
                      const isSun = timelineView === "weekly" && idx === 6;
                      return (
                        <div key={idx} className={isSat ? "text-blue-600" : isSun ? "text-red-500" : ""}>
                          {lbl}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Rows for Machines — rendered from real machine + timeline data */}
                  <div className="flex flex-col divide-y divide-slate-200">
                    {machines.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                        <span className="text-xs font-bold text-slate-400">ยังไม่มีข้อมูลเครื่องจักร</span>
                        <button
                          onClick={openAddMachine}
                          className="text-[14px] font-black px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          + เพิ่มเครื่องจักรเครื่องแรก
                        </button>
                      </div>
                    ) : (
                      machines.map((m, mIdx) => {
                        const allJobs = [...scheduleBlocks].filter(j => j.machineId === m.id);
                        const jobs = allJobs.map(j => {
                          const pos = getJobPosition(j);
                          if (!pos) return null;
                          return { ...j, day: pos.day, span: pos.span };
                        }).filter(Boolean);
                        // Column count follows the view: 7 days (weekly/monthly)
                        // or 10 hours (daily). A hard-coded 7 wrapped the daily
                        // view's extra cells onto a second row per machine.
                        const colCount = timelineColumns.labels.length;
                        // Which columns this machine actually has work on.
                        const busyDays = new Set();
                        jobs.forEach((j) => {
                          for (let i = j.day; i < j.day + (j.span || 1) && i < colCount; i++) busyDays.add(i);
                        });
                        // Inline width instead of a Tailwind col-span-N class: N is
                        // dynamic, and Tailwind only ships classes it can see.
                        const spanStyle = (n) => ({ gridColumn: `span ${n} / span ${n}` });
                        const typeStyle = {
                          work: "bg-green-500/10 border border-green-600/40 text-green-700",
                          setup: "bg-blue-50 border border-blue-300 text-blue-700",
                          clean: "bg-slate-50 border border-slate-200 text-slate-600",
                          conflict: "bg-red-50 border border-dashed border-red-500 text-red-700"
                        };
                        const labelStyle = {
                          work: "text-green-800", setup: "text-blue-700", clean: "text-slate-600", conflict: "text-red-700"
                        };
                        const timeStyle = {
                          work: "text-green-600", setup: "text-blue-500", clean: "text-slate-400", conflict: "text-red-600"
                        };
                        // Build the 7-day cells: a job renders at its start day and
                        // spans `span` columns; days covered by a span are skipped.
                        const cells = [];
                        let d = 0;
                        while (d < timelineColumns.labels.length) {
                          const currentD = d; // capture d for event handlers
                          const job = jobs.find(j => j.day === currentD);
                          if (job) {
                            const span = Math.min(job.span || 1, timelineColumns.labels.length - currentD);
                            const locked = isQcLocked(job.orderCard);
                            const clash = job.type === "conflict" || conflictIds.has(job.id);
                            cells.push(
                              <div
                                key={currentD}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (resizingBlockId) {
                                    const block = scheduleBlocks.find(b => b.id === resizingBlockId);
                                    if (block) {
                                      updateBlockSpan(block, currentD, timelineColumns.dates[currentD]);
                                    }
                                    setResizingBlockId(null);
                                  }
                                }}
                                style={spanStyle(span)}
                                className="p-1 border-r border-slate-200/60"
                              >
                                <div
                                  draggable={!locked}
                                  onDragStart={(e) => {
                                    if (locked) return;
                                    setDraggedOrderId(job.orderCard?._id);
                                    e.dataTransfer.setData("text/plain", job.orderCard?._id || job.id);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() => { setDraggedOrderId(null); setDragOverCell(null); }}
                                  onClick={() => job.fromOrder && openBlockFormula(job.orderCard)}
                                  title={locked ? "กำลังตรวจ QC — ย้ายไม่ได้" : "ลากเพื่อย้ายวัน/เครื่อง · คลิกเพื่อดูสูตร · ลากขอบขวาเพื่อปรับระยะเวลา"}
                                  className={`${clash ? typeStyle.conflict : locked ? "bg-slate-100 border border-slate-200 text-slate-400" : typeStyle[job.type] || typeStyle.work} rounded-xl p-2 h-full flex flex-col justify-between text-[13px] font-black select-none leading-normal transition-opacity relative pr-4.5 ${locked ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing hover:opacity-80"}`}
                                >
                                  <div className={`${clash ? labelStyle.conflict : labelStyle[job.type] || ""} font-black`}>
                                    {clash ? "⚠️ คิวชน · " : locked ? "🔒 " : ""}{job.label || "งานผลิต"}
                                  </div>
                                  {job.detail && <div className="text-[13px] font-bold text-slate-500">{job.detail}</div>}
                                  <div className="mt-1 grid grid-cols-2 gap-1 text-[13px] font-bold text-slate-600">
                                    <span className="rounded bg-white/60 px-1 py-0.5">เริ่ม: {formatTimelineWorkDate(job.startDate)}</span>
                                    <span className="rounded bg-white/60 px-1 py-0.5">จบ: {formatTimelineWorkDate(job.endDate || job.startDate)}</span>
                                  </div>
                                  <div className={`text-[13px] font-mono ${clash ? timeStyle.conflict : timeStyle[job.type] || ""} font-black mt-1`}>
                                    {formatBlockTimeAndDate(job.startDate, job.endDate, job.startTime, job.endTime)}
                                  </div>
                                  
                                  {!locked && (
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setResizingBlockId(job.id);
                                        e.dataTransfer.setData("text/plain", job.id);
                                        e.dataTransfer.effectAllowed = "copy";
                                      }}
                                      onDragEnd={() => {
                                        setResizingBlockId(null);
                                        setDragOverCell(null);
                                      }}
                                      className="absolute top-0 right-0 bottom-0 w-4 hover:w-5 bg-green-600/25 hover:bg-green-600/45 cursor-ew-resize transition-all rounded-r-xl flex items-center justify-center text-green-700/50 text-[13px] font-bold select-none border-l border-green-600/10 z-10 font-mono"
                                      title="ลากขยาย/ลดระยะเวลาผลิต"
                                    >
                                      ⇥
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                            d += span;
                          } else {
                            const cellDate = timelineColumns.dates[currentD];
                            const cellKey = `${m.id}_${currentD}`;
                            const isOver = dragOverCell === cellKey;
                            cells.push(
                              <div
                                key={currentD}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = resizingBlockId ? "copy" : "move"; setDragOverCell(cellKey); }}
                                onDragLeave={() => setDragOverCell((k) => (k === cellKey ? null : k))}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverCell(null);
                                  
                                  if (resizingBlockId) {
                                    const block = scheduleBlocks.find(b => b.id === resizingBlockId);
                                    if (block) {
                                      updateBlockSpan(block, currentD, cellDate);
                                    }
                                    setResizingBlockId(null);
                                    return;
                                  }

                                  const order = orderedCustomers.find((c) => c._id === draggedOrderId);
                                  setDraggedOrderId(null);
                                  const fromTray = draggedFromTray;
                                  setDraggedFromTray(false);
                                  if (order && cellDate) scheduleOrderAtCell(order, m, cellDate, fromTray);
                                }}
                                // armedOrder is only ever set by a tray chip, so the
                                // tap-to-place path snaps to the first slot too.
                                onClick={() => { if (armedOrder && cellDate) scheduleOrderAtCell(armedOrder, m, cellDate, true); }}
                                className={`p-2 flex items-center justify-center border-dashed border m-1 rounded-xl font-bold text-[13px] transition-colors ${
                                  isOver
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : armedOrder
                                      ? "border-green-300 bg-green-50/40 text-green-600 cursor-pointer hover:bg-green-50"
                                      : "border-slate-200 bg-white/40 text-slate-400"
                                }`}
                              >
                                {isOver ? "วางที่นี่" : armedOrder ? "แตะเพื่อวาง" : "ว่าง"}
                              </div>
                            );
                            d += 1;
                          }
                        }
                        return (
                          <div
                            key={m.id}
                            data-machine-row={m.id}
                            style={{ gridTemplateColumns: `160px repeat(${colCount}, minmax(0, 1fr))` }}
                            className={`grid items-stretch min-h-[110px] transition-colors ${
                              pointerDrag?.overMachineId === m.id ? "bg-green-50 ring-2 ring-green-400 ring-inset" : ""
                            }`}
                          >
                            {/* Left: Machine Info */}
                            <div className="bg-slate-50/50 p-3 border-r border-slate-200 flex flex-col justify-between text-left">
                              <div className="flex flex-col">
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="text-xs font-black text-slate-800">M{String(mIdx + 1).padStart(2, "0")}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openEditMachine(m); }}
                                    title="ตั้งค่า / แก้ไขเครื่องจักร"
                                    className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer active:scale-95 shrink-0"
                                  >
                                    <Settings className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Machine photo — the image uploaded on the machine
                                    profile; click to zoom in the shared lightbox. */}
                                <div className="mt-1.5">
                                  {m.image ? (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewImageModal({ open: true, url: getFileUrl(m.image), title: `เครื่องจักร: ${m.name}` });
                                      }}
                                      title="คลิกเพื่อดูรูปเครื่องจักรแบบเต็ม"
                                      className="h-14 w-full rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer hover:border-green-400 hover:shadow-xs transition-all active:scale-[0.98]"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={getFileUrl(m.image)} alt={m.name} className="h-full w-full object-cover" />
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => { e.stopPropagation(); openEditMachine(m); }}
                                      title="ยังไม่มีรูป — คลิกเพื่อเพิ่มรูปเครื่องจักร"
                                      className="h-14 w-full rounded-lg border border-dashed border-slate-200 bg-white/60 flex items-center justify-center gap-1 text-[13px] font-bold text-slate-400 cursor-pointer hover:border-green-300 hover:text-green-600 transition-colors"
                                    >
                                      <Camera className="h-3 w-3" />
                                      <span>เพิ่มรูป</span>
                                    </div>
                                  )}
                                </div>

                                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-tight mt-1">{m.name}</span>
                                {(() => {
                                  // Positive framing: what this machine CAN run. The old
                                  // "ห้าม: <every formula>" list buried the card.
                                  const allowed = m.allowedFormulas || [];
                                  if (!allowed.length) {
                                    return <div className="text-[13px] text-green-700 font-bold mt-1">✅ ผลิตได้ทุกสูตร</div>;
                                  }
                                  return (
                                    <div className="text-[13px] text-green-700 font-bold mt-1" title={allowed.join(", ")}>
                                      ✅ ผลิตได้ {allowed.length} สูตร
                                    </div>
                                  );
                                })()}
                              </div>
                              {/* Day occupancy — an honest count of days that actually
                                  hold a job. (Was "ความจุ 168 ชม. / ใช้ไป 0 ชม.": the
                                  hours came from a free-text field nobody fills and no
                                  machine throughput exists to compute them, so it was
                                  pinned at 0%.) */}
                              <div className="mt-2.5 space-y-1">
                                <div className="text-[13px] font-bold text-slate-500 flex justify-between">
                                  <span>{timelineView === "daily" ? "ช่วงมีงาน" : "วันมีงาน"}</span>
                                  <span className="font-black text-green-600">{busyDays.size}/{colCount}</span>
                                </div>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: colCount }).map((_, i) => (
                                    <span
                                      key={i}
                                      title={timelineColumns.labels[i]}
                                      className={`h-1.5 flex-1 rounded-full ${busyDays.has(i) ? "bg-green-500" : "bg-slate-200"}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            {cells}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                </div>
              </div>

            </div>
          </div>
        ) : stageTab === "finish" ? (
          <div className="flex flex-col gap-5 text-left w-full">
            {/* Search bar inside the Finish tab */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อลูกค้า หรือแบรนด์..."
                value={finishSearch}
                onChange={(e) => setFinishSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 transition-colors font-bold"
              />
            </div>

            {/* List of full-width long cards (one customer per row) */}
            <div className="flex flex-col gap-3">
              {stageOrders.filter((c) => {
                const term = finishSearch.toLowerCase();
                return (
                  (c.name || "").toLowerCase().includes(term) ||
                  (c.brand || "").toLowerCase().includes(term)
                );
              }).length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold italic">ไม่มีรายการสินค้าสำเร็จ</div>
              ) : (
                stageOrders
                  .filter((c) => {
                    const term = finishSearch.toLowerCase();
                    return (
                      (c.name || "").toLowerCase().includes(term) ||
                      (c.brand || "").toLowerCase().includes(term)
                    );
                  })
                  .map((c) => {
                    const p = Array.isArray(c.orderedProducts) ? c.orderedProducts[0] : c.orderedProducts;
                    const formulaName = p?.formulaName || p?.productName || p?.name || "ยังไม่มีสูตร";
                    const bottleSize = p?.bottleSize ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.bottleSize) ? p.bottleSize : `${p.bottleSize} ml`) : "-";
                    const fillVolume = p?.fillVolume ? (/[a-zA-Z\u0e00-\u0e7f]/.test(p.fillVolume) ? p.fillVolume : `${p.fillVolume} ml`) : "-";
                    const quantityPcs = (p?.quantityPcs || p?.quantity || 0).toLocaleString();

                    return (
                      <div
                        key={c._id}
                        className="rounded-2xl border border-slate-200 bg-white hover:shadow-xs transition-all p-5 flex flex-col gap-4 text-left select-none relative"
                      >
                        {/* Top Row: Client Info, Formula Name, Specs */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Status Icon */}
                            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์: <span className="text-slate-700 font-extrabold">{c.brand || "-"}</span></span>
                              </div>
                              <div className="text-sm font-black text-slate-800 truncate mt-0.5">{c.name || "ไม่ระบุชื่อ"}</div>
                            </div>
                          </div>

                          {/* Formula & Spec Info */}
                          <div className="flex items-center gap-6 shrink-0 flex-wrap sm:flex-nowrap">
                            <div className="text-left sm:text-right">
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">สูตรเคมีที่ใช้</span>
                              <span className="text-xs font-extrabold text-slate-700 block truncate max-w-[200px]">🧪 {formulaName}</span>
                            </div>

                            <div className="border-l border-slate-100 h-8 hidden sm:block" />

                            <div className="text-left sm:text-right shrink-0">
                              <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block">รายละเอียด</span>
                              <div className="text-[14px] font-bold text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span>ขวด <span className="text-slate-800 font-mono">{bottleSize}</span></span>
                                <span>·</span>
                                <span>จริง <span className="text-slate-800 font-mono">{fillVolume}</span></span>
                                <span>·</span>
                                <span>จำนวน <span className="text-slate-800 font-mono font-extrabold">{quantityPcs} ชิ้น</span></span>
                              </div>
                            </div>

                            <div className="border-l border-slate-100 h-8 hidden sm:block" />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openStatusModal(c);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                              title="ตั้งค่า/อัปเดตสถานะ"
                            >
                              <Settings className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Middle Row: Gallery of 5 Proof Images. Five across on a phone
                            left each tile 53px — too small to tell one photo from another,
                            let alone read its caption. */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          {/* 1. รูปเนื้อสาร Bulk QC — the photo attached during R&D's
                              In-Process QC (rndQcPhotos); qc1BulkPhoto is the legacy field. */}
                          {(() => {
                            const rndPhotos = Array.isArray(c.rndQcPhotos) ? c.rndQcPhotos.filter(Boolean) : [];
                            const bulkPhoto = rndPhotos[0] || c.qc1BulkPhoto || "";
                            return (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bulkPhoto) {
                                setViewImageModal({ open: true, url: getFileUrl(bulkPhoto), title: "รูปภาพเนื้อสาร (QC จาก R&D)" });
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/60 cursor-pointer hover:border-green-400 transition-colors relative"
                          >
                            <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                              {bulkPhoto ? (
                                <img src={getFileUrl(bulkPhoto)} alt="Bulk QC" className="h-full w-full object-cover" />
                              ) : (
                                <Beaker className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                            {rndPhotos.length > 1 && (
                              <span className="absolute top-1.5 right-1.5 text-[13px] font-black bg-slate-800/70 text-white px-1 rounded">+{rndPhotos.length - 1}</span>
                            )}
                            <span className="text-[13px] text-slate-500 font-extrabold text-center block leading-none truncate w-full">1. รูปเนื้อสาร (QC)</span>
                          </div>
                            );
                          })()}

                          {/* 2. รูปขวดติดสติกเกอร์ */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.qcStickerPhoto) {
                                setViewImageModal({ open: true, url: getFileUrl(c.qcStickerPhoto), title: "รูปขวดติดสติกเกอร์ (Labeling)" });
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/60 cursor-pointer hover:border-green-400 transition-colors"
                          >
                            <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                              {c.qcStickerPhoto ? (
                                <img src={getFileUrl(c.qcStickerPhoto)} alt="Sticker" className="h-full w-full object-cover" />
                              ) : (
                                <Tag className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                            <span className="text-[13px] text-slate-500 font-extrabold text-center block leading-none truncate w-full">2. ติดสติกเกอร์</span>
                          </div>

                          {/* 3. รูปตำแหน่งที่ยิง LOT */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.qcLotPhoto) {
                                setViewImageModal({ open: true, url: getFileUrl(c.qcLotPhoto), title: "รูปตำแหน่งยิง LOT (Lot Coding)" });
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/60 cursor-pointer hover:border-green-400 transition-colors"
                          >
                            <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                              {c.qcLotPhoto ? (
                                <img src={getFileUrl(c.qcLotPhoto)} alt="Lot Coding" className="h-full w-full object-cover" />
                              ) : (
                                <Cpu className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                            <span className="text-[13px] text-slate-500 font-extrabold text-center block leading-none truncate w-full">3. รูปยิง LOT</span>
                          </div>

                          {/* 4. รูปขวดที่ซีลแล้ว */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.qcSealingPhoto) {
                                setViewImageModal({ open: true, url: getFileUrl(c.qcSealingPhoto), title: "รูปขวดที่ซีลแล้ว (Sealing)" });
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/60 cursor-pointer hover:border-green-400 transition-colors"
                          >
                            <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                              {c.qcSealingPhoto ? (
                                <img src={getFileUrl(c.qcSealingPhoto)} alt="Sealing" className="h-full w-full object-cover" />
                              ) : (
                                <Box className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                            <span className="text-[13px] text-slate-500 font-extrabold text-center block leading-none truncate w-full">4. รูปซีลขวดแล้ว</span>
                          </div>

                          {/* 5. Final QC อัปรูปเข้าระบบ */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.qcFinalPhoto) {
                                setViewImageModal({ open: true, url: getFileUrl(c.qcFinalPhoto), title: "รูปภาพ Final QC สำเร็จ" });
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/60 cursor-pointer hover:border-green-400 transition-colors relative"
                          >
                            <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 relative group">
                              {c.qcFinalPhoto ? (
                                <img src={getFileUrl(c.qcFinalPhoto)} alt="Final QC" className="h-full w-full object-cover" />
                              ) : (
                                <Camera className="h-5 w-5 text-slate-300" />
                              )}
                              {/* Upload input overlay */}
                              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer z-10">
                                <UploadCloud className="h-4.5 w-4.5 text-white" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await compressImageToBase64(file);
                                        if (onUpdateCustomerStatus) {
                                          await onUpdateCustomerStatus(c._id, { qcFinalPhoto: base64 });
                                        }
                                      } catch (err) {
                                        console.error("Failed to upload Final QC photo:", err);
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <span className="text-[13px] text-slate-500 font-extrabold text-center block leading-none flex items-center gap-0.5 justify-center truncate w-full">
                              5. รูป Final QC
                              <label className="cursor-pointer hover:text-green-600" onClick={(e) => e.stopPropagation()}>
                                <UploadCloud className="h-2.5 w-2.5 inline-block text-slate-400" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await compressImageToBase64(file);
                                        if (onUpdateCustomerStatus) {
                                          await onUpdateCustomerStatus(c._id, { qcFinalPhoto: base64 });
                                        }
                                      } catch (err) {
                                        console.error("Failed to upload Final QC photo:", err);
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Status Badge and Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 flex-wrap gap-3">
                          <div>
                            <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider block mb-1">สถานะปัจจุบัน</span>
                            <span className={`inline-flex items-center gap-1.5 text-[14px] font-black px-3 py-1 rounded-full border ${
                              c.productionStatus === "รอตรวจ QC รอบที่ 2"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : c.productionStatus === "ส่งให้ลูกค้า"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : c.productionStatus === "ส่งเก็บเข้าคลัง"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}>
                              {c.productionStatus === "รอตรวจ QC รอบที่ 2" ? "🔬 รอตรวจ Final QC" : c.productionStatus === "ส่งให้ลูกค้า" ? "🚚 ส่งให้ลูกค้าเรียบร้อย" : c.productionStatus === "ส่งเก็บเข้าคลัง" ? "📦 ส่งเก็บเข้าคลังสินค้าแล้ว" : "🟢 สำเร็จเสร็จสิ้น (รอส่งมอบ)"}
                            </span>
                          </div>

                          {c.productionStatus === "รอตรวจ QC รอบที่ 2" ? (
                            <div className="flex gap-2">
                              <AsyncButton
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!c.qcFinalPhoto) {
                                    alert("กรุณาอัปโหลดรูป Final QC ก่อนยืนยันผ่าน");
                                    return;
                                  }
                                  if (onUpdateCustomerStatus) {
                                    await onUpdateCustomerStatus(c._id, { productionStatus: "สำเร็จเสร็จสิ้น", productionStep: 6 });
                                  }
                                }}
                                className="px-3.5 py-2 text-[14px] font-black bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors border-none shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                ✓ ยืนยัน Final QC ผ่าน
                              </AsyncButton>
                              <AsyncButton
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onUpdateCustomerStatus) {
                                    await onUpdateCustomerStatus(c._id, { packagingSubStep: "sealing", productionStatus: "รอบรรจุ", productionStep: 4 });
                                  }
                                }}
                                className="px-3.5 py-2 text-[14px] font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-200 shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                ↩ ตีกลับซีลขวด
                              </AsyncButton>
                            </div>
                          ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openShipDialog(c);
                              }}
                              className="px-3.5 py-2 text-[14px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors border-none shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              🚚 ส่งให้ลูกค้า
                            </button>
                            <AsyncButton
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (onUpdateCustomerStatus) {
                                  await onUpdateCustomerStatus(c._id, { productionStatus: "ส่งเก็บเข้าคลัง" });
                                }
                              }}
                              className="px-3.5 py-2 text-[14px] font-black bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors border-none shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              📦 ส่งเก็บเข้าคลัง
                            </AsyncButton>
                          </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {stageOrders.map((c) => (
              <div
                key={c._id}
                className="rounded-2xl border border-slate-200 bg-white hover:shadow-xs transition-all p-4 flex flex-col gap-2.5 text-left select-none relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] text-slate-400 font-bold uppercase tracking-wider">ลูกค้า</span>
                    <div className="text-sm font-black text-slate-800 truncate mt-0.5">{c.name || "ไม่ระบุชื่อ"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="shrink-0 text-[14px] font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      {c.computedStatus || c.productionStatus || "-"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStatusModal(c);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                      title="ตั้งค่า/อัปเดตสถานะ"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[15px] flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-xl border bg-slate-50 border-slate-100 text-slate-500 font-medium">
                  {c.brand && <span>แบรนด์: <span className="text-slate-800 font-bold">{c.brand}</span></span>}
                  {c.producedQty != null && <span>ผลิตแล้ว: <span className="font-mono text-slate-800 font-bold">{(c.producedQty || 0).toLocaleString()}</span></span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal — the keyboard/click path for จัดคิว / แก้ไขคิว.
          openScheduleModal + saveScheduleFromModal already existed but had no UI,
          so both buttons set state and nothing appeared. Drag-and-drop stays; this
          is the precise alternative (exact machine, dates and times). */}
      {selectedScheduleOrder && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60]"
            onClick={() => setSelectedScheduleOrder(null)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[65]">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-800">จัดคิวเข้าเครื่องจักร</h3>
                  <p className="text-[15px] text-slate-500 font-semibold mt-0.5">
                    {selectedScheduleOrder.name || "ลูกค้า"}
                    {selectedScheduleOrder.singleOrderedProduct?.formulaName
                      ? ` · ${selectedScheduleOrder.singleOrderedProduct.formulaName}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedScheduleOrder(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">เครื่องจักร</label>
                  <select
                    value={scheduleForm.machineId}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, machineId: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="">-- เลือกเครื่องจักร --</option>
                    {machines.map((m, i) => {
                      // Grey out (native <option> can't be coloured reliably
                      // cross-browser) + disable machines that can't run this
                      // order's formula, with a spelled-out reason label.
                      const ok = isMachineAllowed(m, selectedScheduleOrder);
                      return (
                        <option key={m.id} value={m.id} disabled={!ok}>
                          {`M${String(i + 1).padStart(2, "0")} · ${m.name}`}{ok ? "" : "  — ผลิตสูตรนี้ไม่ได้"}
                        </option>
                      );
                    })}
                  </select>
                  {/* A red banner does the colour job the disabled <option> can't:
                      the two lists disagree on which machines can run this formula,
                      so name them explicitly. */}
                  {(() => {
                    const blocked = machines.filter((m) => !isMachineAllowed(m, selectedScheduleOrder));
                    if (!blocked.length) return null;
                    return (
                      <div className="mt-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[15px] font-bold px-2.5 py-1.5 leading-relaxed">
                        เครื่องที่ผลิตสูตร “{selectedScheduleOrder.singleOrderedProduct?.formulaName || "-"}” ไม่ได้:{" "}
                        {blocked.map((m) => `M${String(machines.indexOf(m) + 1).padStart(2, "0")}`).join(", ")}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">วันเริ่ม</label>
                    <input
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                        // keep the range valid as the user types
                        endDate: f.endDate && f.endDate < e.target.value ? e.target.value : f.endDate
                      }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">วันจบ</label>
                    <input
                      type="date"
                      value={scheduleForm.endDate}
                      min={scheduleForm.startDate || undefined}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-500 font-bold uppercase tracking-wider">เวลาจบ</label>
                    <input
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                {scheduleError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-[15px] font-bold px-2.5 py-2">
                    {scheduleError}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center gap-2">
                {getAssignedMachineId(selectedScheduleOrder) ? (
                  <button
                    type="button"
                    disabled={savingSchedule}
                    onClick={async () => {
                      setSavingSchedule(true);
                      try {
                        await onScheduleOrder?.(selectedScheduleOrder._id, {
                          scheduleMachineId: "", scheduleStartDate: "", scheduleEndDate: "", scheduleQueueNo: null
                        });
                        setSelectedScheduleOrder(null);
                      } catch (err) {
                        setScheduleError(err.response?.data?.error || err.message || "ถอดออกจากเครื่องไม่สำเร็จ");
                      } finally {
                        setSavingSchedule(false);
                      }
                    }}
                    className="px-3 py-2 text-[15px] font-black text-red-600 hover:bg-red-50 rounded-xl border border-red-200 cursor-pointer disabled:opacity-60 bg-transparent"
                  >
                    ถอดออกจากเครื่อง
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedScheduleOrder(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer bg-transparent"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={savingSchedule}
                    onClick={saveScheduleFromModal}
                    className="px-5 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    {savingSchedule ? "กำลังบันทึก..." : "บันทึกคิว"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Machine Modal */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full max-w-6xl p-4 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left max-h-[92dvh] sm:max-h-[90vh] sm:h-[760px] flex flex-col overflow-hidden">
            
            {/* STATIC HEADER */}
            <button
              onClick={() => setIsMachineModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5 shrink-0">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                <span>{editingMachine ? `แก้ไขเครื่องจักร — ${editingMachine.name}` : "เพิ่มเครื่องจักรเครื่องใหม่"}</span>
              </h3>
              <p className="text-[15px] text-slate-400 mt-1 font-semibold">จัดทำโปรไฟล์เครื่องจักรและจำกัดเงื่อนไขประเภทสูตรสารเคมีที่อนุญาตผลิต</p>
            </div>

            {/* SCROLLABLE INNER BODY CONTENT */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-4">
                
                {/* LEFT COLUMN: Machine Info */}
                <div className="space-y-4 border-r border-slate-100 pr-0 md:pr-8 flex flex-col justify-start">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">1. ข้อมูลทั่วไปของเครื่องจักร</h4>
                  
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-extrabold text-slate-500 block">ชื่อเครื่องจักร *</label>
                    <input
                      type="text"
                      placeholder="ตัวอย่าง: เครื่องบรรจุหัวเดี่ยว 03"
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Machine Photo Upload 1:1 Large Square */}
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-extrabold text-slate-500 block">ภาพถ่ายเครื่องจักร (สัดส่วน 1:1)</label>
                    <div className="w-full flex justify-center py-2">
                      {newMachineImage ? (
                        <div className="w-[200px] aspect-square rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative p-1 shadow-2xs">
                          <img 
                          src={newMachineImage} 
                          onClick={() => setZoomedImage(newMachineImage)}
                          className="h-full w-full object-cover rounded-2xl cursor-zoom-in hover:opacity-80 transition-opacity" 
                          alt="Machine Preview" 
                          title="คลิกเพื่อซูมดูภาพใหญ่"
                        />
                          <button
                            type="button"
                            onClick={() => setNewMachineImage("")}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            ลบรูป
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 w-[200px] aspect-square bg-slate-50 hover:bg-slate-100/50 text-slate-600 rounded-2xl text-[14px] font-extrabold transition-all cursor-pointer border border-dashed border-slate-300 shadow-3xs active:scale-98">
                          <UploadCloud className="h-6 w-6 text-slate-400" />
                          <span>📸 อัปโหลดรูปภาพ</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  const base64 = await compressImageToBase64(file);
                                  setNewMachineImage(base64);
                                } catch (err) {
                                  console.error("Image Conversion Error:", err);
                                }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Allowed Formulas */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">2. สูตรสารเคมีดิบที่อนุญาตผลิต (ไม่ได้เลือก = ห้ามผลิต)</h4>
                  
                  {/* Allowed Checkboxes Grid */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center w-full">
                      <label className="text-[15px] font-extrabold text-slate-500">สูตรที่อนุญาตให้ผลิต (ติ๊กเลือก)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const allNames = formulas.map(f => f.name);
                          const isAllSelected = newMachineAllowed.length === allNames.length;
                          if (isAllSelected) {
                            setNewMachineAllowed([]);
                          } else {
                            setNewMachineAllowed(allNames);
                          }
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[13px] font-black transition-all cursor-pointer"
                      >
                        ✓ เลือกทั้งหมด
                      </button>
                    </div>
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formulas.map(f => {
                          const isChecked = newMachineAllowed.includes(f.name);
                          return (
                            <label
                              key={f._id}
                              className={`flex items-center gap-3 px-4 py-3 border rounded-2xl cursor-pointer transition-all select-none min-w-0 ${
                                isChecked 
                                  ? "border-blue-500 bg-blue-50/30 text-blue-700 font-extrabold shadow-sm" 
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewMachineAllowed([...newMachineAllowed, f.name]);
                                  } else {
                                    setNewMachineAllowed(newMachineAllowed.filter(x => x !== f.name));
                                  }
                                }}
                                className="h-5 w-5 accent-blue-600 cursor-pointer shrink-0"
                              />
                              <span className="text-[15px] leading-tight truncate w-full" title={f.name}>{f.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* STATIC FOOTER */}
                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 shrink-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {editingMachine && (
                      <button
                        type="button"
                        onClick={() => openMachineDeleteConfirm(editingMachine)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 active:scale-95 sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>ลบเครื่องจักร</span>
                      </button>
                    )}
                  </div>
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsMachineModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 active:scale-95"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleAddMachine}
                      disabled={!newMachineName.trim()}
                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 active:scale-95 ${
                        newMachineName.trim()
                          ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {editingMachine ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      <span>{editingMachine ? "บันทึกการแก้ไข" : "เพิ่มเครื่องจักร"}</span>
                    </button>
                  </div>
                </div>

          </Card>
        </div>
      )}

      {machineDeleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="machine-delete-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="machine-delete-title" className="text-base font-bold text-slate-900">
                  ยืนยันการลบเครื่องจักร
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  ต้องการลบเครื่องจักร <strong className="text-slate-900">{machineDeleteTarget.name}</strong> ใช่หรือไม่?
                  การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            {Math.max(machineDeleteTarget.assignedCount, machineDeleteTarget.queueCount) > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                เครื่องนี้มีงานเชื่อมโยง {Math.max(machineDeleteTarget.assignedCount, machineDeleteTarget.queueCount)} รายการ
                ระบบจะนำงานออกจากเครื่องก่อนลบ
              </div>
            )}

            {machineDeleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {machineDeleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMachineDeleteTarget(null)}
                disabled={deletingMachine}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmMachineDelete}
                disabled={deletingMachine}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingMachine ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{deletingMachine ? "กำลังลบ..." : "ยืนยันลบเครื่องจักร"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ghost chip following the cursor while pointer-dragging a tray job */}
      {pointerDrag && (
        <div
          className="fixed z-[80] pointer-events-none rounded-xl border-2 border-green-500 bg-white shadow-2xl px-3 py-2 text-[15px] font-extrabold text-slate-800 flex items-center gap-2 select-none"
          style={{ left: pointerDrag.x + 12, top: pointerDrag.y + 12 }}
        >
          <span className="truncate max-w-[160px]">{pointerDrag.order?.name || "ลูกค้า"}</span>
          <span className="text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
            {pointerDrag.overMachineId ? "ปล่อยเพื่อจัดคิว" : "ลากไปที่แถวเครื่องจักร"}
          </span>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-200 select-none">
            <button
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors cursor-pointer bg-slate-800/40 p-2 rounded-full z-10"
              title="ปิดหน้าต่างซูม"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={zoomedImage} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700/50 shadow-2xl" 
              alt="Zoomed Machine View" 
            />
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {isModalOpen && selectedCust && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <h3 className="font-extrabold text-slate-800 text-sm">🔄 อัปเดตสถานะการผลิต</h3>
              <p className="text-[14px] text-slate-400 font-semibold mt-0.5">
                ลูกค้า: {selectedCust.name} ({selectedCust.brandName || "ไม่มีชื่อแบรนด์"})
              </p>
            </div>

            <div className="space-y-4">
              {/* Select Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[15px] font-extrabold text-slate-500 block">เลือกสถานะใหม่ *</label>
                <select
                  value={newStatus}
                  onChange={(e) => {
                    setNewStatus(e.target.value);
                    setChatError("");
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer focus:border-green-500"
                >
                  <option value="ยังไม่ผลิต">ยังไม่ผลิต / ยังไม่พร้อม</option>
                  <option value="รอยืนยัน">รอยืนยันผลิต (วัตถุดิบครบ)</option>
                  <option value="รอตรวจ QC รอบที่ 1">รอตรวจ QC รอบที่ 1</option>
                  <option value="กำลังผลิต">กำลังผลิต</option>
                  <option value="รอตรวจ QC รอบที่ 2">รอตรวจ QC รอบที่ 2</option>
                  <option value="รอลูกค้ายืนยัน">รอลูกค้ายืนยันรับของ</option>
                  <option value="ลูกค้ายืนยันแล้ว">ลูกค้ายืนยันแล้ว (ต้องแนบรูปแชท)</option>
                  <option value="สำเร็จเสร็จสิ้น">สำเร็จเสร็จสิ้น (ต้องแนบรูปแชท)</option>
                </select>
              </div>

              {/* Chat Screenshot Area */}
              {(newStatus === "ลูกค้ายืนยันแล้ว" || newStatus === "สำเร็จเสร็จสิ้น") && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-[15px] font-extrabold text-slate-500 block">
                    📸 รูปภาพแชทหลักฐานการยืนยันจากลูกค้า *
                  </label>
                  
                  {chatFile || selectedCust.chatScreenshotProof ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 shadow-2xs max-w-xs mx-auto">
                      <img 
                        src={chatFile ? URL.createObjectURL(chatFile) : getFileUrl(selectedCust.chatScreenshotProof)} 
                        alt="Chat Proof" 
                        className="w-full object-contain max-h-40 rounded-lg" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setChatFile(null);
                          setSelectedCust(prev => ({
                            ...prev,
                            chatScreenshotProof: ""
                          }));
                        }}
                        className="absolute top-4 right-4 p-2 bg-red-650 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer active:scale-95 text-[14px]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2.5 py-8 px-4 bg-slate-50 hover:bg-slate-100/50 text-slate-700 rounded-xl text-[14px] font-bold transition-all cursor-pointer border border-dashed border-slate-300 max-w-xs mx-auto">
                      <UploadCloud className="h-5 w-5 text-slate-500" />
                      <span>📸 อัปโหลดสกรีนช็อตภาพแชท</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setChatFile(e.target.files[0]);
                          setChatError("");
                        }}
                      />
                    </label>
                  )}
                  {chatError && (
                    <p className="text-[14px] text-red-600 font-extrabold text-center mt-1">
                      {chatError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={modalUploading}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={modalUploading}
                onClick={handleSaveStatus}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-green-100 active:scale-95 flex items-center gap-1.5"
              >
                {modalUploading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{modalUploading ? "กำลังบันทึก..." : "ยืนยันบันทึก"}</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Formula Detail — large centered modal */}
      {viewingFormula && (
        <div
          className="fixed inset-0 bg-black/60 z-55 flex items-end sm:items-center justify-center p-0 sm:p-0 sm:p-8 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={closeFormulaModal}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full max-w-7xl max-h-[92dvh] sm:max-h-[95vh] p-4 sm:p-10 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left flex flex-col overflow-hidden"
          >
            <button
              onClick={closeFormulaModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5 shrink-0">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-emerald-600" />
                <span>ข้อมูลสูตรผลิต: {cleanFormulaName(viewingFormula.name)}</span>
              </h3>
              <p className="text-[15px] text-slate-400 mt-1 font-semibold">ขั้นตอนและรายละเอียดการผสมสำหรับผู้ควบคุมเครื่องจักร</p>
            </div>

            <div className="min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1">
              {/* LEFT column: procedures + note */}
              <div className="space-y-5 pb-4 order-2 lg:order-1">
              {/* Procedures */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 font-bold">
                  <ClipboardList className="h-4.5 w-4.5 text-blue-600" />
                  วิธีการและขั้นตอนการผสมเคมี
                </h4>
                {viewingFormula.procedures && viewingFormula.procedures.length > 0 && viewingFormula.procedures.some(p => p && p.trim()) ? (
                  <div className="space-y-2.5">
                    {viewingFormula.procedures.filter(p => p && p.trim()).map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[14px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-[15px] text-slate-600 font-semibold leading-relaxed mt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] text-slate-400 font-semibold italic pl-1">ไม่มีข้อมูลระบุขั้นตอนการผลิตในระบบ</p>
                )}
              </div>

              {/* Note / Warnings */}
              {viewingFormula.note && viewingFormula.note.length > 0 && viewingFormula.note.some(n => n && n.trim()) && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                  <span className="text-[14px] font-extrabold text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    หมายเหตุคำแนะนำ
                  </span>
                  <ul className="list-disc pl-4 text-[15px] text-amber-700 font-semibold space-y-0.5 leading-relaxed">
                    {viewingFormula.note.filter(n => n && n.trim()).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              </div>

              {/* RIGHT column: ingredients */}
              <div className="space-y-5 pb-4 order-1 lg:order-2">
              {/* Ingredients Breakdown */}
              <div className="space-y-2">
                {/* Batch size of the order this modal was opened from. bom values are
                    grams per 1 kg, so the operator would otherwise have to do the
                    multiplication by hand at the mixing tank. Opened without an order
                    (prep panel), there is no batch — the per-1kg view stays. */}
                {(() => {
                  const mp = formulaModalOrder ? getProductDetails(formulaModalOrder) : null;
                  const modalBatchKg = mp
                    ? ((parseInt(mp.quantityPcs || mp.quantity) || 0) * (parseFloat(mp.fillVolume || mp.bottleSize) || 0)) / 1000
                    : 0;
                  return (
                <>
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 font-bold">
                  <Layers className="h-4.5 w-4.5 text-green-600" />
                  {modalBatchKg > 0
                    ? `สัดส่วนและวัตถุดิบเคมี (ล็อตนี้ ${modalBatchKg.toLocaleString(undefined, { maximumFractionDigits: 3 })} กก.)`
                    : "สัดส่วนและวัตถุดิบเคมี (ต่อ 1 กิโลกรัม)"}
                </h4>
                {viewingFormula.bom && (viewingFormula.bom instanceof Map ? viewingFormula.bom.size > 0 : Object.keys(viewingFormula.bom).length > 0) ? (
                  (() => {
                    const bomObj = viewingFormula.bom instanceof Map ? Object.fromEntries(viewingFormula.bom) : viewingFormula.bom;
                    const phaseOf = (n) => (viewingFormula.phases instanceof Map ? viewingFormula.phases.get(n) : viewingFormula.phases?.[n]) || "A";
                    const rows = Object.entries(bomObj).map(([name, gramsPerKg]) => ({
                      name,
                      phase: String(phaseOf(name)).toUpperCase(),
                      gramsPerKg: Number(gramsPerKg) || 0,
                      required: (Number(gramsPerKg) || 0) * modalBatchKg
                    }));
                    // Same table R&D uses, minus the stock column: chemicals were
                    // already deducted at BOM confirm, so a mark here would be stale.
                    return <IngredientPlanTable rows={rows} />;
                  })()
                ) : (
                  <p className="text-[15px] text-slate-400 font-semibold italic pl-1">ไม่มีการกำหนดรายละเอียดสัดส่วนสารเคมี</p>
                )}
                </>
                  );
                })()}
              </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3.5 mt-3 shrink-0 flex justify-end gap-2.5">
              {formulaModalOrder ? (
                <Button
                  onClick={handleConfirmProductionFromModal}
                  disabled={confirmingProdDone}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-100"
                >
                  <Check className="h-4 w-4" />
                  {confirmingProdDone ? "กำลังยืนยัน..." : "ยืนยันผลิตเสร็จสิ้น"}
                </Button>
              ) : (
                <Button
                  onClick={closeFormulaModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  ปิดหน้าต่าง
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
      {/* Lightbox / View Image Modal */}
      {/* Ship-to-customer: pick the courier box + how many, then hand over. */}
      {shipTarget && (() => {
        const selected = shippingBoxOptions.find((i) => String(i._id) === String(shipBoxId));
        const qty = parseInt(shipBoxQty) || 0;
        const stock = selected?.currentQuantity || 0;
        const short = !!selected && qty > stock;
        return (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60]"
            onClick={() => !shipSubmitting && setShipTarget(null)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[65]">
            <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] text-left">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-800">ส่งสินค้าให้ลูกค้า</h3>
                  <p className="text-[14px] text-slate-500 font-semibold mt-0.5">
                    {shipTarget.name} · เลือกกล่องไปรษณีย์ที่ใช้ส่ง
                  </p>
                </div>
                <button
                  type="button"
                  disabled={shipSubmitting}
                  onClick={() => setShipTarget(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    กล่องไปรษณีย์ ({shippingBoxOptions.length} รายการ)
                  </label>
                  {/* Same combobox the Sales spec modal uses: type to search, or type
                      a new name and add it (with photo + opening stock) without
                      leaving the dialog. */}
                  <CreatableSelect
                    icon="📮"
                    placeholder="ค้นหากล่อง หรือพิมพ์ชื่อเพื่อเพิ่มใหม่"
                    options={shippingBoxOptions.map((i) => ({
                      ...i,
                      name: `${i.name} (คงเหลือ ${(i.currentQuantity || 0).toLocaleString()} ใบ) · ${i.customer || "ระบบ"}`
                    }))}
                    value={shipBoxId}
                    displayName={selected ? selected.name : ""}
                    onSelect={(opt) => { setShipBoxId(opt?._id || ""); setShipError(""); }}
                    createExtras
                    onCreate={handleCreateShippingBox}
                  />
                </div>

                {selected && (
                  <div className="flex gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div
                      onClick={() => selected.image && setViewImageModal({ open: true, url: getFileUrl(selected.image), title: selected.name })}
                      className={`w-24 h-24 shrink-0 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center ${selected.image ? "cursor-zoom-in hover:ring-2 hover:ring-green-400" : ""}`}
                    >
                      {selected.image
                        ? <img src={getFileUrl(selected.image)} alt={selected.name} className="w-full h-full object-cover" />
                        : <span className="text-[13px] text-slate-400 font-bold text-center px-1">ไม่มีรูป</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-800 truncate">{selected.name}</p>
                      <p className="text-[14px] text-slate-500 font-bold mt-0.5">เจ้าของ: {selected.customer || "ระบบ"}</p>
                      <p className="text-[14px] font-mono font-bold mt-1 text-slate-600">คงเหลือ {stock.toLocaleString()} ใบ</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">จำนวนกล่องที่ใช้</label>
                  <input
                    type="number"
                    min="1"
                    value={shipBoxQty}
                    onChange={(e) => { setShipBoxQty(e.target.value); setShipError(""); }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-green-500"
                  />
                  {short && (
                    <p className="text-[14px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
                      กล่องไม่พอ — ต้องใช้ {qty.toLocaleString()} แต่คงเหลือ {stock.toLocaleString()} (ยืนยันได้ แต่สต็อกจะเหลือ 0)
                    </p>
                  )}
                </div>

                {shipError && (
                  <p className="text-[15px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{shipError}</p>
                )}

                <p className="text-[14px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 leading-relaxed">
                  ยืนยันแล้วระบบจะ <b>ตัดสต็อกกล่อง</b> · ตัดล็อตออกจากคลัง FG · และย้ายดีลกลับไป <b>Retention 1</b> ในหน้า Sales
                </p>
              </div>

              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  disabled={shipSubmitting}
                  onClick={() => setShipTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={shipSubmitting || !shipBoxId}
                  onClick={confirmShipToCustomer}
                  className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🚚 {shipSubmitting ? "กำลังส่ง..." : "ยืนยันส่งให้ลูกค้า"}
                </button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {viewImageModal.open && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[90vh]">
            <button
              onClick={() => setViewImageModal({ open: false, url: "", title: "" })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>🔍 {viewImageModal.title}</span>
              </h3>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-50 rounded-xl border border-slate-200 p-2 min-h-[300px]">
              {viewImageModal.url ? (
                <img src={viewImageModal.url} alt={viewImageModal.title} className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-sm" />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Package className="h-10 w-10 text-slate-350 mx-auto" />
                  <span className="text-xs text-slate-400 italic font-semibold block">ไม่มีรูปภาพแสดงผลในฐานข้อมูล</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3.5 mt-4 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setViewImageModal({ open: false, url: "", title: "" })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors border-none shadow-3xs cursor-pointer active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* R&D Handoff to Production Line Success Modal */}
      {handoffModal.open && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs select-none">
          <Card className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative text-left animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setHandoffModal({ open: false, customerName: "" })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center border border-green-200 shadow-xs shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800">ส่งเข้าไลน์การผลิตสำเร็จ</h4>
                <p className="text-xs text-slate-500 font-bold leading-normal">
                  ลูกค้า <span className="text-green-700 font-black">{handoffModal.customerName}</span> ได้ไปที่ไลน์การผลิตเรียบร้อยแล้ว
                </p>
              </div>
              <div className="flex w-full gap-2 mt-2">
                <button
                  onClick={() => {
                    setStageTab("line");
                    setHandoffModal({ open: false, customerName: "" });
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors border-none shadow-md shadow-green-100 active:scale-95"
                >
                  ตามไปที่ไลน์การผลิต ➔
                </button>
                <button
                  onClick={() => setHandoffModal({ open: false, customerName: "" })}
                  className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors active:scale-95 bg-white"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const stepsList = [
  { title: "1. ยืนยันวัตถุดิบ", desc: "Chemical, Pack, Label" },
  { title: "2. QC รอบที่ 1", desc: "ตรวจขวดและหัวปั๊ม" },
  { title: "3. บรรจุภัณฑ์", desc: "บรรจุชิ้นงานลงขวด" },
  { title: "4. ติดสติกเกอร์ & ห่อหุ้ม", desc: "ติดสติกเกอร์,ยิง lot,ซีลถุง" },
  { title: "5. QC รอบที่ 2", desc: "ตรวจชิ้นงานสมบูรณ์" },
  { title: "6. เสร็จสิ้น", desc: "จัดส่งเสร็จสมบูรณ์" }
];
