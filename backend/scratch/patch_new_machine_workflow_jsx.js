import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Find the boundaries of the Visualizations section
const startMarker = '{/* 2. Visualizations: Pure HTML/CSS Bar Chart & Stock Insights */}';
const endMarker = '{/* 3. Filters and Search Row */}'; // wait, in the previous step we deleted Card 3, so now Card 4 is next!
// Let's verify the text of Card 4 header
const card4Marker = '{/* 4. Table Section */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(card4Marker);

if (startIdx !== -1 && endIdx !== -1) {
  const oldText = code.substring(startIdx, endIdx);
  const newText = `{/* 2. Visualizations: Active Production Machines with Lineup Queue */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Full-width Active Production Machines List */}
        <Card className="col-span-12 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 min-h-[460px] max-h-[560px] overflow-hidden">
          <div className="flex justify-between items-center w-full shrink-0">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                <Cpu className="h-4.5 w-4.5 text-blue-600" />
                เครื่องจักรในกระบวนการผลิต (Production Line Equipment & Queue Lineup)
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold">บริหารคิวปฏิบัติงานแยกรายเครื่องจักร จัดลำดับความสำคัญคิว และควบคุมความปลอดภัยสูตรผสม</p>
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

          {/* Machine Grid List (2 Columns Side-by-Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 min-h-0">
            {machines.length === 0 ? (
              <div className="col-span-2 text-center py-20 text-[10px] text-slate-400 font-semibold italic">
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
                              className="h-9 w-9 rounded-xl object-cover shrink-0 border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity" 
                              alt="Machine" 
                              title="คลิกเพื่อซูมดูภาพใหญ่"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center shrink-0">
                              <Cpu className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-black text-slate-800 block leading-tight">{mach.name}</span>
                            <span className="text-[8px] text-slate-400 font-bold tracking-wider font-mono">ID: {mach.id}</span>
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
                    <div className="w-full md:w-[55%] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative">
                      
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

                            return (
                              <div key={orderId} className="flex justify-between items-center p-1.5 bg-white border border-slate-150 rounded-lg shadow-3xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] bg-slate-100 text-slate-655 font-extrabold font-mono h-4 w-4 rounded-full flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-extrabold text-slate-700 truncate text-[9.5px]" title={cust.name}>
                                    {cust.name} <span className="text-slate-400 font-semibold">({fName})</span>
                                  </span>
                                </div>
                                
                                {/* Up/Down/Delete Controls */}
                                <div className="flex items-center gap-0.5 shrink-0 pl-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveQueueItem(mach.id, idx, -1)}
                                    className={\`p-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer \${idx === 0 ? "opacity-30 cursor-not-allowed" : "text-slate-600"}\`}
                                    title="เลื่อนขึ้น"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === lineupIds.length - 1}
                                    onClick={() => moveQueueItem(mach.id, idx, 1)}
                                    className={\`p-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer \${idx === lineupIds.length - 1 ? "opacity-30 cursor-not-allowed" : "text-slate-600"}\`}
                                    title="เลื่อนลง"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFromMachineQueue(mach.id, orderId)}
                                    className="p-0.5 rounded text-red-500 hover:bg-red-50 hover:text-red-655 transition-all cursor-pointer ml-0.5"
                                    title="ลบออกจากเครื่องนี้"
                                  >
                                    <X className="h-3 w-3" />
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
      </div>

      `;
  code = code.substring(0, startIdx) + newText + code.substring(endIdx);
  console.log("Successfully replaced visual grid layout with 1-column machines scheduler layout!");
} else {
  console.log("Failed to find visualizations section boundaries!");
}

// Clean up backslashes
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully completed ProductionView.js new workflow adjustments!");
