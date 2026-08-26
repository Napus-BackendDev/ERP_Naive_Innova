import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Check icon to the imported icons list
code = code.replace(
  `Cpu, Plus, Trash, ArrowUp, ArrowDown, PlusCircle`,
  `Cpu, Plus, Trash, ArrowUp, ArrowDown, PlusCircle, Check`
);

// 2. Define handleMarkAsCompleted below removeFromMachineQueue
const targetRemoveHelper = `  const removeFromMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines };
    delete updatedOrderMachines[orderId];
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    const queue = (machineQueues[machineId] || []).filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updatedQueues);
  };`;

const replacementRemoveHelper = `  const removeFromMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines };
    delete updatedOrderMachines[orderId];
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    const queue = (machineQueues[machineId] || []).filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updatedQueues);
  };

  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "สำเร็จเสร็จสิ้น",
        productionStep: 6
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

code = code.replace(targetRemoveHelper, replacementRemoveHelper);

// 3. Insert the green checkmark button in the lineup item action division
const targetLineupItemAction = `                                <div className="flex items-center shrink-0 pl-1">
                                  <button
                                    type="button"
                                    onClick={() => removeFromMachineQueue(mach.id, orderId)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                    title="ลบออกจากเครื่องนี้"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>`;

const replacementLineupItemAction = `                                <div className="flex items-center shrink-0 pl-1 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsCompleted(orderId, mach.id)}
                                    className="p-1 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
                                    title="ผลิตเสร็จสิ้น (ย้ายเข้าคลัง)"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFromMachineQueue(mach.id, orderId)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                    title="ลบออกจากเครื่องนี้"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>`;

code = code.replace(targetLineupItemAction, replacementLineupItemAction);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully added lineup completion action button!");
