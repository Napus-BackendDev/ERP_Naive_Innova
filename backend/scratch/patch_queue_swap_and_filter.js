import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Modify filter in useEffect
code = code.replace(
  'const activeCustomers = orderedCustomers.filter(c => c.productionStatus !== "สำเร็จเสร็จสิ้น");',
  'const activeCustomers = orderedCustomers.filter(c => c.productionStatus === "กำลังผลิต");'
);
console.log("Successfully changed queueItems filter to only include 'กำลังผลิต' status!");

// 2. Swap visual position of Cards in JSX
const blockStart = '{/* 2. Visualizations: Pure HTML/CSS Bar Chart & Stock Insights */}';
const blockEnd = '{/* 3. Filters and Search Row */}';

const blockStartIdx = code.indexOf(blockStart);
const blockEndIdx = code.indexOf(blockEnd);

if (blockStartIdx !== -1 && blockEndIdx !== -1) {
  // We want to extract the two cards inside the grid
  const innerStart = code.indexOf('<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">', blockStartIdx);
  const innerEnd = code.indexOf('</div>\n\n      {/* 3. Filters and Search Row */}', blockStartIdx);
  
  if (innerStart !== -1 && innerEnd !== -1) {
    const originalGridContent = code.substring(innerStart, innerEnd);
    
    // Let's define the swapped content of the cards:
    // Card 1: Production Queue (col-span-4)
    // Card 2: Chart (col-span-8)
    const swappedGridContent = `<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Production Queue */}
        <Card className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 max-h-[380px]">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-blue-600" />
                คิวการผลิต (ลากจัดลำดับคิวได้)
              </span>
              <span className="text-[9.5px] bg-slate-100 text-slate-505 font-extrabold font-mono px-2 py-0.5 rounded-md">
                {queueItems.length} คิว
              </span>
            </h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">เรียงลำดับการเข้าสายผลิตขวดและฉลากตามต้องการ</p>
          </div>

          <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[280px]">
            {queueItems.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold italic text-center my-auto py-10">
                ไม่มีสินค้ากำลังดำเนินการผลิตในขณะนี้
              </p>
            ) : (
              queueItems.map((cust, idx) => {
                let productsList = [];
                if (cust.orderedProducts) {
                  if (Array.isArray(cust.orderedProducts)) {
                    productsList = cust.orderedProducts;
                  } else if (typeof cust.orderedProducts === "object") {
                    productsList = [cust.orderedProducts];
                  }
                }

                const qtyNeeded = productsList.reduce((sum, p) => sum + (parseInt(p.quantityPcs || p.quantity) || 0), 0);
                let completedQty = 0;
                
                if (cust.productionStep > 3) {
                  completedQty = qtyNeeded;
                } else if (cust.productionStep === 3) {
                  completedQty = Math.round(qtyNeeded * 0.5);
                } else {
                  completedQty = 0;
                }

                const percent = qtyNeeded > 0 ? Math.round((completedQty / qtyNeeded) * 100) : 0;
                const formulaNames = productsList.map(p => p.formulaName || p.name).join(", ") || "ไม่ระบุสูตร";

                const isDragging = idx === draggedIndex;

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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
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
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Custom Premium Bar Chart */}
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
        
    code = code.replace(originalGridContent, swappedGridContent);
    console.log("Successfully swapped Card visual layout positions!");
  } else {
    console.log("Could not find inner grid boundary!");
  }
} else {
  console.log("Could not find block markers for visualizations!");
}

// 4. Run regex backslash cleanup to avoid compile syntax error
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully wrote updated ProductionView.js!");
