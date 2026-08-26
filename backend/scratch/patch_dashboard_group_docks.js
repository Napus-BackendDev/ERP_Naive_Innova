import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Find boundaries of the Visualizations section
const startMarker = '{/* 2. Visualizations: Left Side holding areas & Right Side machines list */}';
const endMarker = '{/* Right Side: Active Production Machines list (span 8) */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newLeftDockJSX = `{/* 2. Visualizations: Left Side holding areas & Right Side machines list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Symmetrical Staging & Delivery Center Card (span 4) */}
        <Card className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col justify-between h-[460px] overflow-hidden">
          
          {/* Parent Control Header */}
          <div className="shrink-0 pb-2.5 border-b border-slate-100 mb-2.5">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-0.5">
              <Layers className="h-4.5 w-4.5 text-indigo-600" />
              ศูนย์บริหารจัดการคิวและสถานะงาน (Production Dispatch Center)
            </h4>
            <p className="text-[9px] text-slate-400 font-semibold leading-normal">สถานีคัดกรองจัดเตรียมการผลิต ป้องกันการจัดส่งสับสน และสรุปรายงานผลลัพธ์</p>
          </div>

          {/* Sub-Box 1: ช่องลูกค้ายังไม่ได้คิว */}
          <div className="bg-blue-50/20 border border-blue-150 p-3 rounded-xl flex flex-col justify-between h-[175px] shadow-3xs select-none overflow-hidden">
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <div className="flex justify-between items-center pb-1.5 border-b border-blue-100 shrink-0">
                <span className="text-[10px] font-black text-blue-800 flex items-center gap-1.5">
                  📥 คิวรอจัดสรรเครื่องผลิต (Pending Queue)
                </span>
                <span className="bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {queueItems.filter(c => !orderMachines[c._id]).length} ใบสั่ง
                </span>
              </div>
              
              {/* Unassigned List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {queueItems.filter(c => !orderMachines[c._id]).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-4">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 mb-0.5" />
                    <span className="text-[9px] text-emerald-700 font-extrabold">✓ จัดคิวลงเครื่องครบแล้ว</span>
                  </div>
                ) : (
                  queueItems.filter(c => !orderMachines[c._id]).map((cust, idx) => {
                    const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                    const fName = p ? (p.formulaName || p.name) : "สารผสม";
                    const isDragging = draggedLineupItem && draggedLineupItem.machineId === "unassigned" && draggedLineupItem.index === idx;

                    return (
                      <div
                        key={cust._id}
                        draggable="true"
                        onDragStart={(e) => handleLineupDragStart(e, "unassigned", idx)}
                        onDragEnd={handleLineupDragEnd}
                        className={\`flex justify-between items-center p-1.5 bg-white border rounded-lg shadow-3xs cursor-grab active:cursor-grabbing transition-all \${
                          isDragging ? "border-blue-500 bg-blue-50/20 opacity-55 scale-95" : "border-slate-200 hover:bg-blue-50/10"
                        }\`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="h-3 w-3 text-slate-400 shrink-0 cursor-grab" />
                          <span className="font-extrabold text-slate-750 truncate text-[9.5px]">
                            {cust.name} <span className="text-blue-600 font-bold">({fName})</span>
                          </span>
                        </div>
                        <span className="text-[7.5px] bg-amber-50 text-amber-700 border border-amber-150 px-1 rounded font-mono font-bold shrink-0">
                          รอจัดสรร
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sub-Box 2: ช่องสำเร็จการผลิต */}
          <div className="bg-emerald-50/20 border border-emerald-150 p-3 rounded-xl flex flex-col justify-between h-[175px] shadow-3xs select-none overflow-hidden mt-2.5">
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <div className="flex justify-between items-center pb-1.5 border-b border-emerald-100 shrink-0">
                <span className="text-[10px] font-black text-emerald-800 flex items-center gap-1.5">
                  📤 คลังผลิตเสร็จสิ้น (Finished Goods Dock)
                </span>
                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length} ใบสั่ง
                </span>
              </div>
              
              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="text-[9px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่เสร็จสิ้น</span>
                  </div>
                ) : (
                  orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").map((cust) => {
                    const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                    const fName = p ? (p.formulaName || p.name) : "สารผสม";

                    return (
                      <div
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </Card>

        `;
  
  code = code.substring(0, startIdx) + newLeftDockJSX + code.substring(endIdx);
  console.log("Successfully grouped docks inside a single parent card!");
} else {
  console.log("Failed to locate visualization boundaries!");
}

fs.writeFileSync(path, code, 'utf8');
