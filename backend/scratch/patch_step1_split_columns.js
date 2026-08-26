import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionDetailView.js';
let code = fs.readFileSync(path, 'utf8');

const startMarker = '{/* Step 1: ยืนยันวัตถุดิบ */}';
const endMarker = '{/* Step 2: QA รอบที่ 1 */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const oldText = code.substring(startIdx, endIdx);
  const newText = `{/* Step 1: ยืนยันวัตถุดิบ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                  <span>1. ยืนยันความพร้อมของวัตถุดิบและบรรจุภัณฑ์</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">ตรวจสอบความพร้อมของสารเคมีผสม ขวด ฝาขวด และป้ายสติกเกอร์ฉลาก เพื่อเริ่มต้นขั้นตอนการบรรจุ</p>
              </div>

              {/* Split into 2 unequal columns: Left takes 2/3 (BOM Bulk), Right takes 1/3 (Packaging Checklist) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left">
                
                {/* [LEFT COLUMN]: สารเคมี (BOM Bulk) - Spans 2 columns */}
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
                    <div className="lg:col-span-2 flex flex-col justify-between gap-3 p-5 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/55 transition-all w-full group border-slate-100">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">BOM BULK DETAILS</span>
                        <span className="text-[9px] font-extrabold text-green-700 bg-green-50 px-2.5 py-0.5 border border-green-200 rounded-lg">✓ พร้อมผสม</span>
                      </div>
                      
                      {/* Spacious list of substances with calculation breakdown */}
                      <div className="my-auto py-2 flex flex-col gap-2.5 w-full">
                        {productsList.map((p, idx) => {
                          const name = p.formulaName || p.name || "สารผสม";
                          const qty = parseInt(p.quantityPcs || p.quantity || 0);
                          const liters = (qty * 100) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-3xs hover:bg-slate-100/50 transition-all">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-6 w-6 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                                  <Beaker className="h-3.5 w-3.5 text-green-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 truncate">{name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-slate-400 font-extrabold">{qty} ขวด x 100ml =</span>
                                <span className="text-[11px] font-black text-green-700 bg-green-50 px-2 py-0.5 border border-green-150 rounded-lg font-mono">
                                  {liters.toFixed(1)} ลิตร
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-left mt-auto pt-2.5 border-t border-slate-100 flex justify-between items-center w-full">
                        <p className="text-[11.5px] font-extrabold text-slate-750">ปริมาณสารเคมีรวมทั้งหมด</p>
                        <p className="text-[11.5px] font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg font-mono">{bulkInfo.totalLiters.toFixed(1)} ลิตร</p>
                      </div>
                    </div>
                  );
                })()}

                {/* [RIGHT COLUMN]: เช็กลิสต์บรรจุภัณฑ์ (Packaging Checklist) - Spans 1 column */}
                {(() => {
                  const hasPack = checkPackagingReady(cust, packagingItems);
                  const matchedPack = getMatchedPackagingItem();
                  const hasCap = checkCapReady(cust, packagingItems);
                  const matchedCap = getMatchedCapItem();
                  const hasLabel = checkLabelReady(cust, packagingItems);
                  const matchedLabel = getMatchedLabelItem();
                  return (
                    <div className="flex flex-col justify-between p-5 bg-white border border-slate-100 rounded-xl shadow-2xs hover:bg-slate-50/55 transition-all w-full border-slate-100">
                      <div className="flex flex-col gap-4 w-full my-auto">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono mb-2 block uppercase">PACKAGING STOCK STATUS</span>
                        
                        {/* 1. ขวดบรรจุภัณฑ์ */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <PackageOpen className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[11px] font-extrabold text-slate-700">ขวดบรรจุภัณฑ์</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">{matchedPack ? matchedPack.name : "ขวดเปล่าตาม SKU"}</p>
                            </div>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 \${
                            hasPack ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }\`}>
                            {hasPack ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* 2. ฝาขวด / หัวปั๊ม */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[11px] font-extrabold text-slate-700">ฝาขวด / หัวปั๊ม</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">{matchedCap ? matchedCap.name : "ฝาหรือหัวกดปั๊ม"}</p>
                            </div>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 \${
                            hasCap ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }\`}>
                            {hasCap ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                        {/* 3. ฉลากสินค้า */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="text-[11px] font-extrabold text-slate-700">ฉลากสินค้า</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">{matchedLabel ? matchedLabel.name : "สติกเกอร์สำหรับข้างขวด"}</p>
                            </div>
                          </div>
                          <span className={\`text-[10px] font-extrabold px-2.5 py-0.5 border rounded-lg shrink-0 \${
                            hasLabel ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                          }\`}>
                            {hasLabel ? "✓ มีสต็อก" : "❌ สต็อกไม่พอ"}
                          </span>
                        </div>

                      </div>

                      <div className="text-left mt-auto pt-2.5 border-t border-slate-100 flex justify-between items-center w-full">
                        <p className="text-[11px] font-extrabold text-slate-400">เช็คคลังบรรจุภัณฑ์อัตโนมัติ</p>
                      </div>
                    </div>
                  );
                })()}

              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={uploading || !checkPackagingReady(cust, packagingItems) || !checkLabelReady(cust, packagingItems)}
                  onClick={handleConfirmStep1}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1.5 active:scale-98"
                >
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                  <span>ยืนยันวัตถุดิบครบถ้วนเพื่อเริ่มผลิต</span>
                </Button>
              </div>
            </div>
          )
          }`;

  code = code.replace(oldText, newText);
  console.log("Successfully replaced Step 1 layout with a clean 2-column split!");
} else {
  console.log("Could not find start/end JSX comments for Step 1!");
}

fs.writeFileSync(path, code, 'utf8');
