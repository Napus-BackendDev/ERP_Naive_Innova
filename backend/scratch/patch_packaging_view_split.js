import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Update imports
const targetImport = 'import { Package, AlertTriangle, SlidersHorizontal, Camera, Edit2, Trash2, X, Plus, CheckCircle, XCircle, ChevronDown, Search, Minus } from "lucide-react";';
const replacementImport = 'import { Package, AlertTriangle, SlidersHorizontal, Camera, Edit2, Trash2, X, Plus, CheckCircle, XCircle, ChevronDown, Search, Minus, Tag, Mail } from "lucide-react";';

if (code.includes(targetImport)) {
  code = code.replace(targetImport, replacementImport);
  console.log("Imports updated!");
}

// 2. Add classification helper and render table helper inside PackagingView
const targetComponentStart = `export default function PackagingView({ 
  packaging, 
  categories = [],
  customers = [],
  onAdjustStock, 
  onUploadFile, 
  onUpdatePackaging, 
  onDeletePackaging,
  onCreatePackaging 
}) {`;

const replacementComponentStart = `export default function PackagingView({ 
  packaging, 
  categories = [],
  customers = [],
  onAdjustStock, 
  onUploadFile, 
  onUpdatePackaging, 
  onDeletePackaging,
  onCreatePackaging 
}) {
  // Helper to classify items into 3 sections: pack, label, post
  const classifyItem = (pkg) => {
    const catName = pkg.type?.name || "";
    const name = pkg.name || "";
    const lowerCat = catName.toLowerCase();
    const lowerName = name.toLowerCase();

    // 2. ฉลาก (Label)
    if (lowerCat.includes("ฉลาก") || lowerCat.includes("สติกเกอร์") || lowerName.includes("ฉลาก") || lowerName.includes("สติกเกอร์")) {
      return "label";
    }

    // 3. ไปรษณีย์ (Shipping/Mail)
    if (
      lowerCat.includes("กล่อง") || lowerCat.includes("ซอง") || 
      lowerName.includes("กล่อง") || lowerName.includes("ซอง") ||
      lowerCat.includes("ไปรษณีย์") || lowerName.includes("ไปรษณีย์")
    ) {
      return "post";
    }

    // 1. บรรจุภัณฑ์ (Packaging)
    return "pack";
  };

  const renderPackagingTable = (itemsList, emptyMessage) => {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-3xs bg-white">
        <table className="w-full text-xs text-left text-slate-500 border-collapse">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">ชื่อบรรจุภัณฑ์ / รหัส SKU</th>
              <th className="px-4 py-3">แบรนด์ลูกค้า</th>
              <th className="px-4 py-3">หมวดหมู่</th>
              <th className="px-4 py-3">ระดับสต็อก</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">หมายเหตุ</th>
              <th className="px-4 py-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {itemsList.map((pkg) => {
              const cat = getCategoryBadge(pkg.type);
              const isLow = pkg.currentQuantity < 500 && pkg.currentQuantity > 0;
              const isOut = pkg.currentQuantity === 0;

              return (
                <tr key={pkg._id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Item Name / SKU */}
                  <td className="px-4 py-3.5 text-left font-medium">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pkg.image) {
                            setPreviewImage(pkg.image);
                            setPreviewModalOpen(true);
                          }
                        }}
                        className={"h-10 w-10 rounded-lg border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-50 relative group transition-all duration-200 " + (pkg.image ? "cursor-zoom-in hover:border-green-500 shadow-2xs hover:shadow-xs" : "cursor-default")}
                        title={pkg.image ? "คลิกเพื่อดูรูปภาพขนาดใหญ่" : "ไม่มีรูปภาพ"}
                      >
                        {pkg.image ? (
                          <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-900 text-[12px] leading-snug">{pkg.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">{generateMockSku(pkg.name)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3.5 text-left font-semibold text-slate-800">
                    {pkg.customer || "ใช้ร่วมกัน"}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5 text-left">
                    <span className={"inline-block px-2 py-0.5 rounded-md text-[9px] font-bold border " + cat.style}>
                      {cat.label}
                    </span>
                  </td>

                  {/* Stock Level */}
                  <td className={"px-4 py-3.5 text-left font-mono font-black text-xs " + (isOut ? "text-red-500 font-semibold" : isLow ? "text-amber-500" : "text-slate-700")}>
                    {pkg.currentQuantity.toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-left">
                    {isOut ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
                        ● สินค้าหมด
                      </span>
                    ) : isLow ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ● สต็อกใกล้หมด
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                        ● ปกติ
                      </span>
                    )}
                  </td>

                  {/* Note Column */}
                  <td className="px-4 py-3.5 text-left text-slate-500 font-medium max-w-[160px] truncate" title={pkg.note || ""}>
                    {pkg.note || "-"}
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdjustItem(pkg);
                          setAdjustType("in");
                          setAdjustDrawerOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors border border-green-200 cursor-pointer"
                        title="เพิ่มสต็อก (+)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdjustItem(pkg);
                          setAdjustType("out");
                          setAdjustDrawerOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors border border-red-200 cursor-pointer"
                        title="ลดสต็อก (-)"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(pkg);
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors border border-blue-200 cursor-pointer"
                        title="แก้ไขรายละเอียด"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(pkg)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-colors border border-rose-200 cursor-pointer"
                        title="ลบรายการ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {itemsList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold italic bg-slate-50/50">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };`;

