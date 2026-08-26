"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Layers, X, Search, Plus, Edit2, Trash2, PlusCircle, MinusCircle, ChevronDown, GripVertical
} from "lucide-react";

const colorPresets = [
  { code: "#2E7D32", name: "Green" },
  { code: "#1976D2", name: "Blue" },
  { code: "#7B1FA2", name: "Purple" },
  { code: "#E65100", name: "Orange" },
  { code: "#C62828", name: "Red" },
  { code: "#006064", name: "Cyan" },
  { code: "#4A148C", name: "Deep Purple" },
  { code: "#AD1457", name: "Pink" },
  { code: "#00796B", name: "Teal" },
  { code: "#D84315", name: "Rust" }
];

// The modal authors formulas on a 100 g basis. The backend still stores grams
// per 1 kg so production, stock deduction, documents, and existing formulas
// keep their current semantics.
const MODAL_FORMULA_BASIS_GRAMS = 100;
const STORAGE_FORMULA_BASIS_GRAMS = 1000;
const MODAL_TO_STORAGE_SCALE = STORAGE_FORMULA_BASIS_GRAMS / MODAL_FORMULA_BASIS_GRAMS;
const FORMULA_TOTAL_TOLERANCE = 0.0001;

const normalizedRatioToModalGrams = (ratio) =>
  Number(((Number(ratio) || 0) * MODAL_FORMULA_BASIS_GRAMS).toFixed(6));

const modalGramsToStorageGrams = (grams) =>
  Number(((parseFloat(grams) || 0) * MODAL_TO_STORAGE_SCALE).toFixed(4));

