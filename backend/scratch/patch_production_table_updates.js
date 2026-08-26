import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Patch customersWithPrecomputes mapping block
const targetMapping = `      const isBomConfirmed = cust.productionStatus !== "ยังไม่ผลิต" || (cust.productionStep && cust.productionStep > 1);
      const isPackReady = checkPackagingReady(cust, packagingItems) && checkLabelReady(cust, packagingItems);
      
      let computedStatus = "ยังไม่พร้อม";
      const step = cust.productionStep || 1;
      
      if (cust.productionStatus === "สำเร็จเสร็จสิ้น") {
        computedStatus = "สำเร็จเสร็จสิ้น";
      } else if (step === 1) {
        computedStatus = (isBomConfirmed && isPackReady) ? "รอยืนยัน" : "ยังไม่พร้อม";
      } else {
        computedStatus = cust.productionStatus;
      }

      return {
        ...cust,
        isBomConfirmed,
        isPackReady,
        computedStatus
      };`;

const replacementMapping = `      const isBomConfirmed = cust.productionStatus !== "ยังไม่ผลิต" || (cust.productionStep && cust.productionStep > 1);
      const isPackagingReady = checkPackagingReady(cust, packagingItems);
      const isLabelReady = checkLabelReady(cust, packagingItems);
      const isPackReady = isPackagingReady && isLabelReady;
      
      let computedStatus = "ยังไม่พร้อม";
      const step = cust.productionStep || 1;
      
      if (cust.productionStatus === "สำเร็จเสร็จสิ้น") {
        computedStatus = "สำเร็จเสร็จสิ้น";
      } else if (step === 1) {
        computedStatus = (isBomConfirmed && isPackReady) ? "รอยืนยัน" : "ยังไม่พร้อม";
      } else {
        computedStatus = cust.productionStatus;
      }

      return {
        ...cust,
        isBomConfirmed,
        isPackagingReady,
        isLabelReady,
        isPackReady,
        computedStatus
      };`;

if (code.includes(targetMapping)) {
  code = code.replace(targetMapping, replacementMapping);
  console.log("Precomputed mapping target found and replaced!");
} else {
  console.log("Precomputed mapping target NOT found!");
}

// 2. Patch Table Headers
const targetHeaders = `            <thead>
              <tr className="bg-slate-50 text-slate-450 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">ชื่อลูกค้า / แบรนด์</th>
                <th className="px-4 py-3">สถานะผลิต</th>
                <th className="px-4 py-3 text-center">สารเคมี (BOM)</th>
                <th className="px-4 py-3 text-center">บรรจุภัณฑ์ & ฉลาก</th>
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
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>`;

if (code.includes(targetHeaders)) {
  code = code.replace(targetHeaders, replacementHeaders);
  console.log("Table headers target found and replaced!");
} else {
  console.log("Table headers target NOT found!");
}

// 3. Patch colSpan="5" to colSpan="6"
code = code.replace('colSpan="5" className="px-4 py-8', 'colSpan="6" className="px-4 py-8');

// 4. Patch Table Body cells (with Status Date and split columns)
const targetBody = `                      <td className="px-4 py-3">
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

                      {/* Packaging and label readiness indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {cust.isPackReady ? (
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

const replacementBody = `                      <td className="px-4 py-3">
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

if (code.includes(targetBody)) {
  code = code.replace(targetBody, replacementBody);
  console.log("Table body target found and replaced!");
} else {
  console.log("Table body target NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated ProductionView.js table structure!");
