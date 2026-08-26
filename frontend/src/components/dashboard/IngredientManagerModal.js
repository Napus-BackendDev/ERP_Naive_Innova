"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function IngredientManagerModal({
  isOpen,
  onClose,
  onCreateIngredient
}) {
  const [ingName, setIngName] = useState("");
  const [ingStock, setIngStock] = useState("");
  const [ingSupplier, setIngSupplier] = useState("");
  const [ingPrice, setIngPrice] = useState("");
  const [ingError, setIngError] = useState("");
  const [ingSubmitting, setIngSubmitting] = useState(false);

  // Manage body scroll locking when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setIngName("");
      setIngStock("");
      setIngSupplier("");
      setIngPrice("");
      setIngError("");
      setIngSubmitting(false);
    }
  }, [isOpen]);

  const handleIngSubmit = async (e) => {
    e.preventDefault();
    setIngError("");

    const data = {
      name: ingName,
      openingStock: parseFloat(ingStock) || 0,
      supplier: ingSupplier,
      pricePerKg: (parseFloat(ingPrice) || 0) * 1000
    };

    setIngSubmitting(true);
    try {
      await onCreateIngredient(data);
      onClose();
    } catch (err) {
      setIngError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setIngSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity" 
        onClick={onClose} 
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">เพิ่มวัตถุดิบสารเคมีใหม่</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleIngSubmit} className="p-5 space-y-4">
            {ingError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
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
              <label className="text-[14px] text-slate-400 font-bold uppercase tracking-wider">ราคาต่อกรัม (บาท)</label>
              <input
                type="number"
                step="any"
                value={ingPrice}
                onChange={(e) => setIngPrice(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-green-500 outline-none text-xs text-slate-800 font-semibold"
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={ingSubmitting}
                className="flex-grow border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={ingSubmitting}
                className="flex-grow bg-green-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {ingSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
