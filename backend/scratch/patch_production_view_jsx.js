import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the Left Queue Card list item return block to include machine scheduler selector and warning
const targetListItem = `                return (
                  <div
                    key={cust._id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={\`flex flex-col gap-1.5 p-3 bg-slate-50 border rounded-xl hover:bg-slate-100/50 transition-all cursor-grab active:cursor-grabbing relative select-none \${
                      isDragging ? "border-blue-500 bg-blue-50/20 opacity-50 scale-95" : "border-slate-100"
                    }\`}
                  >
                    <div className="flex justify-between items-center w-full min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold h-5 w-5 rounded-full flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-black text-slate-750 truncate">{cust.name}</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                        สเต็ป {cust.productionStep}/6
                      </span>
                    </div>

                    <div className="text-[9.5px] text-slate-400 font-semibold truncate pl-5">
                      สูตร: {formulaNames}
                    </div>

                    <div className="pl-5 space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-500">สถานะ: {cust.productionStatus}</span>
                        <span className="text-slate-700 font-mono">{completedQty}/{qtyNeeded} ชิ้น ({percent}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: \`\${percent}%\` }} />
                      </div>
                    </div>
                  </div>
                );`;

const replacementListItem = `                // Calculate machine assignment queue position and checks
                const assignedMachineId = orderMachines[cust._id];
                const assignedMachine = machines.find(m => m.id === assignedMachineId);
                let localQueueNum = 0;
                if (assignedMachineId) {
                  let count = 0;
                  for (let i = 0; i <= idx; i++) {
                    if (orderMachines[queueItems[i]._id] === assignedMachineId) {
                      count++;
                    }
                  }
                  localQueueNum = count;
                }

                // Check formula validity
                let formulaWarning = "";
                let itemProd = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                let activeFormulaName = itemProd ? (itemProd.formulaName || itemProd.name) : "";
                if (assignedMachine && activeFormulaName) {
                  if (assignedMachine.allowedFormulas && assignedMachine.allowedFormulas.length > 0) {
                    if (!assignedMachine.allowedFormulas.includes(activeFormulaName)) {
                      formulaWarning = "สูตรนี้ไม่อยู่ในรายการที่เครื่องอนุญาต";
                    }
                  }
                  if (assignedMachine.disallowedFormulas && assignedMachine.disallowedFormulas.includes(activeFormulaName)) {
                    formulaWarning = "เครื่องนี้ห้ามผลิตสูตรนี้!";
                  }
                }

                return (
                  <div
                    key={cust._id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={\`flex flex-col gap-1.5 p-3 bg-slate-50 border rounded-xl hover:bg-slate-100/50 transition-all cursor-grab active:cursor-grabbing relative select-none \${
                      isDragging ? "border-blue-500 bg-blue-50/20 opacity-50 scale-95" : "border-slate-100"
                    }\`}
                  >
                    <div className="flex justify-between items-center w-full min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold h-5 w-5 rounded-full flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-black text-slate-750 truncate">{cust.name}</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                        สเต็ป {cust.productionStep}/6
                      </span>
                    </div>

                    <div className="text-[9.5px] text-slate-400 font-semibold truncate pl-5 flex justify-between items-center w-full">
                      <span>สูตร: {formulaNames}</span>
                      {assignedMachine && (
                        <span className="text-[8.5px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.2 rounded font-mono shrink-0">
                          คิวที่ {localQueueNum} ของเครื่อง
                        </span>
                      )}
                    </div>

                    <div className="pl-5 space-y-1">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-500">สถานะ: {cust.productionStatus}</span>
                        <span className="text-slate-700 font-mono">{completedQty}/{qtyNeeded} ชิ้น ({percent}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: \`\${percent}%\` }} />
                      </div>
                    </div>

                    {/* Machine Assignment Select Menu */}
                    <div className="pl-5 space-y-1 mt-1 pt-1.5 border-t border-slate-100">
                      <div className="flex justify-between items-center w-full text-[9px] font-extrabold text-slate-500">
                        <span>เครื่องผลิต:</span>
                        {assignedMachine ? (
                          <span className="text-blue-600 truncate max-w-[120px]" title={assignedMachine.name}>
                            ⚙️ {assignedMachine.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">ยังไม่จัดสรร</span>
                        )}
                      </div>
                      <select
                        value={orderMachines[cust._id] || ""}
                        onChange={(e) => handleAssignMachine(cust._id, e.target.value)}
                        className={\`w-full text-[9.5px] font-black rounded-lg border px-2 py-0.8 outline-none bg-white cursor-pointer transition-all \${
                          formulaWarning ? "border-red-300 text-red-700 bg-red-50/20" : "border-slate-200 text-slate-655 hover:border-slate-300"
                        }\`}
                      >
                        <option value="">-- ยังไม่ระบุเครื่อง --</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      
                      {/* Violation Warning Badge */}
                      {formulaWarning && (
                        <p className="text-[8.5px] font-extrabold text-red-600 bg-red-50 border border-red-150 px-1.5 py-0.5 rounded-md mt-1 animate-pulse leading-snug">
                          ⚠️ {formulaWarning}
                        </p>
                      )}
                    </div>

                  </div>
                );`;