export default function FormulaManagerModal({
  isOpen,
  onClose,
  formulas = [],
  ingredients = [],
  onCreateFormula,
  onUpdateFormula,
  onDeleteFormula,
  autoCopyFormula = null,
  autoCopyName = "",
  onAutoCopySaved = null
}) {
  // Formula modal states
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null); // null means create mode
  const [formulaName, setFormulaName] = useState("");
  const [formulaColor, setFormulaColor] = useState("#2E7D32");
  
  const [formulaIngredients, setFormulaIngredients] = useState([{ name: "", ratio: 100, phase: "-" }]);
  const [formulaNotes, setFormulaNotes] = useState([""]);
  const [formulaProcedures, setFormulaProcedures] = useState([""]);
  
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState("");
  const [openGroupDropdownIdx, setOpenGroupDropdownIdx] = useState(null);
  const [formulaSearchQuery, setFormulaSearchQuery] = useState("");
  const [formulaError, setFormulaError] = useState("");
  const [formulaSubmitting, setFormulaSubmitting] = useState(false);

  // Manage body scroll locking when modal is open
  useEffect(() => {
    if (isOpen || formulaModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, formulaModalOpen]);

  const getAvailableGroups = () => {
    const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const activePhases = formulaIngredients
      .map(row => row.phase)
      .filter(phase => phase && phase !== "-");
    
    if (activePhases.length === 0) {
      return ["-", "A"];
    }
    
    let maxIndex = -1;
    activePhases.forEach(p => {
      const idx = alphabet.indexOf(p);
      if (idx > maxIndex) {
        maxIndex = idx;
      }
    });
    
    const result = ["-"];
    for (let i = 0; i <= maxIndex + 1 && i < alphabet.length; i++) {
      result.push(alphabet[i]);
    }
    return result;
  };

  const adjustTextareaHeight = (element) => {
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  // Handlers for Formula CRUD
  const openAddFormulaModal = () => {
    setEditingFormula(null);
    setFormulaName("");
    setFormulaColor("#2E7D32");
    setFormulaIngredients([{ name: "", ratio: 100, phase: "-" }]);
    setFormulaNotes([""]);
    setFormulaProcedures([""]);
    setOpenDropdownIdx(null);
    setDropdownSearchQuery("");
    setOpenGroupDropdownIdx(null);
    setFormulaSearchQuery("");
    setFormulaError("");
    setFormulaSubmitting(false);
    setFormulaModalOpen(true);
  };

  const openEditFormulaModal = (f) => {
    setEditingFormula(f);
    setFormulaName(f.name);
    setFormulaColor(f.color || "#2E7D32");
    
    const list = f.ingredients.map(ing => ({
      name: ing.name,
      // API ratio is normalized against 1 kg. Show the equivalent grams on the
      // modal's 100 g basis while preserving decimal precision.
      ratio: normalizedRatioToModalGrams(ing.ratio),
      phase: ing.phase || "-"
    }));
    
    setFormulaIngredients(list.length > 0 ? list : [{ name: "", ratio: 100, phase: "-" }]);
    setFormulaNotes(Array.isArray(f.note) ? (f.note.length > 0 ? f.note : [""]) : (f.note ? [f.note] : [""]));
    setFormulaProcedures(f.procedures && f.procedures.length > 0 ? f.procedures : [""]);
    setOpenDropdownIdx(null);
    setDropdownSearchQuery("");
    setOpenGroupDropdownIdx(null);
    setFormulaSearchQuery("");
    setFormulaError("");
    setFormulaSubmitting(false);
    setFormulaModalOpen(true);
  };

  const handleDuplicateFormula = (f) => {
    setEditingFormula(null);
    setFormulaName(`คัดลอก ${f.name}`);
    setFormulaColor(f.color || "#2E7D32");
    
    const list = f.ingredients.map(ing => ({
      name: ing.name,
      // Keep duplicated formulas on the same 100 g authoring basis.
      ratio: normalizedRatioToModalGrams(ing.ratio),
      phase: ing.phase || "-"
    }));
    
    setFormulaIngredients(list.length > 0 ? list : [{ name: "", ratio: 100, phase: "-" }]);
    setFormulaNotes(Array.isArray(f.note) ? (f.note.length > 0 ? [...f.note] : [""]) : (f.note ? [f.note] : [""]));
    setFormulaProcedures(f.procedures && f.procedures.length > 0 ? [...f.procedures] : [""]);
    setOpenDropdownIdx(null);
    setOpenGroupDropdownIdx(null);
    setFormulaSearchQuery("");
    setFormulaError("");
    setFormulaSubmitting(false);
    setFormulaModalOpen(true);
  };

  // When opened from the R&D "ปรับสูตร" overlay, immediately fork the base formula
  // When opened from R&D with a pre-set formula name (e.g. "ชื่อสูตร - ชื่อลูกค้า"), open the create modal directly
  const autoCopyDone = useRef(false);
  useEffect(() => {
    if (isOpen && !autoCopyDone.current) {
      if (autoCopyFormula) {
        autoCopyDone.current = true;
        handleDuplicateFormula(autoCopyFormula);
        if (autoCopyName) setFormulaName(autoCopyName);
      } else if (autoCopyName) {
        autoCopyDone.current = true;
        openAddFormulaModal();
        setFormulaName(autoCopyName);
      }
    }
    if (!isOpen) autoCopyDone.current = false;
  }, [isOpen, autoCopyFormula, autoCopyName]);

  // The list is scrollable, so a row appended at the bottom lands off-screen —
  // scroll to it after React commits the new row.
  const ingredientListRef = useRef(null);

  // Which way the open dropdown should expand. Decided by MEASURING the room
  // left below the button inside the scrollable list — an index-based guess
  // flipped panels upward even when the space below was wide open.
  const [dropUp, setDropUp] = useState(false);

  const decideDropDirection = (btnEl, panelHeight) => {
    const btn = btnEl.getBoundingClientRect();
    const cont = ingredientListRef.current?.getBoundingClientRect();
    const bottomBound = cont ? cont.bottom : window.innerHeight;
    setDropUp(bottomBound - btn.bottom < panelHeight);
  };

  // Drag-to-reorder the ingredient rows (grab the "ลำดับที่ N" chip). The order
  // IS the mixing order, so the row numbers renumber themselves after a drop.
  const [dragRowIdx, setDragRowIdx] = useState(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState(null);

  const handleRowDrop = (targetIdx) => {
    setDragOverRowIdx(null);
    const from = dragRowIdx;
    setDragRowIdx(null);
    if (from === null || from === targetIdx) return;
    const next = [...formulaIngredients];
    const [moved] = next.splice(from, 1);
    next.splice(targetIdx, 0, moved);
    setFormulaIngredients(next);
  };

  const addFormulaIngredientRow = () => {
    setFormulaIngredients([...formulaIngredients, { name: "", ratio: 100, phase: "-" }]);
    requestAnimationFrame(() => {
      const el = ingredientListRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  const removeFormulaIngredientRow = (idx) => {
    const nextList = [...formulaIngredients];
    nextList.splice(idx, 1);
    setFormulaIngredients(nextList);
  };

  const handleFormulaIngredientChange = (idx, field, value) => {
    const nextList = [...formulaIngredients];
    nextList[idx] = { ...nextList[idx], [field]: value };
    setFormulaIngredients(nextList);
  };

  const addFormulaProcedureStep = () => {
    setFormulaProcedures([...formulaProcedures, ""]);
  };

  const removeFormulaProcedureStep = (idx) => {
    if (formulaProcedures.length > 1) {
      const nextList = [...formulaProcedures];
      nextList.splice(idx, 1);
      setFormulaProcedures(nextList);
    }
  };

  const handleFormulaProcedureChange = (idx, value) => {
    const nextList = [...formulaProcedures];
    nextList[idx] = value;
    setFormulaProcedures(nextList);
  };

  const addFormulaNoteRow = () => {
    setFormulaNotes([...formulaNotes, ""]);
  };

  const removeFormulaNoteRow = (idx) => {
    if (formulaNotes.length > 1) {
      const nextList = [...formulaNotes];
      nextList.splice(idx, 1);
      setFormulaNotes(nextList);
    }
  };

  const handleFormulaNoteChange = (idx, value) => {
    const nextList = [...formulaNotes];
    nextList[idx] = value;
    setFormulaNotes(nextList);
  };

  const handleFormulaSubmit = async (e) => {
    e.preventDefault();
    setFormulaError("");

    const bomMap = {};
    const phasesMap = {};
    formulaIngredients.forEach(x => {
      if (x.name) {
        // Convert the 100 g modal value back to the backend's grams-per-1-kg
        // storage contract. This keeps all downstream production math intact.
        bomMap[x.name] = modalGramsToStorageGrams(x.ratio);
        phasesMap[x.name] = x.phase || "-";
      }
    });

    const data = {
      name: formulaName,
      color: formulaColor,
      bom: bomMap,
      phases: phasesMap,
      note: formulaNotes.filter(n => n.trim() !== ""),
      procedures: formulaProcedures
    };

    setFormulaSubmitting(true);
    try {
      if (editingFormula) {
        await onUpdateFormula(editingFormula._id, data);
      } else {
        const created = await onCreateFormula(data);
        // Auto flows hand the created formula back to R&D: "ปรับสูตร" (autoCopyFormula)
        // re-points the order at it; a development add (autoCopyName only) appends it
        // to the order's option list. Both then close and return to R&D.
        const isAutoFlow = autoCopyFormula || autoCopyName;
        if (isAutoFlow && onAutoCopySaved) {
          await onAutoCopySaved(data.name, created);
        }
      }
      setFormulaModalOpen(false);
      if ((autoCopyFormula || autoCopyName) && onAutoCopySaved) onClose();
    } catch (err) {
      setFormulaError(err?.response?.data?.message || err?.response?.data?.error || "บันทึกสูตรผลิตไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setFormulaSubmitting(false);
    }
  };

  const hasIngredients = formulaIngredients.some(ing => ing.name && ing.name.trim() !== "");
  const hasProcedures = formulaProcedures.some(p => p && p.trim() !== "");
  const formulaTotal = useMemo(
    () => formulaIngredients.reduce((sum, row) => sum + (parseFloat(row.ratio) || 0), 0),
    [formulaIngredients]
  );
  const hasCompleteFormulaTotal = Math.abs(formulaTotal - MODAL_FORMULA_BASIS_GRAMS) < FORMULA_TOTAL_TOLERANCE;
  const isSubmitDisabled = !formulaName.trim() || !hasIngredients || !hasProcedures || formulaSubmitting;

  if (!isOpen) return null;

  return (
    <>
      {/* MODAL 4: Manage Formulas */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left flex flex-col sm:h-[600px] max-h-[92dvh] sm:max-h-[90vh]">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-green-600" />
              จัดการสูตรผลิต B.O.M.
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Search Input Box */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-green-500 transition-colors shadow-2xs">
              <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสูตรผลิต..."
                value={formulaSearchQuery}
                onChange={(e) => setFormulaSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs outline-none text-slate-800 font-semibold placeholder-slate-400"
              />
              {formulaSearchQuery && (
                <button 
                  type="button" 
                  onClick={() => setFormulaSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold">
                สูตรผลิตทั้งหมด {formulaSearchQuery ? `ที่พบ (${
                  formulas.filter(f => (f.name || "").toLowerCase().includes(formulaSearchQuery.toLowerCase())).length
                } จาก ${formulas.length} รายการ)` : `(${formulas.length} รายการ)`}
              </span>
              <button
                onClick={() => {
                  openAddFormulaModal();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> สร้างสูตรใหม่
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {[...formulas]
                .filter(f => (f.name || "").toLowerCase().includes(formulaSearchQuery.toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name, "th"))
                .map((f) => (
                  <div key={f._id} className={`p-3.5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors ${f.isArchived ? "opacity-70" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-200 shadow-xs" style={{ backgroundColor: f.color }} />
                      <span className="text-xs font-bold text-slate-800 truncate">{f.name}</span>
                      {f.isArchived && <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">เก็บถาวร</span>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!f.isArchived && <button
                        onClick={() => {
                          handleDuplicateFormula(f);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 border border-green-100 text-green-700 bg-green-50/30 rounded-lg text-[14px] font-bold hover:bg-green-50 hover:border-green-200 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> คัดลอก
                      </button>}
                      {!f.isArchived && <button
                        onClick={() => {
                          openEditFormulaModal(f);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-700 rounded-lg text-[14px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" /> แก้ไขสูตร
                      </button>}
                      {!f.isArchived && <button
                        onClick={() => {
                          if (confirm(`คุณแน่ใจหรือไม่ที่จะเก็บถาวรสูตรผลิต "${f.name}"?`)) {
                            onDeleteFormula(f._id);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 border border-red-100 text-red-600 rounded-lg text-[14px] font-bold hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> เก็บถาวรสูตร
                      </button>}
                    </div>
                  </div>
                ))}
              {formulas.filter(f => (f.name || "").toLowerCase().includes(formulaSearchQuery.toLowerCase())).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบสูตรผลิตที่ตรงกับคำค้นหา</div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 2: Create / Edit B.O.M. Formula */}
      {formulaModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] transition-opacity" onClick={() => setFormulaModalOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
            <div className="bg-white w-full max-w-7xl sm:h-[92vh] max-h-[92dvh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col">
              <div 
                className="p-6 border-b border-slate-200/20 flex justify-between items-center shrink-0 transition-colors duration-500"
                style={{ backgroundColor: formulaColor, color: "#ffffff" }}
              >
                <div className="flex items-center gap-2 text-white">
                  <Layers className="h-5 w-5 text-white/90" />
                  <h3 className="text-base font-extrabold">{editingFormula ? "แก้ไขสูตรผลิต B.O.M." : "สร้างสูตรผสมผลิต B.O.M. ใหม่"}</h3>
                </div>
                <button onClick={() => setFormulaModalOpen(false)} className="text-white/70 hover:text-white cursor-pointer transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormulaSubmit} className="flex-grow flex flex-col min-h-0 bg-slate-50/30 overflow-hidden">
                {formulaError && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                    {formulaError}
                  </div>
                )}

                {/* Two Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 flex-1 min-h-0 overflow-hidden">
                  
                  {/* Left Column: Information (5 cols) */}
                  <div className="md:col-span-5 space-y-4 flex flex-col justify-start overflow-y-auto max-h-full pr-1 scrollbar-thin">
                    {/* Formula Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 tracking-wide">ชื่อสูตรผลิต</label>
                      <input
                        type="text"
                        required
                        value={formulaName}
                        onChange={(e) => setFormulaName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-xs text-slate-800 font-bold shadow-2xs transition-all"
                        placeholder="เช่น Bio-Shampoo สูตรออร์แกนิค"
                      />
                    </div>

                    {/* Color Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 tracking-wide">สีธีมประจำสูตร (Color Theme)</label>
                      <div className="flex gap-2.5 items-center flex-wrap bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                        {colorPresets.map(preset => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => setFormulaColor(preset.code)}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                              formulaColor.toLowerCase() === preset.code.toLowerCase() ? "border-slate-800 scale-105 shadow-xs" : "border-transparent"
                            }`}
                            style={{ backgroundColor: preset.code }}
                            title={preset.name}
                          />
                        ))}
                        
                        <div className="relative w-7 h-7 shrink-0 transition-transform hover:scale-110 active:scale-95">
                          <div
                            className={`absolute inset-0 rounded-full border-2 flex items-center justify-center text-white font-extrabold shadow-sm pointer-events-none ${
                              !colorPresets.some(preset => preset.code.toLowerCase() === formulaColor.toLowerCase())
                                ? "border-slate-800 scale-105 shadow-xs ring-2 ring-slate-300"
                                : "border-transparent"
                            }`}
                            style={{
                              background: "linear-gradient(45deg, #ff3366, #ffcc00, #33ccff, #ff3366)",
                              backgroundSize: "200% 200%",
                            }}
                          >
                            <Plus className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                          </div>
                          
                          <input
                            type="color"
                            value={formulaColor}
                            onChange={(e) => setFormulaColor(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                            title="เลือกสีแบบอิสระ..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manufacturing steps */}
                    <div className="flex flex-col gap-1.5 flex-grow min-h-[220px]">
                      <div className="flex justify-between items-center shrink-0">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">ขั้นตอนการผสมผลิต / วิธีทำ</label>
                        <button
                          type="button"
                          onClick={addFormulaProcedureStep}
                          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg cursor-pointer transition-colors border border-green-200/20"
                          title="เพิ่มขั้นตอน"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2 overflow-y-auto pr-1 max-h-[220px]">
                        {formulaProcedures.map((step, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[14px] font-black text-slate-400 shrink-0 w-20">ขั้นตอนที่ {idx + 1}</span>
                            <textarea
                              required
                              value={step}
                              onChange={(e) => {
                                handleFormulaProcedureChange(idx, e.target.value);
                                adjustTextareaHeight(e.target);
                              }}
                              ref={(el) => adjustTextareaHeight(el)}
                              rows={1}
                              className="flex-grow p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-green-500 outline-none shadow-2xs resize-none overflow-hidden"
                              style={{ minHeight: "36px" }}
                              placeholder={`เช่น ละลายกลุ่ม A ที่ความร้อน 75 °C`}
                            />
                            <button
                              type="button"
                              onClick={() => removeFormulaProcedureStep(idx)}
                              disabled={formulaProcedures.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-red-600 cursor-pointer shrink-0 transition-all duration-75 border border-transparent hover:border-red-600"
                            >
                              <MinusCircle className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes / Warning details */}
                    <div className="flex flex-col gap-1.5 flex-grow min-h-[220px]">
                      <div className="flex justify-between items-center shrink-0">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">หมายเหตุสูตรผลิต / คำเตือน</label>
                        <button
                          type="button"
                          onClick={addFormulaNoteRow}
                          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg cursor-pointer transition-colors border border-green-200/20"
                          title="เพิ่มหมายเหตุ"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2 overflow-y-auto pr-1 max-h-[220px]">
                        {formulaNotes.map((noteItem, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[14px] font-black text-slate-400 shrink-0 w-20">หมายเหตุที่ {idx + 1}</span>
                            <textarea
                              required
                              value={noteItem}
                              onChange={(e) => {
                                handleFormulaNoteChange(idx, e.target.value);
                                adjustTextareaHeight(e.target);
                              }}
                              ref={(el) => adjustTextareaHeight(el)}
                              rows={1}
                              className="flex-grow p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-green-500 outline-none shadow-2xs resize-none overflow-hidden"
                              style={{ minHeight: "36px" }}
                              placeholder="เช่น เก็บให้พ้นจากแสงแดดและความชื้น"
                            />
                            <button
                              type="button"
                              onClick={() => removeFormulaNoteRow(idx)}
                              disabled={formulaNotes.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-red-600 cursor-pointer shrink-0 transition-all duration-75 border border-transparent hover:border-red-600"
                            >
                              <MinusCircle className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Substance List builder (7 cols) */}
                  <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-slate-200/80 pt-6 md:pt-0 md:pl-6 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 shrink-0">
                      <label className="text-xs font-bold text-slate-700 tracking-wide">รายการวัตถุดิบผสม (สัดส่วนต่อ 100 กรัม)</label>
                      <button
                        type="button"
                        onClick={addFormulaIngredientRow}
                        className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1.5 cursor-pointer bg-green-50 px-3 py-1.5 rounded-xl border border-green-200/30 transition-all hover:scale-102"
                      >
                        <PlusCircle className="h-4 w-4" /> เพิ่มวัตถุดิบ
                      </button>
                    </div>

                    {/* Ingredients List Container */}
                    <div ref={ingredientListRef} className="flex-1 space-y-2 overflow-y-auto pr-1 pb-4 min-h-0 scrollbar-thin">
                      {formulaIngredients.map((row, idx) => (
                        <div
                          key={idx}
                          onDragOver={(e) => { if (dragRowIdx !== null) { e.preventDefault(); setDragOverRowIdx(idx); } }}
                          onDragLeave={() => setDragOverRowIdx((v) => (v === idx ? null : v))}
                          onDrop={(e) => { e.preventDefault(); handleRowDrop(idx); }}
                          className={`flex gap-2 items-center bg-white p-2.5 rounded-xl border transition-colors shadow-2xs ${
                            dragRowIdx === idx
                              ? "opacity-40 border-dashed border-green-400"
                              : dragOverRowIdx === idx
                              ? "border-green-500 bg-green-50/40"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Drag handle — the row order is the mixing order */}
                          <span
                            draggable
                            onDragStart={(e) => { setDragRowIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                            onDragEnd={() => { setDragRowIdx(null); setDragOverRowIdx(null); }}
                            title="ลากเพื่อสลับลำดับ"
                            className="h-9 flex items-center justify-center gap-1 text-[15px] font-bold text-slate-600 shrink-0 bg-slate-50 px-2.5 rounded-lg border border-slate-200 min-w-[78px] text-center shadow-2xs cursor-grab active:cursor-grabbing hover:bg-slate-100 hover:border-slate-300 transition-colors select-none"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            ลำดับที่ {idx + 1}
                          </span>

                          {/* Ingredient Name Dropdown */}
                          <div className="flex-grow min-w-[180px] relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                const willOpen = openDropdownIdx !== idx;
                                if (willOpen) decideDropDirection(e.currentTarget, 250);
                                setOpenDropdownIdx(willOpen ? idx : null);
                                setDropdownSearchQuery("");
                              }}
                              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none text-slate-700 focus:border-green-500 font-semibold cursor-pointer text-left flex justify-between items-center shadow-2xs hover:bg-slate-50/50 transition-all"
                            >
                              <span className="truncate">{row.name || "เลือกวัตถุดิบเคมี..."}</span>
                              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 ${openDropdownIdx === idx ? "rotate-180 text-green-600" : ""}`} />
                            </button>

                            {/* Dropdown Panel */}
                            {openDropdownIdx === idx && (
                              <>
                                <div className="fixed inset-0 z-45" onClick={() => setOpenDropdownIdx(null)} />
                                
                                {/* Rows near the bottom open upward (the list is
                                    overflow-y-auto, so a downward panel gets clipped).
                                    When flipped, flex-col-reverse keeps the search box
                                    pinned next to the button — otherwise the panel grows
                                    past the top of the modal and the search is cut off. */}
                                <div className={`absolute left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-1.5 flex max-h-60 min-w-[220px] animate-in fade-in duration-100 ${
                                  dropUp
                                    ? "bottom-full mb-1 slide-in-from-bottom-1 flex-col-reverse"
                                    : "top-full mt-1 slide-in-from-top-1 flex-col"
                                }`}>
                                  <div className="relative shrink-0 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus-within:border-green-500 transition-colors">
                                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1.5" />
                                    <input
                                      type="text"
                                      placeholder="ค้นหาสาร..."
                                      value={dropdownSearchQuery}
                                      onChange={(e) => setDropdownSearchQuery(e.target.value)}
                                      className="w-full bg-transparent text-xs outline-none text-slate-800 font-semibold placeholder-slate-400"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {dropdownSearchQuery && (
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setDropdownSearchQuery(""); }}
                                        className="text-slate-400 hover:text-slate-600 text-xs px-1"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  <div className="overflow-y-auto flex-1 max-h-40 divide-y divide-slate-50">
                                    {ingredients
                                      .filter(ing => (ing.name || "").toLowerCase().includes(dropdownSearchQuery.toLowerCase()))
                                      .map((ing) => (
                                        <button
                                          key={ing._id}
                                          type="button"
                                          onClick={() => {
                                            handleFormulaIngredientChange(idx, "name", ing.name);
                                            setOpenDropdownIdx(null);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer block truncate font-medium ${
                                            row.name === ing.name
                                              ? "bg-green-50 text-green-700 font-bold"
                                              : "hover:bg-green-50/40 text-slate-700"
                                          }`}
                                        >
                                          {ing.name}
                                        </button>
                                      ))}
                                    {ingredients.filter(ing => (ing.name || "").toLowerCase().includes(dropdownSearchQuery.toLowerCase())).length === 0 && (
                                      <div className="text-[14px] text-slate-400 text-center py-4 italic">ไม่พบชื่อวัตถุดิบเคมีนี้</div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Ratio Input */}
                          <div className="w-24 shrink-0 relative flex items-center">
                            <input
                              type="number"
                              required
                              // step="any" — grams are fractional (e.g. 299.75);
                              // the default step of 1 rejects any decimal.
                              step="any"
                              min="0"
                              inputMode="decimal"
                              placeholder="0"
                              className="w-full h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-left focus:border-green-500 outline-none shadow-2xs transition-all"
                              value={row.ratio ?? ""}
                              onChange={(e) => handleFormulaIngredientChange(idx, "ratio", e.target.value)}
                            />
                            <span className="absolute right-2.5 text-[14px] text-slate-400 font-bold pointer-events-none">ก.</span>
                          </div>

                          {/* Group Selector Dropdown */}
                          <div className="w-28 shrink-0 relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                const willOpen = openGroupDropdownIdx !== idx;
                                if (willOpen) decideDropDirection(e.currentTarget, 215);
                                setOpenGroupDropdownIdx(willOpen ? idx : null);
                                setOpenDropdownIdx(null);
                              }}
                              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none text-slate-700 focus:border-green-500 font-bold cursor-pointer text-left flex justify-between items-center shadow-2xs hover:bg-slate-50/50 transition-all"
                            >
                              <span className="truncate">{row.phase === "-" ? "-" : `กลุ่ม ${row.phase}`}</span>
                              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${openGroupDropdownIdx === idx ? "rotate-180 text-green-600" : ""}`} />
                            </button>

                            {openGroupDropdownIdx === idx && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenGroupDropdownIdx(null)} />
                                
                                {/* Same flip as the ingredient dropdown — bottom rows
                                    open upward so the panel isn't clipped. */}
                                <div className={`absolute right-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-1 flex flex-col max-h-52 min-w-[120px] animate-in fade-in duration-100 ${
                                  dropUp
                                    ? "bottom-full mb-1 slide-in-from-bottom-1"
                                    : "top-full mt-1 slide-in-from-top-1"
                                }`}>
                                  <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                                    {getAvailableGroups().map((g) => (
                                      <button
                                        key={g}
                                        type="button"
                                        onClick={() => {
                                          handleFormulaIngredientChange(idx, "phase", g);
                                          setOpenGroupDropdownIdx(null);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer block truncate font-bold ${
                                          row.phase === g
                                            ? "bg-green-50 text-green-700"
                                            : "hover:bg-green-50/40 text-slate-700"
                                        }`}
                                      >
                                        {g === "-" ? "-" : `กลุ่ม ${g}`}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Delete Row Button */}
                          <button
                            type="button"
                            onClick={() => removeFormulaIngredientRow(idx)}
                            disabled={formulaIngredients.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-red-600 cursor-pointer shrink-0 transition-all duration-75 border border-transparent hover:border-red-600"
                          >
                            <MinusCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Summary and Save Bar */}
                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 border-t border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500">น้ำหนักรวมสูตรผลิต:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-slate-800">
                        {formulaTotal.toLocaleString(undefined, { maximumFractionDigits: 6 })} ก.
                      </span>
                      {hasCompleteFormulaTotal ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-extrabold bg-green-50 text-green-700 border border-green-200 shadow-2xs">
                          ● สัดส่วนสมบูรณ์ 100% (100 ก.)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          ● ควรมีน้ำหนักรวมเท่ากับ 100 ก.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 w-full sm:w-auto sm:min-w-[280px]">
                    <button
                      type="button"
                      onClick={() => setFormulaModalOpen(false)}
                      className="flex-grow border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-center"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                        isSubmitDisabled 
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                          : "bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-xs"
                      }`}
                    >
                      บันทึกสูตรผลิต
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
