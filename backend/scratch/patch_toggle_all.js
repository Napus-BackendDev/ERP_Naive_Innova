import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace Allowed select-all button
const targetAllowedBtn = `                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        setNewMachineAllowed(allNames);
                        setNewMachineDisallowed([]);
                      }}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-155 rounded-lg text-[8.5px] font-black transition-all cursor-pointer"
                    >
                      ✓ เลือกทั้งหมด
                    </button>`;

const replacementAllowedBtn = `                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        const isAllSelected = newMachineAllowed.length === allNames.length;
                        if (isAllSelected) {
                          setNewMachineAllowed([]);
                        } else {
                          setNewMachineAllowed(allNames);
                          setNewMachineDisallowed([]);
                        }
                      }}
                      className="px-2.5 py-0.8 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[8.5px] font-black transition-all cursor-pointer"
                    >
                      {newMachineAllowed.length === formulas.length ? "✓ ยกเลิกเลือกทั้งหมด" : "✓ เลือกทั้งหมด"}
                    </button>`;

// 2. Replace Disallowed select-all button
const targetDisallowedBtn = `                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        setNewMachineDisallowed(allNames);
                        setNewMachineAllowed([]);
                      }}
                      className="px-2.5 py-0.8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg text-[8.5px] font-black transition-all cursor-pointer"
                    >
                      ⛔ ห้ามผลิตทั้งหมด
                    </button>`;

const replacementDisallowedBtn = `                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        const isAllSelected = newMachineDisallowed.length === allNames.length;
                        if (isAllSelected) {
                          setNewMachineDisallowed([]);
                        } else {
                          setNewMachineDisallowed(allNames);
                          setNewMachineAllowed([]);
                        }
                      }}
                      className="px-2.5 py-0.8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg text-[8.5px] font-black transition-all cursor-pointer"
                    >
                      {newMachineDisallowed.length === formulas.length ? "⛔ ยกเลิกห้ามทั้งหมด" : "⛔ ห้ามผลิตทั้งหมด"}
                    </button>`;

// Check if these match. If not, let's write a script to locate and replace
// Let's do a direct replace. Wait! Let's check if the classes match.
// In the previous step, we wrote:
// `className="px-2.5 py-0.8 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[8.5px] font-black transition-all cursor-pointer"` for allowed.
// Let's check target buttons exactly by doing a less strict replacement.

code = code.replace(
  /onClick=\{\(\) => \{\s*const allNames = formulas\.map\(f => f\.name\);\s*setNewMachineAllowed\(allNames\);\s*setNewMachineDisallowed\(\[\]\);\s*\}\}/g,
  `onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        const isAllSelected = newMachineAllowed.length === allNames.length;
                        if (isAllSelected) {
                          setNewMachineAllowed([]);
                        } else {
                          setNewMachineAllowed(allNames);
                          setNewMachineDisallowed([]);
                        }
                      }}`
);

code = code.replace(
  /onClick=\{\(\) => \{\s*const allNames = formulas\.map\(f => f\.name\);\s*setNewMachineDisallowed\(allNames\);\s*setNewMachineAllowed\(\[\]\);\s*\}\}/g,
  `onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        const isAllSelected = newMachineDisallowed.length === allNames.length;
                        if (isAllSelected) {
                          setNewMachineDisallowed([]);
                        } else {
                          setNewMachineDisallowed(allNames);
                          setNewMachineAllowed([]);
                        }
                      }}`
);

// Now replace text label
code = code.replace(
  `"✓ เลือกทั้งหมด"`,
  `newMachineAllowed.length === formulas.length ? "✓ ยกเลิกเลือกทั้งหมด" : "✓ เลือกทั้งหมด"`
);

code = code.replace(
  `"⛔ ห้ามผลิตทั้งหมด"`,
  `newMachineDisallowed.length === formulas.length ? "⛔ ยกเลิกห้ามทั้งหมด" : "⛔ ห้ามผลิตทั้งหมด"`
);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully implemented Toggle All logic for both Allowed and Disallowed sections!");
