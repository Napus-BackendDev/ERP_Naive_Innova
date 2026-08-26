import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Target the left container of the list item header in Production Queue
const target = `<div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                        <span className="text-[11px] font-black text-slate-750 truncate">{cust.name}</span>
                      </div>`;

const replacement = `<div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold h-5 w-5 rounded-full flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-black text-slate-750 truncate">{cust.name}</span>
                      </div>`;

code = code.replace(target, replacement);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully added queue position numbers badge to Production Queue items!");
