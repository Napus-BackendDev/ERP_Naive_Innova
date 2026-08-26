import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update imports to include Eye, Beaker, PackageOpen, Tag, Box
const oldImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2
} from "lucide-react";`;

const newImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box
} from "lucide-react";`;

code = code.replace(oldImports, newImports);

// 2. Add states for detail modal
const insertMarker = 'const [packagingItems, setPackagingItems] = useState([]);';
const insertIdx = code.indexOf(insertMarker);

if (insertIdx !== -1) {
  const newStates = `const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailCust, setSelectedDetailCust] = useState(null);

  const openViewDetailModal = (cust) => {
    setSelectedDetailCust(cust);
    setIsDetailModalOpen(true);
  };

  `;
  code = code.substring(0, insertIdx) + newStates + code.substring(insertIdx);
  console.log("Successfully inserted detail modal states!");
} else {
  console.log("Could not find insertMarker for states!");
}

// 3. Add Eye icon button in Table ACTION column
const oldActionCell = `<button
                            type="button"
                            onClick={() => openStatusModal(cust)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer active:scale-95"
                            title="แก้ไขสถานะ"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>`;

const newActionCell = `<button
                            type="button"
                            onClick={() => openViewDetailModal(cust)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                            title="ดูรายละเอียดการสั่งผลิต"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(cust)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer active:scale-95"
                            title="แก้ไขสถานะ"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>`;

code = code.replace(oldActionCell, newActionCell);
console.log("Successfully inserted Eye button in table actions!");

// 4. Insert View Details Modal JSX above Edit Status Modal
const editStatusModalMarker = '{/* Edit Status Modal */}';
const editStatusModalIdx = code.indexOf(editStatusModalMarker);