code = code.replace(targetListItem, replacementListItem);
console.log("Successfully replaced left side queue card list item!");

// 2. Replace the Right Visualizations Card (Custom Bar Chart) with the active machines list
const targetChartBlock = `        {/* Right: Custom Premium Bar Chart */}
        <Card className="lg:col-span-8 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4.5 w-4.5 text-green-600" />
              แผนภูมิจำนวนงานแยกตามขั้นตอนการบรรจุ (Production Step Distribution)
            </h4>
            <p className="text-[9.5px] text-slate-400 font-semibold mb-4">แสดงปริมาณงานสะสมในแต่ละสเต็ปการผลิต</p>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-slate-100 pb-2 relative">
            {stepCounts.map((count, idx) => {
              const heightPercent = \`\${(count / chartMax) * 100}%\`;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 bg-slate-800 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {count} ใบสั่ง
                  </div>
                  {/* The Bar */}
                  <div 
                    className="w-full rounded-t-xl bg-gradient-to-t from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 transition-all duration-500 shadow-xs group-hover:shadow-md cursor-pointer"
                    style={{ height: count > 0 ? heightPercent : "4px" }}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels Row */}
          <div className="flex justify-between gap-3 pt-2 text-center">
            {stepsList.map((step, idx) => (
              <div key={idx} className="flex-1">
                <p className="text-[9px] font-extrabold text-slate-800 truncate" title={step.title}>{step.title.replace(/^\\d\\.\\s/, '')}</p>
                <span className="text-[9.5px] font-extrabold text-green-600 mt-0.5 block font-mono">{stepCounts[idx]} รายการ</span>
              </div>
            ))}
          </div>
        </Card>`;

const replacementMachinesBlock = `        {/* Right: Active Production Machines list */}
        <Card className="lg:col-span-8 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center w-full">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                <Cpu className="h-4.5 w-4.5 text-blue-600" />
                เครื่องจักรในกระบวนการผลิต (Production Line Equipment)
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold">จัดสรรคิวของลูกค้าและกำหนดสเปกข้อจำกัดการผลิตของแต่ละเครื่องจักร</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] pr-1 mt-2">
            {machines.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-[10px] text-slate-400 font-semibold italic">
                ยังไม่มีข้อมูลเครื่องจักรในคลังระบบ
              </div>
            ) : (
              machines.map((mach) => {
                const assignedItems = queueItems
                  .map((cust, idx) => ({ cust, idx }))
                  .filter(({ cust }) => orderMachines[cust._id] === mach.id);

                return (
                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col justify-between gap-3 relative hover:bg-slate-100/30 transition-all">
                    
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center">
                          <Cpu className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-black text-slate-800">{mach.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMachine(mach.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition-all cursor-pointer"
                        title="ลบเครื่องจักร"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[9.5px]">
                      <div className="flex items-start gap-1">
                        <span className="text-slate-450 font-extrabold shrink-0">สูตรที่อนุญาต:</span>
                        <div className="flex flex-wrap gap-1">
                          {mach.allowedFormulas && mach.allowedFormulas.length > 0 ? (
                            mach.allowedFormulas.map(f => (
                              <span key={f} className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold text-[9px]">✓ ทุกสูตร</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-1">
                        <span className="text-slate-450 font-extrabold shrink-0">สูตรที่ห้าม:</span>
                        <div className="flex flex-wrap gap-1">
                          {mach.disallowedFormulas && mach.disallowedFormulas.length > 0 ? (
                            mach.disallowedFormulas.map(f => (
                              <span key={f} className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">- ไม่มี</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-150 pt-2 text-[9.5px]">
                      <span className="text-slate-500 font-extrabold block mb-1">คิวปฏิบัติงานบนเครื่องนี้:</span>
                      {assignedItems.length === 0 ? (
                        <span className="text-slate-400 italic font-semibold">ไม่มีคิวผลิตค้างอยู่ในเครื่อง</span>
                      ) : (
                        <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto pr-1">
                          {assignedItems.map(({ cust, idx }, localIdx) => {
                            let p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
                            let fName = p ? (p.formulaName || p.name) : "สารผสม";
                            return (
                              <div key={cust._id} className="flex justify-between items-center p-1 bg-white border border-slate-100 rounded-md">
                                <span className="font-bold text-slate-700 truncate max-w-[130px]">
                                  {localIdx + 1}. {cust.name} ({fName})
                                </span>
                                <span className="text-[8.5px] bg-slate-100 font-extrabold text-slate-500 px-1 rounded font-mono">
                                  คิวรวมที่ #{idx + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </Card>`;

code = code.replace(targetChartBlock, replacementMachinesBlock);
console.log("Successfully replaced right side visualizations chart block!");

fs.writeFileSync(path, code, 'utf8');
