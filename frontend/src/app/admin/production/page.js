"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import ProductionView from "@/components/dashboard/ProductionView";
import { useRouter } from "next/navigation";

// Machines live in MongoDB (collection `machines`, /api/machines) — they used to
// be kept in localStorage, which meant every browser invented its own machine
// list and the scheduleMachineId saved on an order pointed at an id that existed
// on one laptop only. The view still keys off `id`, so map _id → id here.
const normalizeMachines = (list) =>
  (list || []).map((m) => ({ ...m, id: String(m._id) }));

export default function ProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formulas, setFormulas] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [skus, setSkus] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);

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

    try {
      const [formRes, ingRes, skuRes, prodOrdersRes, machinesRes] = await Promise.all([
        api.get("/bom/formulas"),
        api.get("/bom/ingredients"),
        api.get("/fg/skus"),
        api.get("/production/orders"),
        api.get("/machines")
      ]);
      setFormulas(formRes.data);
      setIngredients(ingRes.data);
      setSkus(skuRes.data);
      // MongoDB is the source of truth; no localStorage mirror (order docs now carry
      // QC media/base64 that overflow the ~5MB localStorage quota — QuotaExceededError).
      setCustomers(prodOrdersRes.data || []);
      setMachines(normalizeMachines(machinesRes.data));
    } catch (error) {
      console.error("Error fetching production page data:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleCreateMachine = async (payload) => {
    const res = await api.post("/machines", payload);
    const created = normalizeMachines([res.data])[0];
    setMachines((prev) => [...prev, created]);
    return created;
  };

  const handleUpdateMachine = async (machineId, payload) => {
    const res = await api.put(`/machines/${machineId}`, payload);
    const updated = normalizeMachines([res.data])[0];
    setMachines((prev) => prev.map((m) => (m.id === machineId ? updated : m)));
    return updated;
  };

  const handleDeleteMachine = async (machineId) => {
    await api.delete(`/machines/${machineId}`);
    setMachines((prev) => prev.filter((m) => m.id !== machineId));
  };

  const handleConfirmProduction = async (payload) => {
    const token = localStorage.getItem("token");

    try {
      const res = await api.post("/bom/confirm-production", payload);
      await fetchData(token);
      return res.data;
    } catch (error) {
      console.error("Failed to confirm production:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 text-left select-none">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded-lg mb-1" />
            <div className="h-3.5 w-64 bg-slate-150 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="h-4 w-1/2 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-50 rounded" />
              <div className="h-8 bg-slate-50 rounded" />
              <div className="h-8 bg-slate-50 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateCustomerStatus = async (customerId, payload) => {
    const realCustomerId = customerId.includes("-") ? customerId.split("-")[0] : customerId;
    const productIndex = customerId.includes("-") ? parseInt(customerId.split("-")[1]) : null;
    
    try {
      // Save directly to MongoDB using Express API!
      const res = await api.put(`/production/orders/${realCustomerId}/status?productIndex=${productIndex}`, payload);
      
      // Update state with updated customer from database
      setCustomers(prev => prev.map(c => c._id === realCustomerId ? res.data : c));
    } catch (error) {
      console.error("Failed to update status in MongoDB:", error);
      throw error;
    }
  };

  const handleScheduleOrder = async (customerId, payload) => {
    const realCustomerId = customerId.includes("-") ? customerId.split("-")[0] : customerId;
    const productIndex = customerId.includes("-") ? parseInt(customerId.split("-")[1]) : null;

    try {
      const res = await api.put(
        `/production/orders/${realCustomerId}/schedule?productIndex=${productIndex}`,
        payload);
      setCustomers(prev => prev.map(c => c._id === realCustomerId ? res.data : c));
    } catch (error) {
      console.error("Failed to save schedule in MongoDB:", error);
      throw error;
    }
  };

  return (
    <ProductionView
      formulas={formulas}
      ingredients={ingredients}
      skus={skus}
      customers={customers}
      machines={machines}
      onConfirmProduction={handleConfirmProduction}
      onUpdateCustomerStatus={handleUpdateCustomerStatus}
      onScheduleOrder={handleScheduleOrder}
      onCreateMachine={handleCreateMachine}
      onUpdateMachine={handleUpdateMachine}
      onDeleteMachine={handleDeleteMachine}
    />
  );
}
