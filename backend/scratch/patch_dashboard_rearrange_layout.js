import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Find boundaries of the Visualizations section
const startMarker = '{/* 2. Visualizations: Active Production Machines with Lineup Queue */}';
const endMarker = '{/* 4. Table Section */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newVisualizationsJSX = `{/* 2. Visualizations: Left Side holding areas & Right Side machines list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Unassigned holding dock & Completed dock (span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[460px] justify-between">
          
          {/* Card 1: ช่องลูกค้า (Unassigned Queue Dock) */}
          <div className="bg-blue-50/20 border-2 border-dashed border-blue-200 p-4 rounded-2xl flex flex-col justify-between h-[220px] shadow-3xs select-none">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100 shrink-0">
                <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                  👥 ช่องลูกค้า (ยังไม่มีคิวเครื่องจักร)
                </span>
                <span className="bg-blue-100 text-blue-700 text-[8.5px] px-2 py-0.5 rounded-md font-mono font-extrabold">
                  {queueItems.filter(c => !orderMachines[c._id]).length} ใบสั่งผลิต
                </span>
              </div>
              <p className="text-[8.5px] text-blue-500 font-bold mt-1.5 mb-2.5">ลากรายชื่อไปวางในคิวเครื่องจักรขวา เพื่อเริ่มผลิตและป้องกัน User Error</p>
              
              {/* Unassigned List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[120px] pr-0.5">
                {queueItems.filter(c => !orderMachines[c._id]).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
                    <span className="text-[9.5px] text-emerald-700 font-extrabold">✓ จัดคิวครบถ้วนแล้ว</span>
                    <span className="text-[8.5px] text-slate-400 font-semibold">ไม่มีใบสั่งผลิตตกหล่น</span>
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
                        className={\`flex justify-between items-center p-2 bg-white border rounded-xl shadow-3xs cursor-grab active:cursor-grabbing transition-all \${
                          isDragging ? "border-blue-500 bg-blue-50/20 opacity-55 scale-95" : "border-slate-200 hover:bg-blue-50/10"
                        }\`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                          <span className="font-extrabold text-slate-755 truncate text-[10px]">
                            {cust.name} <span className="text-blue-600 font-bold">({fName})</span>
                          </span>
                        </div>
                        <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-150 px-1 rounded font-mono font-bold shrink-0 animate-pulse">
                          รอคิวเครื่อง
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Card 2: ช่องลูกค้าสำเร็จจากการผลิต (Completed Queue Dock) */}
          <div className="bg-emerald-50/20 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex flex-col justify-between h-[220px] shadow-3xs select-none">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100 shrink-0">
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  🎉 ช่องสำเร็จผลิต (Completed)
                </span>
                <span className="bg-emerald-100 text-emerald-700 text-[8.5px] px-2 py-0.5 rounded-md font-mono font-extrabold">
                  {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length} ใบสั่งผลิต
                </span>
              </div>
              <p className="text-[8.5px] text-emerald-500 font-bold mt-1.5 mb-2.5">ใบสั่งผลิตที่ผลิต บรรจุ และผ่านขั้นตอน QA ตรวจสอบคุณภาพเรียบร้อย</p>
              
              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[120px] pr-0.5">
                {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <span className="text-[9.5px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่สำเร็จในรอบนี้</span>
                  </div>
                ) : (
                  orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").map((cust) => {
                    const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                    const fName = p ? (p.formulaName || p.name) : "สารผสม";

                    return (
                      <div
                        key={cust._id}
                        className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-xl shadow-3xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-extrabold text-slate-755 truncate text-[10px]">
                            {cust.name} <span className="text-slate-450 font-bold">({fName})</span>
                          </span>
                        </div>
                        <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                          เสร็จสิ้น
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Active Production Machines list (span 8) */}
        <Card className="lg:col-span-8 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[460px] overflow-hidden">
          <div className="flex justify-between items-center w-full shrink-0">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                <Cpu className="h-4.5 w-4.5 text-blue-600" />
                เครื่องจักรในกระบวนการผลิต (Production Line Equipment & Lineup)
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold">จัดคิว แซงคิว ย้ายคิว และผลิตได้อย่างแม่นยำ ป้องกัน User Error</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsMachineModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>เพิ่มเครื่องจักร</span>
            </Button>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 min-h-0">
            {machines.length === 0 ? (
              <div className="text-center py-20 text-[10px] text-slate-400 font-semibold italic">
                ยังไม่มีข้อมูลเครื่องจักรในคลังระบบ
              </div>
            ) : (
              machines.map((mach) => {
                const lineupIds = machineQueues[mach.id] || [];

                return (
                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4 relative hover:bg-slate-100/30 transition-all min-h-[220px]">
                    
                    {/* LEFT COLUMN: Machine Details (Width 45%) */}
                    <div className="w-full md:w-[45%] flex flex-col justify-between gap-3">
                      <div>
                        {/* Title & Image Avatar */}
                        <div className="flex items-center gap-2.5">
                          {mach.image ? (
                            <img 
                              src={mach.image} 
                              onClick={() => setZoomedImage(mach.image)}
                              className="h-14 w-14 rounded-2xl object-cover shrink-0 border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity shadow-sm" 
                              alt="Machine" 
                              title="คลิกเพื่อซูมดูภาพใหญ่"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-150 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                              <Cpu className="h-7 w-7 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-black text-slate-800 block leading-tight">{mach.name}</span>
                          </div>
                        </div>

                        {/* Rules/Constraints */}
                        <div className="space-y-1.5 text-[9.5px] mt-3">
                          <div className="flex items-start gap-1">
                            <span className="text-slate-450 font-extrabold shrink-0">สูตรที่อนุญาต:</span>
                            <div className="flex flex-wrap gap-1">
                              {mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length ? (
                                mach.allowedFormulas.map(f => (
                                  <span key={f} className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">✓ ทั้งหมด</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-1">
                            <span className="text-slate-450 font-extrabold shrink-0">สูตรที่ห้าม:</span>
                            <div className="flex flex-wrap gap-1">
                              {mach.disallowedFormulas && mach.disallowedFormulas.length > 0 ? (
                                mach.disallowedFormulas.length === formulas.length ? (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px] font-black animate-pulse">
                                    ⛔ ห้ามทั้งหมด
                                  </span>
                                ) : (
                                  mach.disallowedFormulas.map(f => (
                                    <span key={f} className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                      {f}
                                    </span>
                                  ))
                                )
                              ) : (
                                <span className="text-slate-400">- ไม่มี</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delete Machine Button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMachine(mach.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-lg text-[9px] font-black transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash className="h-3 w-3" />
                          <span>ลบเครื่องจักร</span>
                        </button>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Queue Lineup Box (Width 55%, Uniform Color Box) */}
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleLineupDropEmpty(e, mach.id)}
                      className="w-full md:w-[55%] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative"
                    >
                      
                      {/* Box Header */}
                      <div className="flex justify-between items-center w-full pb-1.5 border-b border-slate-200 shrink-0">
                        <span className="text-[10px] font-extrabold text-slate-700 flex items-center gap-1">
                          📋 คิวปฏิบัติงานเครื่องนี้
                          <span className="bg-slate-200 text-slate-600 text-[8.5px] px-1.5 py-0.2 rounded-md font-mono">
                            {lineupIds.length} คิว
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddingToMachine(addingToMachine === mach.id ? null : mach.id)}
                          className="p-1 hover:bg-slate-200/60 text-blue-600 hover:text-blue-700 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[9px] font-extrabold"
                          title="เพิ่มล็อตงานลงเครื่องนี้"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>
                      </div>

                      {/* INLINE ADD DROPDOWN POPUP */}
                      {addingToMachine === mach.id && (
                        <div className="absolute top-[35px] left-2 right-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-extrabold text-slate-500">เลือกใบสั่งผลิตที่ต้องการจัดลงคิว:</span>
                            <button 
                              onClick={() => setAddingToMachine(null)}
                              className="text-slate-400 hover:text-slate-600 text-[9px] font-bold"
                            >
                              ปิด
                            </button>
                          </div>
                          <div className="max-h-[120px] overflow-y-auto space-y-1 pr-0.5">
                            {queueItems.length === 0 ? (
                              <p className="text-[8.5px] text-slate-400 font-semibold italic text-center py-4">ไม่มีสินค้ากำลังผลิต</p>
                            ) : (
                              queueItems.map(cust => {
                                const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                                const fName = p ? (p.formulaName || p.name) : "สารผสม";
                                
                                // Constraint check
                                let isForbidden = false;
                                if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
                                  if (!mach.allowedFormulas.includes(fName)) isForbidden = true;
                                }
                                if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
                                  isForbidden = true;
                                }

                                const isAlreadyInThisMachine = lineupIds.includes(cust._id);

                                return (
                                  <button
                                    key={cust._id}
                                    type="button"
                                    onClick={() => {
                                      if (isForbidden) {
                                        alert(\`⚠️ สูตร \${fName} ไม่อนุญาตให้ผลิตบนเครื่องนี้!\`);
                                      } else {
                                        addToMachineQueue(mach.id, cust._id);
                                      }
                                    }}
                                    className={\`w-full text-left p-1.5 rounded-lg text-[9px] font-extrabold flex justify-between items-center transition-all border \${
                                      isAlreadyInThisMachine
                                        ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                                        : isForbidden
                                        ? "bg-rose-50/50 text-rose-700 hover:bg-rose-50 border-rose-100"
                                        : "bg-white text-slate-700 hover:bg-slate-50 border-slate-150 cursor-pointer"
                                    }\`}
                                    disabled={isAlreadyInThisMachine}
                                  >
                                    <span className="truncate max-w-[130px]">
                                      {isForbidden ? "🔴" : "🟢"} {cust.name} ({fName})
                                    </span>
                                    <span className="text-[8px] font-mono shrink-0">
                                      {isAlreadyInThisMachine ? "(คิวอยู่แล้ว)" : isForbidden ? "(สูตรห้ามผลิต!)" : "เลือก"}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* Box Lineup Body */}
                      <div className="flex-1 overflow-y-auto py-2 pr-0.5 space-y-1.5 max-h-[140px] mt-1">
                        {lineupIds.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center py-6 text-[9.5px] text-slate-400 font-semibold italic">
                            ไม่มีคิวผลิตค้างอยู่ในเครื่อง
                          </div>
                        ) : (
                          lineupIds.map((orderId, idx) => {
                            const cust = queueItems.find(c => c._id === orderId);
                            if (!cust) return null;
                            
                            const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                            const fName = p ? (p.formulaName || p.name) : "สารผสม";
                            const isDragging = draggedLineupItem && draggedLineupItem.machineId === mach.id && draggedLineupItem.index === idx;

                            return (
                              <div 
                                key={orderId} 
                                draggable="true"
                                onDragStart={(e) => handleLineupDragStart(e, mach.id, idx)}
                                onDragOver={(e) => handleLineupDragOver(e, mach.id, idx)}
                                onDragEnd={handleLineupDragEnd}
                                className={\`flex justify-between items-center p-2 bg-white border rounded-xl shadow-3xs cursor-grab active:cursor-grabbing transition-all select-none \${
                                  isDragging ? "border-blue-500 bg-blue-50/20 opacity-55 scale-95" : "border-slate-200 hover:bg-slate-50/40"
                                }\`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                                  <span className="text-[9px] bg-slate-100 text-slate-700 font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center font-mono shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-extrabold text-slate-750 truncate text-[10px]" title={cust.name}>
                                    {cust.name} <span className="text-slate-400 font-bold">({fName})</span>
                                  </span>
                                </div>
                                
                                <div className="flex items-center shrink-0 pl-1">
                                  <button
                                    type="button"
                                    onClick={() => removeFromMachineQueue(mach.id, orderId)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                    title="ลบออกจากเครื่องนี้"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>

                  </div>
                );
              })
            )}
          </div>
        </Card>

      </div>`;

  code = code.substring(0, startIdx) + newVisualizationsJSX + code.substring(endIdx);
  console.log("Successfully rearranged visualizer grid layouts!");
} else {
  console.log("Failed to locate boundaries!");
}

fs.writeFileSync(path, code, 'utf8');