if (editStatusModalIdx !== -1) {
  const detailModalJsx = `{/* View Details Modal */}
      {isDetailModalOpen && selectedDetailCust && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                <span>ใบรายละเอียดการสั่งผลิต: {selectedDetailCust.name}</span>
              </h3>
              <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">อีเมลลูกค้า: {selectedDetailCust.email} | สถานะผลิต: {selectedDetailCust.productionStatus || "-"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Product Info & Packaging */}
              <div className="space-y-5">
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <Box className="h-4 w-4 text-blue-600" />
                    <span>ข้อมูลคำสั่งซื้อ / ผลิต</span>
                  </h4>
                  
                  {(() => {
                    let productsList = [];
                    if (selectedDetailCust.orderedProducts) {
                      if (Array.isArray(selectedDetailCust.orderedProducts)) {
                        productsList = selectedDetailCust.orderedProducts;
                      } else if (typeof selectedDetailCust.orderedProducts === "object") {
                        productsList = [selectedDetailCust.orderedProducts];
                      }
                    }
                    return (
                      <div className="space-y-3">
                        {productsList.map((p, idx) => {
                          const name = p.formulaName || p.name || "สารผสม";
                          const qty = parseInt(p.quantityPcs || p.quantity || 0);
                          const liters = (qty * 100) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center p-2.5 bg-white border border-slate-150 rounded-lg shadow-3xs">
                              <span className="text-xs font-extrabold text-slate-700">{name}</span>
                              <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">{qty} ชิ้น ({liters.toFixed(1)} ลิตร)</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Packaging Check & Image */}
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4">
                  <h4 className="text-xs font-black text-slate-700 mb-1 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <PackageOpen className="h-4 w-4 text-green-600" />
                    <span>บรรจุภัณฑ์ที่ระบบจับคู่</span>
                  </h4>

                  {(() => {
                    const matchedPack = packagingItems.find(item => 
                      ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"].includes(item.type?.name) || 
                      ["ขวด", "หลอด", "ซอง"].some(kw => item.name?.includes(kw))
                    );
                    const matchedCap = packagingItems.find(item => 
                      item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || ["ฝา", "หัวปั๊ม", "หัวปั้ม", "ฝาขวด"].some(kw => item.name?.includes(kw))
                    );
                    const matchedLabel = packagingItems.find(item => 
                      ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"].includes(item.type?.name) || 
                      ["กล่อง", "ฉลาก", "สติกเกอร์"].some(kw => item.name?.includes(kw))
                    );

                    let qtyNeeded = 0;
                    if (selectedDetailCust.orderedProducts) {
                      if (Array.isArray(selectedDetailCust.orderedProducts)) {
                        qtyNeeded = selectedDetailCust.orderedProducts.reduce((sum, p) => sum + (parseInt(p.quantityPcs || p.quantity) || 0), 0);
                      } else if (typeof selectedDetailCust.orderedProducts === "object") {
                        qtyNeeded = parseInt(selectedDetailCust.orderedProducts.quantityPcs || selectedDetailCust.orderedProducts.quantity) || 0;
                      }
                    }

                    return (
                      <div className="space-y-3">
                        {/* ขวด */}
                        <div className="flex justify-between items-center p-2.5 bg-white border border-slate-150 rounded-lg">
                          <div className="text-left">
                            <p className="text-[11px] font-extrabold text-slate-700">ขวดบรรจุภัณฑ์</p>
                            <p className="text-[9px] text-slate-400 font-semibold">{matchedPack ? matchedPack.name : "ไม่ระบุ"}</p>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2 py-0.5 border rounded-lg \${
                            matchedPack && matchedPack.currentQuantity >= qtyNeeded ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                          }\`}>
                            {matchedPack && matchedPack.currentQuantity >= qtyNeeded ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* ฝา */}
                        <div className="flex justify-between items-center p-2.5 bg-white border border-slate-150 rounded-lg">
                          <div className="text-left">
                            <p className="text-[11px] font-extrabold text-slate-700">ฝาขวด / หัวปั๊ม (ใช้หัวแบบไหน / จำนวนเท่าไร)</p>
                            <p className="text-[9px] text-slate-400 font-semibold">{matchedCap ? \`\${matchedCap.name} (ใช้ \${qtyNeeded} ชิ้น)\` : \`หัวปั๊มมาตรฐาน (ใช้ \${qtyNeeded} ชิ้น)\`}</p>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2 py-0.5 border rounded-lg \${
                            matchedCap && matchedCap.currentQuantity >= qtyNeeded ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                          }\`}>
                            {matchedCap && matchedCap.currentQuantity >= qtyNeeded ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* ฉลาก */}
                        <div className="flex justify-between items-center p-2.5 bg-white border border-slate-150 rounded-lg">
                          <div className="text-left">
                            <p className="text-[11px] font-extrabold text-slate-700">ฉลากสินค้า (Sticker Label)</p>
                            <p className="text-[9px] text-slate-400 font-semibold">{matchedLabel ? matchedLabel.name : "ไม่ระบุ"}</p>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2 py-0.5 border rounded-lg \${
                            matchedLabel && matchedLabel.currentQuantity >= qtyNeeded ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                          }\`}>
                            {matchedLabel && matchedLabel.currentQuantity >= qtyNeeded ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* Sticker Template Image preview */}
                        {matchedLabel && (matchedLabel.imageUrl || matchedLabel.image) && (
                          <div className="pt-2 border-t border-slate-100 flex flex-col items-start gap-1">
                            <span className="text-[9px] font-extrabold text-slate-400 block uppercase">แม่แบบฉลากที่ลูกค้าให้มา</span>
                            <div className="h-24 w-full bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                              <img src={getFileUrl(matchedLabel.imageUrl || matchedLabel.image)} className="h-full w-auto object-contain" alt="Sticker Preview" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: BOM Formula Ingredients Breakdown */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex flex-col justify-between">
                <div className="w-full">
                  <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <Beaker className="h-4 w-4 text-green-600" />
                    <span>ใบสูตรสารเคมีดิบ (BOM Formula Recheck)</span>
                  </h4>

                  {(() => {
                    let productsList = [];
                    if (selectedDetailCust.orderedProducts) {
                      if (Array.isArray(selectedDetailCust.orderedProducts)) {
                        productsList = selectedDetailCust.orderedProducts;
                      } else if (typeof selectedDetailCust.orderedProducts === "object") {
                        productsList = [selectedDetailCust.orderedProducts];
                      }
                    }

                    return (
                      <div className="space-y-4">
                        {productsList.map((p, pIdx) => {
                          const name = p.formulaName || p.name || "สารผสม";
                          const qty = parseInt(p.quantityPcs || p.quantity || 0);
                          const totalKg = (qty * 100) / 1000;
                          
                          // Find matched formula
                          const matchedFormula = formulas.find(f => f.name === p.formulaName);
                          let bomObj = {};
                          if (matchedFormula && matchedFormula.bom) {
                            if (matchedFormula.bom instanceof Map) {
                              bomObj = Object.fromEntries(matchedFormula.bom);
                            } else {
                              bomObj = matchedFormula.bom;
                            }
                          }
                          const hasIngredients = Object.keys(bomObj).length > 0;

                          return (
                            <div key={pIdx} className="bg-white border border-slate-150 rounded-xl p-3 shadow-3xs text-left">
                              <div className="border-b border-slate-100 pb-2 mb-2 flex justify-between items-center">
                                <span className="text-[11.5px] font-extrabold text-slate-800">{name}</span>
                                <span className="text-[10px] text-slate-400 font-bold font-mono">ขนาดสารผลิต: {totalKg.toFixed(1)} กก.</span>
                              </div>

                              {hasIngredients ? (
                                <table className="w-full text-[10.5px]">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                                      <th className="py-1 text-left">ชื่อวัตถุดิบสาร</th>
                                      <th className="py-1 text-right">สัดส่วน / กก.</th>
                                      <th className="py-1 text-right">ปริมาณที่ต้องเบิก</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(bomObj).map(([ingName, gPerKg]) => {
                                      const neededGrams = gPerKg * totalKg;
                                      const neededText = neededGrams >= 1000 
                                        ? \`\${(neededGrams / 1000).toFixed(2)} กิโลกรัม\` 
                                        : \`\${neededGrams.toFixed(1)} กรัม\`;
                                      return (
                                        <tr key={ingName} className="border-b border-slate-50 text-[10px]">
                                          <td className="py-1.5 text-slate-650 font-bold text-left">{ingName}</td>
                                          <td className="py-1.5 text-slate-400 text-right font-semibold">{gPerKg} กรัม/กก.</td>
                                          <td className="py-1.5 text-slate-800 text-right font-black font-mono">{neededText}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-semibold italic text-center py-2">
                                  ไม่มีข้อมูลสัดส่วนสารเคมีในระบบ R&D
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-150 flex justify-end">
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      `;
  code = code.substring(0, editStatusModalIdx) + detailModalJsx + code.substring(editStatusModalIdx);
  console.log("Successfully inserted View Details Modal component!");
} else {
  console.log("Could not find Edit Status Modal marker to insert above!");
}

fs.writeFileSync(path, code, 'utf8');
