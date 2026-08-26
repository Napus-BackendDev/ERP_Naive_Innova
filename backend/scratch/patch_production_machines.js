import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update imports
const oldImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, GripVertical
} from "lucide-react";`;

const newImports = `import { 
  ClipboardList, CheckCircle2, XCircle, Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Layers, AlertCircle,
  MoreVertical, X, UploadCloud, Camera, AlertTriangle, Trash2, Loader2, Eye, Beaker, PackageOpen, Tag, Box, GripVertical,
  Cpu, Plus, Trash
} from "lucide-react";`;

code = code.replace(oldImports, newImports);

// 2. Insert new states and handlers below "const [draggedIndex, setDraggedIndex] = useState(null);"
const insertMarker = 'const [draggedIndex, setDraggedIndex] = useState(null);';
const insertIdx = code.indexOf(insertMarker);

if (insertIdx !== -1) {
  const machineStates = `
  // Machines Scheduler State
  const [machines, setMachines] = useState([]);
  const [orderMachines, setOrderMachines] = useState({});
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  
  // Add Machine form states
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineAllowed, setNewMachineAllowed] = useState([]);
  const [newMachineDisallowed, setNewMachineDisallowed] = useState([]);

  // Load machines and assignments from localStorage
  useEffect(() => {
    const savedMachines = localStorage.getItem("mes_production_machines");
    if (savedMachines) {
      try {
        setMachines(JSON.parse(savedMachines));
      } catch (e) {
        console.error("Failed to parse machines", e);
      }
    } else {
      // Default fallback machines
      const defaultMachines = [
        {
          id: "m1",
          name: "เครื่องผสม/บรรจุอัตโนมัติ 01",
          allowedFormulas: ["Hair Coat", "Milk Shampoo"],
          disallowedFormulas: []
        },
        {
          id: "m2",
          name: "เครื่องกึ่งอัตโนมัติ 02",
          allowedFormulas: [],
          disallowedFormulas: ["ครีมนวดผม"]
        }
      ];
      setMachines(defaultMachines);
      localStorage.setItem("mes_production_machines", JSON.stringify(defaultMachines));
    }

    const savedAssignments = localStorage.getItem("mes_production_order_machines");
    if (savedAssignments) {
      try {
        setOrderMachines(JSON.parse(savedAssignments));
      } catch (e) {
        console.error("Failed to parse assignments", e);
      }
    }
  }, []);

  const handleAssignMachine = (orderId, machineId) => {
    const updated = { ...orderMachines, [orderId]: machineId };
    setOrderMachines(updated);
    localStorage.setItem("mes_production_order_machines", JSON.stringify(updated));
  };

  const handleAddMachine = () => {
    if (!newMachineName.trim()) return;
    const newMachine = {
      id: "mach_" + Date.now(),
      name: newMachineName,
      allowedFormulas: newMachineAllowed,
      disallowedFormulas: newMachineDisallowed
    };
    const updated = [...machines, newMachine];
    setMachines(updated);
    localStorage.setItem("mes_production_machines", JSON.stringify(updated));
    
    setNewMachineName("");
    setNewMachineAllowed([]);
    setNewMachineDisallowed([]);
    setIsMachineModalOpen(false);
  };

  const handleDeleteMachine = (id) => {
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
  };
  `;
  
  code = code.substring(0, insertIdx + insertMarker.length) + machineStates + code.substring(insertIdx + insertMarker.length);
  console.log("Successfully inserted machine scheduler states!");
} else {
  console.log("Could not find insertMarker for machine states!");
}

fs.writeFileSync(path, code, 'utf8');
