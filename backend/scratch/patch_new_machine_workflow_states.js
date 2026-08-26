import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update imports
const oldImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, GripVertical,
  Cpu, Plus, Trash
} from "lucide-react";`;

const newImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, GripVertical,
  Cpu, Plus, Trash, ArrowUp, ArrowDown, PlusCircle
} from "lucide-react";`;

code = code.replace(oldImports, newImports);

// 2. Insert new states and helper functions below handleDeleteMachine (around line 242)
const insertMarker = `  const handleDeleteMachine = (id) => {
    const updated = machines.filter(m => m.id !== id);
    setMachines(updated);
    localStorage.setItem("mes_production_machines", JSON.stringify(updated));
    
    // Clear assignments to this machine
    const updatedAss = { ...orderMachines };
    Object.keys(updatedAss).forEach(k => {
      if (updatedAss[k] === id) {
        delete updatedAss[k];
      }
    });
    setOrderMachines(updatedAss);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedAss));
  };`;

const helperFunctions = `

  // New Machine Lineup states and helpers
  const [machineQueues, setMachineQueues] = useState({});
  const [addingToMachine, setAddingToMachine] = useState(null);

  // Sync machineQueues whenever orderMachines, machines, or queueItems change
  useEffect(() => {
    const savedQueues = localStorage.getItem("mes_production_machine_queues");
    let parsedQueues = {};
    if (savedQueues) {
      try {
        parsedQueues = JSON.parse(savedQueues);
      } catch (e) {
        console.error("Failed to parse machine queues", e);
      }
    }

    const updatedQueues = { ...parsedQueues };
    machines.forEach(m => {
      if (!updatedQueues[m.id]) {
        updatedQueues[m.id] = [];
      }
      
      const assigned = queueItems
        .filter(c => orderMachines[c._id] === m.id)
        .map(c => c._id);
        
      const savedIds = updatedQueues[m.id].filter(id => assigned.includes(id));
      const newIds = assigned.filter(id => !savedIds.includes(id));
      updatedQueues[m.id] = [...savedIds, ...newIds];
    });

    setMachineQueues(updatedQueues);
  }, [machines, orderMachines, queueItems]);

  const saveMachineQueues = (updated) => {
    setMachineQueues(updated);
    localStorage.setItem("mes_production_machine_queues", JSON.stringify(updated));
  };

  const moveQueueItem = (machineId, index, direction) => {
    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
    if (queue.length === 0) return;
    
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= queue.length) return;
    
    const temp = queue[index];
    queue[index] = queue[targetIdx];
    queue[targetIdx] = temp;
    
    const updated = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updated);
  };

  const addToMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    const queue = machineQueues[machineId] ? [...machineQueues[machineId]] : [];
    if (!queue.includes(orderId)) {
      queue.push(orderId);
    }
    
    const updatedQueues = { ...machineQueues };
    Object.keys(updatedQueues).forEach(mId => {
      if (mId === machineId) {
        updatedQueues[mId] = queue;
      } else {
        updatedQueues[mId] = (updatedQueues[mId] || []).filter(id => id !== orderId);
      }
    });
    
    saveMachineQueues(updatedQueues);
    setAddingToMachine(null);
  };

  const removeFromMachineQueue = (machineId, orderId) => {
    const updatedOrderMachines = { ...orderMachines };
    delete updatedOrderMachines[orderId];
    setOrderMachines(updatedOrderMachines);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updatedOrderMachines));

    const queue = (machineQueues[machineId] || []).filter(id => id !== orderId);
    const updatedQueues = { ...machineQueues, [machineId]: queue };
    saveMachineQueues(updatedQueues);
  };`;

const insertIdx = code.indexOf(insertMarker);
if (insertIdx !== -1) {
  code = code.substring(0, insertIdx + insertMarker.length) + helperFunctions + code.substring(insertIdx + insertMarker.length);
  console.log("Successfully inserted machine lineup states and helper functions!");
} else {
  console.log("Failed to locate insertion marker!");
}

fs.writeFileSync(path, code, 'utf8');
