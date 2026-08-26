import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update activeCustomers filter to include all active production statuses
const targetActiveCustomers = `  useEffect(() => {
    const activeCustomers = orderedCustomers.filter(c => c.productionStatus === "กำลังผลิต");`;

const replacementActiveCustomers = `  useEffect(() => {
    const activeCustomers = orderedCustomers.filter(c => 
      c.productionStatus === "กำลังผลิต" || 
      c.productionStatus === "รอยืนยัน" || 
      c.productionStatus === "เลือกเครื่องจักร" || 
      c.productionStatus === "รอบรรจุ" ||
      c.productionStatus === "รอตรวจ QA รอบที่ 1" ||
      c.productionStatus === "รอตรวจ QA รอบที่ 2"
    );`;

code = code.replace(targetActiveCustomers, replacementActiveCustomers);

// Also replace the fallback activeCustomers inside the same useEffect
const targetActiveCustomersFallback = `    setQueueItems(activeCustomers);
  }, [orderedCustomers]);`;

const replacementActiveCustomersFallback = `    setQueueItems(activeCustomers);
  }, [orderedCustomers]);`;

// 2. Update finishedGoodsCustomers filter to include "รอบรรจุ"
const targetFinishedGoods = `  // Finished Goods Dock filter (contains active QC step 5 and completed step 6)
  const finishedGoodsCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => 
      c.productionStatus === "สำเร็จเสร็จสิ้น" || 
      c.productionStatus === "รอตรวจ QA รอบที่ 2"
    );
  }, [customersWithPrecomputes]);`;

const replacementFinishedGoods = `  // Finished Goods Dock filter (contains "รอบรรจุ", Step 5 QA 2, and completed Step 6)
  const finishedGoodsCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => 
      c.productionStatus === "รอบรรจุ" ||
      c.productionStatus === "รอตรวจ QA รอบที่ 2" ||
      c.productionStatus === "สำเร็จเสร็จสิ้น"
    );
  }, [customersWithPrecomputes]);`;

code = code.replace(targetFinishedGoods, replacementFinishedGoods);

// 3. Update handleMarkAsCompleted (checkmark) to set status to "รอบรรจุ" and step 3
const targetMarkCompleted = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอตรวจ QA รอบที่ 2",
        productionStep: 5
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

const replacementMarkCompleted = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอบรรจุ",
        productionStep: 3
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

code = code.replace(targetMarkCompleted, replacementMarkCompleted);

// 4. Update addToMachineQueue to update status to "กำลังผลิต" in DB
const targetAddToMachine = `  const addToMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];`;

const replacementAddToMachine = `  const addToMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    if (onUpdateCustomerStatus) {
      onUpdateCustomerStatus(orderId, {
        productionStatus: "กำลังผลิต",
        productionStep: 3
      });
    }

    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];`;

code = code.replace(targetAddToMachine, replacementAddToMachine);

// 5. Update handleLineupDropEmpty to update status to "กำลังผลิต" in DB
const targetLineupDropEmpty = `    // Update orderMachines
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    // Update queues`;

const replacementLineupDropEmpty = `    // Update orderMachines
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    if (onUpdateCustomerStatus) {
      onUpdateCustomerStatus(orderId, {
        productionStatus: "กำลังผลิต",
        productionStep: 3
      });
    }

    // Update queues`;

code = code.replace(targetLineupDropEmpty, replacementLineupDropEmpty);

// 6. Update DragOver Case 1 to update status to "กำลังผลิต" in DB
const targetDragOverCase1 = `      // Assign in orderMachines
      const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
      setOrderMachines(updatedOrderMachines);
      localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

      // Insert at hover position`;

const replacementDragOverCase1 = `      // Assign in orderMachines
      const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
      setOrderMachines(updatedOrderMachines);
      localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

      if (cust.productionStatus !== "กำลังผลิต") {
        if (onUpdateCustomerStatus) {
          onUpdateCustomerStatus(orderId, {
            productionStatus: "กำลังผลิต",
            productionStep: 3
          });
        }
      }

      // Insert at hover position`;

