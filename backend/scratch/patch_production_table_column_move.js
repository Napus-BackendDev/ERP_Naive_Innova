import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Replace Table Headers (adding วันที่เปลี่ยนสถานะ and updating headers)
const targetHeaders = `            <thead>
              <tr className="bg-slate-50 text-slate-450 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">ชื่อลูกค้า / แบรนด์</th>
                <th className="px-4 py-3">สถานะผลิต</th>
                <th className="px-4 py-3 text-center">สาร (BOM)</th>
                <th className="px-4 py-3 text-center">บรรจุภัณฑ์</th>
                <th className="px-4 py-3 text-center">ฉลาก</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>`;

const replacementHeaders = `            <thead>
              <tr className="bg-slate-50 text-slate-450 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">ชื่อลูกค้า / แบรนด์</th>
                <th className="px-4 py-3">สถานะผลิต</th>
                <th className="px-4 py-3 text-center">สาร (BOM)</th>
                <th className="px-4 py-3 text-center">บรรจุภัณฑ์</th>
                <th className="px-4 py-3 text-center">ฉลาก</th>
                <th className="px-4 py-3 text-center">วันที่เปลี่ยนสถานะ</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>`;

if (code.includes(targetHeaders)) {
  code = code.replace(targetHeaders, replacementHeaders);
  console.log("Headers updated successfully!");
} else {
  console.log("Headers NOT found!");
}

// 2. Replace colSpan="6" to colSpan="7"
code = code.replace('colSpan="6" className="px-4 py-8', 'colSpan="7" className="px-4 py-8');

// 3. Replace Table Row Content (removing date from under status badge, adding it after Label)
const targetRow = `                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {renderStatusBadge(cust)}
                          {cust.updatedAt && (
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5 whitespace-nowrap">
                              อัปเดตเมื่อ: {new Date(cust.updatedAt).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* BOM Chemical confirmation indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isBomConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัตถุดิบครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัตถุดิบไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Packaging readiness indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isPackagingReady ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัสดุครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัสดุไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Label readiness indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isLabelReady ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัสดุครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัสดุไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>`;

const replacementRow = `                      <td className="px-4 py-3">
                        {renderStatusBadge(cust)}
                      </td>
                      
                      {/* BOM Chemical confirmation indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isBomConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัตถุดิบครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัตถุดิบไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Packaging readiness indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isPackagingReady ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัสดุครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัสดุไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Label readiness indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isLabelReady ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              วัสดุครบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              วัสดุไม่ครบ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Change Date column */}
                      <td className="px-4 py-3 text-center">
                        {cust.updatedAt ? (
                          <span className="text-[11px] text-slate-500 font-bold font-mono">
                            {new Date(cust.updatedAt).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>`;

if (code.includes(targetRow)) {
  code = code.replace(targetRow, replacementRow);
  console.log("Table row cell replacement succeeded!");
} else {
  console.log("Table row cell replacement NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched column relocation in ProductionView.js!");
