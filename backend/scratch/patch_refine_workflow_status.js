import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update handleMarkAsCompleted to set status to "รอตรวจ QA รอบที่ 2" and step 5
const targetMarkCompleted = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "สำเร็จเสร็จสิ้น",
        productionStep: 6
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

const replacementMarkCompleted = `  const handleMarkAsCompleted = async (orderId, machineId) => {
    if (onUpdateCustomerStatus) {
      await onUpdateCustomerStatus(orderId, {
        productionStatus: "รอตรวจ QA รอบที่ 2",
        productionStep: 5
      });
    }
    removeFromMachineQueue(machineId, orderId);
  };`;

code = code.replace(targetMarkCompleted, replacementMarkCompleted);

// 2. Define finishedGoodsCustomers filter that contains both "สำเร็จเสร็จสิ้น" and "รอตรวจ QA รอบที่ 2"
const targetStateLocation = `  // Statistics widgets counts`;
const replacementStateLocation = `  // Finished Goods Dock filter (contains active QC step 5 and completed step 6)
  const finishedGoodsCustomers = useMemo(() => {
    return customersWithPrecomputes.filter(c => 
      c.productionStatus === "สำเร็จเสร็จสิ้น" || 
      c.productionStatus === "รอตรวจ QA รอบที่ 2"
    );
  }, [customersWithPrecomputes]);

  // Statistics widgets counts`;

code = code.replace(targetStateLocation, replacementStateLocation);

// 3. Update Left Dock (Finished Goods Dock) to use finishedGoodsCustomers instead of completedCustomers
const targetFinishedGoodsTitle = `                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  🎉 ช่องสำเร็จผลิต (Completed)
                </span>
                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {completedCustomers.length} ใบสั่ง
                </span>`;

const replacementFinishedGoodsTitle = `                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  🎉 ช่องสำเร็จผลิต & รอ QC
                </span>
                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {finishedGoodsCustomers.length} ใบสั่ง
                </span>`;

code = code.replace(targetFinishedGoodsTitle, replacementFinishedGoodsTitle);

const targetFinishedGoodsList = `              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {completedCustomers.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="text-[9px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่เสร็จสิ้น</span>
                  </div>
                ) : (
                  completedCustomers.map((cust) => {`;

const replacementFinishedGoodsList = `              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {finishedGoodsCustomers.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="text-[9px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่รอ QC</span>
                  </div>
                ) : (
                  finishedGoodsCustomers.map((cust) => {`;

code = code.replace(targetFinishedGoodsList, replacementFinishedGoodsList);

// Also replace the map callback variables
const targetMapEnd = `return (
                      <div
                        key={cust._id}
                        className="flex justify-between items-center p-1.5 bg-white border border-slate-200 rounded-lg shadow-3xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-extrabold text-slate-755 truncate text-[9.5px]">
                            {cust.name} <span className="text-slate-450 font-bold">({fName})</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(\`/admin/production/\${cust._id}\`);
                          }}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-650 rounded-lg text-[8px] font-black cursor-pointer transition-all shadow-xs shrink-0 flex items-center"
                          title="กดเพื่อตรวจสอบและดำเนินการ QC ต่อ"
                        >
                          ดำเนินการ QC
                        </button>
                      </div>
                    );
                  })
                )}`;

// Since targetMapEnd is mapped, we keep it as finishedGoodsCustomers.map
// Let's write out to verify
fs.writeFileSync(path, code, 'utf8');
console.log("Successfully refined workflow statuses and synced Left Dock with process table list!");
