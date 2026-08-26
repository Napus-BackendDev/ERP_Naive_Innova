"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import RndView from "@/components/dashboard/RndView";

export default function RndPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [orders, setOrders] = useState([]);
  const [packagings, setPackagings] = useState([]);
  const [nozzles, setNozzles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData(token);
  }, []);

  const fetchData = async (token) => {
    setLoading(true);
    setError("");

    try {
      const [ingRes, formRes, orderRes, pkgRes, nozRes] = await Promise.all([
        api.get("/bom/ingredients"),
        api.get("/bom/formulas?includeArchived=true"),
        api.get("/production/orders"),
        api.get("/packaging"),
        api.get("/nozzles"),
      ]);
      setIngredients(ingRes.data || []);
      setFormulas(formRes.data || []);
      setPackagings(pkgRes.data || []);
      setNozzles(nozRes.data || []);
      const realOrders = Array.isArray(orderRes.data) ? orderRes.data : [];
      setOrders(realOrders);
    } catch (err) {
      console.error("Error fetching R&D data:", err);
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const token = localStorage.getItem("token");
    if (token) fetchData(token);
  };

  const handleCreateFormula = async (newData) => {
    try {
      const res = await api.post("/bom/formulas", newData);
      if (res.data) {
        setFormulas(prev => [...prev, res.data]);
      }
      return res.data;
    } catch (error) {
      console.error("Failed to create formula:", error);
      throw error;
    }
  };

  const handleUpdateFormula = async (id, updatedData) => {
    try {
      const res = await api.put(`/bom/formulas/${id}`, updatedData);
      if (res.data) {
        setFormulas(prev => prev.map(f => f._id === id ? res.data : f));
      }
    } catch (error) {
      console.error("Failed to update formula:", error);
      throw error;
    }
  };

  const handleDeleteFormula = async (id) => {
    try {
      const res = await api.delete(`/bom/formulas/${id}`);
      setFormulas(prev => prev.filter(f => f._id !== id));
      return res.data;
    } catch (error) {
      console.error("Failed to delete formula:", error);
      throw error;
    }
  };

  const handleCreateIngredient = async (newData) => {
    try {
      const res = await api.post("/bom/ingredients", newData);
      if (res.data) {
        setIngredients(prev => [...prev, res.data]);
      }
    } catch (error) {
      console.error("Failed to create ingredient:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 text-left select-none">
        <div className="h-24 w-full bg-slate-100 rounded-3xl border border-slate-200" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-40 bg-slate-100 rounded-xl border border-slate-200 shrink-0" />
          ))}
        </div>
        <div className="h-72 w-full bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-left">
        <p className="text-sm font-bold text-red-700">{error}</p>
        <button
          onClick={handleRefresh}
          className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <RndView
      ingredients={ingredients}
      formulas={formulas}
      orders={orders}
      packagings={packagings}
      nozzles={nozzles}
      onRefresh={handleRefresh}
      onCreateFormula={handleCreateFormula}
      onUpdateFormula={handleUpdateFormula}
      onDeleteFormula={handleDeleteFormula}
      onCreateIngredient={handleCreateIngredient}
    />
  );
}
