"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import SalesCrmView from "@/components/dashboard/SalesCrmView";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/imageCompress";

export default function SalesCrmPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [packagings, setPackagings] = useState([]);
  const [scents, setScents] = useState([]);
  const [nozzles, setNozzles] = useState([]);
  const [prefixConfigs, setPrefixConfigs] = useState([]);
  const [productLots, setProductLots] = useState([]);
  const [sampleProducts, setSampleProducts] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [createLeadSection, setCreateLeadSection] = useState("s1");
  const [boardColumns, setBoardColumns] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchLeads(token);
  }, []);

  const fetchLeads = async (token) => {
    setLoading(true);
    setError("");

    try {
      const [resLeads, resFormulas, resIngredients, resPackagings, resColumns, resScents, resNozzles, resPrefixConfigs, resLots, resSampleProducts] = await Promise.all([
        api.get("/sales"),
        api.get("/bom/formulas"),
        api.get("/bom/ingredients"),
        api.get("/packaging"),
        api.get("/sales/columns"),
        api.get("/scents"),
        api.get("/nozzles"),
        api.get("/fg/prefix-configs"),
        // includeDelivered: the drawer's "ประวัติใบสั่งผลิตที่เสร็จแล้ว" is a HISTORY
        // panel, not a stock view. /fg/lots hides delivered lots by default (they
        // left the warehouse), which made a deal's history vanish the moment the
        // goods shipped — exactly the orders it should be listing.
        api.get("/fg/lots?includeDelivered=true").catch(() => ({ data: [] })),
        api.get("/products?sample=true").catch(() => ({ data: [] }))
      ]);
      setLeads(resLeads.data);
      setFormulas(resFormulas.data);
      setIngredients(resIngredients.data);
      setPackagings(resPackagings.data || []);
      setBoardColumns(resColumns.data || []);
      setScents(resScents.data || []);
      setNozzles(resNozzles.data || []);
      setPrefixConfigs(resPrefixConfigs.data || []);
      setProductLots(resLots.data || []);
      setSampleProducts(resSampleProducts.data || []);
    } catch (err) {
      console.error("Error fetching sales page data:", err);
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveColumns = async (newCols) => {
    // Optimistic update
    setBoardColumns(newCols);

    try {
      await api.put("/sales/columns", newCols);
    } catch (err) {
      console.error("Failed to save board columns to DB", err);
    }
  };

  // Create a scent entity on the fly and return it (with its new ObjectId) so
  // the combobox can immediately link the ordered product by _id.
  const handleCreateScent = async (name) => {
    const res = await api.post("/scents", { name });
    setScents(prev => (prev.some(s => s._id === res.data._id) ? prev : [...prev, res.data]));
    return res.data;
  };

  // Upload an image file via the multer endpoint; returns the /uploads URL ("" if none).
  const uploadImageFile = async (file) => {
    if (!file) return "";
    const fd = new FormData();
    fd.append("file", await compressImage(file));
    // No explicit Content-Type: the browser must set the multipart boundary itself.
    const res = await api.post("/production/upload", fd);
    return res.data.secure_url || "";
  };

  // extras = { file, qty } from the combobox's inline new-item panel.
  const handleCreateNozzle = async (name, extras) => {
    const image = await uploadImageFile(extras?.file);
    const qty = parseInt(extras?.qty) || 0;
    const res = await api.post("/nozzles", {
      name,
      image,
      currentQuantity: qty
    });
    setNozzles(prev => (prev.some(n => n._id === res.data._id) ? prev : [...prev, res.data]));
    return res.data;
  };

  // Find (or create) a PackagingType by name and return its _id, so items made
  // from the Sales spec modal land in the correct Stock category instead of
  // showing "-". Reuses the existing category if one already exists.
  const getOrCreatePackagingTypeId = async (typeName) => {
    if (!typeName || !typeName.trim()) return null;

    const name = typeName.trim();
    try {
      const list = (await api.get("/packaging-types")).data || [];
      const existing = list.find(t => (t.name || "").trim() === name);
      if (existing) return existing._id;
      const created = (await api.post("/packaging-types", { name })).data;
      return created?._id || null;
    } catch (err) {
      console.error("Failed to resolve packaging type:", err);
      return null;
    }
  };

  // Create a PackagingItem (bottle/jar) owned by the given customer, with an
  // uploaded image, opening stock, and a Stock CATEGORY (type), so the Sales
  // spec modal can link it at once and it lands in the right Stock tab/category.
  const handleCreatePackaging = async (name, extras, customerName, typeName = "บรรจุภัณฑ์") => {
    const image = await uploadImageFile(extras?.file);
    const qty = parseInt(extras?.qty) || 0;
    const type = await getOrCreatePackagingTypeId(typeName);
    const res = await api.post("/packaging", {
      name,
      customer: (customerName || "").trim() || "ระบบ",
      image,
      currentQuantity: qty,
      type
    });
    setPackagings(prev => (prev.some(p => p._id === res.data._id) ? prev : [...prev, res.data]));
    return res.data;
  };

  // Sticker/label variant — categorized under the "สติกเกอร์" packaging type so
  // the label pickers (which filter by type/name) and Stock both classify it.
  const handleCreateLabel = async (name, extras, customerName) => {
    const n = name.includes("สติกเกอร์") || name.includes("ฉลาก") ? name : `สติกเกอร์ ${name}`;
    return handleCreatePackaging(n, extras, customerName, "สติกเกอร์");
  };

  const handleCreateLead = async (payload) => {
    // The form now names the stage explicitly. The old rule forced every sample
    // order into "s2" and everything else into "s1" — ids that need not exist on
    // a board whose columns are user-created, so cards landed in the wrong place
    // or nowhere visible at all.
    const targetSection = payload.section || createLeadSection || boardColumns[0]?.id || "s1";
    const newLead = {
      ...payload,
      section: targetSection
    };

    try {
      const res = await api.post("/sales", newLead);
      setLeads(prev => [res.data, ...prev]);
      if (newLead.orderType === "sample" && Array.isArray(newLead.orderedProducts)) {
        setSampleProducts(prev => prev.map(product => {
          const ordered = newLead.orderedProducts.find(item => item?.productId === product._id);
          if (!ordered) return product;
          const qty = Math.max(0, parseInt(ordered.quantity) || 0);
          return {
            ...product,
            currentQuantity: Math.max(0, (product.currentQuantity || 0) - qty)
          };
        }));
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to create lead", err);
      throw err;
    }
  };

  const handleUpdateLead = async (leadId, payload) => {
    try {
      const previousLead = leads.find(l => l._id === leadId);
      const res = await api.put(`/sales/${leadId}`, payload);
      setLeads(prev => prev.map(l => l._id === leadId ? res.data : l));
      if (previousLead) {
        const toMap = (lead) => {
          if (lead?.orderType !== "sample" || !Array.isArray(lead.orderedProducts)) return new Map();
          return lead.orderedProducts.reduce((map, item) => {
            if (!item?.productId) return map;
            map.set(item.productId, (map.get(item.productId) || 0) + (Math.max(0, parseInt(item.quantity) || 0)));
            return map;
          }, new Map());
        };
        const before = toMap(previousLead);
        const after = toMap(res.data);
        setSampleProducts(prev => prev.map(product => {
          const delta = (after.get(product._id) || 0) - (before.get(product._id) || 0);
          if (delta <= 0) return product;
          return {
            ...product,
            currentQuantity: Math.max(0, (product.currentQuantity || 0) - delta)
          };
        }));
      }
      setDrawerOpen(false);
      setSelectedLead(null);
    } catch (err) {
      console.error("Failed to update lead", err);
      throw err;
    }
  };

  const handleMoveLead = async (leadId, newSection) => {
    const leadToUpdate = leads.find(l => l._id === leadId);
    if (!leadToUpdate) return;

    const targetCol = boardColumns.find(c => c.id === newSection);
    const targetIsTargetList = targetCol && targetCol.label === "รายชื่อเป้าหมาย";
    const nextPrevSection = targetIsTargetList
      ? (leadToUpdate.section === newSection ? (leadToUpdate.previousSection || "") : (leadToUpdate.section || ""))
      : "";

    const targetIsClosedWon = targetCol && (targetCol.label === "ปิดการขาย" || targetCol.label === "Closed Won" || targetCol.id === "s11");
    const targetIsRetention1 = targetCol && /^retention\s*1$/i.test(targetCol.label || "");
    const shouldCloseDevelopOrder = targetIsRetention1 && leadToUpdate.orderType === "develop";
    const nextIsReturningCustomer = leadToUpdate.isReturningCustomer || targetIsClosedWon || targetIsRetention1 || false;

    const updatedLeadData = {
      ...leadToUpdate,
      section: newSection,
      previousSection: nextPrevSection,
      isReturningCustomer: nextIsReturningCustomer,
      ...(shouldCloseDevelopOrder ? { orderType: "", orderedProducts: [] } : {}),
      statusChangedAt: new Date().toISOString()
    };

    // Optimistically update local state
    setLeads(prev => prev.map(l => l._id === leadId ? updatedLeadData : l));

    try {
      await api.put(`/sales/${leadId}`, updatedLeadData);
    } catch (err) {
      console.error("Failed to move lead", err);
      // Revert state if API call fails
      setLeads(prev => prev.map(l => l._id === leadId ? leadToUpdate : l));
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("คุณต้องการลบดีลลูกค้านี้ใช่หรือไม่?")) return;

    try {
      await api.delete(`/sales/${leadId}`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      console.error("Failed to delete lead", err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded-lg mb-1" />
            <div className="h-3.5 w-64 bg-slate-150 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(col => (
            <div key={col} className="w-[300px] flex-shrink-0 flex flex-col rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-3">
              <div className="flex justify-between items-center mb-2 p-1">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-6 bg-slate-200 rounded-full" />
              </div>
              <div className="h-9 w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-xl" />
              {[1, 2].map(card => (
                <div key={card} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                  <div className="h-4 w-2/3 bg-slate-200 rounded" />
                  <div className="space-y-1.5 pt-2">
                    <div className="h-8 w-full bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              const token = localStorage.getItem("token");
              if (token) fetchLeads(token);
            }}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 cursor-pointer"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <SalesCrmView
      leads={leads}
      formulas={formulas}
      ingredients={ingredients}
      packagings={packagings}
      scents={scents}
      nozzles={nozzles}
      prefixConfigs={prefixConfigs}
      productLots={productLots}
      sampleProducts={sampleProducts}
      onCreateScent={handleCreateScent}
      onCreateNozzle={handleCreateNozzle}
      onCreatePackaging={handleCreatePackaging}
      onCreateLabel={handleCreateLabel}
      boardColumns={boardColumns}
      saveBoardColumns={handleSaveColumns}
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      selectedLead={selectedLead}
      setSelectedLead={setSelectedLead}
      handleCreateLead={handleCreateLead}
      handleUpdateLead={handleUpdateLead}
      handleMoveLead={handleMoveLead}
      handleDeleteLead={handleDeleteLead}
      setCreateLeadSection={setCreateLeadSection}
    />
  );
}
