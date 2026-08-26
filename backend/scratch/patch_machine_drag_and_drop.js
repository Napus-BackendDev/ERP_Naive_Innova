import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Insert drag-and-drop state and functions
const targetLineupHelpers = `  const [addingToMachine, setAddingToMachine] = useState(null);`;
const replacementLineupHelpers = `  const [addingToMachine, setAddingToMachine] = useState(null);

  // Lineup Drag and Drop State
  const [draggedLineupItem, setDraggedLineupItem] = useState(null);

  const handleLineupDragStart = (e, machineId, index) => {
    setDraggedLineupItem({ machineId, index });
  };

  const handleLineupDragOver = (e, machineId, index) => {
    e.preventDefault();
    if (!draggedLineupItem || draggedLineupItem.machineId !== machineId || draggedLineupItem.index === index) return;
    
    const queue = [...(machineQueues[machineId] || [])];
    const dragIdx = draggedLineupItem.index;
    const hoverIdx = index;
    
    const draggedId = queue[dragIdx];
    queue.splice(dragIdx, 1);
    queue.splice(hoverIdx, 0, draggedId);
    
    const updated = { ...machineQueues, [machineId]: queue };
    setMachineQueues(updated);
    setDraggedLineupItem({ machineId, index: hoverIdx });
  };

  const handleLineupDragEnd = () => {
    if (draggedLineupItem) {
      localStorage.setItem("mes_production_machine_queues", JSON.stringify(machineQueues));
    }
    setDraggedLineupItem(null);
  };`;

code = code.replace(targetLineupHelpers, replacementLineupHelpers);

// 2. Remove the ID label from the machine avatar column
const targetIdLabel = `                          <div>
                            <span className="text-xs font-black text-slate-800 block leading-tight">{mach.name}</span>
                            <span className="text-[8px] text-slate-400 font-bold tracking-wider font-mono">ID: {mach.id}</span>
                          </div>`;

const replacementIdLabel = `                          <div>
                            <span className="text-xs font-black text-slate-800 block leading-tight">{mach.name}</span>
                          </div>`;

code = code.replace(targetIdLabel, replacementIdLabel);

// 3. Make the machine image bigger (from h-9 w-9 to h-14 w-14)
const targetImageTag = `                          {mach.image ? (
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
                          )}`;

const replacementImageTag = `                          {mach.image ? (
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
                          )}`;

code = code.replace(targetImageTag, replacementImageTag);

// 4. Update the lineup list items to use HTML5 Drag and Drop instead of up/down arrow buttons
const targetLineupItemMap = `                            return (
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
                            );`;

const replacementLineupItemMap = `                            const isDragging = draggedLineupItem && draggedLineupItem.machineId === mach.id && draggedLineupItem.index === idx;
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
                            );`;

code = code.replace(targetLineupItemMap, replacementLineupItemMap);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully completed Drag-and-drop and size updates!");
