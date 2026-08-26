import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/BomCalculatorView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Update form container to prevent scroll on form body
const targetForm = '              <form onSubmit={handleFormulaSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50/30">';
const replacementForm = '              <form onSubmit={handleFormulaSubmit} className="flex-grow flex flex-col min-h-0 bg-slate-50/30 overflow-hidden">';

if (code.includes(targetForm)) {
  code = code.replace(targetForm, replacementForm);
  console.log("Form container layout updated!");
} else {
  console.log("Form container NOT found!");
}

// 2. Update Grid container to hide outer scroll
const targetGrid = '                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 flex-1 min-h-0 overflow-y-auto">';
const replacementGrid = '                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 flex-1 min-h-0 overflow-hidden">';

if (code.includes(targetGrid)) {
  code = code.replace(targetGrid, replacementGrid);
  console.log("Grid container layout updated!");
} else {
  console.log("Grid container NOT found!");
}

// 3. Update Left Column to scroll independently
const targetLeftCol = '                  <div className="md:col-span-5 space-y-4 flex flex-col justify-start">';
const replacementLeftCol = '                  <div className="md:col-span-5 space-y-4 flex flex-col justify-start overflow-y-auto max-h-full pr-1 scrollbar-thin">';

if (code.includes(targetLeftCol)) {
  code = code.replace(targetLeftCol, replacementLeftCol);
  console.log("Left column layout updated!");
} else {
  console.log("Left column NOT found!");
}

// 4. Update Right Column to hide outer scroll
const targetRightCol = '                  <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-slate-200/80 pt-6 md:pt-0 md:pl-6 flex flex-col min-h-0">';
const replacementRightCol = '                  <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-slate-200/80 pt-6 md:pt-0 md:pl-6 flex flex-col min-h-0 overflow-hidden">';

if (code.includes(targetRightCol)) {
  code = code.replace(targetRightCol, replacementRightCol);
  console.log("Right column layout updated!");
} else {
  console.log("Right column NOT found!");
}

// 5. Update Ingredients List container to use remaining height (flex-1 min-h-0)
const targetIngredients = '                    <div className="flex-grow space-y-2 overflow-y-auto pr-1 pb-4 min-h-[250px] max-h-[480px]">';
const replacementIngredients = '                    <div className="flex-1 space-y-2 overflow-y-auto pr-1 pb-4 min-h-0 scrollbar-thin">';

if (code.includes(targetIngredients)) {
  code = code.replace(targetIngredients, replacementIngredients);
  console.log("Ingredients list container layout updated!");
} else {
  console.log("Ingredients list container NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("BOM Modal scrolling layout patch complete!");
