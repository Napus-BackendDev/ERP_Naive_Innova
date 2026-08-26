"use client";

import React, { useState, useEffect } from "react";
import { Search, FlaskConical, Package, Boxes, Calendar, X, Plus, Image, Upload, Minus, Edit2, Trash2, ChevronDown, Check, FileText, Download, UploadCloud } from "lucide-react";
import api from "@/lib/api";
import HeroBanner from "@/components/dashboard/HeroBanner";
import Badge from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatStructuredMovement, formatThaiStockDateTime, stockItemTypeForTab } from "@/lib/stockMovement";

const formatTravelLog = (desc) => {
  if (!desc) return "";
  const regex = /:\s*(รับเข้า|เบิกออก)\s*([\d,\.]+)\s*(ก\.|ชิ้น)\s*\(สต็อกคงเหลือปัจจุบัน:\s*([\d,\.]+)\s*(ก\.|ชิ้น)\)(?:\s*\|\s*หมายเหตุ:\s*(.*))?/;
  const match = desc.match(regex);
  if (!match) {
    return desc.replace(/^ปรับปรุงสต็อกวัตถุดิบสารเคมี\s*"[^"]*":\s*/, "")
               .replace(/^ปรับปรุงสต็อกบรรจุภัณฑ์\s*"[^"]*":\s*/, "");
  }

  const action = match[1];
  const amountStr = match[2];
  const unit = match[3];
  const currentStr = match[4];
  const remark = match[6] || "";

  const amount = parseFloat(amountStr.replace(/,/g, ""));
  const current = parseFloat(currentStr.replace(/,/g, ""));
  
  let previous = 0;
  if (action === "รับเข้า") {
    previous = current - amount;
  } else {
    previous = current + amount;
  }

  const fmtPrev = previous.toLocaleString();
  const fmtCurrent = current.toLocaleString();

  let result = `${action} ${amountStr} ${unit} | สต็อกก่อนหน้า: ${fmtPrev} ${unit} | สต็อกปัจจุบัน: ${fmtCurrent} ${unit}`;
  if (remark) {
    result += ` | หมายเหตุ: ${remark}`;
  }
  return result;
};

