import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionDetailView.js';
let code = fs.readFileSync(path, 'utf8');

const startMarker = '{/* 1. สารเคมี (BOM Bulk) */}';
const endMarker = '{/* 2. ขวดบรรจุภัณฑ์ (Packaging) */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const oldText = code.substring(startIdx, endIdx);
  const newText = `{/* 1. สารเคมี (BOM Bulk) */}
                {(() => {
                  const bulkInfo = getBulkChemicalsInfo();
                  let productsList = [];
                  if (cust.orderedProducts) {
                    if (Array.isArray(cust.orderedProducts)) {
                      productsList = cust.orderedProducts;
                    } else if (typeof cust.orderedProducts === "object") {
                      productsList = [cust.orderedProducts];
                    }
                  }
                  return (
                    <div className="flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 transition-all aspect-square w-full group border-slate-100">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">BOM BULK</span>
                        <span className="text-[9px] font-extrabold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 rounded-lg">✓ พร้อมผสม</span>
                      </div>
                      
                      {/* List of sub-slots / items */}
                      <div className="my-auto py-1 flex flex-col gap-2 w-full overflow-y-auto max-h-[160px] pr-1">
                        {productsList.map((p, idx) => {
                          const name = p.formulaName || p.name || "สารผสม";
                          const qty = parseInt(p.quantityPcs || p.quantity || 0);
                          const liters = (qty * 100) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-lg shadow-2xs hover:bg-slate-100/50 transition-all">
                              <div className="flex items-center gap-2 min-w-0">
                                <Beaker className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                <span className="text-[10px] font-extrabold text-slate-700 truncate">{name}</span>
                              </div>
                              <span className="text-[9.5px] font-black text-green-700 bg-green-50 px-1.5 py-0.5 border border-green-150 rounded-md shrink-0 font-mono">
                                {liters.toFixed(1)} ลิตร
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-left mt-auto pt-2 border-t border-slate-100 flex justify-between items-center w-full">
                        <p className="text-[11.5px] font-extrabold text-slate-700">ปริมาณรวมทั้งหมด</p>
                        <p className="text-[11px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{bulkInfo.totalLiters.toFixed(1)} ลิตร</p>
                      </div>
                    </div>
                  );
                })()}

                `;

  code = code.replace(oldText, newText);
  console.log("Successfully patched Step 1 BOM Bulk list layout!");
} else {
  console.log("Could not find start/end markers for BOM Bulk!");
}

fs.writeFileSync(path, code, 'utf8');
