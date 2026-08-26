import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the completed item status badge with the "ดำเนินการ QC" button
const targetCompletedBadge = `                      <div
                        key={cust._id}
                        className="flex justify-between items-center p-1.5 bg-white border border-slate-200 rounded-lg shadow-3xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-extrabold text-slate-755 truncate text-[9.5px]">
                            {cust.name} <span className="text-slate-450 font-bold">({fName})</span>
                          </span>
                        </div>
                        <span className="text-[7.5px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-1 rounded font-mono font-bold shrink-0">
                          เสร็จสิ้น
                        </span>
                      </div>`;

const replacementCompletedBadge = `                      <div
                        key={cust._id}
                        className="flex justify-between items-center p-1.5 bg-white border border-slate-200 rounded-lg shadow-3xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-extrabold text-slate-755 truncate text-[9.5px]">
                            {cust.name} <span className="text-slate-450 font-bold">({fName})</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openViewDetailModal(cust)}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-650 rounded-lg text-[8px] font-black cursor-pointer transition-all shadow-xs shrink-0 flex items-center"
                          title="กดเพื่อตรวจสอบและดำเนินการ QC ต่อ"
                        >
                          ดำเนินการ QC
                        </button>
                      </div>`;

code = code.replace(targetCompletedBadge, replacementCompletedBadge);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully replaced completed badge with QC action button!");
