import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF
code = code.replace(/\r\n/g, '\n');

// 1. Add state variable
const targetState = `  // Lineup Drag and Drop State
  const [draggedLineupItem, setDraggedLineupItem] = useState(null);`;

const replacementState = `  // Lineup Drag and Drop State
  const [draggedLineupItem, setDraggedLineupItem] = useState(null);
  const [hoveredMachineId, setHoveredMachineId] = useState(null);`;

if (code.includes(targetState)) {
  code = code.replace(targetState, replacementState);
  console.log("Successfully defined hoveredMachineId state!");
} else {
  // Try single line replace
  code = code.replace(
    `const [draggedLineupItem, setDraggedLineupItem] = useState(null);`,
    `const [draggedLineupItem, setDraggedLineupItem] = useState(null);\n  const [hoveredMachineId, setHoveredMachineId] = useState(null);`
  );
  console.log("Replaced using single-line fallback!");
}

// 2. Add setHoveredMachineId(null) inside handleLineupDragEnd
const targetDragEnd = `  const handleLineupDragEnd = () => {
    if (draggedLineupItem) {
      localStorage.setItem("mes_production_machine_queues", JSON.stringify(machineQueues));
    }
    setDraggedLineupItem(null);
  };`;

const replacementDragEnd = `  const handleLineupDragEnd = () => {
    if (draggedLineupItem) {
      localStorage.setItem("mes_production_machine_queues", JSON.stringify(machineQueues));
    }
    setDraggedLineupItem(null);
    setHoveredMachineId(null);
  };`;

if (code.includes(targetDragEnd)) {
  code = code.replace(targetDragEnd, replacementDragEnd);
  console.log("Successfully updated handleLineupDragEnd!");
} else {
  console.log("Warning: handleLineupDragEnd target not found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("File saved successfully.");
