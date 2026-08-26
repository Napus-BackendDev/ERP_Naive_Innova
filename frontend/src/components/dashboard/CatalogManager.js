"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";

/**
 * Reusable master-data CRUD panel for simple name-only catalogs (e.g. scents,
 * nozzles). Each item is its own entity with an ObjectId. Talks to a REST
 * endpoint exposing GET / POST / PUT :id / DELETE :id.
 *
 * Props:
 *  - title, subtitle, icon (lucide component), addPlaceholder
 *  - apiPath: path segment after /api, e.g. "scents"
 */
export default function CatalogManager({ title, subtitle, icon: Icon, addPlaceholder, apiPath }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");


  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${apiPath}`);
      setItems(res.data || []);
    } catch (error) {
      console.error(`Error fetching ${apiPath}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  const flash = (setter, msg) => {
    setter(msg);
    setTimeout(() => setter(""), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.post(`/${apiPath}`, { name: newName.trim() });
      setItems(prev => (prev.some(i => i._id === res.data._id) ? prev : [...prev, res.data]));
      setNewName("");
      flash(setSuccessMsg, "เพิ่มรายการสำเร็จ");
    } catch (error) {
      flash(setErrorMsg, error.response?.data?.message || "ไม่สามารถเพิ่มรายการได้");
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.put(`/${apiPath}/${id}`, { name: editName.trim() });
      setItems(prev => prev.map(i => (i._id === id ? res.data : i)));
      setEditingId(null);
      setEditName("");
      flash(setSuccessMsg, "แก้ไขรายการสำเร็จ");
    } catch (error) {
      flash(setErrorMsg, error.response?.data?.message || "ไม่สามารถแก้ไขรายการได้");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${name}"?`)) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.delete(`/${apiPath}/${id}`);
      setItems(prev => prev.filter(i => i._id !== id));
      flash(setSuccessMsg, "ลบรายการสำเร็จ");
    } catch (error) {
      flash(setErrorMsg, error.response?.data?.message || "ไม่สามารถลบรายการได้");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-slate-500" />} {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl">{successMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">เพิ่มรายการใหม่</h4>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ชื่อรายการ</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={addPlaceholder}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" /> เพิ่มรายการ
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs md:col-span-2 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">รายการทั้งหมด ({items.length})</h4>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-2">
              {items.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">ยังไม่มีข้อมูลในระบบ</p>
              ) : (
                items.map((item) => (
                  <div key={item._id} className="py-3 flex justify-between items-center gap-4 transition-colors hover:bg-slate-50/50 rounded-lg px-2">
                    {editingId === item._id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-grow p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-green-500 outline-none text-xs text-slate-800"
                        />
                        <button onClick={() => handleSaveEdit(item._id)} className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer" title="บันทึก">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditName(""); }} className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer" title="ยกเลิก">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => { setEditingId(item._id); setEditName(item.name); }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-green-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, item.name)}
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
          )}
        </div>
      </div>
    </div>
  );
}