code = code.replace(targetDragOverCase1, replacementDragOverCase1);

// 7. Update Pending Queue filter to show only "เลือกเครื่องจักร" and unassigned
code = code.replaceAll(
  `queueItems.filter(c => !orderMachines[c._id])`,
  `queueItems.filter(c => c.productionStatus === "เลือกเครื่องจักร" && !orderMachines[c._id])`
);

// 8. Update renderStatusBadge and statusFilter dropdown in ProductionView.js
const targetRenderStatusBadge = `    if (status === "กำลังผลิต" || status === "กำลังผลิต (บรรจุ)" || status === "กำลังผลิต (ติดฉลาก)") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
          กำลังผลิต
        </span>
      );
    }`;

const replacementRenderStatusBadge = `    if (status === "กำลังผลิต" || status === "กำลังผลิต (บรรจุ)" || status === "กำลังผลิต (ติดฉลาก)") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
          กำลังผลิต
        </span>
      );
    }
    if (status === "เลือกเครื่องจักร") {
      return (
        <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold">
          เลือกเครื่องจักร
        </span>
      );
    }
    if (status === "รอบรรจุ") {
      return (
        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold">
          รอบรรจุ
        </span>
      );
    }`;

code = code.replace(targetRenderStatusBadge, replacementRenderStatusBadge);

// 9. Update statusFilter dropdown options
const targetStatusOptions = `                <option value="qa1">กรอง: QA รอบที่ 1</option>
                <option value="producing">กรอง: กำลังผลิต/ห่อหุ้ม</option>
                <option value="qa2">กรอง: QA รอบที่ 2</option>
                <option value="pending-cust">กรอง: รอลูกค้ายืนยัน</option>
                <option value="cust-confirmed">กรอง: ลูกค้ายืนยันแล้ว</option>
                <option value="completed">กรอง: จัดส่งแล้ว</option>`;

const replacementStatusOptions = `                <option value="qa1">กรอง: QA รอบที่ 1</option>
                <option value="producing">กรอง: กำลังผลิต/ห่อหุ้ม</option>
                <option value="ready-mach">กรอง: เลือกเครื่องจักร</option>
                <option value="ready-pack">กรอง: รอบรรจุ</option>
                <option value="qa2">กรอง: QA รอบที่ 2</option>
                <option value="pending-cust">กรอง: รอลูกค้ายืนยัน</option>
                <option value="cust-confirmed">กรอง: ลูกค้ายืนยันแล้ว</option>
                <option value="completed">กรอง: จัดส่งแล้ว</option>`;

code = code.replace(targetStatusOptions, replacementStatusOptions);

// Add filtering logic for "ready-mach" and "ready-pack"
const targetFilterLogic = `        if (statusFilter === "qa1") return c.computedStatus === "รอตรวจ QA รอบที่ 1";
        if (statusFilter === "producing") return c.computedStatus === "กำลังผลิต (บรรจุ)" || c.computedStatus === "กำลังผลิต (ติดฉลาก)" || c.computedStatus === "กำลังผลิต";`;

const replacementFilterLogic = `        if (statusFilter === "qa1") return c.computedStatus === "รอตรวจ QA รอบที่ 1";
        if (statusFilter === "ready-mach") return c.computedStatus === "เลือกเครื่องจักร";
        if (statusFilter === "ready-pack") return c.computedStatus === "รอบรรจุ";
        if (statusFilter === "producing") return c.computedStatus === "กำลังผลิต (บรรจุ)" || c.computedStatus === "กำลังผลิต (ติดฉลาก)" || c.computedStatus === "กำลังผลิต";`;

code = code.replace(targetFilterLogic, replacementFilterLogic);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched ProductionView.js for the new workflow!");
