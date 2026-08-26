import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Insert calculation variables inside machines.map loop body
const targetMapStart = `              machines.map((mach) => {
                const lineupIds = machineQueues[mach.id] || [];

                return (`;

const replacementMapStart = `              machines.map((mach) => {
                const lineupIds = machineQueues[mach.id] || [];

                const isDraggingAny = !!draggedLineupItem;
                let isTargetForbidden = false;
                if (isDraggingAny) {
                  let draggedCust = null;
                  if (draggedLineupItem.machineId === "unassigned") {
                    const unassignedOrders = queueItems.filter(c => c.productionStatus === "เลือกเครื่องจักร" && !orderMachines[c._id]);
                    draggedCust = unassignedOrders[draggedLineupItem.index];
                  } else {
                    const sourceQueue = machineQueues[draggedLineupItem.machineId] || [];
                    const orderId = sourceQueue[draggedLineupItem.index];
                    draggedCust = queueItems.find(c => c._id === orderId);
                  }

                  if (draggedCust) {
                    const p = Array.isArray(draggedCust.orderedProducts) ? draggedCust.orderedProducts[0] : draggedCust.orderedProducts;
                    const fName = p ? (p.formulaName || p.name) : "สารผสม";
                    if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
                      if (!mach.allowedFormulas.includes(fName)) isTargetForbidden = true;
                    }
                    if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
                      isTargetForbidden = true;
                    }
                  }
                }

                const isCurrentlyHovered = hoveredMachineId === mach.id;

                return (`;

code = code.replace(targetMapStart, replacementMapStart);

// 2. Replace the lineup box div container with dynamic classes and events
const targetLineupDiv = `                    {/* RIGHT COLUMN: Queue Lineup Box (Width 55%, Uniform Color Box) */}
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleLineupDropEmpty(e, mach.id)}
                      className="w-full md:w-[55%] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative"
                    >`;

const replacementLineupDiv = `                    {/* RIGHT COLUMN: Queue Lineup Box (Width 55%, Uniform Color Box) */}
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isDraggingAny && !isTargetForbidden && hoveredMachineId !== mach.id) {
                          setHoveredMachineId(mach.id);
                        }
                      }}
                      onDragLeave={() => {
                        setHoveredMachineId(null);
                      }}
                      onDrop={(e) => {
                        handleLineupDropEmpty(e, mach.id);
                        setHoveredMachineId(null);
                      }}
                      className={\`w-full md:w-[55%] rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative transition-all duration-200 border-2 \${
                        isDraggingAny
                          ? isTargetForbidden
                            ? "bg-rose-50/15 border-dashed border-rose-300 opacity-60 cursor-no-drop"
                            : isCurrentlyHovered
                              ? "bg-emerald-50/30 border-dashed border-emerald-500 shadow-md ring-2 ring-emerald-350 scale-[1.01] animate-pulse"
                              : "bg-blue-50/10 border-dashed border-blue-400 shadow-3xs"
                          : "bg-slate-100 border-slate-200"
                      }\`}
                    >`;

code = code.replace(targetLineupDiv, replacementLineupDiv);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully implemented drop shadow highlight overlays!");
