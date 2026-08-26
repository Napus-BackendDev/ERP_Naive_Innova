import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update handleLineupDragOver to support cross-machine drag and drop
const targetDragOver = `  const handleLineupDragOver = (e, machineId, index) => {
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

const replacementDragOverAndDrop = `  const handleLineupDragOver = (e, machineId, index) => {
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
        if (isForbidden) return;
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

    // Case 2: Cross-machine drag and drop (dragging from Machine A to Machine B)
    if (draggedLineupItem.machineId !== machineId && draggedLineupItem.machineId !== "unassigned") {
      const sourceQueue = machineQueues[draggedLineupItem.machineId] || [];
      const orderId = sourceQueue[draggedLineupItem.index];
      if (!orderId) return;

      // Check formula constraints
      const cust = queueItems.find(c => c._id === orderId);
      if (!cust) return;
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
        if (isForbidden) return; // Block drop if formula is not allowed
      }

      // Remove from source queue
      const updatedSourceQueue = sourceQueue.filter(id => id !== orderId);

      // Add to target queue at index
      const targetQueue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
      if (!targetQueue.includes(orderId)) {
        targetQueue.splice(index, 0, orderId);
      }

      // Update orderMachines
      const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
      setOrderMachines(updatedOrderMachines);
      localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

      const updatedQueues = { 
        ...machineQueues, 
        [draggedLineupItem.machineId]: updatedSourceQueue, 
        [machineId]: targetQueue 
      };
      saveMachineQueues(updatedQueues);
      setDraggedLineupItem({ machineId, index });
      return;
    }

    // Case 3: Standard reordering within same machine
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
  };

  const handleLineupDropEmpty = (e, machineId) => {
    e.preventDefault();
    if (!draggedLineupItem) return;
    
    const sourceMachineId = draggedLineupItem.machineId;
    const sourceIdx = draggedLineupItem.index;
    
    let orderId = null;
    if (sourceMachineId === "unassigned") {
      const unassignedOrders = queueItems.filter(c => !orderMachines[c._id]);
      orderId = unassignedOrders[sourceIdx]?._id;
    } else {
      const sourceQueue = machineQueues[sourceMachineId] || [];
      orderId = sourceQueue[sourceIdx];
    }
    
    if (!orderId) return;

    // Check formula constraints
    const cust = queueItems.find(c => c._id === orderId);
    if (!cust) return;
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
      if (isForbidden) {
        alert(\`⚠️ สูตร \${fName} ไม่อนุญาตให้ผลิตบนเครื่องนี้!\`);
        return;
      }
    }

    // Update orderMachines
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    // Update queues
    const updatedQueues = { ...machineQueues };
    
    // Remove from source queue
    if (sourceMachineId !== "unassigned") {
      updatedQueues[sourceMachineId] = (updatedQueues[sourceMachineId] || []).filter(id => id !== orderId);
    }
    
    // Add to target queue (append to the end of the lineup)
    const targetQueue = updatedQueues[machineId] ? [...updatedQueues[machineId]] : [];
    if (!targetQueue.includes(orderId)) {
      targetQueue.push(orderId);
    }
    updatedQueues[machineId] = targetQueue;
    
    saveMachineQueues(updatedQueues);
    setDraggedLineupItem(null);
  };`;

code = code.replace(targetDragOver, replacementDragOverAndDrop);

// 2. Add drop handlers to the queue lineup container box in each machine card
const targetLineupBox = `                    {/* RIGHT COLUMN: Queue Lineup Box (Width 55%, Uniform Color Box) */}
                    <div className="w-full md:w-[55%] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative">`;

const replacementLineupBox = `                    {/* RIGHT COLUMN: Queue Lineup Box (Width 55%, Uniform Color Box) */}
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleLineupDropEmpty(e, mach.id)}
                      className="w-full md:w-[55%] bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[160px] relative"
                    >`;

code = code.replace(targetLineupBox, replacementLineupBox);

// Clean up escaped backslashes
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched cross-machine drag and drop functionality!");