if (code.includes(targetComponentStart)) {
  code = code.replace(targetComponentStart, replacementComponentStart);
  console.log("Helpers added successfully!");
}

// 3. Replace Table Container with 3 Tables container
const targetTable = `        {/* Packaging Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-500 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ชื่อบรรจุภัณฑ์ / รหัส SKU</th>
                <th className="px-4 py-3">แบรนด์ลูกค้า</th>
                <th className="px-4 py-3">หมวดหมู่</th>
                <th className="px-4 py-3">ระดับสต็อก</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">หมายเหตุ</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {sortedPackaging.map((pkg) => {
                const cat = getCategoryBadge(pkg.type);
                const isLow = pkg.currentQuantity < 500 && pkg.currentQuantity > 0;
                const isOut = pkg.currentQuantity === 0;

                return (
                  <tr key={pkg._id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Item Name / SKU (With Zoomable Thumbnail Image) */}
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pkg.image) {
                              setPreviewImage(pkg.image);
                              setPreviewModalOpen(true);
                            }
                          }}
                          className={\`h-10 w-10 rounded-lg border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-50 relative group transition-all duration-200 \${
                            pkg.image 
                              ? "cursor-zoom-in hover:border-green-500 shadow-2xs hover:shadow-xs" 
                              : "cursor-default"
                          }\`}
                          title={pkg.image ? "คลิกเพื่อดูรูปภาพขนาดใหญ่" : "ไม่มีรูปภาพ"}
                        >
                          {pkg.image ? (
                            <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-sm leading-snug">{pkg.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{generateMockSku(pkg.name)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Brand */}
                    <td className="px-4 py-3.5 text-left font-medium text-slate-700">
                      {pkg.customer || "ใช้ร่วมกัน"}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-left">
                      <span className={\`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold border \${cat.style}\`}>
                        {cat.label}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className={\`px-4 py-3.5 text-left font-mono font-bold text-sm \${isOut ? "text-red-500 font-medium" : isLow ? "text-amber-500" : "text-slate-700"}\`}>
                      {pkg.currentQuantity.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-left">
                      {isOut ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          ● สินค้าหมด
                        </span>
                      ) : isLow ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          ● สต็อกใกล้หมด
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          ● ปกติ
                        </span>
                      )}
                    </td>

                    {/* Note Column */}
                    <td className="px-4 py-3.5 text-left text-slate-500 font-medium max-w-[160px] truncate" title={pkg.note || ""}>
                      {pkg.note || "-"}
                    </td>

                    {/* Actions Column (Plus & Minus) */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedAdjustItem(pkg);
                            setAdjustType("in");
                            setAdjustDrawerOpen(true);
                          }}
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors border border-green-200 cursor-pointer"
                          title="เพิ่มสต็อก (+)"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAdjustItem(pkg);
                            setAdjustType("out");
                            setAdjustDrawerOpen(true);
                          }}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors border border-red-200 cursor-pointer"
                          title="ลดสต็อก (-)"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPackaging.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold">
                    ไม่พบข้อมูลบรรจุภัณฑ์ตามตัวกรองที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>`;

const replacementTable = `        {/* Classify sorted items into 3 separate arrays */}
        {(() => {
          const packItems = sortedPackaging.filter(p => classifyItem(p) === "pack");
          const labelItems = sortedPackaging.filter(p => classifyItem(p) === "label");
          const postItems = sortedPackaging.filter(p => classifyItem(p) === "post");

          return (
            <div className="space-y-6">
              {/* Section 1: บรรจุภัณฑ์ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">1. บรรจุภัณฑ์ ({packItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {packItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(packItems, "ไม่พบข้อมูลบรรจุภัณฑ์")}
              </div>

              {/* Section 2: ฉลาก */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">2. ฉลาก ({labelItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {labelItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(labelItems, "ไม่พบข้อมูลฉลาก")}
              </div>

              {/* Section 3: ไปรษณีย์ */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">3. ไปรษณีย์ ({postItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {postItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(postItems, "ไม่พบข้อมูลกล่องไปรษณีย์/ซอง")}
              </div>
            </div>
          );
        })()}`;

if (code.includes(targetTable)) {
  code = code.replace(targetTable, replacementTable);
  console.log("Table code split successfully!");
} else {
  console.log("Table code split NOT found!");
}

// 4. Overwrite file
fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched split tables in PackagingView.js!");
