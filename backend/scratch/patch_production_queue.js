import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add GripVertical to imports
const oldImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box
} from "lucide-react";`;

const newImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, GripVertical
} from "lucide-react";`;

code = code.replace(oldImports, newImports);

// 2. Insert drag-and-drop state & handlers above useEffect for packagingItems
const insertMarker = 'const [packagingItems, setPackagingItems] = useState([]);';
const insertIdx = code.indexOf(insertMarker);

if (insertIdx !== -1) {
  const dragHandlers = `const [queueItems, setQueueItems] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Initialize queue items from active customers
  useEffect(() => {
    const activeCustomers = orderedCustomers.filter(c => c.productionStatus !== "สำเร็จเสร็จสิ้น");
    
    // Check if we have a saved order in localStorage
    const savedOrder = localStorage.getItem("mes_production_queue_order");
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const sorted = [...activeCustomers].sort((a, b) => {
          const idxA = orderIds.indexOf(a._id);
          const idxB = orderIds.indexOf(b._id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setQueueItems(sorted);
        return;
      } catch (err) {
        console.error("Failed to parse saved queue order:", err);
      }
    }
    setQueueItems(activeCustomers);
  }, [orderedCustomers]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...queueItems];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setQueueItems(items);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    const orderIds = queueItems.map(item => item._id);
    localStorage.setItem("mes_production_queue_order", JSON.stringify(orderIds));
  };

  `;
  code = code.substring(0, insertIdx) + dragHandlers + code.substring(insertIdx);
  console.log("Successfully inserted drag-and-drop state & handlers!");
} else {
  console.log("Could not find insertMarker for drag handlers!");
}

// 3. Replace Material summary card with Production Queue card
const cardStart = '{/* Right: Material Stock Status Visual overview */}';
const cardEnd = '      {/* 3. Filters and Search Row */}';

const cardStartIdx = code.indexOf(cardStart);
const cardEndIdx = code.indexOf(cardEnd);

if (cardStartIdx !== -1 && cardEndIdx !== -1) {
  const oldCardText = code.substring(cardStartIdx, cardEndIdx);
  const newCardText = `{/* Right: Production Queue */}
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

      `;
  code = code.replace(oldCardText, newCardText);
  console.log("Successfully replaced visual summary card with Production Queue drag-and-drop list!");
} else {
  console.log("Could not find visual summary card boundaries to replace!");
}

fs.writeFileSync(path, code, 'utf8');
