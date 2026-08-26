import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF
code = code.replace(/\r\n/g, '\n');

// 1. Declare handleDropToUnassigned below handleMarkAsCompleted
const targetCompletedHelper = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอบรรจุ",
        productionStep: 3
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

const replacementCompletedHelper = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอบรรจุ",
        productionStep: 3
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };

  const handleDropToUnassigned = async (e) => {
    e.preventDefault();
    if (!draggedLineupItem || draggedLineupItem.machineId === "unassigned") return;

    const sourceMachineId = draggedLineupItem.machineId;
    const sourceIdx = draggedLineupItem.index;
    const sourceQueue = machineQueues[sourceMachineId] || [];
    const orderId = sourceQueue[sourceIdx];

    if (!orderId) return;

    // 1. Update orderMachines by removing the machine link
    const updatedOrderMachines = { ...orderMachines };
    delete updatedOrderMachines[orderId];
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    // 2. Remove from machine queue
    const queue = sourceQueue.filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [sourceMachineId]: queue };
    saveMachineQueues(updatedQueues);

    // 3. Update database status back to "เลือกเครื่องจักร"
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "เลือกเครื่องจักร",
        productionStep: 3
      });
    }

    setDraggedLineupItem(null);
  };`;

code = code.replace(targetCompletedHelper, replacementCompletedHelper);

// 2. Replace Pending Queue container start div to accept drops and highlight
const targetPendingQueueDiv = `          {/* Sub-Box 1: ช่องลูกค้ายังไม่ได้คิว */}
          <div className="bg-blue-50/20 border border-blue-150 p-3 rounded-xl flex flex-col justify-between h-[175px] shadow-3xs select-none overflow-hidden">`;

const replacementPendingQueueDiv = `          {/* Sub-Box 1: ช่องลูกค้ายังไม่ได้คิว */}
          <div 
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={handleDropToUnassigned}
            className={\`bg-blue-50/20 border-2 p-3 rounded-xl flex flex-col justify-between h-[175px] shadow-3xs select-none overflow-hidden transition-all duration-200 \${
              draggedLineupItem && draggedLineupItem.machineId !== "unassigned"
                ? "border-dashed border-blue-500 bg-blue-50/30 scale-[1.01] animate-pulse shadow-md"
                : "border-blue-150"
            }\`}
          >`;

code = code.replace(targetPendingQueueDiv, replacementPendingQueueDiv);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully implemented dragging back to unassigned dock!");
