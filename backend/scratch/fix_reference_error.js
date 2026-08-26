import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Extract the queueItems drag-and-drop code block
const dragBlock = `  const [queueItems, setQueueItems] = useState([]);
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
  };`;

// Remove it from its current position above packagingItems
code = code.replace(dragBlock, '');

// Now insert it right after the orderedCustomers definition
const insertTarget = `  const orderedCustomers = useMemo(() => {
    return customers.filter(c => 
      c.orderType === "lot" || 
      c.orderType === "sample" ||
      (c.orderedProducts && Array.isArray(c.orderedProducts) && c.orderedProducts.length > 0) ||
      (c.orderedProducts && typeof c.orderedProducts === "object" && c.orderedProducts.formulaName) ||
      c.section === "s11"
    );
  }, [customers]);`;

const insertReplacement = `${insertTarget}

${dragBlock}`;

code = code.replace(insertTarget, insertReplacement);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully moved drag-and-drop queue block below orderedCustomers declaration!");
