"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, X, Save, Sliders, Settings, FlaskConical, Wind } from "lucide-react";
import CatalogManager from "@/components/dashboard/CatalogManager";
import HeroBanner from "@/components/dashboard/HeroBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  // Lot Prefix Config states
  const [formulas, setFormulas] = useState([]);
  const [prefixConfigs, setPrefixConfigs] = useState([]);
  const [newCfgFormula, setNewCfgFormula] = useState("");
  const [newCfgPrefix, setNewCfgPrefix] = useState("");
  const [newCfgDesc, setNewCfgDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // prefix cfg pending delete
  const [deletingPrefix, setDeletingPrefix] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchCategories(token);
    fetchPrefixConfigs(token);
    fetchFormulas(token);
  }, []);

  const retryLoad = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchCategories(token);
    fetchPrefixConfigs(token);
    fetchFormulas(token);
  };

  const fetchCategories = async (token) => {
    setLoading(true);
    setLoadError("");

    try {
      const res = await api.get("/packaging-types");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrefixConfigs = async (token) => {

    try {
      const res = await api.get("/fg/prefix-configs");
      setPrefixConfigs(res.data);
    } catch (error) {
      console.error("Error fetching prefix configs:", error);
      setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  const fetchFormulas = async (token) => {

    try {
      const res = await api.get("/bom/formulas");
      setFormulas(res.data);
    } catch (error) {
      console.error("Error fetching formulas:", error);
      setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  const handleSavePrefixConfig = async (e) => {
    e.preventDefault();
    if (!newCfgFormula || !newCfgPrefix) return;

    try {
      const res = await api.post("/fg/prefix-configs", {
        formulaId: formulas.find(f => f.name === newCfgFormula)?._id || "",
        formulaName: newCfgFormula,
        prefix: newCfgPrefix.toUpperCase(),
        description: newCfgDesc,
      });
      
      setPrefixConfigs(prev => {
        const exists = prev.findIndex(c =>
          (res.data.formulaId && String(c.formulaId || "") === String(res.data.formulaId)) ||
          c.formulaName === res.data.formulaName
        );
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = res.data;
          return updated;
        }
        return [...prev, res.data];
      });
      setNewCfgFormula("");
      setNewCfgPrefix("");
      setNewCfgDesc("");
      setSuccessMsg("บันทึก Prefix สำเร็จ!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleDeletePrefixConfig = async (id) => {

    try {
      await api.delete(`/fg/prefix-configs/${id}`);
      setPrefixConfigs(prev => prev.filter(c => c._id !== id));
      setSuccessMsg("ลบ Prefix สำเร็จ!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;


    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.post("/packaging-types", {
        name: newCategoryName
      });
      setCategories([...categories, res.data]);
      setNewCategoryName("");
      setSuccessMsg("เพิ่มหมวดหมู่บรรจุภัณฑ์สำเร็จ");
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "ไม่สามารถเพิ่มหมวดหมู่ได้");
    }
  };

  const handleSaveEdit = async (catId) => {
    if (!editName.trim()) return;


    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.put(`/packaging-types/${catId}`, {
        name: editName
      });
      setCategories(categories.map(c => c._id === catId ? res.data : c));
      setEditingCategory(null);
      setEditName("");
      setSuccessMsg("แก้ไขหมวดหมู่บรรจุภัณฑ์สำเร็จ");
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "ไม่สามารถแก้ไขข้อมูลได้");
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${catName}"?`)) return;


    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.delete(`/packaging-types/${catId}`);
      setCategories(categories.filter(c => c._id !== catId));
      setSuccessMsg("ลบหมวดหมู่บรรจุภัณฑ์สำเร็จ");
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "ไม่สามารถลบหมวดหมู่ได้เนื่องจากมีบรรจุภัณฑ์ใช้อยู่");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const formulaOptions = formulas.map(f => {
    const existingConfig = prefixConfigs.find(cfg =>
      (cfg.formulaId && String(cfg.formulaId) === String(f._id)) || cfg.formulaName === f.name
    );
    return {
      value: f.name,
      label: f.name,
      badge: existingConfig ? existingConfig.prefix : null,
      badgeColor: existingConfig ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-mono font-black" : undefined
    };
  });

  return (
    <div className="flex flex-col gap-6 select-none text-left">
      <HeroBanner
        title="Settings"
        subtitle="ระบบตั้งค่าพารามิเตอร์ นโยบายการควบคุม ตัวแปรหมวดหมู่คลังวัตถุดิบและบรรจุภัณฑ์"
      />

      {/* Message Alerts */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form column (Left) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">เพิ่มหมวดหมู่ใหม่</h4>
          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อหมวดหมู่</label>
              <input 
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="ตัวอย่างเช่น ฝาปั๊มสูญญากาศ"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" /> เพิ่มหมวดหมู่
            </button>
          </form>
        </div>

        {/* List column (Right) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs md:col-span-2 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">หมวดหมู่ทั้งหมด ({categories.length})</h4>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
            {categories.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">ไม่มีข้อมูลหมวดหมู่บรรจุภัณฑ์ในระบบ</p>
            ) : (
              categories.map((cat) => (
                <div key={cat._id} className="py-3 flex justify-between items-center gap-4 transition-colors hover:bg-slate-50/50 rounded-lg px-2">
                  {editingCategory === cat._id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-grow p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-green-500 outline-none text-xs text-slate-800"
                      />
                      <button 
                        onClick={() => handleSaveEdit(cat._id)}
                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                        title="บันทึก"
                      >
                        <Save className="h-4.5 w-4.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingCategory(null);
                          setEditName("");
                        }}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                        title="ยกเลิก"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                      <div className="inline-flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat._id);
                            setEditName(cat.name);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-green-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat._id, cat.name)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 my-2" />

      {/* Scent catalog management */}
      <CatalogManager
        title="ตั้งค่าคลังกลิ่น (Scent)"
        subtitle="จัดการรายการกลิ่นที่เลือกใช้ในดีลลูกค้า แต่ละกลิ่นเป็นรายการอิสระที่มี ID ของตัวเอง"
        icon={FlaskConical}
        addPlaceholder="ตัวอย่างเช่น กลิ่นลาเวนเดอร์"
        apiPath="scents"
      />



      {/* Divider */}
      <div className="border-t border-slate-200 my-2" />

      {/* Lot Prefix config management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-500" />
            ตั้งค่า Lot Prefix — ผูกสูตรกับรหัสล็อต
          </h4>
          <p className="text-xs text-slate-400">กำหนดรหัสนำหน้าหมายเลข Lot สำหรับแต่ละสูตรผลิต เพื่อใช้แยกแยะล็อตสินค้าสำเร็จรูปอัตโนมัติ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form column (Left) */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 h-fit">
            <form onSubmit={handleSavePrefixConfig} className="space-y-3">
              <div className="flex flex-col gap-1">
                <SearchableSelect
                  label="เลือกสูตรผลิต"
                  placeholder="-- ค้นหาและเลือกสูตรผลิต --"
                  options={formulaOptions}
                  value={newCfgFormula}
                  onChange={(val) => {
                    setNewCfgFormula(val);
                    const existing = prefixConfigs.find(c => c.formulaName === val);
                    if (existing) {
                      setNewCfgPrefix(existing.prefix);
                      setNewCfgDesc(existing.description || "");
                    }
                  }}
                  searchable={true}
                  required={true}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">รหัส Prefix (ไม่เกิน 6 ตัวอักษร)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={newCfgPrefix}
                  onChange={e => setNewCfgPrefix(e.target.value.toUpperCase())}
                  placeholder="เช่น BS, SH"
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-mono font-bold uppercase"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">คำอธิบายย่อย (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={newCfgDesc}
                  onChange={e => setNewCfgDesc(e.target.value)}
                  placeholder="เช่น ชื่อย่อสินค้า หรือแบรนด์"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={!newCfgFormula || !newCfgPrefix}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" /> บันทึก Prefix
              </button>
            </form>
          </div>

          {/* List column (Right) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-bold text-slate-700">รายการ Prefix ที่กำหนดไว้ ({prefixConfigs.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {prefixConfigs.length === 0 ? (
                <div className="col-span-2 py-8 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <p className="text-xs text-slate-400 italic">ยังไม่มีการตั้งค่า Prefix</p>
                </div>
              ) : (
                prefixConfigs.map(cfg => (
                  <div key={cfg._id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="font-mono font-black text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 text-xs min-w-[40px] text-center">
                      {cfg.prefix}
                    </span>
                    <div className="flex-grow min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-700 truncate">{cfg.formulaName}</p>
                      {cfg.description && <p className="text-[13px] text-slate-400">{cfg.description}</p>}
                    </div>
                    <button
                      onClick={() => handleDeletePrefixConfig(cfg._id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-450 hover:text-red-650 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal helpers for local alerts
function AlertTriangle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CheckCircle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
