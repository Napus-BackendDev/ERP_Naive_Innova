import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace card import with both card and button import
code = code.replace(
  'import { Card } from "@heroui/react";',
  'import { Card, Button } from "@heroui/react";'
);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully added Button to the @heroui/react import statement!");