function SearchableSelectWithAddNew({
  label,
  options = [], // [{ value, label }]
  value,
  onChange,
  onAddNew,
  placeholder = "เลือก...",
  addNewLabel = "เพิ่มรายการใหม่"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full text-left flex flex-col gap-1.5" ref={dropdownRef}>
      {label && <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch("");
          }}
          className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold cursor-pointer flex justify-between items-center`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5" />
        </div>

        {isOpen && (
          <div className="absolute left-0 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-64 flex flex-col min-w-[200px]">
            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full bg-transparent text-xs outline-none text-slate-700 font-semibold"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {filteredOptions.length === 0 ? (
                search.trim() !== "" ? (
                  <div
                    onClick={() => {
                      onAddNew(search.trim());
                      setIsOpen(false);
                    }}
                    className="px-3 py-2.5 text-xs cursor-pointer font-extrabold text-green-600 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <span>+ {addNewLabel} "{search.trim()}"</span>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 text-xs text-slate-400 italic text-center">ไม่พบผลลัพธ์</div>
                )
              ) : (
                <>
                  {filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={`px-3 py-2.5 text-xs cursor-pointer flex justify-between items-center font-semibold hover:bg-slate-50 transition-colors ${
                          isSelected ? "text-green-600 bg-green-50/50" : "text-slate-600"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      </div>
                    );
                  })}
                  {search.trim() !== "" && !filteredOptions.some(opt => opt.label.toLowerCase() === search.trim().toLowerCase()) && (
                    <div
                      onClick={() => {
                        onAddNew(search.trim());
                        setIsOpen(false);
                      }}
                      className="px-3 py-2.5 text-xs cursor-pointer font-extrabold text-green-600 border-t border-slate-100 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <span>+ {addNewLabel} "{search.trim()}"</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockView({ ingredients = [], packagings = [], sampleProducts = [], fgLots = [], onRefresh }) {
  const [activeTab, setActiveTab] = useState("ingredients");
  const [searchTerm, setSearchTerm] = useState("");
  // Chip filter for the active stock tab ("all" = no filter). Each tab filters by
  // its own dimension — see CHIP_CONFIG / chipKeyOf below.
  const [stockFilter, setStockFilter] = useState("all");
  // Packaging tab carries a second dimension: the customer who ordered it.
  // Filtered together with the หมวดหมู่ chips (AND), reset whenever the tab changes.
  const [pkgCustomerFilter, setPkgCustomerFilter] = useState("all");
  const [zoomImage, setZoomImage] = useState(null);
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [modalImage, setModalImage] = useState("");

  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const docDropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (docDropdownRef.current && !docDropdownRef.current.contains(event.target)) {
        setDocDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportPackagings = () => {
    if (packagings.length === 0) {
      alert("ไม่มีข้อมูลบรรจุภัณฑ์เพื่อส่งออก");
      return;
    }
    const headers = ["ชื่อบรรจุภัณฑ์", "ประเภท", "ลูกค้าผู้สั่ง", "จำนวนคงเหลือ", "รายละเอียด/หมายเหตุ"];
    const rows = packagings.map(p => [
      p.name || "",
      p.type?.name || p.type || "",
      p.customer || "ระบบ",
      p.currentQuantity || 0,
      p.note || ""
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `packaging_stock_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDocDropdownOpen(false);
  };

  const handleDownloadTemplate = () => {
    const headers = ["ชื่อบรรจุภัณฑ์", "ประเภท", "ลูกค้าผู้สั่ง", "จำนวนคงเหลือ", "รายละเอียด/หมายเหตุ"];
    const sampleRow = ["ตัวอย่างขวดแชมพู 100ml สีขาว", "บรรจุภัณฑ์", "ระบบ", 1200, "ขวดพลาสติกเนื้อขาวขุ่น"];
    const csvContent = "\uFEFF" + [headers.join(","), sampleRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `packaging_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDocDropdownOpen(false);
  };

  const handleImportCSV = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert("ไฟล์ไม่มีข้อมูล");
        return;
      }
      
      const headers = lines[0].replace(/^\uFEFF/, "").split(",").map(h => h.trim().replace(/^"|"$/g, ''));
      
      const colMap = {
        name: headers.indexOf("ชื่อบรรจุภัณฑ์"),
        type: headers.indexOf("ประเภท"),
        customer: headers.indexOf("ลูกค้าผู้สั่ง"),
        currentQty: headers.indexOf("จำนวนคงเหลือ"),
        note: headers.indexOf("รายละเอียด/หมายเหตุ")
      };

      if (colMap.name === -1) {
        alert("ไม่พบหัวข้อ 'ชื่อบรรจุภัณฑ์' ในไฟล์ CSV");
        return;
      }

      const rawItems = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split CSV preserving EMPTY fields (,,) — the old regex dropped them,
        // shifting every later column (customer ended up holding the quantity).
        const row = [];
        {
          let cur = "", inQ = false;
          for (let c = 0; c < line.length; c++) {
            const ch = line[c];
            if (inQ) {
              if (ch === '"' && line[c + 1] === '"') { cur += '"'; c++; }
              else if (ch === '"') inQ = false;
              else cur += ch;
            } else if (ch === '"') {
              inQ = true;
            } else if (ch === ",") {
              row.push(cur.trim()); cur = "";
            } else {
              cur += ch;
            }
          }
          row.push(cur.trim());
        }
        
        const name = row[colMap.name];
        if (!name) continue;

        const typeStr = colMap.type !== -1 ? row[colMap.type] : "";
        const customer = colMap.customer !== -1 ? row[colMap.customer] : "ระบบ";
        const currentQty = colMap.currentQty !== -1 ? parseFloat(row[colMap.currentQty]) || 0 : 0;
        const note = colMap.note !== -1 ? row[colMap.note] : "";

        rawItems.push({
          name,
          customer,
          currentQuantity: currentQty,
          note,
          rawType: typeStr,
          image: ""
        });
      }

      if (rawItems.length === 0) {
        alert("ไม่พบข้อมูลบรรจุภัณฑ์ที่ถูกต้องในการนำเข้า");
        return;
      }

      if (!window.confirm(`ยืนยันการนำเข้าข้อมูลบรรจุภัณฑ์จำนวน ${rawItems.length} รายการ?`)) {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

        // Fetch categories to resolve ObjectIds
        const typesRes = await api.get("/packaging-types");
        const existingTypes = typesRes.data || [];

        // Helper function to find or create type
        const getOrCreateType = async (typeName) => {
          if (!typeName || typeName.trim() === "") return null;
          const trimmedName = typeName.trim();
          const match = existingTypes.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
          if (match) return match._id;
          try {
            const res = await api.post("/packaging-types", { name: trimmedName });
            existingTypes.push(res.data);
            return res.data._id;
          } catch (err) {
            console.error(`Failed to create type: ${trimmedName}`, err);
            return null;
          }
        };

        let successCount = 0;
        for (const item of rawItems) {
          try {
            const typeId = await getOrCreateType(item.rawType);

            const payload = {
              name: item.name,
              customer: item.customer,
              currentQuantity: item.currentQuantity,
              note: item.note,
              type: typeId,
              image: ""
            };

            await api.post("/packaging", payload);
            successCount++;
          } catch (err) {
            console.error(`Failed to import item: ${item.name}`, err);
          }
        }

        alert(`นำเข้าข้อมูลสำเร็จ ${successCount} จากทั้งหมด ${rawItems.length} รายการ!`);
        if (onRefresh) onRefresh();
      } catch (err) {
        alert("เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล: " + (err.message || err));
      }
    };
    reader.readAsText(file, "UTF-8");
    setDocDropdownOpen(false);
  };

  const handleImageChange = async (item, file, type) => {
    if (!file) return;
    setUploadingItemId(item._id);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result;
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

        if (type === "ingredients") {
          await api.put(`/bom/ingredients/${item._id}`, { image: base64String });
        } else if (type === "packagings") {
          await api.put(`/packaging/${item._id}`, { image: base64String });
        } else if (type === "sampleProducts") {
          await api.put(`/products/${item._id}`, { image: base64String });
        } else if (type === "fglots") {
          await api.patch(`/fg/lots/${item._id}`, { image: base64String });
        }
        
        if (onRefresh) onRefresh();
      } catch (err) {
        alert(err?.response?.data?.message || err?.response?.data?.error || "อัปโหลดรูปภาพล้มเหลว");
      } finally {
        setUploadingItemId(null);
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setUploadingItemId(null);
    };
  };

  // Modal States for Add Ingredient
  const [ingModalOpen, setIngModalOpen] = useState(false);
  const [ingName, setIngName] = useState("");
  const [ingStock, setIngStock] = useState("");
  const [ingSupplier, setIngSupplier] = useState("");
  const [ingPrice, setIngPrice] = useState("");
  const [ingSubmitting, setIngSubmitting] = useState(false);
  const [ingError, setIngError] = useState("");

  const handleIngSubmit = async (e) => {
    e.preventDefault();
    setIngError("");
    const data = {
      name: ingName,
      openingStock: parseFloat(ingStock) || 0,
      supplier: ingSupplier,
      pricePerKg: (parseFloat(ingPrice) || 0) * 1000,
      image: modalImage
    };

    setIngSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

      if (editIngId) await api.put(`/bom/ingredients/${editIngId}`, data);
      else await api.post("/bom/ingredients", data);
      setIngModalOpen(false);
      setEditIngId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setIngError(err?.response?.data?.message || err?.response?.data?.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIngSubmitting(false);
    }
  };

  // Modal States for Add Packaging
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgCustomer, setPkgCustomer] = useState("ระบบ");
  const [pkgCurrentQty, setPkgCurrentQty] = useState("");
  const [pkgNote, setPkgNote] = useState("");
  const [pkgSubmitting, setPkgSubmitting] = useState(false);
  const [pkgError, setPkgError] = useState("");
  const [pkgTypes, setPkgTypes] = useState([]);
  const [customersList, setCustomersList] = useState(["ระบบ"]);
  const [pkgTypeVal, setPkgTypeVal] = useState("");
  const [bomFormulas, setBomFormulas] = useState([]);

  const handlePkgTypeChange = (val) => {
    setPkgTypeVal(val);
  };

  const handleAddNewCustomer = (name) => {
    setCustomersList(prev => {
      const list = [...prev, name];
      return Array.from(new Set(list)).sort();
    });
    setPkgCustomer(name);
  };

  const handleAddNewCustomerForProd = (name) => {
    setCustomersList(prev => {
      const list = [...prev, name];
      return Array.from(new Set(list)).sort();
    });
    setProdBrand(name);
  };

  const handlePkgSubmit = async (e) => {
    e.preventDefault();
    setPkgError("");
    const data = {
      name: pkgName,
      customer: pkgCustomer || "ระบบ",
      currentQuantity: parseFloat(pkgCurrentQty) || 0,
      note: pkgNote || "",
      image: modalImage,
      type: pkgTypeVal || null
    };
    setPkgSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

      if (editPkgId) await api.put(`/packaging/${editPkgId}`, data);
      else await api.post("/packaging", data);
      setPkgModalOpen(false);
      setEditPkgId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setPkgError(err?.response?.data?.message || err?.response?.data?.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setPkgSubmitting(false);
    }
  };

  // Modal States for Add Product
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodFormulaName, setProdFormulaName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodFormulaId, setProdFormulaId] = useState("");
  const [prodBrand, setProdBrand] = useState("นาอีฟ");
  const [prodCategory, setProdCategory] = useState("สินค้าตัวอย่าง");
  const [prodSize, setProdSize] = useState("");
  const [prodCurrentQty, setProdCurrentQty] = useState("");
  const [prodNote, setProdNote] = useState("");
  const [prodSubmitting, setProdSubmitting] = useState(false);
  const [prodError, setProdError] = useState("");

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    setProdError("");
    const data = {
      name: prodName,
      formulaId: prodFormulaId || bomFormulas.find(f => f.name === prodFormulaName)?._id || "",
      formulaName: prodFormulaName || "",
      sku: prodSku || "",
      brand: prodBrand || "นาอีฟ",
      category: prodCategory || "สินค้าตัวอย่าง",
      size: prodSize || "",
      currentQuantity: parseFloat(prodCurrentQty) || 0,
      note: prodNote || "",
      isSample: true,
      image: modalImage
    };
    setProdSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

      if (editProdId) await api.put(`/products/${editProdId}`, data);
      else await api.post("/products", data);
      setProdModalOpen(false);
      setEditProdId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setProdError(err?.response?.data?.message || err?.response?.data?.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setProdSubmitting(false);
    }
  };

  // Modal States for Add Lot
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [lotNoVal, setLotNoVal] = useState("");
  const [lotFormulaId, setLotFormulaId] = useState("");
  const [lotFormulaName, setLotFormulaName] = useState("");
  const [lotCustomer, setLotCustomer] = useState("");
  const [lotQuantity, setLotQuantity] = useState("");
  const [lotUnit, setLotUnit] = useState("ชิ้น");
  const [lotMfgDate, setLotMfgDate] = useState("");
  const [lotExpDate, setLotExpDate] = useState("");
  const [lotSubmitting, setLotSubmitting] = useState(false);
  const [lotError, setLotError] = useState("");

  // Fetch packaging types, customers & formulas
  React.useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const [typesRes, salesRes, formulasRes] = await Promise.all([
          api.get("/packaging-types"),
          api.get("/sales"),
          api.get("/bom/formulas")
        ]);

        setPkgTypes(typesRes.data || []);
        setBomFormulas(formulasRes.data || []);

        const list = (salesRes.data || []).map(c => c.brand || c.name).filter(Boolean);
        const uniqueList = Array.from(new Set(list)).sort();
        setCustomersList(["ระบบ", ...uniqueList]);
      } catch (err) {
        console.error("Error fetching select options:", err);
      }
    };
    if (pkgModalOpen || prodModalOpen || lotModalOpen) {
      fetchSelectOptions();
    }
  }, [pkgModalOpen, prodModalOpen, lotModalOpen]);

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    setLotError("");
    const data = {
      lotNo: lotNoVal,
      formulaId: lotFormulaId || bomFormulas.find(f => f.name === lotFormulaName)?._id || "",
      formulaName: lotFormulaName || "",
      customer: lotCustomer || "",
      quantity: parseInt(lotQuantity) || 0,
      unit: lotUnit || "ชิ้น",
      mfgDate: lotMfgDate,
      expDate: lotExpDate,
      status: "active",
      image: modalImage
    };
    setLotSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("ไม่พบรหัสผู้ใช้กรุณาเข้าสู่ระบบใหม่");

      if (editLotId) await api.put(`/fg/lots/${editLotId}`, data);
      else await api.post("/fg/recv", data);
      setLotModalOpen(false);
      setEditLotId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setLotError(err?.response?.data?.message || err?.response?.data?.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLotSubmitting(false);
    }
  };

  // Edit-mode ids (null = the modal is in "add" mode; set = editing that row via the same modal)
  const [editIngId, setEditIngId] = useState(null);
  const [editPkgId, setEditPkgId] = useState(null);
  const [editProdId, setEditProdId] = useState(null);
  const [editLotId, setEditLotId] = useState(null);


  // Adjust-stock drawer (ported from the Packaging page design)
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState(null);
  const [adjustTab, setAdjustTab] = useState("ingredients");
  const [adjustType, setAdjustType] = useState("in");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustLogs, setAdjustLogs] = useState([]);

  const fetchAdjustLogs = async () => {
    try {
      const item = selectedAdjustItem;
      const res = await api.get("/logs", {
        params: {
          category: "stock",
          stockItemType: stockItemTypeForTab(adjustTab),
          stockItemId: item?._id,
          legacyName: item?.name || item?.lotNo || "",
          limit: 1000,
          page: 1
        }
      });
      setAdjustLogs(res.data?.items || (Array.isArray(res.data) ? res.data : []));
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  };

  useEffect(() => {
    if (selectedAdjustItem) {
      fetchAdjustLogs();
    }
  }, [selectedAdjustItem, adjustTab]);

  // + / -  open the drawer for a single row (replaces the old window.prompt)
  const handleAdjust = (tab, item, dir) => {
    setSelectedAdjustItem(item);
    setAdjustTab(tab);
    setAdjustType(dir);
    setAdjustDrawerOpen(true);
  };

  const adjustCurrentQty = (tab, item) => {
    if (!item) return 0;
    if (tab === "ingredients") return Number(item.openingStock) || 0;
    if (tab === "fglots") return Number(item.quantity) || 0;
    return Number(item.currentQuantity) || 0;
  };
  const adjustUnit = (tab) => (tab === "ingredients" ? "ก." : "ชิ้น");

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(e.target.adjustQty.value);
    const note = e.target.adjustNote.value || "";
    if (isNaN(qty) || qty <= 0) return;
    const item = selectedAdjustItem, tab = adjustTab, dir = adjustType;
    setAdjustSubmitting(true);
    try {
      if (tab === "ingredients") {
        await api.post("/bom/ingredients/tx", { itemId: item._id, type: dir, amount: qty, note });
      } else if (tab === "packagings") {
        await api.post("/packaging/tx", { itemId: item._id, type: dir, amount: qty, note });
      } else if (tab === "sampleProducts") {
        const cur = Number(item.currentQuantity) || 0;
        const next = Math.max(0, dir === "in" ? cur + qty : cur - qty);
        await api.put(`/products/${item._id}`, { currentQuantity: next });
      } else if (tab === "fglots") {
        const cur = Number(item.quantity) || 0;
        const next = Math.max(0, dir === "in" ? cur + qty : cur - qty);
        await api.patch(`/fg/lots/${item._id}`, { quantity: next });
      }
      setAdjustDrawerOpen(false);
      setSelectedAdjustItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || "ปรับสต็อกไม่สำเร็จ");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // delete a single row
  const handleDelete = async (tab, item) => {
    if (!window.confirm(`ยืนยันลบ "${item.name || item.lotNo || ""}" ?`)) return;
    try {
      if (tab === "ingredients") await api.delete(`/bom/ingredients/${item._id}`);
      else if (tab === "packagings") await api.delete(`/packaging/${item._id}`);
      else if (tab === "sampleProducts") await api.delete(`/products/${item._id}`);
      else if (tab === "fglots") await api.delete(`/fg/lots/${item._id}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || "ลบไม่สำเร็จ");
    }
  };

  // open the existing "add" modal pre-filled, in edit mode
  const openEditIng = (item) => {
    setIngName(item.name || ""); setIngStock(String(item.openingStock ?? ""));
    setIngSupplier(item.supplier || ""); setIngPrice(item.pricePerKg ? String(item.pricePerKg / 1000) : "");
    setModalImage(item.image || ""); setIngError(""); setIngSubmitting(false);
    setEditIngId(item._id); setIngModalOpen(true);
  };
  const openEditPkg = (item) => {
    setPkgName(item.name || ""); setPkgCustomer(item.customer || "ระบบ");
    setPkgCurrentQty(String(item.currentQuantity ?? ""));
    setPkgNote(item.note || ""); setModalImage(item.image || ""); setPkgError(""); setPkgSubmitting(false);
    setPkgTypeVal(item.type?._id || item.type || "");
    setEditPkgId(item._id); setPkgModalOpen(true);
  };
  const openEditProd = (item) => {
    setProdName(item.name || ""); setProdFormulaId(item.formulaId || ""); setProdFormulaName(item.formulaName || ""); setProdSku(item.sku || "");
    setProdBrand(item.brand || "นาอีฟ"); setProdCategory(item.category || "สินค้าตัวอย่าง"); setProdSize(item.size || "");
    setProdCurrentQty(String(item.currentQuantity ?? ""));
    setProdNote(item.note || ""); setModalImage(item.image || ""); setProdError(""); setProdSubmitting(false);
    setEditProdId(item._id); setProdModalOpen(true);
  };
  const openEditLot = (item) => {
    setLotNoVal(item.lotNo || ""); setLotFormulaId(item.formulaId || ""); setLotFormulaName(item.formulaName || ""); setLotCustomer(item.customer || "");
    setLotQuantity(String(item.quantity ?? "")); setLotUnit(item.unit || "ชิ้น");
    setLotMfgDate(item.mfgDate ? new Date(item.mfgDate).toISOString().split("T")[0] : "");
    setLotExpDate(item.expDate ? new Date(item.expDate).toISOString().split("T")[0] : "");
    setModalImage(item.image || ""); setLotError(""); setLotSubmitting(false);
    setEditLotId(item._id); setLotModalOpen(true);
  };

  // compact action-cell shared by every table — button colors match the Packaging page
  const ActionCell = ({ tab, item }) => (
    <td className="px-6 py-4">
      <div className="inline-flex items-center gap-1 justify-end w-full">
        <button type="button" title="เพิ่มสต็อก (+)" onClick={() => handleAdjust(tab, item, "in")} className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors border border-green-200 cursor-pointer"><Plus className="h-3.5 w-3.5" /></button>
        <button type="button" title="ลดสต็อก (-)" onClick={() => handleAdjust(tab, item, "out")} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors border border-red-200 cursor-pointer"><Minus className="h-3.5 w-3.5" /></button>
        <button type="button" title="แก้ไขรายละเอียด" onClick={() => { if (tab === "ingredients") openEditIng(item); else if (tab === "packagings") openEditPkg(item); else if (tab === "sampleProducts") openEditProd(item); else openEditLot(item); }} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors border border-blue-200 cursor-pointer"><Edit2 className="h-3.5 w-3.5" /></button>
        <button type="button" title="ลบรายการ" onClick={() => handleDelete(tab, item)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-colors border border-rose-200 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </td>
  );

  // Each stock tab filters by the dimension that matters for it:
  //   สาร → Supplier, บรรจุภัณฑ์ → หมวดหมู่, Sample → แบรนด์, FG → ลูกค้า
  // Chip values are derived from the data, so new suppliers/types/brands/customers
  // appear on their own. Records with no value are grouped under "ไม่ระบุ".
  const UNSET = "ไม่ระบุ";
  const chipKeyOf = {
    ingredients: (item) => item.supplier?.trim() || UNSET,
    packagings: (item) => item.type?.name || UNSET,
    sampleProducts: (item) => item.brand?.trim() || UNSET,
    fglots: (item) => item.customer?.trim() || UNSET
  };
  const buildChips = (items, keyFn) => {
    const counts = items.reduce((acc, item) => {
      const k = keyFn(item);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    // "ไม่ระบุ" always sorts last; the rest alphabetically (Thai-aware).
    const keys = Object.keys(counts).sort((a, b) => {
      if (a === UNSET) return 1;
      if (b === UNSET) return -1;
      return a.localeCompare(b, "th");
    });
    return { counts, keys };
  };
  const matchesChip = (item, tab) =>
    stockFilter === "all" || chipKeyOf[tab](item) === stockFilter;

  // Customer dimension used only by the packaging tab's second chip row.
  const pkgCustomerKeyOf = (item) => item.customer?.trim() || UNSET;
  const matchesPkgCustomer = (item) =>
    pkgCustomerFilter === "all" || pkgCustomerKeyOf(item) === pkgCustomerFilter;

  const filteredIngredients = ingredients.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesChip(item, "ingredients")
  );
  // Nozzles (หัวฉีด) now live in the packaging collection as PackagingType "หัวฉีด"
  // (migrated), so they show in this same list — no separate merge needed.
  const filteredPackagings = packagings.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    matchesChip(item, "packagings") && matchesPkgCustomer(item)
  );
  const filteredSampleProducts = sampleProducts.filter(item =>
    (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    matchesChip(item, "sampleProducts")
  );
  const filteredFgLots = fgLots.filter(item =>
    item.lotNo?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesChip(item, "fglots")
  );

  const CHIP_CONFIG = {
    ingredients:    { label: "Supplier", items: ingredients },
    packagings:     { label: "หมวดหมู่",  items: packagings },
    sampleProducts: { label: "แบรนด์",   items: sampleProducts },
    fglots:         { label: "ลูกค้า",    items: fgLots }
  };

  const formatBuddhistDate = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d)) return "-";
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  };

  const getIngredientBadge = (openingStock) => {
    const val = Number(openingStock) || 0;
    if (val === 0) return <Badge variant="danger">หมดคลัง</Badge>;
    if (val < 100) return <Badge variant="warning">สต็อกต่ำ</Badge>;
    return <Badge variant="success">เพียงพอ</Badge>;
  };

  const getPackagingBadge = (current) => {
    const val = Number(current) || 0;
    if (val === 0) return <Badge variant="danger">สินค้าหมด</Badge>;
    if (val < 500) return <Badge variant="warning">ใกล้หมด</Badge>;
    return <Badge variant="success">เพียงพอ</Badge>;
  };
  
  const getFgLotBadge = (expDate) => {
    if (!expDate) return <Badge variant="success">ปกติ</Badge>;
    const exp = new Date(expDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    if (exp < now) return <Badge variant="danger">หมดอายุ</Badge>;
    if (exp < thirtyDaysFromNow) return <Badge variant="warning">ใกล้หมดอายุ</Badge>;
    return <Badge variant="success">ปกติ</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <HeroBanner 
        title="Stock" 
        subtitle="คลังสินค้ารวม — สาร บรรจุภัณฑ์ สินค้าตัวอย่าง และสินค้าสำเร็จรูป" 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <button
          onClick={() => { setActiveTab("ingredients"); setStockFilter("all"); setPkgCustomerFilter("all"); }}
          className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
            activeTab === "ingredients"
              ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <FlaskConical className={`h-5 w-5 transition-transform duration-200 ${activeTab === "ingredients" ? "text-green-600 scale-110" : "text-slate-400"}`} />
            <span className={`text-xs md:text-sm tracking-tight ${activeTab === "ingredients" ? "font-black" : "font-bold text-slate-600"}`}>
              สารและวัตถุดิบ
            </span>
          </div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
            activeTab === "ingredients" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {ingredients.length}
          </div>
        </button>
        <button
          onClick={() => { setActiveTab("packagings"); setStockFilter("all"); setPkgCustomerFilter("all"); }}
          className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
            activeTab === "packagings"
              ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <Package className={`h-5 w-5 transition-transform duration-200 ${activeTab === "packagings" ? "text-green-600 scale-110" : "text-slate-400"}`} />
            <span className={`text-xs md:text-sm tracking-tight ${activeTab === "packagings" ? "font-black" : "font-bold text-slate-600"}`}>
              ขวดและบรรจุภัณฑ์
            </span>
          </div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
            activeTab === "packagings" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {packagings.length}
          </div>
        </button>
        <button
          onClick={() => { setActiveTab("sampleProducts"); setStockFilter("all"); setPkgCustomerFilter("all"); }}
          className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
            activeTab === "sampleProducts"
              ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <Boxes className={`h-5 w-5 transition-transform duration-200 ${activeTab === "sampleProducts" ? "text-green-600 scale-110" : "text-slate-400"}`} />
            <span className={`text-xs md:text-sm tracking-tight ${activeTab === "sampleProducts" ? "font-black" : "font-bold text-slate-600"}`}>
              สินค้าตัวอย่าง (Sample)
            </span>
          </div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
            activeTab === "sampleProducts" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {sampleProducts.length}
          </div>
        </button>
        <button
          onClick={() => { setActiveTab("fglots"); setStockFilter("all"); setPkgCustomerFilter("all"); }}
          className={`flex items-center justify-between p-4 px-5 rounded-2xl border transition-all cursor-pointer select-none ${
            activeTab === "fglots"
              ? "bg-green-50/20 border-2 border-green-600 text-green-800 shadow-sm scale-[1.01]"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/30 hover:border-slate-300 shadow-3xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <Calendar className={`h-5 w-5 transition-transform duration-200 ${activeTab === "fglots" ? "text-green-600 scale-110" : "text-slate-400"}`} />
            <span className={`text-xs md:text-sm tracking-tight ${activeTab === "fglots" ? "font-black" : "font-bold text-slate-600"}`}>
              สินค้าสำเร็จรูป (FG)
            </span>
          </div>
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[15px] font-mono font-extrabold shrink-0 ml-2 ${
            activeTab === "fglots" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {fgLots.length}
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
          <div className="w-full max-w-sm">
            <Input
              icon={Search}
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === "ingredients" && (
            <button
              onClick={() => {
                setIngName("");
                setIngStock("");
                setIngSupplier("");
                setIngPrice("");
                setIngError("");
                setIngSubmitting(false);
                setModalImage("");
                setEditIngId(null);
                setIngModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-green-100/30"
            >
              <Plus className="h-4 w-4 shrink-0 text-white" />
              <span>เพิ่มสารเคมี</span>
            </button>
          )}
          {activeTab === "packagings" && (
            <div className="flex items-center gap-2 relative" ref={docDropdownRef}>
              {/* Document Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDocDropdownOpen(!docDropdownOpen)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer border border-slate-200"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>จัดการเอกสาร</span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-slate-500 transition-transform duration-200" />
                </button>

                {docDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 flex flex-col text-left">
                    {/* Export Action */}
                    <button
                      type="button"
                      onClick={handleExportPackagings}
                      className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-green-600 transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                      <span>Export เอกสารออก (.csv)</span>
                    </button>

                    {/* Import Action (using hidden file input) */}
                    <label className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-green-600 transition-colors flex items-center gap-2 cursor-pointer">
                      <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
                      <span>Import เอกสารเข้า (.csv)</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImportCSV(file);
                        }}
                      />
                    </label>

                    <div className="border-t border-slate-100 my-1" />

                    {/* Download Template Action */}
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-350" />
                      <span>ดาวน์โหลด Template (.csv)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Packaging Button */}
              <button
                onClick={() => {
                  setPkgName("");
                  setPkgCustomer("ระบบ");
                  setPkgCurrentQty("");
                  setPkgNote("");
                  setPkgError("");
                  setPkgSubmitting(false);
                  setModalImage("");
                  setPkgTypeVal("");
                  setEditPkgId(null);
                  setPkgModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-green-100/30"
              >
                <Plus className="h-4 w-4 shrink-0 text-white" />
                <span>เพิ่มบรรจุภัณฑ์</span>
              </button>
            </div>
          )}
          {activeTab === "sampleProducts" && (
            <button
              onClick={() => {
                setProdName("");
                setProdFormulaId("");
                setProdFormulaName("");
                setProdSku("");
                setProdBrand("นาอีฟ");
                setProdCategory("สินค้าตัวอย่าง");
                setProdSize("");
                setProdCurrentQty("");
                setProdNote("");
                setProdError("");
                setProdSubmitting(false);
                setModalImage("");
                setEditProdId(null);
                setProdModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-green-100/30"
            >
              <Plus className="h-4 w-4 shrink-0 text-white" />
              <span>เพิ่มสินค้าตัวอย่าง</span>
            </button>
          )}
          {activeTab === "fglots" && (
            <button
              onClick={() => {
                setLotNoVal("");
                setLotFormulaId("");
                setLotFormulaName("");
                setLotCustomer("");
                setLotQuantity("");
                setLotUnit("ชิ้น");
                setLotMfgDate("");
                setLotExpDate("");
                setLotError("");
                setLotSubmitting(false);
                setModalImage("");
                setEditLotId(null);
                setLotModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-green-100/30"
            >
              <Plus className="h-4 w-4 shrink-0 text-white" />
              <span>เพิ่มล็อตสินค้า</span>
            </button>
          )}
        </div>

        {/* Filter chips for the active tab — Supplier / หมวดหมู่ / แบรนด์ / ลูกค้า.
            Values come from the data, so new ones appear on their own. */}
        {(() => {
          const cfg = CHIP_CONFIG[activeTab];
          if (!cfg) return null;
          const { counts, keys } = buildChips(cfg.items, chipKeyOf[activeTab]);
          if (keys.length === 0) return null;
          const chips = [
            { key: "all", label: "ทั้งหมด", count: cfg.items.length },
            ...keys.map(k => ({ key: k, label: k, count: counts[k] }))
          ];
          return (
            <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-black text-slate-400 uppercase tracking-wider mr-0.5">{cfg.label}</span>
              {chips.map(chip => {
                const active = stockFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setStockFilter(chip.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] font-black border transition-all active:scale-95 cursor-pointer ${
                      active
                        ? "bg-green-600 text-white border-green-700 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`font-mono text-[14px] px-1.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Second filter row — customer — only on the packaging tab. */}
        {activeTab === "packagings" && (() => {
          const { counts, keys } = buildChips(packagings, pkgCustomerKeyOf);
          if (keys.length === 0) return null;
          const chips = [
            { key: "all", label: "ทั้งหมด", count: packagings.length },
            ...keys.map(k => ({ key: k, label: k, count: counts[k] }))
          ];
          return (
            <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-black text-slate-400 uppercase tracking-wider mr-0.5">ลูกค้า</span>
              {chips.map(chip => {
                const active = pkgCustomerFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setPkgCustomerFilter(chip.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] font-black border transition-all active:scale-95 cursor-pointer ${
                      active
                        ? "bg-green-600 text-white border-green-700 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`font-mono text-[14px] px-1.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        <div className="p-0 overflow-x-auto">
          {activeTab === "ingredients" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 whitespace-nowrap">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ชื่อสาร</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">คงเหลือ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">สถานะ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">Supplier</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ราคา/กก.</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-slate-400">ยังไม่มีข้อมูลในคลังนี้</td>
                  </tr>
                ) : (
                  filteredIngredients.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.openingStock || 0} ก.</td>
                      <td className="px-6 py-4">
                        {getIngredientBadge(item.openingStock)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.supplier || "-"}</td>
                      <td className="px-6 py-4 text-sm font-mono font-medium text-slate-600">{item.pricePerKg ? `${item.pricePerKg.toLocaleString()} ฿` : "-"}</td>
                      <ActionCell tab="ingredients" item={item} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "packagings" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 whitespace-nowrap">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-20">รูปภาพ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ชื่อบรรจุภัณฑ์</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ลูกค้า</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">หมวดหมู่</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">จำนวน</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">หมายเหตุ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPackagings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm font-medium text-slate-400">ยังไม่มีข้อมูลในคลังนี้</td>
                  </tr>
                ) : (
                  filteredPackagings.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 w-20">
                        <div className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50 select-none">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setZoomImage(item.image)}
                            />
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-400">
                              {uploadingItemId === item._id ? (
                                <span className="text-[13px] font-bold animate-pulse text-green-600">อัป...</span>
                              ) : (
                                <>
                                  <Image className="h-4 w-4" />
                                  <span className="text-[13px] font-semibold mt-0.5">เพิ่มภาพ</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageChange(item, e.target.files[0], "packagings")}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.customer || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.type?.name || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {(item.currentQuantity || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{item.note || "-"}</td>
                      <ActionCell tab="packagings" item={item} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "sampleProducts" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 whitespace-nowrap">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-20">รูปภาพ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ชื่อ + SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">แบรนด์</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">หมวดหมู่</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">คงเหลือ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">หมายเหตุ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSampleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm font-medium text-slate-400">ยังไม่มีข้อมูลในคลังนี้</td>
                  </tr>
                ) : (
                  filteredSampleProducts.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 w-20">
                        <div className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50 select-none">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setZoomImage(item.image)}
                            />
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-400">
                              {uploadingItemId === item._id ? (
                                <span className="text-[13px] font-bold animate-pulse text-green-600">อัป...</span>
                              ) : (
                                <>
                                  <Image className="h-4 w-4" />
                                  <span className="text-[13px] font-semibold mt-0.5">เพิ่มภาพ</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageChange(item, e.target.files[0], "sampleProducts")}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                        {item.sku && <div className="text-xs text-slate-500">{item.sku}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.brand || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.category || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.currentQuantity || 0}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.note || "-"}</td>
                      <ActionCell tab="sampleProducts" item={item} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "fglots" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 whitespace-nowrap">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-20">รูปภาพ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">Lot No.</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">จำนวน</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">ลูกค้า</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">MFG</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">EXP</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500">สถานะ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFgLots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm font-medium text-slate-400">ยังไม่มีข้อมูลในคลังนี้</td>
                  </tr>
                ) : (
                  filteredFgLots.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 w-20">
                        <div className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50 select-none">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.lotNo}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setZoomImage(item.image)}
                            />
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-400">
                              {uploadingItemId === item._id ? (
                                <span className="text-[13px] font-bold animate-pulse text-green-600">อัป...</span>
                              ) : (
                                <>
                                  <Image className="h-4 w-4" />
                                  <span className="text-[13px] font-semibold mt-0.5">เพิ่มภาพ</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageChange(item, e.target.files[0], "fglots")}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.lotNo}</td>
                      <td className="px-6 py-4 text-sm font-mono font-medium text-slate-800">{item.quantity || 0} ชิ้น</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.customer || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatBuddhistDate(item.mfgDate)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatBuddhistDate(item.expDate)}</td>
                      <td className="px-6 py-4">{getFgLotBadge(item.expDate)}</td>
                      <ActionCell tab="fglots" item={item} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* stock adjust drawer */}
      {adjustDrawerOpen && selectedAdjustItem && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }} />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
            <div className={`p-6 flex justify-between items-center text-left shrink-0 shadow-xs ${adjustType === "in" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
              <div>
                <h2 className="text-sm font-extrabold">{adjustType === "in" ? "เพิ่มจำนวนสต็อก (+)" : "ลดจำนวนสต็อก (-)"}</h2>
                <p className={`text-[14px] font-semibold mt-0.5 ${adjustType === "in" ? "text-green-100" : "text-red-100"}`}>{selectedAdjustItem.name || selectedAdjustItem.lotNo}</p>
              </div>
              <button type="button" className={`p-1.5 rounded-full cursor-pointer transition-colors ${adjustType === "in" ? "hover:bg-green-700 text-white" : "hover:bg-red-700 text-white"}`} onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="flex-1 flex flex-col overflow-hidden text-left bg-white p-6 space-y-4">
              <div className={`p-4 border rounded-xl flex items-center justify-between font-bold text-xs ${adjustType === "in" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <span>จำนวนคงคลังปัจจุบัน</span>
                <span className="font-mono font-extrabold text-sm">{adjustCurrentQty(adjustTab, selectedAdjustItem).toLocaleString()} {adjustUnit(adjustTab)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">{adjustType === "in" ? `จำนวนที่ต้องการเพิ่ม (${adjustUnit(adjustTab)})` : `จำนวนที่ต้องการลด (${adjustUnit(adjustTab)})`} <span className="text-red-500">*</span></label>
                <input name="adjustQty" required min="1" type="number" step="any" className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-semibold transition-all ${adjustType === "in" ? "focus:border-green-600 focus:bg-white" : "focus:border-red-600 focus:bg-white"}`} placeholder="ระบุจำนวน เช่น 100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">หมายเหตุ (ระบุสาเหตุการปรับสต็อก)</label>
                <textarea name="adjustNote" className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 h-20 resize-none font-semibold transition-all ${adjustType === "in" ? "focus:border-green-600 focus:bg-white" : "focus:border-red-600 focus:bg-white"}`} placeholder="เช่น ส่งตัวอย่างลูกค้า / ปรับปรุงยอดประจำปี" />
              </div>
              <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-4 overflow-hidden">
                <span className="text-[14px] text-slate-400 font-bold uppercase tracking-wider block mb-2">ประวัติการเคลื่อนไหว (Log การเดินทาง)</span>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {(() => {
                    const itemLogs = adjustLogs;
                    if (itemLogs.length === 0) {
                      return (
                        <div className="h-full flex items-center justify-center py-6 text-[15px] text-slate-400 font-semibold italic bg-slate-50 rounded-xl border border-slate-100">
                          ยังไม่มีประวัติการเคลื่อนไหวของรายการนี้
                        </div>
                      );
                    }
                    return itemLogs.map((l) => {
                      const movement = l.stockMovement;
                      const isEntry = movement ? movement.direction === "in" : l.description && l.description.includes("รับเข้า");
                      return (
                        <div key={l._id} className={`p-3 rounded-xl border border-slate-200/60 border-l-4 ${isEntry ? "border-l-green-500 bg-green-50/10" : "border-l-red-400 bg-red-50/10"} text-[15px] text-slate-650 flex flex-col gap-1`}>
                          <div className="flex justify-between items-center text-slate-400 text-[13px] font-bold">
                            <span className="font-extrabold text-slate-500">{l.operator}</span>
                            <span>{formatThaiStockDateTime(l.createdAt)}</span>
                          </div>
                          <p className="font-bold leading-normal text-slate-700">
                            {movement ? formatStructuredMovement(movement) : formatTravelLog(l.description)}
                            {l.isLegacyStockMovement && <span className="ml-2 text-[11px] text-slate-400">(ข้อมูลเดิม)</span>}
                          </p>
                          {movement?.relatedOrderName && <p className="text-[12px] text-slate-500 font-semibold">ออเดอร์: {movement.relatedOrderName}</p>}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex gap-3 mt-auto shrink-0 bg-white">
                <button type="submit" disabled={adjustSubmitting} className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-xs text-white disabled:opacity-50 ${adjustType === "in" ? "bg-green-600 hover:bg-green-700 shadow-xs" : "bg-red-600 hover:bg-red-700 shadow-xs"}`}>{adjustSubmitting ? "กำลังบันทึก..." : "ยืนยันทำรายการ"}</button>
                <button type="button" className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs" onClick={() => { setAdjustDrawerOpen(false); setSelectedAdjustItem(null); }}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </>
      )}

      {ingModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => setIngModalOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] text-left flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">เพิ่มวัตถุดิบสารเคมีใหม่</h3>
                <button onClick={() => setIngModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleIngSubmit} className="p-5 space-y-4">
                {ingError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                    {ingError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อสารเคมีวัตถุดิบ</label>
                  <input
                    type="text"
                    required
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                    placeholder="เช่น Citric Acid (กรดมะนาว)"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">จำนวนสต็อกเปิดคลัง (ก.)</label>
                  <input
                    type="number"
                    required
                    value={ingStock}
                    onChange={(e) => setIngStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ผู้จัดจำหน่าย (Supplier)</label>
                  <input
                    type="text"
                    value={ingSupplier}
                    onChange={(e) => setIngSupplier(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                    placeholder="เช่น เคมีคอสเมติกส์"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ราคาต่อกิโลกรัม (บาท)</label>
                  <input
                    type="number"
                    value={ingPrice}
                    onChange={(e) => setIngPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIngModalOpen(false)}
                    className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={ingSubmitting}
                    className="flex-grow bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {ingSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {pkgModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => setPkgModalOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] text-left flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">{editPkgId ? "แก้ไขข้อมูลบรรจุภัณฑ์" : "เพิ่มบรรจุภัณฑ์ใหม่"}</h3>
                <button onClick={() => setPkgModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePkgSubmit} className="p-5 space-y-4">
                {pkgError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                    {pkgError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อบรรจุภัณฑ์</label>
                    <input
                      type="text"
                      required
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="เช่น ขวดแชมพู 100ml สีขาว"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">รูปภาพประกอบ</label>
                    <div className="flex flex-col gap-1 items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative group h-[140px]">
                      {modalImage ? (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                          <img src={modalImage} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setModalImage("")}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer text-slate-400 gap-1.5 py-2 w-full h-full">
                          <Upload className="h-5 w-5 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-600">อัปโหลดรูปภาพ</span>
                          <span className="text-[14px] text-slate-400">คลิกเพื่อเลือกไฟล์</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                  setModalImage(reader.result);
                                };
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <SearchableSelectWithAddNew
                    label="แบรนด์ (ลูกค้า)"
                    placeholder="-- เลือกหรือพิมพ์ค้นหาลูกค้า --"
                    options={customersList.map((c) => ({ value: c, label: c }))}
                    value={pkgCustomer}
                    onChange={setPkgCustomer}
                    onAddNew={handleAddNewCustomer}
                    addNewLabel="เพิ่มแบรนด์ลูกค้าใหม่"
                  />

                  <SearchableSelectWithAddNew
                    label="หมวดหมู่"
                    placeholder="-- เลือกหรือพิมพ์ค้นหาหมวดหมู่ --"
                    options={pkgTypes.map((t) => ({ value: t._id, label: t.name }))}
                    value={pkgTypeVal}
                    onChange={handlePkgTypeChange}
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">จำนวนคงเหลือ (ชิ้น)</label>
                    <input
                      type="number"
                      required
                      value={pkgCurrentQty}
                      onChange={(e) => setPkgCurrentQty(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">หมายเหตุ</label>
                    <input
                      type="text"
                      value={pkgNote}
                      onChange={(e) => setPkgNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="เช่น ล็อตพิเศษสีด้าน"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPkgModalOpen(false)}
                    className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={pkgSubmitting}
                    className="flex-grow bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {pkgSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {prodModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => setProdModalOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] text-left flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">{editProdId ? "แก้ไขข้อมูลสินค้าตัวอย่าง" : "เพิ่มสินค้าตัวอย่างใหม่"}</h3>
                <button onClick={() => setProdModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleProdSubmit} className="p-5 space-y-4">
                {prodError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                    {prodError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อสินค้าตัวอย่าง</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="เช่น Wound Healing Gel"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">SKU / เลขสินค้า</label>
                    <input
                      type="text"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="เช่น SMP-011"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">รูปภาพประกอบ</label>
                    <div className="flex flex-col gap-1 items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative group h-[140px]">
                      {modalImage ? (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                          <img src={modalImage} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setModalImage("")}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer text-slate-400 gap-1.5 py-2 w-full h-full">
                          <Upload className="h-5 w-5 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-600">อัปโหลดรูปภาพ</span>
                          <span className="text-[14px] text-slate-400">คลิกเพื่อเลือกไฟล์</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                  setModalImage(reader.result);
                                };
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <SearchableSelectWithAddNew
                    label="แบรนด์ (ลูกค้า)"
                    placeholder="-- เลือกหรือพิมพ์ค้นหาลูกค้า --"
                    options={customersList.map((c) => ({ value: c, label: c }))}
                    value={prodBrand}
                    onChange={setProdBrand}
                    onAddNew={handleAddNewCustomerForProd}
                    addNewLabel="เพิ่มแบรนด์ลูกค้าใหม่"
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">จำนวนคงเหลือ (ชิ้น)</label>
                    <input
                      type="number"
                      required
                      value={prodCurrentQty}
                      onChange={(e) => setProdCurrentQty(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">หมายเหตุ</label>
                    <input
                      type="text"
                      value={prodNote}
                      onChange={(e) => setProdNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      placeholder="รายละเอียดเพิ่มเติม"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setProdModalOpen(false)}
                    className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={prodSubmitting}
                    className="flex-grow bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {prodSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {lotModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={() => setLotModalOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] text-left flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">{editLotId ? "แก้ไขข้อมูลล็อตสินค้าสำเร็จรูป" : "เพิ่มล็อตสินค้าสำเร็จรูปใหม่"}</h3>
                <button onClick={() => setLotModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleLotSubmit} className="p-5 space-y-4">
                {lotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                    {lotError}
                  </div>
                )}

                <div className="space-y-4">
                  <SearchableSelectWithAddNew
                    label="ชื่อสูตร/ผลิตภัณฑ์"
                    placeholder="-- เลือกหรือพิมพ์ค้นหาชื่อสูตร --"
                    options={bomFormulas.map((f) => ({ value: f.name, label: f.name }))}
                    value={lotFormulaName}
                    onChange={(val) => {
                      setLotFormulaName(val);
                      setLotFormulaId(bomFormulas.find(f => f.name === val)?._id || "");
                    }}
                    onAddNew={(val) => { setLotFormulaName(val); setLotFormulaId(""); }}
                    addNewLabel="ใช้สูตรชื่อใหม่"
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">รูปภาพประกอบ</label>
                    <div className="flex flex-col gap-1 items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative group h-[140px]">
                      {modalImage ? (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                          <img src={modalImage} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setModalImage("")}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer text-slate-400 gap-1.5 py-2 w-full h-full">
                          <Upload className="h-5 w-5 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-600">อัปโหลดรูปภาพ</span>
                          <span className="text-[14px] text-slate-400">คลิกเพื่อเลือกไฟล์</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                  setModalImage(reader.result);
                                };
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <SearchableSelectWithAddNew
                    label="แบรนด์ (ลูกค้า)"
                    placeholder="-- เลือกหรือพิมพ์ค้นหาลูกค้า --"
                    options={customersList.map((c) => ({ value: c, label: c }))}
                    value={lotCustomer}
                    onChange={setLotCustomer}
                    onAddNew={(val) => setLotCustomer(val)}
                    addNewLabel="เพิ่มแบรนด์ลูกค้าใหม่"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">หมายเลขล็อต (Lot No.)</label>
                      <input
                        type="text"
                        required
                        value={lotNoVal}
                        onChange={(e) => setLotNoVal(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                        placeholder="เช่น FG-2026-001"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">จำนวนสินค้า (ชิ้น)</label>
                      <input
                        type="number"
                        required
                        value={lotQuantity}
                        onChange={(e) => setLotQuantity(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">วันผลิต (MFG)</label>
                      <input
                        type="date"
                        required
                        value={lotMfgDate}
                        onChange={(e) => setLotMfgDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">วันหมดอายุ (EXP)</label>
                      <input
                        type="date"
                        required
                        value={lotExpDate}
                        onChange={(e) => setLotExpDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLotModalOpen(false)}
                    className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={lotSubmitting}
                    className="flex-grow bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {lotSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {zoomImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] transition-opacity flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setZoomImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={zoomImage} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-2 cursor-pointer shadow-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
