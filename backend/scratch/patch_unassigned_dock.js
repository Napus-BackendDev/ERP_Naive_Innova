import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update handleLineupDragOver to support dragging from unassigned
const targetDragOver = `  const handleLineupDragOver = (e, machineId, index) => {
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
  };`;

const replacementDragOver = `  const handleLineupDragOver = (e, machineId, index) => {
    e.preventDefault();
    if (!draggedLineupItem) return;
    
    // Case 1: Dragging from unassigned box into a machine queue
    if (draggedLineupItem.machineId === "unassigned" && machineId !== "unassigned") {
      const unassignedOrders = queueItems.filter(c => !orderMachines[c._id]);
      const orderId = unassignedOrders[draggedLineupItem.index]?._id;
      if (!orderId) return;

      // Check formula constraints
      const cust = unassignedOrders[draggedLineupItem.index];
      const p = Array.isArray(cust.orderedProducts) ? cust.orderedProducts[0] : cust.orderedProducts;
      const fName = p ? (p.formulaName || p.name) : "สารผสม";
      const mach = machines.find(m => m.id === machineId);
      if (mach) {
        let isForbidden = false;
        if (mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length) {
          if (!mach.allowedFormulas.includes(fName)) isForbidden = true;
        }
        if (mach.disallowedFormulas && mach.disallowedFormulas.includes(fName)) {
          isForbidden = true;
        }
        if (isForbidden) return; // Block dragging onto this machine if not allowed
      }

      // Assign in orderMachines
      const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
      setOrderMachines(updatedOrderMachines);
      localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

      // Insert at hover position
      const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
      if (!queue.includes(orderId)) {
        queue.splice(index, 0, orderId);
      }
      
      const updatedQueues = { ...machineQueues, [machineId]: queue };
      saveMachineQueues(updatedQueues);
      setDraggedLineupItem({ machineId, index });
      return;
    }

    // Case 2: Standard reordering within same machine
    if (draggedLineupItem.machineId === machineId && draggedLineupItem.index !== index) {
      const queue = [...(machineQueues[machineId] || [])];
      const dragIdx = draggedLineupItem.index;
      const hoverIdx = index;
      
      const draggedId = queue[dragIdx];
      queue.splice(dragIdx, 1);
      queue.splice(hoverIdx, 0, draggedId);
      
      const updated = { ...machineQueues, [machineId]: queue };
      setMachineQueues(updated);
      setDraggedLineupItem({ machineId, index: hoverIdx });
    }
  };`;

code = code.replace(targetDragOver, replacementDragOver);

// 2. Insert "ช่องลูกค้า" as the first item in the machines grid list
const targetGridStart = `          {/* Machine Grid List (2 Columns Side-by-Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 min-h-0">
            {machines.length === 0 ? (
              <div className="col-span-2 text-center py-20 text-[10px] text-slate-400 font-semibold italic">
                ยังไม่มีข้อมูลเครื่องจักรในคลังระบบ
              </div>
            ) : (`;

const replacementGridStart = `          {/* Machine Grid List (2 Columns Side-by-Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 min-h-0">
            
            {/* Slot 1: ช่องลูกค้า (Unassigned Queue Dock) */}
            <div className="bg-blue-50/20 border-2 border-dashed border-blue-200 p-4 rounded-2xl flex flex-col justify-between min-h-[220px] shadow-3xs select-none">
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
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[140px] pr-0.5">
                  {queueItems.filter(c => !orderMachines[c._id]).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
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
                            <span className="font-extrabold text-slate-750 truncate text-[10px]">
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

            {machines.length === 0 ? (
              <div className="col-span-1 text-center py-20 text-[10px] text-slate-400 font-semibold italic">
                ยังไม่มีข้อมูลเครื่องจักรในคลังระบบ
              </div>
            ) : (`;

code = code.replace(targetGridStart, replacementGridStart);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully implemented Unassigned Customer Slot and drag/drop linking!");
