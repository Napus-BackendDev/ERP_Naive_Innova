"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Chip } from "@heroui/react";
import {
  Plus, MoreHorizontal, MapPin, X, Phone, User, Home, Search,
  Layers, Package, CheckSquare, Square, Info, Calendar, Trash2, GripVertical, MessageSquare, Settings, Zap, Star, Move, Upload, Download, FileText, FileSpreadsheet,
  ChevronDown, ChevronRight, ClipboardList, LayoutGrid, List as ListIcon,
  ArrowDownWideNarrow, ArrowUpNarrowWide
} from "lucide-react";
import { openProductionSpecDoc } from "@/lib/productionSpecDoc";
import { withLotDates, addYears, todayDateOnly } from "@/lib/lotDates";
import CreatableSelect from "./CreatableSelect";
import HeroBanner from "./HeroBanner";
import UIModal from "@/components/ui/Modal";
import UIButton from "@/components/ui/Button";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SalesListView from "./SalesListView";
import LoyaltyStars, { loyaltyCount } from "./LoyaltyStars";
import Select from "@/components/ui/Select";
import { openDevelopSpecDoc } from "@/lib/developSpecDoc";

const COLUMN_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Slate", value: "#64748b" }
];

function generateLotNo(prefix, mfgDate) {
  const d = mfgDate ? new Date(mfgDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dateStr = `${y}${m}${day}`;
  if (!prefix) return `XX${dateStr}`;
  return `${prefix.toUpperCase()}${dateStr}`;
}

export default function SalesCrmView({
  leads,
  formulas = [],
  ingredients = [],
  packagings = [],
  scents = [],
  nozzles = [],
  prefixConfigs = [],
  productLots = [],
  sampleProducts = [],
  onCreateScent,
  onCreateNozzle,
  onCreatePackaging,
  onCreateLabel,
  modalOpen,
  setModalOpen,
  drawerOpen,
  setDrawerOpen,
  selectedLead,
  setSelectedLead,
  handleCreateLead,
  handleUpdateLead,
  handleMoveLead,
  handleDeleteLead,
  setCreateLeadSection,
  boardColumns = [],
  saveBoardColumns
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // A blank lot line item. scentId/nozzleId hold the ObjectId link to the
  // master catalog; scentType/nozzleType keep a denormalized name snapshot.
  const emptyLotItem = () => ({
    // Blank, not formulas[0]: defaulting to "whatever formula sorts first" meant an
    // untouched row still looked like a deliberate choice once saved.
    formulaId: "",
    formulaName: "",
    quantityKg: "",
    quantityPcs: "",
    bottleSize: "",
    packagingType: "",
    packagingItemId: "",
    labelType: "",
    labelItemId: "",
    scentId: "",
    scentType: "",
    nozzleId: "",
    nozzleType: "",
    // New detailed spec fields
    brand: "",
    customerName: "",
    customerFormulaType: "เลือกสูตรโรงงาน",
    fillVolume: "",
    bottleCount: "",
    nozzleCount: "",
    bottlesDelivered: false,
    autoMfgDate: true,
    mfgDate: new Date().toISOString().split("T")[0],
    expDate: "",
    printLocation: "ยิงใต้ขวด",
    notifyLot: false,
    stickerWidth: "",
    stickerHeight: "",
    stickerOrderer: "Naive",
    stickerStatus: "รอสติกเกอร์",
    labelArtworkUrl: "",
    productImageUrl: "",
    notes: ""
  });

  // Pull the development-order line item from orderedProducts. Handles both the
  // current array shape and the legacy single-object shape.
  const getDevItem = (op) => {
    if (!op) return null;
    if (Array.isArray(op)) return op.find(p => p && p.isDevelopment) || null;
    return (typeof op === "object" && op.isDevelopment) ? op : null;
  };

  const emptyDevelopItem = () => ({
    formulaId: "",
    formulaName: "",
    brand: "",
    productCategory: "",
    targetSkinPet: "",
    desiredClaim: "",
    activeIngredients: "",
    textureColorScent: "",
    ingredientsMustHaveAvoid: "",
    budgetAndQty: "",
    timelineTarget: "",
    referenceSample: "",
    targetPackaging: "",
    marketStandard: "",
    shelfLife: "",
    ipNdaAgreement: "",
    brief: "",
    isDevelopment: true
  });

  const normalizeDevelopItems = (op) => {
    const rows = Array.isArray(op) ? op : (op ? [op] : []);
    const devRows = rows
      .filter(p => p && (p.isDevelopment || p.formulaName))
      .map(p => ({
        ...emptyDevelopItem(),
        ...p,
        formulaName: p.formulaName || "",
        brand: p.brand || "",
        productCategory: p.productCategory || p.briefSpec?.productCategory || "",
        targetSkinPet: p.targetSkinPet || p.briefSpec?.targetSkinPet || "",
        desiredClaim: p.desiredClaim || p.briefSpec?.desiredClaim || p.briefSpec?.claims || "",
        activeIngredients: p.activeIngredients || p.briefSpec?.activeIngredients || "",
        textureColorScent: p.textureColorScent || p.briefSpec?.textureColorScent || "",
        ingredientsMustHaveAvoid: p.ingredientsMustHaveAvoid || p.briefSpec?.ingredientsMustHaveAvoid || p.briefSpec?.prohibitedIngredients || "",
        budgetAndQty: p.budgetAndQty || p.briefSpec?.budgetAndQty || "",
        timelineTarget: p.timelineTarget || p.briefSpec?.timelineTarget || p.briefSpec?.timeline || "",
        referenceSample: p.referenceSample || p.briefSpec?.referenceSample || p.briefSpec?.benchmarkSample || "",
        targetPackaging: p.targetPackaging || p.briefSpec?.targetPackaging || p.briefSpec?.packagingDetails || "",
        marketStandard: p.marketStandard || p.briefSpec?.marketStandard || p.briefSpec?.marketAndStandard || "",
        shelfLife: p.shelfLife || p.briefSpec?.shelfLife || "",
        ipNdaAgreement: p.ipNdaAgreement || p.briefSpec?.ipNdaAgreement || p.briefSpec?.formulaIP || "",
        brief: p.brief || p.developBrief || p.notes || p.briefSpec?.brief || p.briefSpec?.briefNote || "",
        isDevelopment: true
      }));
    return devRows.length ? devRows : [emptyDevelopItem()];
  };

  // Normalize a stored ordered-product into a lot line item (back-compat: older
  // records only have the string scentType/nozzleType and no *Id).
  const mapOrderedToItem = (x) => ({
    formulaId: x.formulaId || "",
    formulaName: x.formulaName || "",
    quantityKg: x.quantityKg || "",
    quantityPcs: x.quantityPcs || "",
    bottleSize: x.bottleSize || "",
    packagingType: x.packagingType || "",
    packagingItemId: x.packagingItemId || "",
    labelType: x.labelType || "",
    labelItemId: x.labelItemId || "",
    scentId: x.scentId || "",
    scentType: x.scentType || "",
    nozzleId: x.nozzleId || "",
    nozzleType: x.nozzleType || "",
    // New detailed spec fields
    brand: x.brand || "",
    customerName: x.customerName || "",
    customerFormulaType: x.customerFormulaType || "เลือกสูตรโรงงาน",
    fillVolume: x.fillVolume || "",
    bottleCount: x.bottleCount || "",
    nozzleCount: x.nozzleCount || "",
    bottlesDelivered: x.bottlesDelivered || false,
    autoMfgDate: x.autoMfgDate !== undefined ? x.autoMfgDate : true,
    mfgDate: x.mfgDate || "",
    expDate: x.expDate || "",
    printLocation: x.printLocation || "ยิงใต้ขวด",
    notifyLot: x.notifyLot || false,
    stickerWidth: x.stickerWidth || "",
    stickerHeight: x.stickerHeight || "",
    stickerOrderer: x.stickerOrderer || "Naive",
    stickerStatus: x.stickerStatus || "รอสติกเกอร์",
    labelArtworkUrl: x.labelArtworkUrl || "",
    productImageUrl: x.productImageUrl || "",
    notes: x.notes || ""
  });

  // The label stays human-readable in the form, but every saved BOM-backed line
  // carries the stable ObjectId. Name-only rows remain valid for development and
  // legacy imports until R&D creates/selects a real BOM formula.
  const withFormulaLink = (item) => {
    const formula = item?.formulaId
      ? formulas.find(f => String(f._id) === String(item.formulaId))
      : formulas.find(f => f.name === String(item?.formulaName || "").trim());
    return {
      ...item,
      formulaId: formula?._id || item?.formulaId || "",
      formulaName: formula?.name || String(item?.formulaName || "").trim()
    };
  };

  // Packaging inventory split into the accessory pickers. Nozzles (หัวฉีด) now
  // live in the packaging collection as PackagingType "หัวฉีด" (migrated from the
  // old standalone nozzles collection), so they're filtered out of the bottle
  // picker and into their own nozzleOptions.
  const packOptions = packagings.filter(p => {
    const n = (p.type?.name || p.category || "").toLowerCase();
    return !n.includes("ฉลาก") && !n.includes("สติกเกอร์") && !n.includes("กล่อง") && !n.includes("ซอง") && !n.includes("หัวฉีด");
  });
  const labelOptions = packagings.filter(p => {
    const n = (p.type?.name || p.category || p.name || "").toLowerCase();
    return n.includes("ฉลาก") || n.includes("สติกเกอร์");
  });
  const nozzleOptions = packagings.filter(p => (p.type?.name || p.category || "").toLowerCase().includes("หัวฉีด"));
  const idByName = (list, name) => list.find(p => p.name === name)?._id || "";

  // Which packaging/label items belong to "the system" (Naive) vs a customer.
  const SYSTEM_OWNERS = ["ระบบ", "นาอีฟ", "naive", "กลาง", "nice"];
  const isSystemOwner = (c) => SYSTEM_OWNERS.includes((c || "").trim().toLowerCase());

  // Owner tabs for the packaging/label pickers.
  const OWNER_TABS = [
    { key: "customer", label: "ลูกค้า" },
    { key: "naive", label: "Naive" }
  ];

  // Deduplicate nozzles (from packaging type "หัวฉีด") and scents by name.
  // Keyed by owner+name, not name alone: a customer's nozzle and Naive's nozzle
  // may share a name and both must survive for the owner tabs to list them.
  const uniqueNozzles = React.useMemo(() => {
    const map = new Map();
    nozzleOptions.forEach(n => {
      if (n && n.name) map.set(`${(n.customer || "").trim().toLowerCase()}|${n.name.trim().toLowerCase()}`, n);
    });
    return Array.from(map.values());
  }, [nozzleOptions]);

  const uniqueScents = React.useMemo(() => {
    const map = new Map();
    (scents || []).forEach(s => {
      if (s && s.name) {
        map.set(s.name.trim().toLowerCase(), s);
      }
    });
    return Array.from(map.values());
  }, [scents]);

  // Build a tabbed option list: the given customer's own items (tab "customer")
  // plus a "pending upload" placeholder, and the system's items (tab "naive").
  const buildTabbedOptions = (list, customerName) => {
    const cust = (customerName || "").trim().toLowerCase();
    const customerItems = cust
      ? list.filter(p => (p.customer || "").trim().toLowerCase() === cust).map(p => ({ ...p, _tab: "customer" }))
      : [];
    const naiveItems = list.filter(p => isSystemOwner(p.customer)).map(p => ({ ...p, _tab: "naive" }));
    // No placeholder: if the item isn't in stock yet, the user types the name and
    // adds it to the database inline (see CreatableSelect's create hint).
    return [...customerItems, ...naiveItems];
  };
  const [dragOverCol, setDragOverCol] = useState(null);
  
  // Custom Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x: number, y: number, lead: Lead }

  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#3b82f6");
  // Where a new stage gets inserted: null = append (header button), a number =
  // the slot the small "+" between columns was clicked at.
  const [insertAtIndex, setInsertAtIndex] = useState(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  // Which sub-tab is active inside the Import/Export modal ("import" | "export").
  const [impExpTab, setImpExpTab] = useState("import");

  // Per-column collapse: map of { [colId]: true } for columns minimized to a
  // narrow vertical bar (cards hidden) to save horizontal space. Initialized
  // from localStorage so the collapsed/expanded layout survives a page reload.
  const [collapsedCols, setCollapsedCols] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem("salesCollapsedCols") || "{}") || {};
    } catch {
      return {};
    }
  });
  const [localColumns, setLocalColumns] = useState(boardColumns);

  // Persist collapse state per browser whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem("salesCollapsedCols", JSON.stringify(collapsedCols));
    } catch {
      /* ignore quota / unavailable storage */
    }
  }, [collapsedCols]);

  useEffect(() => {
    setLocalColumns(boardColumns);
  }, [boardColumns]);

  // Customer search across the whole board. With hundreds of leads spread over
  // 14 columns, finding one by scrolling is hopeless — type a name/phone, see
  // which stage it sits in, click to jump there and flash the card.
  const [boardSearch, setBoardSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHitId, setSearchHitId] = useState(null);

  const searchMatches = (() => {
    const q = boardSearch.trim().toLowerCase();
    if (!q) return [];
    const qDigits = q.replace(/\D/g, "");
    return (leads || []).filter(l => {
      const name = String(l.name || "").toLowerCase();
      if (name.includes(q)) return true;
      const phone = String(l.phone || "").replace(/\D/g, "");
      return qDigits.length >= 3 && phone.includes(qDigits);
    }).slice(0, 25);
  })();

  // Expand the target column, scroll its card into view, flash it for ~2.5s.
  const locateLead = (lead) => {
    if (!lead) return;
    setViewMode("board");
    setCollapsedCols(p => (p[lead.section] ? { ...p, [lead.section]: false } : p));
    setSearchOpen(false);
    setSearchHitId(lead._id);
    setTimeout(() => {
      const el = document.getElementById(`sales-card-${lead._id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
    }, 80);
    setTimeout(() => setSearchHitId(id => (id === lead._id ? null : id)), 2600);
  };

  // Ref callback that fits a textarea to its content on mount — needed so a long
  // pre-filled note (e.g. an imported Asana blurb) opens fully expanded, not
  // stuck at the min height. onInput keeps it growing as the user types. The
  // drawer animates in, so the first measure can read a clamped scrollHeight;
  // re-measuring after the transition settles fixes that.
  const fitTextarea = (el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
  const autoGrow = (el) => {
    if (!el) return;
    requestAnimationFrame(() => fitTextarea(el));
    setTimeout(() => fitTextarea(el), 120);
    setTimeout(() => fitTextarea(el), 400);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newCol = { id: newId, label: newColumnName.trim(), isDefault: false, color: newColumnColor };
    // insertAtIndex === null → append at the end (the header button); a number
    // comes from the small "+" between columns, so the stage lands right there.
    const next = [...localColumns];
    next.splice(insertAtIndex ?? next.length, 0, newCol);
    saveBoardColumns(next);
    setNewColumnName("");
    setNewColumnColor("#3b82f6");
    setInsertAtIndex(null);
    setShowAddColumnModal(false);
  };

  const handleDeleteColumn = (colId) => {
    const col = localColumns.find(c => c.id === colId);
    if (!col) return;
    const fallbackCol = localColumns.find(c => c.id !== colId);
    if (!fallbackCol) {
      alert("ไม่สามารถลบคอลัมน์สุดท้ายของบอร์ดได้");
      return;
    }
    const leadsInCol = leads.filter(l => l.section === colId);
    if (leadsInCol.length > 0) {
      if (!window.confirm(`คอลัมน์ "${col.label}" มี ${leadsInCol.length} ดีลอยู่ ดีลจะถูกย้ายไปที่คอลัมน์ "${fallbackCol.label}" ต้องการลบหรือไม่?`)) return;
      // Move leads to fallbackCol
      leadsInCol.forEach(l => handleMoveLead(l._id, fallbackCol.id));
    }
    saveBoardColumns(localColumns.filter(c => c.id !== colId));
  };

  const handleMoveColumnPosition = (columnId, targetIdx) => {
    const colToMove = localColumns.find(c => c.id === columnId);
    if (!colToMove) return;
    const remaining = localColumns.filter(c => c.id !== columnId);
    const updated = [...remaining];
    updated.splice(targetIdx, 0, colToMove);
    const ordered = updated.map((c, i) => ({ ...c, order: i }));
    setLocalColumns(ordered);
    saveBoardColumns(ordered);
  };

  const fileInputRef = useRef(null);

  // CSV cell writer. Quotes alone do NOT stop Excel turning "0812345678" into the
  // number 812345678 — the leading zero of every Thai phone number was lost the
  // moment the file was opened, so exports and the import template disagreed with
  // what is actually stored. ="…" is the one form Excel treats as literal text.
  const csvCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const csvTextCell = (val) => {
    const s = String(val ?? "");
    if (!s) return '""';
    return `"=""${s.replace(/"/g, '""""')}"""`;
  };
  // Undo csvTextCell (and Excel's own ="…" wrapper) when reading a file back.
  const stripCsvTextWrapper = (val) => {
    const s = String(val ?? "").trim();
    const m = s.match(/^=\s*"(.*)"$/s);
    return m ? m[1].replace(/""/g, '"') : s;
  };

  const handleExportLeads = () => {
    const headers = ["ชื่อลูกค้า", "เบอร์โทรศัพท์", "ประเภทออเดอร์", "ขั้นตอน", "หมายเหตุ", "ที่อยู่"];
    const rows = leads.map(l => {
      const col = localColumns.find(c => c.id === l.section);
      const colLabel = col ? col.label : "";
      
      let displayOrderType = "";
      if (l.orderType === "lot") displayOrderType = "สั่งผลิตล็อต";
      else if (l.orderType === "sample") displayOrderType = "สั่งสินค้าตัวอย่าง";
      else displayOrderType = "สอบถามข้อมูล";

      return [
        l.name || "",
        l.phone || "",
        displayOrderType,
        colLabel,
        l.notes || "",
        l.address || ""
      ];
    });

    // Column 1 is the phone \u2014 written as text so Excel keeps its leading zero.
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map((val, i) => (i === 1 ? csvTextCell(val) : csvCell(val))).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Same six columns, in the same order, that the importer reads — kept in one
  // place so the template a user fills can never drift from what we parse back.
  // "วันที่สร้าง" is optional: blank means "now", a date backdates the card so a
  // batch of old leads lands on the right day of the board.
  const IMPORT_HEADERS = ["ชื่อลูกค้า / คลินิก / บริษัท", "เบอร์โทรศัพท์", "ที่อยู่", "Stage", "หมายเหตุ", "วันที่สร้าง (Created)"];
  const IMPORT_SAMPLES = [
    ["สมชาย รักดี", "0812345678", "12/3 กรุงเทพ", "รายชื่อเป้าหมาย", "สนใจครีมบำรุงผิว OEM", "2026-07-22"],
    ["สมหญิง ใจดี", "0899999999", "45/6 เชียงใหม่", "ส่งสินค้าตัวอย่าง", "ขอสูตรทดลอง Wound Healing Gel", ""]
  ];

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const stageOptions = localColumns.map(c => c.label).filter(Boolean);

    const aoa = [IMPORT_HEADERS, ...IMPORT_SAMPLES];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 34 }, { wch: 16 }, { wch: 32 }, { wch: 22 }, { wch: 30 }, { wch: 20 }];

    // Phones and dates as text so Excel keeps the leading 0 and doesn't reformat
    // the date into a serial number the importer then can't read back.
    for (let r = 2; r <= aoa.length; r++) {
      ["B", "F"].forEach(col => { const cell = ws[`${col}${r}`]; if (cell) cell.t = "s"; });
    }

    // Dropdown on the Stage column listing the board's real stages, so an
    // imported value always matches a column instead of falling to the first.
    if (stageOptions.length) {
      ws["!dataValidation"] = [{
        type: "list", allowBlank: false, sqref: "D2:D1000",
        formula1: '"' + stageOptions.join(",").slice(0, 250) + '"'
      }];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Import Template");
    XLSX.writeFile(wb, "Naive_ERP_Sales_Import_Template.xlsx");
  };


  // "2026-07-22" | "22/07/2026" | "22-07-2026" | a Date (from an xlsx date cell)
  // -> a Date at local noon, or null. Noon, not midnight, so a day never slips
  // backward when the value is later serialised to a UTC timestamp. A 4-digit
  // year >= 2500 is read as พ.ศ. and converted.
  const parseCreatedDate = (v) => {
    if (v == null || v === "") return null;
    if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12);
    const s = String(v).trim();
    let y, m, d;
    let mth = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);           // ISO
    if (mth) { [, y, m, d] = mth.map(Number); }
    else {
      mth = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);   // D/M/Y
      if (mth) { [, d, m, y] = mth.map(Number); } else return null;
    }
    if (y >= 2500) y -= 543;                                     // พ.ศ. -> ค.ศ.
    const dt = new Date(y, m - 1, d, 12);
    return isNaN(dt) || dt.getMonth() !== m - 1 ? null : dt;
  };

  // Both readers hand rows here as arrays in the template's column order:
  //   [ ชื่อ, เบอร์, ที่อยู่, Stage, หมายเหตุ, วันที่สร้าง ]
  const rowsToLeads = (rows) => {
    const leads = [];
    for (const cols of rows) {
      const name = String(cols[0] ?? "").trim();
      if (!name) continue;

      const stageVal = String(cols[3] ?? "").trim().toLowerCase();
      const matchedCol = localColumns.find(c => c.label.trim().toLowerCase() === stageVal);
      const sectionId = matchedCol ? matchedCol.id : (localColumns[0]?.id || "s1");

      // Accept the ="…" text form and a bare value; a 9-digit Thai mobile that
      // lost its leading 0 in Excel gets it back.
      let phone = stripCsvTextWrapper(cols[1]);
      if (/^[689]\d{8}$/.test(phone)) phone = "0" + phone;

      const lead = {
        name,
        phone,
        orderType: "inquiry",
        section: sectionId,
        notes: String(cols[4] ?? "").trim(),
        address: String(cols[2] ?? "").trim(),
      };
      // Backdate only when a date was given; the card then lands on that day of
      // the board (statusChangedAt drives the day grouping) instead of today.
      const created = parseCreatedDate(cols[5]);
      if (created) {
        lead.createdAt = created.toISOString();
        lead.statusChangedAt = created.toISOString();
      }
      leads.push(lead);
    }
    return leads;
  };

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parseCsvLine = (line) => {
      const result = [];
      let current = "", inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
        else current += char;
      }
      result.push(current.trim());
      return result;
    };
    return lines.slice(1).map(parseCsvLine);   // drop header
  };

  const readImportRows = async (file) => {
    const isXlsx = /\.xlsx?$/i.test(file.name) ||
      file.type.includes("spreadsheet") || file.type.includes("excel");
    if (isXlsx) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      return aoa.slice(1);   // drop header row
    }
    const text = await file.text();
    return parseCsvText(text);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const rows = await readImportRows(file);
      if (!rows.length) { alert("ไม่พบข้อมูลในไฟล์นำเข้า"); return; }

      const parsedLeads = rowsToLeads(rows);
      if (parsedLeads.length === 0) { alert("ไม่พบข้อมูลลูกค้าที่ถูกต้อง"); return; }

      // Skip anything already on the board, and de-duplicate within the file
      // itself — importing the same sheet twice used to double every lead. Match
      // is name + phone-digits, the same key the DB cleanup uses.
      const keyOf = (name, phone) =>
        String(name || "").trim().toLowerCase() + "|" + String(phone || "").replace(/\D/g, "");
      const existing = new Set((leads || []).map(l => keyOf(l.name, l.phone)));
      const seen = new Set();
      const importedLeads = [];
      let skipped = 0;
      for (const lead of parsedLeads) {
        const k = keyOf(lead.name, lead.phone);
        if (existing.has(k) || seen.has(k)) { skipped++; continue; }
        seen.add(k);
        importedLeads.push(lead);
      }

      if (importedLeads.length === 0) {
        alert(`ทุกรายการ (${skipped}) มีอยู่ในระบบแล้ว ไม่มีข้อมูลใหม่ให้นำเข้า`);
        return;
      }

      const backdated = importedLeads.filter(l => l.createdAt).length;
      const msg = `พบข้อมูลใหม่ ${importedLeads.length} รายการ` +
        (skipped ? ` (ข้ามที่ซ้ำ/มีอยู่แล้ว ${skipped} รายการ)` : "") +
        (backdated ? ` · ระบุวันที่ย้อนหลัง ${backdated} รายการ` : "") +
        ` ต้องการนำเข้าใช่หรือไม่?`;
      if (!window.confirm(msg)) return;

      for (const lead of importedLeads) {
        await handleCreateLead(lead);
      }
      alert(`นำเข้าสำเร็จ ${importedLeads.length} รายการ` + (skipped ? ` · ข้ามซ้ำ ${skipped} รายการ` : ""));
      window.location.reload();
    } catch (err) {
      console.error("Failed to parse import file", err);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ (.xlsx หรือ .csv)");
    }
  };

  // Create Modal Form States
  const [createOrderType, setCreateOrderType] = useState("sample"); // "inquiry", "sample", or "lot"
  const [createLotItems, setCreateLotItems] = useState([]);
  const [createDevelopItems, setCreateDevelopItems] = useState([emptyDevelopItem()]);
  // Board column the new card will be dropped into. Seeded from whichever "+"
  // opened the modal, then freely changeable in the form.
  const [createSection, setCreateSection] = useState("");
  // "board" = the Kanban; "list" = the Asana-style grouped table.
  const [viewMode, setViewMode] = useState("board");
  // Lead with the newest activity by default; users can still switch to the
  // oldest-first view when they need to chase long-waiting customers.
  const [dateOrder, setDateOrder] = useState("newest");

  // Falling back to localColumns[0] would drop a brand-new deal into whichever
  // column happens to sit first — on this board that is "ลูกค้าไม่สนใจ". Prefer
  // the new-lead column instead, and only then the leftmost one.
  const defaultCreateSection = () => {
    const cols = localColumns || [];
    const lead = cols.find(c => c.id === "s1") ||
      cols.find(c => /เป้าหมาย|lead|ผู้ติดต่อใหม่/i.test(c.label || ""));
    return (lead || cols[0])?.id || "";
  };

  // Whichever button opened the modal, the picker must start on a real column —
  // an empty select would post a lead with no stage.
  useEffect(() => {
    if (modalOpen && !createSection) setCreateSection(defaultCreateSection());
  }, [modalOpen]);
  const [createSelectedSamples, setCreateSelectedSamples] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  // Lightbox for the packaging/nozzle/sticker thumbnails in the spec modal
  const [zoomImage, setZoomImage] = useState(null);

  // Detailed Specifications Modal States
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [activeSpecIndex, setActiveSpecIndex] = useState(null);
  const [activeSpecType, setActiveSpecType] = useState(null); // "create" or "edit"

  const openSpecModal = (index, type) => {
    setActiveSpecIndex(index);
    setActiveSpecType(type);
    setIsSpecModalOpen(true);
  };

  // Edit Drawer Form States
  const [editOrderType, setEditOrderType] = useState("sample");
  const [editLotItems, setEditLotItems] = useState([]);
  const [editDevelopItems, setEditDevelopItems] = useState([emptyDevelopItem()]);
  const [editSelectedSamples, setEditSelectedSamples] = useState([]);
  const [editStage, setEditStage] = useState("");
  const [developDetailTarget, setDevelopDetailTarget] = useState(null);

  // EstValue states for dynamic placeholder computation
  const [createEstValue, setCreateEstValue] = useState("");
  const [editEstValue, setEditEstValue] = useState("");

  // Live customer name so the packaging/label pickers can show that customer's
  // own items vs the system's (Naive) items.
  const [createCustomerName, setCreateCustomerName] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");

  // Repeat-customer picker on the create-deal form. The name field is a combobox:
  // free text still creates a new customer, but typing an existing name offers to
  // reuse that record's contact details so the same customer stops being re-entered
  // (and re-spelled) as a brand new one on every deal.
  const [createPhone, setCreatePhone] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [reusedCustomer, setReusedCustomer] = useState(null);
  const [showCustomerSuggest, setShowCustomerSuggest] = useState(false);
  const customerBoxRef = useRef(null);

  // One entry per distinct customer name, carrying the newest contact details.
  const knownCustomers = React.useMemo(() => {
    const byName = new Map();
    (leads || []).forEach((l) => {
      const key = (l.name || "").trim();
      if (!key) return;
      const prev = byName.get(key.toLowerCase());
      const newer = !prev || new Date(l.updatedAt || l.createdAt || 0) > new Date(prev.updatedAt || prev.createdAt || 0);
      if (newer) byName.set(key.toLowerCase(), l);
    });
    return [...byName.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [leads]);

  const customerSuggestions = React.useMemo(() => {
    const q = createCustomerName.trim().toLowerCase();
    if (!q) return knownCustomers.slice(0, 8);
    return knownCustomers.filter((l) => (l.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [knownCustomers, createCustomerName]);

  const pickExistingCustomer = (lead) => {
    setCreateCustomerName(lead.name || "");
    setCreatePhone(lead.phone || "");
    setCreateAddress(lead.address || "");
    setReusedCustomer(lead);
    setShowCustomerSuggest(false);
  };

  useEffect(() => {
    if (!showCustomerSuggest) return;
    const onDown = (e) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target)) setShowCustomerSuggest(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showCustomerSuggest]);

  // Edit Column and Automation States
  const [editingColumn, setEditingColumn] = useState(null);
  const [editColLabel, setEditColLabel] = useState("");
  const [editColColor, setEditColColor] = useState("#3b82f6");
  const [editColRuleEnabled, setEditColRuleEnabled] = useState(false);
  const [editColRuleDays, setEditColRuleDays] = useState(7);
  const [editColRuleTarget, setEditColRuleTarget] = useState("");

  // Column drag and drop ordering state
  const [draggedColId, setDraggedColId] = useState(null);


  // A new deal starts with NO product lines. It used to auto-insert one row
  // pre-filled with whichever formula happened to be first in the list, which got
  // saved as a real order line whenever the salesperson did not notice it.

  // Clear any stale create-error when the modal (re)opens.
  useEffect(() => {
    if (modalOpen) setCreateError("");
  }, [modalOpen]);

  // Synchronize Edit states when selectedLead changes
  useEffect(() => {
    if (selectedLead) {
      const type = (!selectedLead.orderType || selectedLead.orderType === "inquiry") ? "sample" : selectedLead.orderType;
      setEditOrderType(type);
      setEditEstValue(selectedLead.estValue || "");
      setEditCustomerName(selectedLead.name || "");
      setEditError("");
      setEditStage(selectedLead.section || "");

      if (type === "lot") {
        let initialItems = [];
        if (selectedLead.orderedProducts) {
          if (Array.isArray(selectedLead.orderedProducts)) {
            initialItems = selectedLead.orderedProducts.map(mapOrderedToItem);
          } else if (typeof selectedLead.orderedProducts === "object") {
            initialItems = [mapOrderedToItem(selectedLead.orderedProducts)];
          }
        }
        if (initialItems.length === 0) {
          initialItems = [emptyLotItem()];
        }
        setEditLotItems(initialItems);
        setEditSelectedSamples([]);
        setEditDevelopItems([emptyDevelopItem()]);
      } else if (type === "sample") {
        setEditLotItems([emptyLotItem()]);
        const arr = Array.isArray(selectedLead.orderedProducts) ? selectedLead.orderedProducts : [];
        setEditSelectedSamples(arr.map(entry => {
          if (typeof entry === "string") {
            const matched = sampleProducts.find(sp => sp.name === entry);
            return {
              productId: matched ? matched._id : "",
              name: entry,
              formulaName: entry,
              size: "",
              quantity: 1
            };
          }
          return entry;
        }));
        setEditDevelopItems([emptyDevelopItem()]);
      } else if (type === "develop") {
        setEditLotItems([emptyLotItem()]);
        setEditSelectedSamples([]);
        setEditDevelopItems(normalizeDevelopItems(selectedLead.orderedProducts));
      }
    }
  }, [selectedLead, formulas, packagings]);

  // Global click listener to close context menu
  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener("click", handleCloseMenu);
    }
    return () => {
      window.removeEventListener("click", handleCloseMenu);
    };
  }, [contextMenu]);

  // Column auto-move rules now run on the server (backend/src/jobs/autoMoveLeads.js).
  // They used to run here, which meant the rule only fired while someone had this
  // page open — and then fired for every stale deal at once, one PUT per card.
  // The board simply renders whatever sections the server has already settled on.

  // Create Lot Item handlers
  const addCreateLotItem = () => {
    setCreateLotItems([...createLotItems, emptyLotItem()]);
  };

  const updateCreateLotItem = (index, field, value) => {
    setCreateLotItems(createLotItems.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    ));
  };

  // Merge several fields into one item at once (used when a combobox sets both
  // the ObjectId link and the denormalized name in a single update).
  const updateCreateLotItemFields = (index, patch) => {
    setCreateLotItems(createLotItems.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    ));
  };

  const removeCreateLotItem = (index) => {
    setCreateLotItems(createLotItems.filter((_, idx) => idx !== index));
  };

  // Edit Lot Item handlers
  const addEditLotItem = () => {
    setEditLotItems([...editLotItems, emptyLotItem()]);
  };

  const updateEditLotItem = (index, field, value) => {
    setEditLotItems(editLotItems.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    ));
  };

  const updateEditLotItemFields = (index, patch) => {
    setEditLotItems(editLotItems.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    ));
  };

  const removeEditLotItem = (index) => {
    setEditLotItems(editLotItems.filter((_, idx) => idx !== index));
  };

  // Drag & Drop logic
  const handleDragStart = (e, leadId) => {
    e.stopPropagation(); // Prevent column drag from firing when dragging a card
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (colId, e) => {
    e.preventDefault();
    if (draggedColId) {
      handleColDragOver(e, colId);
      return;
    }
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Ignore leaves caused by moving onto a child element (dragleave bubbles from
    // children) — only clear when the pointer actually exits the column. This
    // stops the drop-highlight from flickering on/off during a drag.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverCol(null);
  };

  const handleDrop = (e, targetColId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (draggedColId) {
      handleColDragEnd();
      return;
    }
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId && handleMoveLead) {
      handleMoveLead(leadId, targetColId);
    }
  };

  // Column Drag Reordering logic
  const handleColDragStart = (e, colId) => {
    setDraggedColId(colId);
    e.dataTransfer.setData("columnId", colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragOver = (e, targetColId) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    // Decide drop side from the pointer vs the target's horizontal midpoint.
    // Columns are laid out horizontally, so use clientX. Reordering by raw index
    // on every dragover makes the dragged column land under the cursor and then
    // swap back on the next event → oscillation → flicker. Anchoring the insert
    // position to the pointer side (and bailing when the order is unchanged)
    // makes the reorder deterministic and smooth.
    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientX > rect.left + rect.width / 2;

    setLocalColumns(prev => {
      const dragged = prev.find(c => c.id === draggedColId);
      if (!dragged) return prev;
      const without = prev.filter(c => c.id !== draggedColId);
      const tIdx = without.findIndex(c => c.id === targetColId);
      if (tIdx === -1) return prev;
      const insertAt = insertAfter ? tIdx + 1 : tIdx;
      const next = [
        ...without.slice(0, insertAt),
        dragged,
        ...without.slice(insertAt),
      ];
      // No-op guard: if the order is identical, return the SAME array so React
      // skips the re-render (prevents needless repaint / flicker).
      if (next.length === prev.length && next.every((c, i) => c.id === prev[i].id)) {
        return prev;
      }
      return next;
    });
  };

  const handleColDragEnd = () => {
    if (!draggedColId) return;
    setDraggedColId(null);
    saveBoardColumns(localColumns);
  };

  // Trigger Right-Click Menu
  const handleCardContextMenu = (e, lead) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      lead
    });
  };

  // Form Submit Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    let orderedProducts = null;
    if (createOrderType === "lot") {
      orderedProducts = createLotItems
        .filter(item => item.formulaName && item.formulaName.toString().trim() !== "")
        .map(item => {
          const pcs = (item.quantityPcs || "").toString().trim();
          const kg = (parseFloat(pcs) || 0) * (parseFloat(item.fillVolume || item.bottleSize) || 0) / 1000;
          return {
            ...withFormulaLink(withLotDates(item)),
            quantityKg: kg,
            quantityPcs: pcs
          };
        });
    } else if (createOrderType === "sample") {
      orderedProducts = createSelectedSamples;
    } else if (createOrderType === "develop") {
      orderedProducts = createDevelopItems
        .map(item => ({
          ...withFormulaLink(item),
          formulaName: (item.formulaName || "").trim(),
          brief: item.brief || "",
          isDevelopment: true
        }))
        .filter(item => item.formulaName);
    }

    let paidAmount = "";
    let estValue = "";

    if (createOrderType === "lot") {
      estValue = form.estValue ? (form.estValue.value || "") : "";
      paidAmount = form.paidAmount ? (form.paidAmount.value || "") : "";
    }

    const payload = {
      name: form.name.value,
      brand: form.brand?.value || "",
      phone: form.phone.value,
      address: createOrderType === "inquiry" ? (form.address.value || "") : form.address.value,
      orderType: createOrderType,
      orderedProducts,
      notes: form.notes.value,
      email: `lead.${Date.now()}.${Math.round(Math.random() * 100)}@naiveops.com`,
      province: form.address.value ? form.address.value.slice(0, 20) : "",
      estValue,
      payPct: "",
      paidAmount,
      section: createSection
    };

    setCreating(true);
    setCreateError("");
    try {
      await handleCreateLead(payload);
      // Reset States only on success (modal closed by the page handler).
      setCreateOrderType("sample");
      setCreateEstValue("");
      setCreateCustomerName("");
      setCreatePhone("");
      setCreateAddress("");
      setReusedCustomer(null);
      setCreateLotItems([]);
      setCreateDevelopItems([emptyDevelopItem()]);
      setCreateSelectedSamples([]);
      setCreateSection("");
    } catch (err) {
      // Keep the modal open with its data intact so the user can retry.
      setCreateError("บันทึกดีลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    let orderedProducts = null;
    if (editOrderType === "lot") {
      orderedProducts = editLotItems
        .filter(item => item.formulaName && item.formulaName.toString().trim() !== "")
        .map(item => {
          const pcs = (item.quantityPcs || "").toString().trim();
          const kg = (parseFloat(pcs) || 0) * (parseFloat(item.fillVolume || item.bottleSize) || 0) / 1000;
          return {
            ...withFormulaLink(withLotDates(item)),
            quantityKg: kg,
            quantityPcs: pcs
          };
        });
    } else if (editOrderType === "sample") {
      orderedProducts = editSelectedSamples;
    } else if (editOrderType === "develop") {
      orderedProducts = editDevelopItems
        .map(item => ({
          ...withFormulaLink(item),
          formulaName: (item.formulaName || "").trim(),
          brief: item.brief || "",
          isDevelopment: true
        }))
        .filter(item => item.formulaName);
    }

    let paidAmount = "";
    let estValue = "";

    if (editOrderType === "lot") {
      estValue = form.estValue ? (form.estValue.value || "") : "";
      paidAmount = form.paidAmount ? (form.paidAmount.value || "") : "";
    }

    const payload = {
      name: form.name.value,
      // The deal-level brand input was removed — keep whatever the record already
      // has instead of wiping it (form.brand no longer exists).
      brand: selectedLead.brand || "",
      phone: form.phone.value,
      address: editOrderType === "inquiry" ? (form.address.value || "") : form.address.value,
      orderType: editOrderType,
      orderedProducts,
      notes: form.notes.value,
      province: form.address.value ? form.address.value.slice(0, 20) : "",
      estValue,
      payPct: "",
      paidAmount
    };

    if (editStage && editStage !== selectedLead.section) {
      const targetCol = boardColumns.find(c => c.id === editStage);
      const targetIsTargetList = targetCol && targetCol.label === "รายชื่อเป้าหมาย";
      payload.section = editStage;
      payload.previousSection = targetIsTargetList
        ? (selectedLead.section === editStage ? (selectedLead.previousSection || "") : (selectedLead.section || ""))
        : "";
      const targetIsClosedWon = targetCol && (targetCol.label === "ปิดการขาย" || targetCol.label === "Closed Won" || targetCol.id === "s11");
      const targetIsRetention1 = targetCol && /^retention\s*1$/i.test(targetCol.label || "");
      const shouldCloseDevelopOrder = targetIsRetention1 && selectedLead.orderType === "develop";
      payload.isReturningCustomer = selectedLead.isReturningCustomer || targetIsClosedWon || targetIsRetention1 || false;
      if (shouldCloseDevelopOrder) {
        payload.orderType = "";
        payload.orderedProducts = [];
      }
      payload.statusChangedAt = new Date().toISOString();
    }

    setEditSubmitting(true);
    setEditError("");
    try {
      await handleUpdateLead(selectedLead._id, payload);
    } catch (err) {
      // Keep the drawer open with its data so the user can retry.
      setEditError("บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Sales prints the same sheet Production prints — see lib/productionSpecDoc.
  // A line has left Sales' hands once R&D confirmed the BOM (producedLotId set /
  // isConfirmed) or Production moved it past the waiting state. Checked against
  // selectedLead.orderedProducts, not editLotItems — mapOrderedToItem drops these
  // production fields.
  const PRE_PRODUCTION_STATUSES = ["", "ยังไม่ผลิต", "ยังไม่พร้อม"];
  const lineInProduction = (p) =>
    !!p?.producedLotId ||
    p?.isConfirmed === true ||
    !PRE_PRODUCTION_STATUSES.includes((p?.productionStatus || "").trim());

  const lockedLines = (() => {
    const op = selectedLead?.orderedProducts;
    const arr = Array.isArray(op) ? op : (op ? [op] : []);
    return arr.filter(lineInProduction);
  })();
  // No unlock flag: approval is a one-way door for Sales.
  const lotBoxLocked = lockedLines.length > 0;

  const downloadProductionDoc = (item, meta = {}) =>
    openProductionSpecDoc({ item, customer: selectedLead || {}, packagings, formulas, meta });

  const downloadDevelopDocFromForm = (form, fallbackItem = {}, fallbackCustomer = {}) => {
    const item = {
      ...fallbackItem,
      formulaName: (fallbackItem.formulaName || form?.developFormulaName?.value || "").trim(),
      isDevelopment: true
    };
    const customer = {
      ...fallbackCustomer,
      name: form?.name?.value || fallbackCustomer.name || "",
      brand: form?.brand?.value || fallbackCustomer.brand || "",
      phone: form?.phone?.value || fallbackCustomer.phone || "",
      address: form?.address?.value || fallbackCustomer.address || "",
      notes: form?.notes?.value || fallbackCustomer.notes || ""
    };
    openDevelopSpecDoc({ item, customer, formulas });
  };

  const developItemsOf = (type) => type === "edit" ? editDevelopItems : createDevelopItems;
  const setDevelopItemsOf = (type, updater) => {
    const setter = type === "edit" ? setEditDevelopItems : setCreateDevelopItems;
    setter(prev => {
      const base = prev.length ? prev : [emptyDevelopItem()];
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const updateDevelopItem = (type, index, patch) => {
    setDevelopItemsOf(type, prev => prev.map((item, idx) =>
      idx === index ? { ...item, ...patch, isDevelopment: true } : item
    ));
  };

  const addDevelopItem = (type) => setDevelopItemsOf(type, prev => [...prev, emptyDevelopItem()]);

  const removeDevelopItem = (type, index) => {
    setDevelopItemsOf(type, prev => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [emptyDevelopItem()];
    });
  };

  const openDevelopDetailModal = (type, index) => setDevelopDetailTarget({ type, index });

  const saveDevelopDetail = (detail) => {
    if (!developDetailTarget) return;
    updateDevelopItem(developDetailTarget.type, developDetailTarget.index, detail);
    setDevelopDetailTarget(null);
  };


  const renderDevelopOrderBox = (type, formCustomer = {}) => {
    const items = developItemsOf(type);
    const customer = type === "edit" ? (selectedLead || {}) : formCustomer;
    return (
      <div className="flex flex-col gap-3 border-2 border-dashed border-purple-200 rounded-2xl p-4 bg-purple-50/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-purple-600">
            <Zap className="h-4 w-4" />
            <p className="text-xs font-black">{"\u0e2a\u0e31\u0e48\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e2a\u0e39\u0e15\u0e23\u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c\u0e43\u0e2b\u0e21\u0e48"}</p>
          </div>
          <button type="button" onClick={() => addDevelopItem(type)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 font-black text-[13px] transition-colors cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            {"\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e2a\u0e39\u0e15\u0e23"}
          </button>
        </div>
        {items.map((item, idx) => (
          <div key={`${type}-develop-${idx}`} className="bg-white border border-purple-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-black text-purple-700">{"\u0e2a\u0e39\u0e15\u0e23\u0e17\u0e35\u0e48"} {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeDevelopItem(type, idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors" title="delete develop order">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[14px] text-slate-500 font-bold">{"\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e39\u0e15\u0e23/\u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e1e\u0e31\u0e12\u0e19\u0e32"}</label>
              <input value={item.formulaName || ""} onChange={(e) => updateDevelopItem(type, idx, { formulaName: e.target.value })} className="w-full p-2.5 bg-white border border-purple-200 rounded-xl focus:border-purple-500 outline-none text-xs font-semibold text-slate-800" placeholder={"\u0e40\u0e0a\u0e48\u0e19 \u0e40\u0e0b\u0e23\u0e31\u0e48\u0e21\u0e27\u0e34\u0e15\u0e32\u0e21\u0e34\u0e19\u0e0b\u0e35 \u0e2a\u0e39\u0e15\u0e23\u0e40\u0e09\u0e1e\u0e32\u0e30"} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[14px] text-slate-500 font-bold">{"\u0e41\u0e1a\u0e23\u0e19\u0e14\u0e4c"}</label>
              <input value={item.brand || ""} onChange={(e) => updateDevelopItem(type, idx, { brand: e.target.value })} className="w-full p-2.5 bg-white border border-purple-200 rounded-xl focus:border-purple-500 outline-none text-xs font-semibold text-slate-800" placeholder={"\u0e40\u0e0a\u0e48\u0e19 Naive, Pet Care, \u0e41\u0e1a\u0e23\u0e19\u0e14\u0e4c\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32"} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => openDevelopDetailModal(type, idx)} className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-black text-xs transition-colors cursor-pointer"><Info className="h-4 w-4" />{"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}</button>
              <button type="button" onClick={(e) => downloadDevelopDocFromForm(e.currentTarget.form, item, customer)} className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 font-black text-xs transition-colors cursor-pointer"><FileText className="h-4 w-4" />{"\u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e2a\u0e39\u0e15\u0e23"}</button>
            </div>
            {(item.brand || item.productCategory || item.targetSkinPet || item.brief) && (
              <p className="text-[13px] text-slate-500 font-semibold line-clamp-2 bg-purple-50/70 border border-purple-100 rounded-lg px-2.5 py-2">
                {[item.brand, item.productCategory, item.targetSkinPet, item.brief].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const toggleCreateSample = (p) => {
    if (createSelectedSamples.some(x => x.productId === p._id)) {
      setCreateSelectedSamples(createSelectedSamples.filter(x => x.productId !== p._id));
    } else {
      setCreateSelectedSamples([...createSelectedSamples, { productId: p._id, name: p.name, formulaName: p.formulaName, size: p.size || "", quantity: 1 }]);
    }
  };

  const toggleEditSample = (p) => {
    if (editSelectedSamples.some(x => x.productId === p._id)) {
      setEditSelectedSamples(editSelectedSamples.filter(x => x.productId !== p._id));
    } else {
      setEditSelectedSamples([...editSelectedSamples, { productId: p._id, name: p.name, formulaName: p.formulaName, size: p.size || "", quantity: 1 }]);
    }
  };

  const setCreateSampleQty = (productId, qty) => {
    setCreateSelectedSamples(createSelectedSamples.map(x => x.productId === productId ? { ...x, quantity: Math.max(1, Number(qty) || 1) } : x));
  };

  const setEditSampleQty = (productId, qty) => {
    setEditSelectedSamples(editSelectedSamples.map(x => x.productId === productId ? { ...x, quantity: Math.max(1, Number(qty) || 1) } : x));
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100dvh-8rem)] select-none">
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.csv"
        onChange={handleImportFileChange}
        className="hidden"
      />
      <HeroBanner
        title="Sales"
        subtitle="ระบบจัดการข้อมูลการขาย บันทึกการเจรจา และติดตามสถานะลูกค้า (Pipeline Stage)"
        onCreateManual={() => { setCreateSection(defaultCreateSection()); setModalOpen(true); }}
        createLabel="เพิ่มดีลใหม่ (Lead)"
        onImportExport={() => setShowImportExportModal(true)}
        importExportLabel="นำเข้า/ส่งออกเอกสาร"
      >
        {/* Board / List switch. Sits left of "เพิ่ม Stage ใหม่" so the two
            board-level controls stay together. */}
        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          {[
            { id: "board", label: "บอร์ด", icon: LayoutGrid },
            { id: "list", label: "ลิสต์", icon: ListIcon }
          ].map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                  viewMode === v.id
                    ? "bg-white text-slate-800 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className={`h-4 w-4 ${viewMode === v.id ? "text-green-600" : ""}`} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            onClick={() => { setInsertAtIndex(null); setShowAddColumnModal(!showAddColumnModal); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
              showAddColumnModal
                ? "bg-slate-100 text-slate-800 border-slate-300"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Layers className="h-4 w-4 text-blue-600" />
            <span>เพิ่ม Stage ใหม่</span>
          </button>
          {showAddColumnModal && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowAddColumnModal(false); setNewColumnName(""); setInsertAtIndex(null); }} />
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4 text-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm text-slate-800">
                    {insertAtIndex !== null && localColumns[insertAtIndex]
                      ? `แทรก Stage ก่อน "${localColumns[insertAtIndex].label}"`
                      : "เพิ่ม Stage ใหม่ (ต่อท้าย)"}
                  </h4>
                    <p className="text-[14px] text-slate-400">คอลัมน์จะปรากฏในบอร์ด</p>
                  </div>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") { setShowAddColumnModal(false); setNewColumnName(""); } }}
                  placeholder="เช่น รอชำระเงิน, จัดส่งสินค้า..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 placeholder:text-slate-300"
                />
                {/* Where the new stage lands on the board */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[14px] text-slate-400 font-bold uppercase">ตำแหน่งคอลัมน์</label>
                  <select
                    value={insertAtIndex === null ? "end" : String(insertAtIndex)}
                    onChange={(e) => setInsertAtIndex(e.target.value === "end" ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="end">ต่อท้ายสุด (ขวาสุด)</option>
                    {localColumns.map((c, i) => (
                      <option key={c.id} value={i}>{`แทรกก่อน "${c.label}"`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[14px] text-slate-400 font-bold uppercase">สีประจำคอลัมน์</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLUMN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewColumnColor(c.value)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-all border-2 ${
                          newColumnColor === c.value
                            ? "border-slate-800 scale-110 shadow-xs"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 hover:scale-105 transition-all">
                      <input
                        type="color"
                        value={newColumnColor}
                        onChange={(e) => setNewColumnColor(e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        title="กำหนดสีเอง"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> สร้างคอลัมน์
                  </button>
                  <button
                    onClick={() => { setShowAddColumnModal(false); setNewColumnName(""); }}
                    className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </HeroBanner>

      {/* Search on the left, date order on the right — one row, so the two
          things that reshape the board sit together. */}
      <div className="w-full flex items-start justify-between gap-3 flex-wrap">
      {/* Board-wide customer search: locates a lead across every stage. */}
      <div className="relative w-full max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={boardSearch}
            onChange={(e) => { setBoardSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchMatches[0]) locateLead(searchMatches[0]);
              if (e.key === "Escape") { setBoardSearch(""); setSearchOpen(false); }
            }}
            placeholder="ค้นหาลูกค้า (ชื่อ / เบอร์)"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all shadow-2xs placeholder:text-slate-300"
          />
          {boardSearch && (
            <button
              type="button"
              onClick={() => { setBoardSearch(""); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="ล้างการค้นหา"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchOpen && boardSearch.trim() && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-4 py-2 text-[14px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                พบ {searchMatches.length} รายการ
              </div>
              {searchMatches.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">ไม่พบลูกค้าที่ตรงกับ “{boardSearch.trim()}”</div>
              ) : (
                <div className="max-h-80 overflow-y-auto py-1">
                  {searchMatches.map(lead => {
                    const col = localColumns.find(c => c.id === lead.section);
                    return (
                      <button
                        key={lead._id}
                        type="button"
                        onClick={() => locateLead(lead)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-green-50/60 transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-slate-800 truncate">{lead.name || "(ไม่มีชื่อ)"}</span>
                          {lead.phone && <span className="text-[15px] text-slate-400">{lead.phone}</span>}
                        </div>
                        <span
                          className="shrink-0 text-[14px] font-bold px-2 py-1 rounded-full border"
                          style={{
                            color: col?.color || "#64748b",
                            borderColor: `${col?.color || "#94a3b8"}55`,
                            backgroundColor: `${col?.color || "#94a3b8"}14`,
                          }}
                        >
                          {col?.label || "ไม่ทราบคอลัมน์"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

        {/* Date order — which end of the timeline leads every column. */}
        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-2xs shrink-0">
          {[
            { id: "newest", label: "ล่าสุดก่อน", icon: ArrowDownWideNarrow },
            { id: "oldest", label: "เก่าสุดก่อน", icon: ArrowUpNarrowWide }
          ].map(o => {
            const Icon = o.icon;
            const active = dateOrder === o.id;
            return (
              <button
                key={o.id}
                type="button"
                title={o.id === "newest" ? "เรียงวันที่ใหม่สุดขึ้นก่อน" : "เรียงวันที่เก่าสุดขึ้นก่อน (ค้างนานสุดอยู่บน)"}
                onClick={() => setDateOrder(o.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-slate-800 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-green-600" : ""}`} />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "list" && (
        <SalesListView
          leads={leads}
          columns={localColumns}
          onOpenLead={(lead) => { setSelectedLead(lead); setDrawerOpen(true); }}
          onCreateInSection={(sectionId) => {
            setCreateLeadSection(sectionId || defaultCreateSection());
            setCreateSection(sectionId || defaultCreateSection());
            setModalOpen(true);
          }}
          onUpdateLead={handleUpdateLead}
        />
      )}

      <div className={`flex-1 gap-4 overflow-x-auto pb-4 items-start select-none ${viewMode === "board" ? "flex" : "hidden"}`}>
        {localColumns.map((col, colIdx) => {
          let colLeads = leads.filter(x => x.section === col.id);
          if (col.label === "รายชื่อเป้าหมาย") {
            const getPriorityWeight = (lead) => {
              const prevCol = localColumns.find(c => c.id === lead.previousSection);
              const label = prevCol ? prevCol.label : "";
              if (label.includes("Retention 3")) return 1;
              if (label.includes("Retention 2")) return 2;
              if (label.includes("Retention 1")) return 3;
              if (loyaltyCount(lead) > 0) return 4;
              if (label.includes("ติดตามครั้งที่ 3") || label.toLowerCase().includes("follow-up 3") || label.includes("Follow-up ครั้งที่ 3")) return 5;
              if (label.includes("ติดตามครั้งที่ 2") || label.toLowerCase().includes("follow-up 2") || label.includes("Follow-up ครั้งที่ 2")) return 6;
              if (label.includes("ติดตามครั้งที่ 1") || label.toLowerCase().includes("follow-up 1") || label.includes("Follow-up ครั้งที่ 1") || lead.previousSection === "s6") return 7;
              return 8; // ลูกค้าใหม่
            };
            colLeads = [...colLeads].sort((a, b) => {
              const wA = getPriorityWeight(a);
              const wB = getPriorityWeight(b);
              if (wA !== wB) return wA - wB;
              // More completed orders = higher priority. A six-time buyer is worth
              // calling before a first-timer who happens to have landed later.
              const starDiff = loyaltyCount(b) - loyaltyCount(a);
              if (starDiff !== 0) return starDiff;
              const dateA = a.statusChangedAt ? new Date(a.statusChangedAt).getTime() : 0;
              const dateB = b.statusChangedAt ? new Date(b.statusChangedAt).getTime() : 0;
              // Cards inside one day follow the same direction as the day blocks.
              return dateOrder === "newest" ? dateB - dateA : dateA - dateB;
            });
          } else {
            // Every other column ranks by stars too, then by how recently it moved.
            colLeads = [...colLeads].sort((a, b) => {
              const starDiff = loyaltyCount(b) - loyaltyCount(a);
              if (starDiff !== 0) return starDiff;
              const dateA = a.statusChangedAt ? new Date(a.statusChangedAt).getTime() : 0;
              const dateB = b.statusChangedAt ? new Date(b.statusChangedAt).getTime() : 0;
              // Cards inside one day follow the same direction as the day blocks.
              return dateOrder === "newest" ? dateB - dateA : dateA - dateB;
            });
          }

          // EVERY column is split into one block per day the deal landed in it,
          // oldest day first — the longest-waiting batch is what needs attention
          // today, in any stage, not only in "รายชื่อเป้าหมาย". The per-column
          // sort above is unchanged; it now applies WITHIN each day.
          const dayKeyOf = (lead) => {
            const raw = lead.statusChangedAt || lead.updatedAt || lead.createdAt;
            if (!raw) return "";
            const d = new Date(raw);
            if (isNaN(d.getTime())) return "";
            // Local date parts, not toISOString(): in UTC+7 the latter reports the
            // previous day for anything before 07:00 local.
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          };
          const buckets = new Map();
          colLeads.forEach((lead) => {
            const key = dayKeyOf(lead);
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(lead);
          });
          const leadGroups = [...buckets.entries()]
            // Undated deals last — they have no waiting time to rank by.
            .sort((a, b) => {
              if (!a[0]) return 1;
              if (!b[0]) return -1;
              return dateOrder === "newest" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]);
            })
            .map(([key, items]) => ({
              key: key || "no-date",
              label: key
                ? new Date(key).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
                : "ไม่ระบุวันที่",
              items
            }));
          const isDragOver = dragOverCol === col.id;
          const isColBeingDragged = draggedColId === col.id;
          const isCollapsed = !!collapsedCols[col.id];
          const toggleCollapse = (e) => { e.stopPropagation(); setCollapsedCols(p => ({ ...p, [col.id]: !p[col.id] })); };
          // Column tools dropdown — shared by the expanded header and the collapsed bar.
          const columnMenu = columnMenuOpen === col.id ? (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => { e.stopPropagation(); setColumnMenuOpen(null); }}
              />
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnMenuOpen(null);
                    setEditingColumn(col);
                    setEditColLabel(col.label);
                    setEditColColor(col.color || "#3b82f6");
                    setEditColRuleEnabled(col.rule?.enabled || false);
                    setEditColRuleDays(col.rule?.triggerDays || 7);
                    setEditColRuleTarget(col.rule?.targetColumnId || "");
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  ตั้งค่า
                </button>

                <div className="relative group border-t border-slate-100">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-between gap-1.5 font-medium"
                  >
                    <span className="flex items-center gap-1.5">
                      <Move className="h-3.5 w-3.5 text-slate-500" />
                      ย้ายคอลัมน์ไปที่
                    </span>
                    <span className="text-[14px] text-slate-400">{colIdx < 2 ? "▶" : "◀"}</span>
                  </button>
                  <div className={`absolute top-0 hidden group-hover:block z-50 ${
                    colIdx < 2 ? "left-full pl-2" : "right-full pr-2"
                  }`}>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[200px] max-h-60 overflow-y-auto text-left">
                      {localColumns.map((targetCol, idx) => {
                        const isCurrent = targetCol.id === col.id;
                        return (
                          <button
                            key={targetCol.id}
                            disabled={isCurrent}
                            onClick={(e) => {
                              e.stopPropagation();
                              setColumnMenuOpen(null);
                              handleMoveColumnPosition(col.id, idx);
                            }}
                            className={`w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center justify-between font-semibold ${
                              isCurrent
                                ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                            }`}
                          >
                            <span className="truncate pr-2">
                              {idx === 0
                                ? `ตำแหน่งที่ 1 (หน้าสุด)`
                                : `ตำแหน่งที่ ${idx + 1} (หลัง ${localColumns[idx - 1].label})`}
                            </span>
                            {isCurrent && <span className="text-[13px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded-sm shrink-0">ปัจจุบัน</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnMenuOpen(null);
                    handleDeleteColumn(col.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  ลบคอลัมน์
                </button>
              </div>
            </>
          ) : null;
          return (
            <React.Fragment key={col.id}>
            {/* Small insert slot — creates the new stage right before this column */}
            <button
              type="button"
              onClick={() => { setInsertAtIndex(colIdx); setShowAddColumnModal(true); }}
              title={`แทรก Stage ก่อน "${col.label}"`}
              className="group self-stretch w-5 shrink-0 flex items-start justify-center pt-3 cursor-pointer"
            >
              <span className="h-5 w-5 rounded-full border border-dashed border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold leading-none opacity-30 group-hover:opacity-100 group-hover:border-green-500 group-hover:text-green-600 group-hover:bg-green-50 transition-all">
                +
              </span>
            </button>
            <div
              draggable={true}
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={(e) => handleDragOver(col.id, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragEnd={handleColDragEnd}
              className={`${isCollapsed ? 'w-14' : 'w-[300px]'} flex-shrink-0 flex flex-col rounded-2xl border transition-colors duration-200 max-h-full ${
                columnMenuOpen === col.id ? "relative z-30 shadow-md" : "relative z-10"
              } ${
                isColBeingDragged ? "opacity-30 border-dashed border-slate-350 scale-95" : ""
              } ${
                isDragOver 
                  ? "bg-slate-100/90 border-green-500 shadow-lg scale-[1.01]" 
                  : "bg-slate-50 border-slate-200"
              }`}
              style={isCollapsed
                ? { borderRight: `4px solid ${col.color || '#3b82f6'}` }
                : { borderTop: `4px solid ${col.color || '#3b82f6'}` }}
            >
              {/* Column Header */}
              {isCollapsed ? (
                <div className="flex flex-col items-center justify-between h-full py-3 gap-2">
                  {/* Expand button — back to full-width column */}
                  <button
                    onClick={toggleCollapse}
                    title="ขยายคอลัมน์"
                    className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-1 rounded-lg cursor-pointer transition-colors shrink-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {/* Vertical label (flipped for readability) — click to expand */}
                  <div
                    className="flex-1 flex items-center justify-center w-full overflow-hidden cursor-pointer"
                    onClick={toggleCollapse}
                    title="ขยายคอลัมน์"
                  >
                    <h3 className={`font-bold text-sm truncate [writing-mode:vertical-rl] py-2 ${isDragOver ? "text-green-700" : "text-slate-600"}`} title={col.label}>{col.label}</h3>
                  </div>
                  {/* Count */}
                  <span className={`text-[14px] font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-colors ${
                    isDragOver ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                  }`}>{colLeads.length}</span>
                  {/* Column tools (bottom) */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setColumnMenuOpen(columnMenuOpen === col.id ? null : col.id);
                      }}
                      className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-0.5 rounded-lg cursor-pointer transition-colors"
                      title="เครื่องมือการจัดการคอลัมน์"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {columnMenu}
                  </div>
                </div>
              ) : (
                <div className={`p-4 border-b rounded-t-2xl flex justify-between items-center shrink-0 transition-colors ${
                  isDragOver ? "bg-green-50/50 border-green-200" : "bg-slate-100/80 border-slate-200"
                }`}>
                <div className="flex items-center gap-1.5 text-left select-none min-w-0 flex-1 mr-4">
                  <GripVertical className="h-3.5 w-3.5 text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
                  <h3 className={`font-bold text-sm truncate ${isDragOver ? "text-green-700" : "text-slate-800"}`} title={col.label}>{col.label}</h3>
                  {col.rule && col.rule.enabled && col.rule.targetColumnId && (() => {
                    const targetCol = localColumns.find(c => c.id === col.rule.targetColumnId);
                    const targetLabel = targetCol ? targetCol.label : "คอลัมน์ปลายทาง";
                    return (
                      <div className="relative group cursor-help w-5 h-5 flex items-center justify-center z-10 shrink-0">
                        <Zap className="h-3.5 w-3.5 text-blue-500 fill-blue-100" />
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-64 p-3 bg-white text-slate-700 text-xs rounded-xl shadow-xl leading-normal text-left pointer-events-none border border-slate-200 backdrop-blur-xs">
                          <p className="font-bold text-blue-600 mb-1.5 flex items-center gap-1.5 text-[16px]">⚡ ย้ายดีลอัตโนมัติ</p>
                          <div className="space-y-1 text-slate-500 text-xs">
                            <p>• ย้ายดีลในคอลัมน์นี้ไปที่: <span className="font-bold text-slate-800">"{targetLabel}"</span></p>
                            <p>• หากไม่มีความเคลื่อนไหวเกิน: <span className="font-bold text-slate-800">{col.rule.triggerDays} วัน</span></p>
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-white"></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={toggleCollapse}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-0.5 rounded-lg cursor-pointer transition-colors"
                    title="ย่อคอลัมน์"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <span className={`text-[14px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isDragOver ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                  }`}>{colLeads.length}</span>
                  
                  {/* Three-dots Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setColumnMenuOpen(columnMenuOpen === col.id ? null : col.id);
                      }}
                      className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-0.5 rounded-lg cursor-pointer transition-colors"
                      title="เครื่องมือการจัดการคอลัมน์"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    
                    {columnMenu}
                  </div>
                </div>
                </div>
              )}
              {/* Cards Container */}
              {!isCollapsed && (
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {/* Quick Add Button */}
                <button
                  onClick={() => {
                    setCreateLeadSection(col.id);
                    setCreateSection(col.id);
                    setModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-200 hover:border-green-600 hover:bg-green-50/30 text-slate-400 hover:text-green-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors bg-white shadow-2xs"
                >
                  <Plus className="h-4 w-4" /> เพิ่มดีลใหม่
                </button>
                {leadGroups.map(group => (
                  <React.Fragment key={group.key}>
                {group.label && (
                  <div className="flex items-center gap-2 pt-1 first:pt-0">
                    <span className="text-[13px] font-black text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {group.label}
                    </span>
                    <span className="text-[13px] font-bold text-slate-300">{group.items.length}</span>
                    <span className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
                {group.items.map(lead => {
                  let cardColor = col.color || '#3b82f6';
                  if (col.label === "รายชื่อเป้าหมาย" && lead.previousSection) {
                    const originalCol = localColumns.find(c => c.id === lead.previousSection);
                    if (originalCol) {
                      cardColor = originalCol.color || '#3b82f6';
                    }
                  }
                  const isSearchHit = searchHitId === lead._id;
                  return (
                    <div
                      key={lead._id}
                      id={`sales-card-${lead._id}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead._id)}
                      onClick={() => {
                        setSelectedLead(lead);
                        setDrawerOpen(true);
                      }}
                      onContextMenu={(e) => handleCardContextMenu(e, lead)}
                      className={`p-4 rounded-xl shadow-xs border hover:shadow-sm active:opacity-60 active:cursor-grabbing transition-all duration-200 cursor-grab group flex flex-col gap-2 text-left ${
                        isSearchHit ? "ring-2 ring-green-500 ring-offset-2 animate-pulse" : ""
                      }`}
                      style={{
                        backgroundColor: `${cardColor}1a`,
                        borderColor: `${cardColor}40`
                      }}
                    >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm group-hover:text-green-600 transition-colors leading-tight flex items-center gap-1 min-w-0">
                          <span className="truncate">{lead.name}</span>
                          <LoyaltyStars lead={lead} />
                        </h4>
                        {lead.brand && (
                          <span className="text-[13px] font-bold text-slate-500 bg-white/85 border border-slate-200/60 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
                            {lead.brand}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({
                            x: rect.left,
                            y: rect.bottom + 4,
                            lead
                          });
                        }}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md hover:bg-slate-50 shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Custom Products Pill Tag */}
                    <div className="flex flex-col gap-1 mt-0.5">
                      {(lead.orderType === "lot" || lead.orderType === "develop") && lead.orderedProducts ? (
                        Array.isArray(lead.orderedProducts) ? (
                          lead.orderedProducts.map((p, pIdx) => (
                            <div key={pIdx} className="flex flex-col p-1.5 bg-white/60 border border-white/80 rounded-lg text-[13px] font-semibold text-slate-700 shadow-3xs">
                              <div className={`font-bold truncate ${lead.orderType === "develop" ? "text-purple-800" : "text-blue-800"}`}>
                                {lead.orderType === "develop" && <span className="mr-1 text-[13px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-black">พัฒนาสูตร</span>}
                                {p.formulaName}
                              </div>
                              <div className="flex flex-wrap gap-x-1.5 text-slate-500 mt-0.5 text-[13px]">
                                <span>{p.quantityPcs || 0} ชิ้น</span>
                                {p.bottleSize && (
                                  <>
                                    <span>•</span>
                                    <span>{p.bottleSize} ml</span>
                                  </>
                                )}
                                {p.packagingType && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[80px]">{p.packagingType}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold border ${lead.orderType === "develop" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-blue-50 text-blue-700 border-blue-100/65"}`}>
                            {lead.orderType === "develop" ? "พัฒนาสูตร: " : "ล็อต: "} {lead.orderedProducts.formulaName} ({lead.orderedProducts.quantityPcs || 0})
                          </span>
                        )
                      ) : lead.orderType === "sample" && Array.isArray(lead.orderedProducts) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/65">
                          ตัวอย่าง: {lead.orderedProducts.length} สูตรสินค้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
                          ไม่มีการสั่งสินค้า
                        </span>
                      )}
                    </div>

                    {/* Bottom layout displaying address and estValue tag */}
                    <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-100/60">
                      <p className="text-slate-500 text-[14px] flex items-center gap-1 truncate max-w-[70%]">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {lead.address || "ไม่มีที่อยู่ผู้จัดส่ง"}
                      </p>
                      {lead.estValue && (
                        <span className="text-[13px] font-extrabold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100/60">
                          {typeof lead.estValue === "number" ? `฿${lead.estValue.toLocaleString()}` : lead.estValue}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
                </React.Fragment>
            ))}
                </div>
              )}
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Slide-over Drawer Component */}
      {drawerOpen && selectedLead && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
            onClick={() => {
              setDrawerOpen(false);
              setSelectedLead(null);
            }}
          />
          {/* A hard 640px anchored to the right edge hangs 250px off the left of
              a 390px phone: the labels and the left half of every field are
              simply outside the viewport and unreachable. Full width below sm. */}
          <div className="fixed top-0 right-0 h-full w-full max-w-full sm:w-[640px] bg-white shadow-xl z-50 border-l border-slate-200 flex flex-col transition-transform duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h2 className="text-base font-bold text-slate-800 truncate">{selectedLead.name}</h2>
                  <Chip size="sm" color="success" variant="flat">Active</Chip>
                </div>
                <p className="text-[14px] text-slate-400 font-semibold">Lead ID: #{selectedLead._id?.slice(-6).toUpperCase()}</p>
              </div>
              <button
                type="button"
                aria-label="ปิด"
                className="shrink-0 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedLead(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Drawer Content Form */}
            <form onSubmit={handleEditSubmit} className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 text-left">
                {/* 1. Basic Info */}
                <div className="space-y-3">
                  <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block border-b border-slate-100 pb-1">รายละเอียดดีลผู้ติดต่อ</span>
                  {/* Name — the deal-level brand field was removed; brand is captured
                      per production line instead (ประเภทสูตร / แบรนด์ ในรายการใบสั่งผลิต). */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase">ชื่อลูกค้า / คลินิก / บริษัท <span className="text-red-500">*</span></label>
                    <input name="name" required defaultValue={selectedLead.name} onChange={(e) => setEditCustomerName(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs font-semibold text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase">เบอร์โทรศัพท์</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input name="phone" defaultValue={selectedLead.phone || ""} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs font-semibold text-slate-800" />
                    </div>
                  </div>
                  
                  {editOrderType === "lot" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Estimated Price */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">ราคาโดยประมาณ</label>
                        <input
                          type="text"
                          name="estValue"
                          value={editEstValue} 
                          onChange={(e) => setEditEstValue(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs font-semibold text-slate-800 text-left" 
                          placeholder="0" 
                        />
                      </div>

                      {/* Paid Amount Freetext */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">ยอดที่ชำระแล้ว</label>
                        <input 
                          type="text" 
                          name="paidAmount" 
                          defaultValue={selectedLead.paidAmount || ""}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs font-semibold text-slate-800 text-left" 
                          placeholder={
                            (parseFloat(editEstValue.toString().replace(/,/g, "")) || 0) > 0 
                              ? `เช่น ${(parseFloat(editEstValue.toString().replace(/,/g, "")) / 2).toLocaleString()}` 
                              : "0"
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase">
                      ที่อยู่ผู้รับ/จัดส่งสินค้า
                    </label>
                    <div className="relative">
                      <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <textarea name="address" defaultValue={selectedLead.address || ""} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs font-semibold text-slate-800 h-16 resize-none" />
                    </div>
                  </div>

                  {boardColumns && boardColumns.length > 0 && (
                    <Select
                      label="ย้ายสถานะ (Stage)"
                      options={boardColumns.map(c => ({ value: c.id, label: c.label }))}
                      value={editStage}
                      icon={Move}
                      onChange={(e) => setEditStage(e.target.value)}
                    />
                  )}
                </div>

                {/* 2. Order Selection */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block border-b border-slate-200/50 pb-1">การเลือกสินค้า</span>
                  
                  {/* Segmented Controls */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-200/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditOrderType("sample")}
                      className={`py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                        editOrderType === "sample" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      ตัวอย่างสินค้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOrderType("lot")}
                      className={`py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                        editOrderType === "lot" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      สั่งสินค้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOrderType("develop")}
                      className={`py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                        editOrderType === "develop" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      พัฒนาสูตรเอง
                    </button>
                  </div>

                  {editOrderType === "lot" && (
                    <div className="space-y-3 pt-1 text-left flex flex-col relative">
                      <label className="text-[14px] text-slate-400 font-bold uppercase block">รายการใบสั่งผลิต <span className="text-green-600 normal-case">({editLotItems.length} รายการ)</span></label>

                      {/* Once R&D or Production has approved, the order is FROZEN —
                          no unlock path. Chemicals and packaging are already deducted
                          and the floor is building to this spec; letting Sales edit it
                          afterwards would make the paperwork disagree with the batch.
                          Changes at that point have to go through Production. */}
                      {lotBoxLocked ? (
                        <div className="absolute inset-0 z-20 rounded-2xl bg-slate-900/75 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 px-4 text-center">
                          <span className="text-white text-xs font-black">🔒 สินค้านี้กำลังผลิตอยู่</span>
                          <span className="text-slate-300 text-[14px] font-semibold leading-relaxed">
                            {lockedLines.length} รายการผ่านการอนุมัติแล้ว — แก้ไขไม่ได้
                            <br />ต้องการเปลี่ยนแปลง ติดต่อฝ่ายผลิตโดยตรง
                          </span>
                        </div>
                      ) : (
                        <span className="text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 w-fit">
                          ● ยังแก้ไขได้ (ยังไม่ถูกอนุมัติเข้าผลิต)
                        </span>
                      )}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {editLotItems.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200">
                            {/* Same split as the create modal: the formula takes a whole
                                row on a phone, then type + actions share the next one. */}
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end">
                              {/* Formula */}
                              <div className="col-span-6 flex flex-col gap-0.5">
                                {idx === 0 && <label className="text-[13px] text-slate-400 font-bold">สูตรสินค้า <span className="text-red-500">*</span></label>}
                                <select
                                  value={item.formulaName}
                                  onChange={(e) => updateEditLotItem(idx, "formulaName", e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                                >
                                  {/* Rows added here also start blank — same reason. */}
                                  <option value="">-- เลือกสูตรสินค้า --</option>
                                  {formulas.map(f => (
                                    <option key={f._id} value={f.name}>{f.name}</option>
                                  ))}
                                  <option value="ผลิตสูตรเอง">ผลิตสูตรเอง</option>
                                </select>
                              </div>
                              {/* Formula Type */}
                              <div className="col-span-4 sm:col-span-4 flex flex-col gap-0.5">
                                {idx === 0 && <label className="text-[13px] text-slate-400 font-bold">ประเภทสูตร <span className="text-red-500">*</span></label>}
                                <select
                                  value={item.customerFormulaType || "สูตรตามโรงงาน"}
                                  onChange={(e) => updateEditLotItem(idx, "customerFormulaType", e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="สูตรตามโรงงาน">สูตรตามโรงงาน</option>
                                  <option value="ปรับสูตร">ปรับสูตร</option>
                                </select>
                              </div>
                              {/* Actions */}
                              <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1.5 pb-1">
                                <button
                                  type="button"
                                  onClick={() => openSpecModal(idx, "edit")}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                  title="ตั้งค่าข้อมูลสินค้าโดยละเอียด"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {editLotItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeEditLotItem(idx)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={addEditLotItem}
                          className="w-full py-2 border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 text-blue-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มใบสั่งผลิต
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {editOrderType === "sample" && (
                    <div className="pt-1 text-left space-y-2">
                      <label className="text-[14px] text-slate-400 font-bold uppercase block mb-1">เลือกสูตรตัวอย่างสินค้า (เลือกได้หลายรายการ)</label>
                      {sampleProducts.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                          ยังไม่มีสินค้าตัวอย่างในคลัง (ไปที่ Stock เพื่อสร้าง)
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-white">
                          {sampleProducts.map(p => {
                            const selectedEntry = editSelectedSamples.find(x => x.productId === p._id);
                            const checked = !!selectedEntry;
                            return (
                              <div key={p._id} className={`flex flex-col gap-2 p-2 rounded-lg border transition-colors ${checked ? "bg-green-50/70 border-green-300" : "border-slate-100 hover:bg-slate-50"}`}>
                                <div onClick={() => toggleEditSample(p)} className="flex items-start gap-2 cursor-pointer">
                                  <div className="mt-0.5">
                                    {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-green-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-semibold truncate ${checked ? "text-green-800" : "text-slate-600"}`}>{p.name}</div>
                                    {p.size && <div className="text-[14px] text-slate-400 truncate">{p.size}</div>}
                                    <div className="mt-1">
                                      {p.currentQuantity > 0 ? (
                                        <span className="text-[13px] font-bold px-1.5 py-0.5 rounded-sm bg-green-100 text-green-700 border border-green-200">คงเหลือ {p.currentQuantity}</span>
                                      ) : (
                                        <span className="text-[13px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 border border-amber-200">หมดสต๊อก</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {checked && (
                                  <div className="pl-6 border-t border-green-200 pt-2 mt-1">
                                    <label className="text-[13px] text-green-700 font-bold mb-1 block">จำนวน (ชิ้น)</label>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number" 
                                        min="1" 
                                        value={selectedEntry.quantity || 1} 
                                        onChange={(e) => setEditSampleQty(p._id, e.target.value)} 
                                        className="w-16 p-1 text-xs text-center border border-green-300 rounded focus:outline-none focus:border-green-500 bg-slate-800 text-white"
                                      />
                                      {selectedEntry.quantity > p.currentQuantity && (
                                        <span className="text-[13px] text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">เกินสต๊อก (มี {p.currentQuantity})</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}



                  {editOrderType === "develop" && renderDevelopOrderBox("edit")}
                </div>

                {(() => {
                  const storedProducts = selectedLead?.orderedProducts;
                  const storedDevItems = (Array.isArray(storedProducts) ? storedProducts : (storedProducts ? [storedProducts] : []))
                    .filter(p => p && (p.isDevelopment || selectedLead.orderType === "develop"));
                  const isSelectedOrderLot = (lot) => lot?.orderId && ((lot.orderId._id || lot.orderId) === selectedLead._id);
                  const isDevelopmentLot = (lot) => {
                    const formulaName = lot?.formulaName || "";
                    const lotOrder = typeof lot?.orderId === "object" ? lot.orderId : null;
                    const orderProducts = Array.isArray(lotOrder?.orderedProducts)
                      ? lotOrder.orderedProducts
                      : (lotOrder?.orderedProducts ? [lotOrder.orderedProducts] : []);
                    const orderProduct = Number.isInteger(lot?.productIndex) ? orderProducts[lot.productIndex] : null;
                    return lot?.isDevelopment
                      || String(lot?.lotNo || "").startsWith("DEV-")
                      || formulaName.includes("ทางเลือก")
                      || orderProduct?.isDevelopment
                      || orderProducts.some(p => p?.isDevelopment && (p.selectedFormulaName || p.formulaName) === formulaName)
                      || lotOrder?.orderType === "develop"
                      || storedDevItems.some(p => (p.selectedFormulaName || p.formulaName) === formulaName)
                      || (isSelectedOrderLot(lot) && selectedLead.orderType === "develop");
                  };
                  const matchingLots = (productLots || [])
                    .filter(l => (l.orderId && ((l.orderId._id || l.orderId) === selectedLead._id)) ||
                                 (l.customer && selectedLead.name && l.customer === selectedLead.name));
                  const representedDevFormulas = new Set(
                    matchingLots
                      .filter(isDevelopmentLot)
                      .map(l => l.formulaName || "")
                      .filter(Boolean)
                  );
                  const realRows = [
                    ...matchingLots.map(l => ({
                      id: l._id,
                      date: l.mfgDate ? new Date(l.mfgDate).toISOString().slice(0,10) : (l.createdAt ? new Date(l.createdAt).toISOString().slice(0,10) : todayDateOnly()),
                      time: l.createdAt ? new Date(l.createdAt).toTimeString().slice(0,5) : "12:00",
                      formulaName: l.formulaName || "-",
                      lotNo: l.lotNo, quantity: l.quantity || 0, unit: l.unit || "????",
                      status: l.status || "active",
                      raw: l,
                      isDev: isDevelopmentLot(l)
                    })),
                    ...(storedDevItems
                      .filter(di => !representedDevFormulas.has(di.selectedFormulaName || di.formulaName || ""))
                      .map((di, idx) => ({
                        id: `dev-${idx}-${selectedLead._id}`,
                        date: selectedLead.createdAt ? new Date(selectedLead.createdAt).toISOString().slice(0,10) : todayDateOnly(),
                        time: selectedLead.createdAt ? new Date(selectedLead.createdAt).toTimeString().slice(0,5) : "12:00",
                        formulaName: di.formulaName || `???????????? ${idx + 1}`,
                        lotNo: `DEV-${selectedLead._id?.slice(-6) || "001"}-${idx + 1}`,
                        quantity: 0,
                        unit: "????",
                        status: "develop",
                        raw: di,
                        isDev: true
                      })))
                  ];
                  const rows = realRows;
                  // group by day, newest day first; within a day newest time first
                  const groups = Object.values(rows.reduce((acc, r) => {
                    (acc[r.date] = acc[r.date] || { date: r.date, items: [] }).items.push(r);
                    return acc;
                  }, {})).sort((a, b) => new Date(b.date) - new Date(a.date));
                  groups.forEach(g => g.items.sort((a, b) => (b.time || "").localeCompare(a.time || "")));
                  const totalCount = rows.length;
                  const fmtDay = (d) => d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";

                  return (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">
                          ประวัติใบสั่งผลิตที่เสร็จแล้ว ({totalCount})
                        </span>
                      </div>
                      {rows.length === 0 ? (
                        <p className="text-[15px] text-slate-400 py-2 text-center">ยังไม่มีประวัติการผลิตที่เสร็จ</p>
                      ) : (
                        <div className="space-y-4">
                          {groups.map(group => (
                            <div key={group.date} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {fmtDay(group.date)}
                                </span>
                                <span className="text-[13px] text-slate-400 font-bold">
                                  {group.items.length} ใบ
                                </span>
                              </div>
                              <div className="pl-3 border-l-2 border-slate-100 ml-1 space-y-2 pt-1">
                                {group.items.map(item => (
                                  <div key={item.id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[14px] font-mono font-bold text-green-600 shrink-0 w-10">{item.time} น.</span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-slate-800 truncate">{item.formulaName}</span>
                                        <span className="text-[14px] text-slate-400 font-mono">Lot: {item.lotNo}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {!item.isDev && <span className="text-xs font-mono font-semibold text-slate-700">{item.quantity.toLocaleString()} {item.unit}</span>}
                                      {/* Outcome of the run, not just "done": a deal's
                                          history should say where the goods ended up.
                                          Mirrors ProductLot.status's four values. */}
                                      {(() => {
                                        if (item.isDev) {
                                          return <span className="inline-block px-2 py-0.5 rounded-full text-[13px] font-bold border whitespace-nowrap bg-purple-50 text-purple-700 border-purple-200">{"\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e2a\u0e39\u0e15\u0e23"}</span>;
                                        }
                                        const S = {
                                          delivered: ["🚚 ส่งให้ลูกค้าแล้ว", "bg-blue-50 text-blue-700 border-blue-200"],
                                          expired: ["⚠ หมดอายุ", "bg-amber-50 text-amber-700 border-amber-200"],
                                          recalled: ["⛔ เรียกคืน", "bg-red-50 text-red-700 border-red-200"],
                                          active: ["📦 อยู่ในคลัง", "bg-green-50 text-green-700 border-green-200"]
                                        };
                                        const [label, cls] = S[item.status] || S.active;
                                        return (
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[13px] font-bold border whitespace-nowrap ${cls}`}>{label}</span>
                                        );
                                      })()}
                                      {item.isDev ? (
                                        <button
                                          type="button"
                                          onClick={() => openDevelopSpecDoc({
                                            item: { ...(item.raw || {}), formulaName: item.formulaName, rndQcAt: item.raw?.rndQcAt || item.date, resultStatus: "pass" },
                                            customer: selectedLead || {},
                                            formulas,
                                            pageMode: "auto"
                                          })}
                                          title="ดาวน์โหลดเอกสารพัฒนาสูตร 2 หน้า"
                                          className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer shrink-0"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                          // The lot row only carries formulaName/qty; pull the
                                          // full spec off the matching ordered line so the sheet
                                          // still shows packaging, nozzle, sticker and BOM.
                                          const spec = editLotItems.find(li =>
                                            (li.formulaId && item.formulaId && String(li.formulaId) === String(item.formulaId)) ||
                                            ((!li.formulaId || !item.formulaId) && li.formulaName === item.formulaName)
                                          ) || {};
                                          // Legacy single-product orders have no matching line, so
                                          // MFG/EXP and the batch weight (hence every "total" column)
                                          // printed as "-" even though the produced lot stored them.
                                          // Fall back to the lot for exactly those fields.
                                          const lot = item.raw || {};
                                          const plan = lot.bomPlan instanceof Map ? Object.fromEntries(lot.bomPlan) : (lot.bomPlan || {});
                                          const planKg = Number(plan[item.formulaName]) ||
                                            Object.values(plan).reduce((s, v) => s + (Number(v) || 0), 0);
                                          downloadProductionDoc(
                                            {
                                              ...spec,
                                              formulaName: item.formulaName,
                                              quantityPcs: spec.quantityPcs || item.quantity,
                                              // spec wins when the ordered line exists; the lot fills
                                              // the gaps for legacy orders whose line is empty.
                                              quantityKg: spec.quantityKg || planKg || undefined,
                                              mfgDate: spec.mfgDate || spec.lotStampMfg || lot.mfgDate,
                                              expDate: spec.expDate || spec.lotStampExp || lot.expDate,
                                            },
                                            { lotNo: item.lotNo, dayLabel: fmtDay(group.date), time: item.time }
                                          );
                                          }}
                                          title="บันทึกใบสั่งผลิตเป็น PDF"
                                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-green-50 text-slate-500 hover:text-green-600 border border-slate-200 hover:border-green-200 transition-colors cursor-pointer shrink-0"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Notes — tall by default and grows with its content, so a
                    long imported note (Asana pipeline dumps a paragraph here) is
                    readable without scrolling a tiny box. */}
                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase block">หมายเหตุ</label>
                  <textarea
                    name="notes"
                    defaultValue={selectedLead.notes || ""}
                    ref={autoGrow}
                    onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                    className="w-full min-h-[160px] p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-700 resize-y overflow-hidden leading-relaxed"
                    placeholder="ระบุรายละเอียดข้อตกลงเพิ่มเติม..."
                  />
                </div>
              </div>
              
              {/* Drawer Footer */}
              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3">
                {editError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                    {editError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={editSubmitting} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors cursor-pointer text-xs shadow-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {editSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        กำลังบันทึก...
                      </>
                    ) : "Save Changes"}
                  </button>
                  <button type="button" disabled={editSubmitting} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => { setDrawerOpen(false); setSelectedLead(null); }}>Close</button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Create New Lead Modal */}
      {modalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
            onClick={() => setModalOpen(false)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-[84rem] rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh]">
              <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold text-slate-800">สร้างดีลลูกค้าใหม่</h2>
                <button className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setModalOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col overflow-hidden text-left bg-white">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[40fr_60fr] gap-5 md:gap-6">
                  {/* Left Column: Customer Details */}
                  <div className="space-y-4 flex flex-col justify-between md:h-[450px]">
                    <div className="space-y-3 flex flex-col">
                      <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block border-b border-slate-100 pb-1">ข้อมูลลูกค้า</span>
                      
                      {/* Name — combobox over existing customers so a repeat buyer
                          reuses their record instead of being typed in afresh. */}
                      <div className="flex flex-col gap-1" ref={customerBoxRef}>
                        <label className="text-[14px] text-slate-400 font-bold uppercase">ชื่อลูกค้า / คลินิก / บริษัท <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            name="name"
                            required
                            autoComplete="off"
                            value={createCustomerName}
                            onChange={(e) => { setCreateCustomerName(e.target.value); setReusedCustomer(null); setShowCustomerSuggest(true); }}
                            onFocus={() => setShowCustomerSuggest(true)}
                            className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                            placeholder="พิมพ์เพื่อค้นหาลูกค้าเดิม หรือพิมพ์ชื่อใหม่"
                            type="text"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustomerSuggest(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="เลือกจากลูกค้าเดิม"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${showCustomerSuggest ? "rotate-180" : ""}`} />
                          </button>

                          {showCustomerSuggest && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                              <div className="max-h-44 overflow-y-auto py-1">
                                {customerSuggestions.length > 0 ? (
                                  customerSuggestions.map((l) => (
                                    <button
                                      key={l._id}
                                      type="button"
                                      onClick={() => pickExistingCustomer(l)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-green-50 cursor-pointer transition-colors"
                                    >
                                      <div className="text-[15px] font-bold text-slate-700 truncate">{l.name}</div>
                                      <div className="text-[13px] text-slate-400 truncate">{[l.phone, l.address].filter(Boolean).join(" · ") || "ไม่มีข้อมูลติดต่อ"}</div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-[14px] text-slate-400 text-center italic">ไม่พบลูกค้าเดิมที่ตรงกัน</div>
                                )}
                              </div>
                              {createCustomerName.trim() && !reusedCustomer && (
                                <div className="px-3 py-1.5 bg-blue-50/60 border-t border-blue-100 text-[13px] font-bold text-blue-700 text-left">
                                  จะสร้างลูกค้าใหม่ “{createCustomerName.trim()}”
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {reusedCustomer && (
                          <p className="text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                            ● ลูกค้าเดิม — ดึงเบอร์โทรและที่อยู่มาให้แล้ว
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">เบอร์โทรศัพท์</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input name="phone" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold" placeholder="เช่น 0891234567" type="tel"/>
                        </div>
                      </div>

                      {createOrderType === "lot" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Estimated Price */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[14px] text-slate-400 font-bold uppercase">ราคาโดยประมาณ</label>
                            <input
                              type="text"
                              name="estValue"
                              value={createEstValue}
                              onChange={(e) => setCreateEstValue(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold text-left" 
                              placeholder="0" 
                            />
                          </div>

                          {/* Paid Amount Freetext */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[14px] text-slate-400 font-bold uppercase">ยอดที่ชำระแล้ว</label>
                            <input 
                              type="text" 
                              name="paidAmount" 
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold text-left" 
                              placeholder={
                                (parseFloat(createEstValue.toString().replace(/,/g, "")) || 0) > 0 
                                  ? `เช่น ${(parseFloat(createEstValue.toString().replace(/,/g, "")) / 2).toLocaleString()}` 
                                  : "0"
                              }
                              defaultValue="" 
                            />
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">
                          ที่อยู่ผู้รับ/จัดส่งสินค้า
                        </label>
                        <div className="relative">
                          <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <textarea name="address" value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold h-16 resize-none" placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด..." />
                        </div>
                      </div>
                    </div>

                    {/* Stage — where the card lands on the board. Previously the
                        column was decided silently (hard-coded "s2" for a sample
                        order, "s1" otherwise), so a deal created from the header
                        button always appeared in the first column and had to be
                        dragged. */}
                    <div className="flex flex-col gap-1 mt-auto">
                      <label className="text-[14px] text-slate-400 font-bold uppercase">Stage ที่จะให้การ์ดไปอยู่ <span className="text-red-500">*</span></label>
                      <Select
                        value={createSection}
                        onChange={(e) => setCreateSection(e.target.value)}
                        options={(localColumns || []).map(c => ({ value: c.id, label: c.label }))}
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] text-slate-400 font-bold uppercase">หมายเหตุ</label>
                      <textarea name="notes" className="w-full h-16 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-700 resize-none" placeholder="เช่น ต้องการใบเสนอราคาด่วน หรือมีรายละเอียดเพิ่มเติม..."></textarea>
                    </div>
                  </div>

                  {/* Right Column: Product Order Selection */}
                  <div className="space-y-4 flex flex-col border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 pl-0 md:pl-6 md:h-[450px]">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                      <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block">การเลือกสั่งสินค้า</span>
                      
                      {/* Segmented Tab bar inside a nice box at top-right */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCreateOrderType("sample")}
                          className={`px-3 py-1 rounded-md text-[14px] font-extrabold transition-all cursor-pointer ${
                            createOrderType === "sample" ? "bg-white text-slate-800 shadow-2xs border border-slate-200/20" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          ตัวอย่างสินค้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateOrderType("lot")}
                          className={`px-3 py-1 rounded-md text-[14px] font-extrabold transition-all cursor-pointer ${
                            createOrderType === "lot" ? "bg-white text-slate-800 shadow-2xs border border-slate-200/20" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          สั่งสินค้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateOrderType("develop")}
                          className={`px-3 py-1 rounded-md text-[14px] font-extrabold transition-all cursor-pointer ${
                            createOrderType === "develop" ? "bg-white text-slate-800 shadow-2xs border border-slate-200/20" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          พัฒนาสูตรเอง
                        </button>
                      </div>
                    </div>

                    {createOrderType === "lot" && (
                      <div className="space-y-3 pt-1 text-left flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                          <label className="text-[14px] text-slate-400 font-bold uppercase block">รายการใบสั่งผลิต <span className="text-green-600 normal-case">({createLotItems.length} รายการ)</span></label>
                          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                            {createLotItems.map((item, idx) => (
                              <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200">
                                {/* 12 columns only once there is room for them: inside the
                                    640px drawer a phone gave each column 23px, so the formula
                                    dropdown showed about two Thai characters. */}
                                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end">
                                  {/* Formula */}
                                  <div className="col-span-6 flex flex-col gap-0.5">
                                    {idx === 0 && <label className="text-[13px] text-slate-400 font-bold">สูตรสินค้า <span className="text-red-500">*</span></label>}
                                    <select
                                      value={item.formulaName}
                                      onChange={(e) => updateCreateLotItem(idx, "formulaName", e.target.value)}
                                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                                    >
                                      {/* Blank first option, so an unchosen row reads as
                                          unchosen instead of silently showing formulas[0]. */}
                                      <option value="">-- เลือกสูตรสินค้า --</option>
                                      {formulas.map(f => (
                                        <option key={f._id} value={f.name}>{f.name}</option>
                                      ))}
                                      <option value="ผลิตสูตรเอง">ผลิตสูตรเอง</option>
                                    </select>
                                  </div>
                                  {/* Formula Type */}
                                  <div className="col-span-4 sm:col-span-4 flex flex-col gap-0.5">
                                    {idx === 0 && <label className="text-[13px] text-slate-400 font-bold">ประเภทสูตร <span className="text-red-500">*</span></label>}
                                    <select
                                      value={item.customerFormulaType || "สูตรตามโรงงาน"}
                                      onChange={(e) => updateCreateLotItem(idx, "customerFormulaType", e.target.value)}
                                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                                    >
                                      <option value="สูตรตามโรงงาน">สูตรตามโรงงาน</option>
                                      <option value="ปรับสูตร">ปรับสูตร</option>
                                    </select>
                                  </div>
                                  {/* Actions */}
                                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1.5 pb-1">
                                    <button
                                      type="button"
                                      onClick={() => openSpecModal(idx, "create")}
                                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                      title="ตั้งค่าข้อมูลสินค้าโดยละเอียด"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {/* Always removable — the list may legitimately go
                                        back to empty now that it starts that way. */}
                                    {(
                                      <button
                                        type="button"
                                        onClick={() => removeCreateLotItem(idx)}
                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {createLotItems.length === 0 && (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-6 text-center text-[15px] font-semibold text-slate-400">
                                ยังไม่มีรายการสินค้า — กด &quot;เพิ่มใบสั่งผลิต&quot; ด้านล่างเมื่อลูกค้าเลือกสูตรแล้ว
                              </div>
                            )}
                          </div>

                          <div className="pt-1.5">
                            <button
                              type="button"
                              onClick={addCreateLotItem}
                              className="w-full py-2 border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 text-blue-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus className="h-4 w-4" />
                              เพิ่มใบสั่งผลิต
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {createOrderType === "sample" && (
                      <div className="pt-1 text-left space-y-2 flex-1 flex flex-col overflow-hidden">
                        <label className="text-[14px] text-slate-400 font-bold uppercase block mb-1">เลือกสูตรตัวอย่างสินค้า (Checklist เลือกได้หลายรายการ)</label>
                        {sampleProducts.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                            ยังไม่มีสินค้าตัวอย่างในคลัง (ไปที่ Stock เพื่อสร้าง)
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50 flex-1 max-h-[360px]">
                            {sampleProducts.map(p => {
                              const selectedEntry = createSelectedSamples.find(x => x.productId === p._id);
                              const checked = !!selectedEntry;
                              return (
                                <div key={p._id} className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-colors ${checked ? "bg-green-50/70 border-green-300" : "border-slate-200 hover:bg-slate-100 bg-white"}`}>
                                  <div onClick={() => toggleCreateSample(p)} className="flex items-start gap-2 cursor-pointer">
                                    <div className="mt-0.5">
                                      {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-green-600" /> : <Square className="h-4 w-4 shrink-0 text-slate-300" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className={`text-xs font-semibold truncate ${checked ? "text-green-800" : "text-slate-600"}`}>{p.name}</div>
                                          {p.size && <div className="text-[14px] text-slate-400 truncate">{p.size}</div>}
                                        </div>
                                        {p.currentQuantity > 0 ? (
                                          <span className="text-[13px] font-bold px-1.5 py-0.5 rounded-sm bg-green-100 text-green-700 border border-green-200 shrink-0">คงเหลือ {p.currentQuantity}</span>
                                        ) : (
                                          <span className="text-[13px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 border border-amber-200 shrink-0">หมดสต๊อก</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {checked && (
                                    <div className="pl-6 border-t border-green-200 pt-2 mt-1">
                                      <label className="text-[13px] text-green-700 font-bold mb-1 block">จำนวน (ชิ้น)</label>
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="number" 
                                          min="1" 
                                          value={selectedEntry.quantity || 1} 
                                          onChange={(e) => setCreateSampleQty(p._id, e.target.value)} 
                                          className="w-16 p-1 text-xs text-center border border-green-300 rounded focus:outline-none focus:border-green-500 bg-slate-800 text-white"
                                        />
                                        {selectedEntry.quantity > p.currentQuantity && (
                                          <span className="text-[13px] text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">เกินสต๊อก (มี {p.currentQuantity})</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}



                    {createOrderType === "develop" && renderDevelopOrderBox("create", { name: createCustomerName, phone: createPhone, address: createAddress })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
                  {createError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                      {createError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" disabled={creating} className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" disabled={creating} className="flex-grow bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors cursor-pointer text-xs shadow-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {creating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          กำลังสร้าง...
                        </>
                      ) : "Create Lead"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {developDetailTarget && (() => {
        const item = developItemsOf(developDetailTarget.type)[developDetailTarget.index] || emptyDevelopItem();
        const fields = [
          ["productCategory", "\u0e2b\u0e21\u0e27\u0e14\u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c", "\u0e40\u0e0a\u0e48\u0e19 \u0e41\u0e0a\u0e21\u0e1e\u0e39, \u0e04\u0e23\u0e35\u0e21, \u0e40\u0e0b\u0e23\u0e31\u0e48\u0e21"],
          ["targetSkinPet", "\u0e2a\u0e31\u0e15\u0e27\u0e4c + \u0e1c\u0e34\u0e27\u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22", "\u0e40\u0e0a\u0e48\u0e19 \u0e2a\u0e38\u0e19\u0e31\u0e02\u0e1c\u0e34\u0e27\u0e41\u0e1e\u0e49, \u0e41\u0e21\u0e27\u0e02\u0e19\u0e22\u0e32\u0e27, \u0e1c\u0e34\u0e27\u0e41\u0e2b\u0e49\u0e07"],
          ["desiredClaim", "Claim \u0e17\u0e35\u0e48\u0e2d\u0e22\u0e32\u0e01\u0e44\u0e14\u0e49", "\u0e40\u0e0a\u0e48\u0e19 \u0e25\u0e14\u0e04\u0e31\u0e19, \u0e02\u0e19\u0e19\u0e38\u0e48\u0e21, \u0e25\u0e14\u0e01\u0e25\u0e34\u0e48\u0e19"],
          ["activeIngredients", "\u0e2a\u0e32\u0e23\u0e2a\u0e01\u0e31\u0e14\u0e2d\u0e2d\u0e01\u0e24\u0e17\u0e18\u0e34\u0e4c", "Active ingredients \u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23"],
          ["textureColorScent", "\u0e25\u0e31\u0e01\u0e29\u0e13\u0e30\u0e40\u0e19\u0e37\u0e49\u0e2d + \u0e2a\u0e35 + \u0e01\u0e25\u0e34\u0e48\u0e19", "\u0e40\u0e0a\u0e48\u0e19 \u0e40\u0e19\u0e37\u0e49\u0e2d\u0e40\u0e08\u0e25\u0e43\u0e2a, \u0e2a\u0e35\u0e1f\u0e49\u0e32, \u0e01\u0e25\u0e34\u0e48\u0e19\u0e25\u0e32\u0e40\u0e27\u0e19\u0e40\u0e14\u0e2d\u0e23\u0e4c"],
          ["ingredientsMustHaveAvoid", "\u0e2a\u0e32\u0e23\u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35 / \u0e2a\u0e32\u0e23\u0e15\u0e49\u0e2d\u0e07\u0e2b\u0e49\u0e32\u0e21", "\u0e40\u0e0a\u0e48\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35 SLS, \u0e44\u0e21\u0e48\u0e43\u0e2a\u0e48\u0e19\u0e49\u0e33\u0e2b\u0e2d\u0e21"],
          ["budgetAndQty", "\u0e07\u0e1a\u0e15\u0e48\u0e2d\u0e2b\u0e19\u0e48\u0e27\u0e22 + \u0e08\u0e33\u0e19\u0e27\u0e19", "\u0e40\u0e0a\u0e48\u0e19 \u0e15\u0e49\u0e19\u0e17\u0e38\u0e19 35 \u0e1a./\u0e0a\u0e34\u0e49\u0e19, \u0e17\u0e14\u0e25\u0e2d\u0e07 3 \u0e2a\u0e39\u0e15\u0e23"],
          ["timelineTarget", "Timeline \u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2a\u0e48\u0e07", "\u0e40\u0e0a\u0e48\u0e19 \u0e02\u0e2d\u0e2a\u0e39\u0e15\u0e23\u0e17\u0e14\u0e25\u0e2d\u0e07\u0e20\u0e32\u0e22\u0e43\u0e19 7 \u0e27\u0e31\u0e19"],
          ["referenceSample", "\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07", "Benchmark / \u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07"],
          ["targetPackaging", "\u0e1a\u0e23\u0e23\u0e08\u0e38\u0e20\u0e31\u0e13\u0e11\u0e4c\u0e17\u0e35\u0e48\u0e08\u0e30\u0e43\u0e0a\u0e49", "\u0e40\u0e0a\u0e48\u0e19 \u0e02\u0e27\u0e14 300 ml, \u0e1b\u0e31\u0e4a\u0e21, \u0e0b\u0e2d\u0e07"],
          ["marketStandard", "\u0e15\u0e25\u0e32\u0e14 + \u0e21\u0e32\u0e15\u0e23\u0e10\u0e32\u0e19", "\u0e40\u0e0a\u0e48\u0e19 FDA / \u0e2d\u0e22. / \u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01"],
          ["shelfLife", "Shelf life \u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23", "\u0e40\u0e0a\u0e48\u0e19 12 \u0e40\u0e14\u0e37\u0e2d\u0e19, 24 \u0e40\u0e14\u0e37\u0e2d\u0e19"],
          ["ipNdaAgreement", "\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e02\u0e2d\u0e07\u0e2a\u0e39\u0e15\u0e23", "IP / NDA / \u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e2a\u0e39\u0e15\u0e23"],
        ];
        return (
          <>
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[90]" onClick={() => setDevelopDetailTarget(null)} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[95]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const detail = Object.fromEntries(fields.map(([key]) => [key, form.elements[key]?.value || ""]));
                  detail.brief = form.elements.brief?.value || "";
                  saveDevelopDetail(detail);
                }}
                className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left max-h-[88dvh] flex flex-col"
              >
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e43\u0e1a\u0e2a\u0e31\u0e48\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e2a\u0e39\u0e15\u0e23"}</h3>
                    <p className="text-[14px] text-slate-500 font-semibold mt-0.5">{"\u0e2a\u0e39\u0e15\u0e23\u0e17\u0e35\u0e48"} {developDetailTarget.index + 1}: {item.formulaName || "-"}</p>
                  </div>
                  <button type="button" onClick={() => setDevelopDetailTarget(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-4.5 w-4.5" /></button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map(([key, label, placeholder]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-500 font-bold">{label}</label>
                        <input name={key} defaultValue={item[key] || ""} className="w-full p-2.5 bg-white border border-purple-200 rounded-xl focus:border-purple-500 outline-none text-xs font-semibold text-slate-800" placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-500 font-bold">{"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38\u0e2a\u0e23\u0e38\u0e1b\u0e23\u0e27\u0e21 / Brief Note"}</label>
                    <textarea name="brief" defaultValue={item.brief || ""} className="w-full h-28 p-3 bg-white border border-purple-200 rounded-xl focus:border-purple-500 outline-none text-xs text-slate-700 resize-none" placeholder={"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21"} />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                  <button type="button" onClick={() => setDevelopDetailTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer">{"\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01"}</button>
                  <button type="submit" className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black cursor-pointer">{"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}</button>
                </div>
              </form>
            </div>
          </>
        );
      })()}

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-[100] min-w-[140px] text-left"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedLead(contextMenu.lead);
              setDrawerOpen(true);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors text-left"
          >
            แก้ไขข้อมูลดีล
          </button>
          
          <div className="relative group border-t border-slate-100">
            <button
              className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex justify-between items-center gap-2 cursor-pointer transition-colors text-left"
            >
              <span>ย้ายไปยังคอลัมน์</span>
              <span className="text-[14px] text-slate-400">▶</span>
            </button>
            <div className={`absolute top-0 hidden group-hover:block z-[110] ${
              contextMenu.x > (typeof window !== "undefined" ? window.innerWidth : 1000) - 300 
                ? "right-full pr-2" 
                : "left-full pl-2"
            }`}>
              <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[160px] max-h-60 overflow-y-auto text-left">
                {localColumns.map(col => {
                  const isCurrent = contextMenu.lead.section === col.id;
                  return (
                    <button
                      key={col.id}
                      disabled={isCurrent}
                      onClick={() => {
                        handleMoveLead(contextMenu.lead._id, col.id);
                        setContextMenu(null);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center justify-between font-semibold ${
                        isCurrent 
                          ? "text-slate-300 cursor-not-allowed bg-slate-50/50" 
                          : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <span className="truncate pr-1">{col.label}</span>
                      {isCurrent && <span className="text-[13px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded-sm">ปัจจุบัน</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (handleDeleteLead) {
                handleDeleteLead(contextMenu.lead._id);
              }
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors text-left border-t border-slate-100"
          >
            ลบดีลลูกค้า
          </button>
        </div>
      )}

      {/* Edit Column & Automations Modal */}
      {editingColumn && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] transition-opacity" 
            onClick={() => setEditingColumn(null)}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70]">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center text-left">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">แก้ไขคอลัมน์และตั้งกฎอัตโนมัติ</h2>
                  <p className="text-[14px] text-slate-400">ระบุชื่อ Stage หรือ ตั้งเงื่อนไขการทำงานอัตโนมัติ</p>
                </div>
                <button className="p-1 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setEditingColumn(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-left">
                {/* Column Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase">ชื่อคอลัมน์</label>
                  <input 
                    type="text" 
                    value={editColLabel} 
                    onChange={(e) => setEditColLabel(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-xs text-slate-800 font-bold animate-none" 
                    placeholder="ระบุชื่อคอลัมน์..."
                  />
                </div>

                {/* Column Color */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-slate-400 font-bold uppercase">สีประจำคอลัมน์</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLUMN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditColColor(c.value)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-all border-2 ${
                          editColColor === c.value
                            ? "border-slate-800 scale-110 shadow-xs"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 hover:scale-105 transition-all">
                      <input
                        type="color"
                        value={editColColor}
                        onChange={(e) => setEditColColor(e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        title="กำหนดสีเอง"
                      />
                    </div>
                  </div>
                </div>

                {/* Automation Rules */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-slate-400 font-bold uppercase block tracking-wider">ย้ายอัตโนมัติ (Auto-move Rule)</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editColRuleEnabled} 
                        onChange={(e) => setEditColRuleEnabled(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {editColRuleEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">หากไม่มีการเคลื่อนไหวเกิน (วัน)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={editColRuleDays} 
                          onChange={(e) => setEditColRuleDays(parseInt(e.target.value) || "")} 
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-xs text-slate-800 font-bold transition-all"
                          placeholder="เช่น 7"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[14px] text-slate-400 font-bold uppercase">ย้ายดีลไปยังคอลัมน์ปลายทาง</label>
                        <select
                          value={editColRuleTarget}
                          onChange={(e) => setEditColRuleTarget(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-xs text-slate-800 font-semibold cursor-pointer transition-colors"
                        >
                          <option value="" disabled>เลือกคอลัมน์ปลายทาง...</option>
                          {localColumns.filter(c => c.id !== editingColumn.id).map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                <button 
                  onClick={() => {
                    handleDeleteColumn(editingColumn.id);
                    setEditingColumn(null);
                  }}
                  className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  ลบคอลัมน์
                </button>
                <button 
                  onClick={() => setEditingColumn(null)} 
                  className="flex-grow border border-slate-200 text-slate-500 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => {
                    // Update column label and rules
                    const updated = localColumns.map(col => {
                      if (col.id === editingColumn.id) {
                        return {
                          ...col,
                          label: editColLabel.trim() || col.label,
                          color: editColColor,
                          rule: {
                            enabled: editColRuleEnabled,
                            triggerDays: editColRuleDays || 7,
                            targetColumnId: editColRuleTarget
                          }
                        };
                      }
                      return col;
                    });
                    saveBoardColumns(updated);
                    setEditingColumn(null);
                  }}
                  className="flex-grow bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Modal: Detailed Product Specifications ────────────────────────── */}
      {isSpecModalOpen && activeSpecIndex !== null && (
        (() => {
          const specItem = activeSpecType === "create" 
            ? createLotItems[activeSpecIndex] 
            : editLotItems[activeSpecIndex];
            
          if (!specItem) return null;
          
          const handleFieldChange = (field, val) => {
            if (activeSpecType === "create") {
              setCreateLotItems(prev => prev.map((item, idx) =>
                idx === activeSpecIndex ? { ...item, [field]: val } : item
              ));
            } else {
              setEditLotItems(prev => prev.map((item, idx) =>
                idx === activeSpecIndex ? { ...item, [field]: val } : item
              ));
            }
          };


          return (
            <>
              <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60] transition-opacity" 
                onClick={() => setIsSpecModalOpen(false)}
              />
              <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[65]">
                <div className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                        ตั้งค่าข้อมูลสินค้าโดยละเอียด
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        สูตรโรงงาน: <span className="text-green-600 font-bold">{specItem.formulaName || "-"}</span>
                      </p>
                    </div>
                    <button 
                      type="button"
                      className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" 
                      onClick={() => setIsSpecModalOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 text-slate-700 space-y-6">
                    <div className="flex flex-col gap-6">

                      {/* Sections — stacked single column */}
                      <div className="space-y-6 text-left">

                        {/* Section 1: Product identity — whose brand this order is for */}
                        <div className="space-y-2.5 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                          <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider border-b border-slate-100 pb-0.5">
                            ข้อมูลสินค้า
                          </h4>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500 font-bold">แบรนด์ (สินค้านี้ผลิตให้แบรนด์ใด)</label>
                            <input
                              type="text"
                              value={specItem.brand || ""}
                              onChange={(e) => handleFieldChange("brand", e.target.value)}
                              placeholder="เช่น Naive หรือชื่อแบรนด์ของลูกค้า"
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500"
                            />
                          </div>

                        </div>

                        {/* Section 2: Scents & Accessories */}
                        <div className="space-y-2.5 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                          <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider border-b border-slate-100 pb-0.5">
                            วัตถุดิบและกลิ่น
                          </h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">บรรจุภัณฑ์ (ขวด/กระปุก)</label>
                              <div className="flex gap-2 items-center">
                                {(() => {
                                  const pItem = packOptions.find(p => p._id === specItem.packagingItemId);
                                  return (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <CreatableSelect
                                          icon="📦"
                                          placeholder="เลือกบรรจุภัณฑ์"
                                          tabs={OWNER_TABS}
                                          options={buildTabbedOptions(packOptions, activeSpecType === "create" ? createCustomerName : editCustomerName)}
                                          value={idByName(packOptions, specItem.packagingType)}
                                          displayName={specItem.packagingType}
                                          onSelect={(opt) => {
                                            handleFieldChange("packagingType", opt?.name || "");
                                            handleFieldChange("packagingItemId", opt?._id || "");
                                          }}
                                          createExtras
                                          onCreate={(name, extras) => onCreatePackaging?.(name, extras, activeSpecType === "create" ? createCustomerName : editCustomerName)}
                                        />
                                        {(() => {
                                          const needed = parseInt(specItem.bottleCount || specItem.quantityPcs) || 0;
                                          let text = "ไม่มีในสต็อก";
                                          let cls = "border-amber-200 bg-amber-50/60 text-amber-700";
                                          if (pItem) {
                                            if ((pItem.currentQuantity || 0) >= needed && (pItem.currentQuantity || 0) > 0) {
                                              text = `มีจำนวน ${pItem.currentQuantity} — มีขวดพร้อมผลิต`;
                                              cls = "border-green-200 bg-green-50/60 text-green-700";
                                            } else {
                                              text = `มีจำนวน ${pItem.currentQuantity || 0}${needed ? ` / ต้องใช้ ${needed}` : ""} — ขวดไม่พอ เบิกเข้าใน Stock: ${(activeSpecType === "create" ? createCustomerName : editCustomerName) || "ลูกค้า"} · ${pItem.name}`;
                                            }
                                          }
                                          return (
                                            <input
                                              type="text"
                                              readOnly
                                              tabIndex={-1}
                                              value={text}
                                              className={`mt-1.5 w-full p-2 rounded-lg border text-[15px] font-bold outline-none cursor-default ${cls}`}
                                            />
                                          );
                                        })()}
                                      </div>
                                      <div
                                        onClick={() => pItem?.image && setZoomImage({ src: pItem.image, alt: pItem.name })}
                                        className={`w-24 h-24 rounded-xl bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden ${pItem?.image ? "cursor-zoom-in hover:ring-2 hover:ring-green-400" : ""}`}
                                      >
                                        {pItem?.image ? <img src={pItem.image} alt="bottle" className="w-full h-full object-cover" /> : <span className="text-[14px] text-slate-400">ภาพ</span>}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">หัวฉีด</label>
                              <div className="flex gap-2 items-center">
                                {(() => {
                                  const nItem = uniqueNozzles.find(n => n._id === specItem.nozzleId);
                                  return (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <CreatableSelect
                                          icon="🔌"
                                          placeholder="เลือกหัวฉีด"
                                          tabs={OWNER_TABS}
                                          options={buildTabbedOptions(uniqueNozzles, activeSpecType === "create" ? createCustomerName : editCustomerName)}
                                          value={specItem.nozzleId}
                                          displayName={specItem.nozzleType}
                                          onSelect={(opt) => {
                                            handleFieldChange("nozzleId", opt?._id || "");
                                            handleFieldChange("nozzleType", opt?.name || "");
                                          }}
                                          createExtras
                                          onCreate={(name, extras) => onCreatePackaging?.(name, extras, activeSpecType === "create" ? createCustomerName : editCustomerName, "หัวฉีด")}
                                        />
                                        {(() => {
                                          const needed = parseInt(specItem.nozzleCount || specItem.bottleCount || specItem.quantityPcs) || 0;
                                          let text = "ไม่มีในสต็อก";
                                          let cls = "border-amber-200 bg-amber-50/60 text-amber-700";
                                          if (nItem) {
                                            if ((nItem.currentQuantity || 0) >= needed && (nItem.currentQuantity || 0) > 0) {
                                              text = `มีจำนวน ${nItem.currentQuantity} — มีหัวฉีดพร้อมผลิต`;
                                              cls = "border-green-200 bg-green-50/60 text-green-700";
                                            } else {
                                              text = `มีจำนวน ${nItem.currentQuantity || 0}${needed ? ` / ต้องใช้ ${needed}` : ""} — หัวฉีดไม่พอ เบิกเข้าใน Stock: ${(activeSpecType === "create" ? createCustomerName : editCustomerName) || "ลูกค้า"} · ${nItem.name}`;
                                            }
                                          }
                                          return (
                                            <input
                                              type="text"
                                              readOnly
                                              tabIndex={-1}
                                              value={text}
                                              className={`mt-1.5 w-full p-2 rounded-lg border text-[15px] font-bold outline-none cursor-default ${cls}`}
                                            />
                                          );
                                        })()}
                                      </div>
                                      <div
                                        onClick={() => nItem?.image && setZoomImage({ src: nItem.image, alt: nItem.name })}
                                        className={`w-24 h-24 rounded-xl bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden ${nItem?.image ? "cursor-zoom-in hover:ring-2 hover:ring-green-400" : ""}`}
                                      >
                                        {nItem?.image ? <img src={nItem.image} alt="nozzle" className="w-full h-full object-cover" /> : <span className="text-[14px] text-slate-400">ภาพ</span>}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">กลิ่นที่เลือก</label>
                              <CreatableSelect
                                icon="🌿"
                                placeholder="เลือก/เพิ่มกลิ่น"
                                options={uniqueScents}
                                value={specItem.scentId}
                                displayName={specItem.scentType}
                                onSelect={(opt) => {
                                  handleFieldChange("scentId", opt?._id || "");
                                  handleFieldChange("scentType", opt?.name || "");
                                }}
                                onCreate={onCreateScent}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Bottle Spec & Quantity */}
                        <div className="space-y-2.5 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                          <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider border-b border-slate-100 pb-0.5">
                            ปริมาณและขนาดบรรจุ
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">ขนาดขวด (ml)</label>
                              <input
                                type="number"
                                value={specItem.bottleSize || ""}
                                onChange={(e) => handleFieldChange("bottleSize", e.target.value)}
                                placeholder="ขนาดขวด"
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">ปริมาณที่ใส่ (ml)</label>
                              <input
                                type="number"
                                value={specItem.fillVolume || ""}
                                onChange={(e) => handleFieldChange("fillVolume", e.target.value)}
                                placeholder="ปริมาณน้ำยา"
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">จำนวนขวดและหัวฉีด</label>
                              <input
                                type="number"
                                value={specItem.bottleCount || ""}
                                onChange={(e) => {
                                  handleFieldChange("bottleCount", e.target.value);
                                  handleFieldChange("nozzleCount", e.target.value);
                                  handleFieldChange("quantityPcs", e.target.value);
                                }}
                                placeholder="จำนวนขวดและหัวฉีด"
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-800 outline-none focus:border-green-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 5: Sticker / Label specs */}
                        <div className="space-y-2.5 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                          <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider border-b border-slate-100 pb-0.5">
                            รายละเอียดสติกเกอร์
                          </h4>
                          {/* Sticker item picker (moved here from วัตถุดิบและกลิ่น) */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500 font-bold">สติกเกอร์</label>
                            <div className="flex gap-2 items-center">
                              {(() => {
                                const lItem = labelOptions.find(l => l._id === specItem.labelItemId);
                                return (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <CreatableSelect
                                        icon="🏷️"
                                        placeholder="เลือกสติกเกอร์"
                                        tabs={OWNER_TABS}
                                        options={buildTabbedOptions(labelOptions, activeSpecType === "create" ? createCustomerName : editCustomerName)}
                                        value={idByName(labelOptions, specItem.labelType)}
                                        displayName={specItem.labelType}
                                        onSelect={(opt) => {
                                          handleFieldChange("labelType", opt?.name || "");
                                          handleFieldChange("labelItemId", opt?._id || "");
                                        }}
                                        createExtras
                                        onCreate={(name, extras) => onCreateLabel?.(name, extras, activeSpecType === "create" ? createCustomerName : editCustomerName)}
                                      />
                                      {(() => {
                                        const needed = parseInt(specItem.bottleCount || specItem.quantityPcs) || 0;
                                        let text = "ไม่มีในสต็อก";
                                        let cls = "border-amber-200 bg-amber-50/60 text-amber-700";
                                        if (lItem) {
                                          if ((lItem.currentQuantity || 0) >= needed && (lItem.currentQuantity || 0) > 0) {
                                            text = `มีจำนวน ${lItem.currentQuantity} — มีสติกเกอร์พร้อมผลิต`;
                                            cls = "border-green-200 bg-green-50/60 text-green-700";
                                          } else {
                                            text = `มีจำนวน ${lItem.currentQuantity || 0}${needed ? ` / ต้องใช้ ${needed}` : ""} — สติกเกอร์ไม่พอ เบิกเข้าใน Stock: ${(activeSpecType === "create" ? createCustomerName : editCustomerName) || "ลูกค้า"} · ${lItem.name}`;
                                          }
                                        }
                                        return (
                                          <input
                                            type="text"
                                            readOnly
                                            tabIndex={-1}
                                            value={text}
                                            className={`mt-1.5 w-full p-2 rounded-lg border text-[15px] font-bold outline-none cursor-default ${cls}`}
                                          />
                                        );
                                      })()}
                                    </div>
                                    <div
                                      onClick={() => lItem?.image && setZoomImage({ src: lItem.image, alt: lItem.name })}
                                      className={`w-24 h-24 rounded-xl bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden ${lItem?.image ? "cursor-zoom-in hover:ring-2 hover:ring-green-400" : ""}`}
                                    >
                                      {lItem?.image ? <img src={lItem.image} alt="sticker" className="w-full h-full object-cover" /> : <span className="text-[14px] text-slate-400">ภาพ</span>}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">ขนาดสติกเกอร์ (กว้าง x สูง CM)</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={specItem.stickerWidth || ""}
                                  onChange={(e) => handleFieldChange("stickerWidth", e.target.value)}
                                  placeholder="กว้าง"
                                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500"
                                />
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={specItem.stickerHeight || ""}
                                  onChange={(e) => handleFieldChange("stickerHeight", e.target.value)}
                                  placeholder="สูง"
                                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">ผู้สั่งผลิตสติกเกอร์</label>
                              <SearchableSelect
                                value={specItem.stickerOrderer || "Naive"}
                                onChange={(val) => handleFieldChange("stickerOrderer", val)}
                                options={[
                                  { value: "Naive", label: "สติกเกอร์ Naive" },
                                  { value: "เราสั่ง", label: "ลูกค้าสั่งเอง" }
                                ]}
                                searchable={false}
                                className="w-full text-base p-3"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500 font-bold">สถานะสติกเกอร์</label>
                              <SearchableSelect
                                value={specItem.stickerStatus || "รอสติกเกอร์"}
                                onChange={(val) => handleFieldChange("stickerStatus", val)}
                                options={[
                                  { value: "รอสติกเกอร์", label: "รอสติกเกอร์" },
                                  { value: "ติดสติกเกอร์แล้ว", label: "ติดสติกเกอร์แล้ว" }
                                ]}
                                searchable={false}
                                className="w-full text-base p-3"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 text-left">
                        {/* Section 4: Lot Info & Printing */}
                        <div className="space-y-4 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                          <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider border-b border-slate-100 pb-0.5">
                            การระบุล็อตผลิตและการยิงขวด
                          </h4>
                          
                          {/* Row 1: ตำแหน่งการยิงล็อต (Full Row) */}
                          <div className="flex flex-col gap-1 w-full">
                            <label className="text-xs text-slate-500 font-bold">ตำแหน่งการยิงล็อต</label>
                            <SearchableSelect
                              value={specItem.printLocation || "ยิงใต้ขวด"}
                              onChange={(val) => handleFieldChange("printLocation", val)}
                              options={[
                                { value: "ยิงใต้ขวด", label: "ยิงใต้ขวด" },
                                { value: "ยิงบนฉลาก", label: "ยิงบนฉลาก" }
                              ]}
                              searchable={false}
                              className="w-full text-base p-3"
                            />
                          </div>

                          {/* Row 2: Checkboxes (แจ้งเลขล็อก & แจ้งวันที่ผลิต) */}
                          <div className="flex items-center gap-6 py-1">
                            <label className="flex items-center gap-2 cursor-pointer text-base font-bold text-slate-655">
                              <input 
                                type="checkbox"
                                checked={specItem.notifyLot || false}
                                onChange={(e) => handleFieldChange("notifyLot", e.target.checked)}
                                className="rounded border-slate-350 text-green-600 w-5 h-5 cursor-pointer"
                              />
                              แจ้งเลขล็อก
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-base font-bold text-slate-655">
                              <input 
                                type="checkbox"
                                checked={specItem.autoMfgDate === false}
                                onChange={(e) => {
                                  const isManualDates = e.target.checked;
                                  handleFieldChange("autoMfgDate", !isManualDates);
                                  if (!isManualDates) {
                                    const todayStr = todayDateOnly();
                                    handleFieldChange("mfgDate", todayStr);
                                    handleFieldChange("expDate", addYears(todayStr));
                                  }
                                }}
                                className="rounded border-slate-350 text-green-600 w-5 h-5 cursor-pointer"
                              />
                              แจ้งวันที่ผลิต
                            </label>
                          </div>

                          {/* Row 3: LOT Number Field (Auto vs Manual) */}
                          {(() => {
                            const activeCfg = (prefixConfigs || []).find(c =>
                              (c.formulaId && specItem.formulaId && String(c.formulaId) === String(specItem.formulaId)) ||
                              ((!c.formulaId || !specItem.formulaId) && c.formulaName === specItem.formulaName)
                            );
                            const prefix = activeCfg ? activeCfg.prefix : "";
                            const generated = generateLotNo(prefix, specItem.mfgDate);
                            const isAuto = !specItem.notifyLot;
                            
                            return (
                              <div className="flex flex-col gap-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <label className="text-xs text-slate-500 font-bold">
                                  {isAuto ? "เลข LOT (สร้างอัตโนมัติ)" : "ระบุเลข LOT เอง"}
                                </label>
                                <input
                                  type="text"
                                  value={isAuto ? generated : (specItem.lotNo || "")}
                                  disabled={isAuto}
                                  onChange={(e) => {
                                    if (!isAuto) {
                                      handleFieldChange("lotNo", e.target.value);
                                    }
                                  }}
                                  placeholder={isAuto ? "Auto generated lot number..." : "ป้อนเลข LOT เอง..."}
                                  className="p-3 bg-white border border-slate-200 rounded-lg text-base font-bold text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                />
                              </div>
                            );
                          })()}

                          {/* LOT Dates */}
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-700">LOT ผลิต (วันผลิต/หมดอายุ)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-455 font-bold">วันที่ผลิต (MFG)</label>
                                <input 
                                  type="date"
                                  value={specItem.autoMfgDate !== false ? (specItem.mfgDate || new Date().toISOString().split("T")[0]) : (specItem.mfgDate || "")}
                                  disabled={specItem.autoMfgDate !== false}
                                  onChange={(e) => handleFieldChange("mfgDate", e.target.value)}
                                  className="p-3 bg-white border border-slate-200 rounded-lg text-base text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400 w-full"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-455 font-bold">วันหมดอายุ (EXP)</label>
                                <input 
                                  type="date"
                                  value={specItem.autoMfgDate !== false
                                    ? (specItem.expDate || addYears(specItem.mfgDate || todayDateOnly()))
                                    : (specItem.expDate || "")}
                                  disabled={specItem.autoMfgDate !== false}
                                  onChange={(e) => handleFieldChange("expDate", e.target.value)}
                                  className="p-3 bg-white border border-slate-200 rounded-lg text-base text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400 w-full"
                                />
                              </div>
                            </div>
                            {specItem.autoMfgDate !== false && (
                              <div className="text-xs text-red-500 font-semibold mt-1">
                                * ถ้าตั้งเป็น Auto วันผลิตแล้วจะนับวันที่ผ่าน QC รอบที่สอง
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Section 6: Notes */}
                    <div className="space-y-1.5 text-left bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                      <h4 className="text-sm text-slate-455 font-bold uppercase tracking-wider pb-0.5">
                        หมายเหตุเพิ่มเติม
                      </h4>
                      <textarea 
                        value={specItem.notes || ""}
                        onChange={(e) => handleFieldChange("notes", e.target.value)}
                        placeholder="ระบุคำสั่งพิเศษหรือข้อสังเกตเฉพาะของสเปกสินค้านี้..."
                        className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 outline-none focus:border-green-500 focus:bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                    <button 
                      type="button"
                      onClick={() => setIsSpecModalOpen(false)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-green-100/50 cursor-pointer"
                    >
                      บันทึกข้อมูลสเปกสินค้า
                    </button>
                  </div>
                </div>
              </div>

              {/* Image lightbox (click thumbnail to zoom) */}
              {zoomImage && (
                <div
                  className="fixed inset-0 z-[80] bg-slate-950/80 flex items-center justify-center p-8 cursor-zoom-out"
                  onClick={() => setZoomImage(null)}
                >
                  <div className="flex flex-col items-center gap-3 max-w-[90vw]">
                    <img src={zoomImage.src} alt={zoomImage.alt || "zoom"} className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain bg-white" />
                    {zoomImage.alt && <p className="text-white text-sm font-bold">{zoomImage.alt}</p>}
                  </div>
                </div>
              )}
            </>
          );
        })()
      )}

      {/* Import/Export Document Modal (BOM Calculator Style) */}
      <UIModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        title="จัดการดีลลูกค้า (นำเข้า / ส่งออก)"
        icon={FileSpreadsheet}
        size="2xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <UIButton
              variant="text"
              onClick={handleDownloadTemplate}
              icon={Download}
              className="text-green-600 hover:text-green-700 font-extrabold"
            >
              Download Template
            </UIButton>
            <UIButton
              variant="outline"
              onClick={() => setShowImportExportModal(false)}
            >
              ปิดหน้าต่าง
            </UIButton>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Import / Export tab switcher */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setImpExpTab("import")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${impExpTab === "import" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Upload className="h-4 w-4" /> นำเข้า (Import)
            </button>
            <button
              type="button"
              onClick={() => setImpExpTab("export")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${impExpTab === "export" ? "bg-white text-green-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Download className="h-4 w-4" /> ส่งออก (Export)
            </button>
          </div>

          {/* Import panel */}
          {impExpTab === "import" && (
            <div className="flex flex-col items-center justify-center p-4 text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">นำเข้าข้อมูลลูกค้า (Import)</h4>
                <p className="text-xs text-slate-500 mt-1">อัปโหลดไฟล์ Excel (.xlsx) หรือ .csv ที่กรอกตามเทมเพลต · คอลัมน์ <b>วันที่สร้าง</b> เว้นว่าง = วันนี้ หรือใส่วันย้อนหลังได้</p>
              </div>
              <div className="w-full max-w-[240px] relative">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    handleImportFileChange(e);
                    setShowImportExportModal(false);
                  }}
                  className="hidden"
                  id="csv-file-import-crm"
                />
                <label
                  htmlFor="csv-file-import-crm"
                  className="w-full inline-flex items-center justify-center gap-1.5 font-bold transition-all duration-200 rounded-xl outline-none active:scale-95 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer px-4 py-2.5 text-xs"
                >
                  <Upload className="h-4.5 w-4.5" />
                  เลือกไฟล์ Excel / CSV
                </label>
              </div>
            </div>
          )}

          {/* Export panel */}
          {impExpTab === "export" && (
            <div className="flex flex-col items-center justify-center p-4 text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">ส่งออกข้อมูลลูกค้า (Export)</h4>
                <p className="text-xs text-slate-500 mt-1">ดาวน์โหลดข้อมูลดีลปัจจุบันบนบอร์ดทั้งหมดในระบบเป็นไฟล์ Excel (.csv)</p>
              </div>
              <UIButton
                variant="primary"
                onClick={() => {
                  handleExportLeads();
                  setShowImportExportModal(false);
                }}
                icon={Download}
                className="w-full max-w-[240px]"
              >
                Export ข้อมูล
              </UIButton>
            </div>
          )}
        </div>
      </UIModal>
    </div>
  );
}
