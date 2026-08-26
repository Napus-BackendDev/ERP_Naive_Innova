import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the onClick action of the "ดำเนินการ QC" button to route push instead of open modal
const targetButtonCode = `                        <button
                          type="button"
                          onClick={() => openViewDetailModal(cust)}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-650 rounded-lg text-[8px] font-black cursor-pointer transition-all shadow-xs shrink-0 flex items-center"
                          title="กดเพื่อตรวจสอบและดำเนินการ QC ต่อ"
                        >
                          ดำเนินการ QC
                        </button>`;

const replacementButtonCode = `                        <button
                          type="button"
                          onClick={() => {
                            router.push(\`/admin/production/\${cust._id}\`);
                          }}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-650 rounded-lg text-[8px] font-black cursor-pointer transition-all shadow-xs shrink-0 flex items-center"
                          title="กดเพื่อตรวจสอบและดำเนินการ QC ต่อ"
                        >
                          ดำเนินการ QC
                        </button>`;

code = code.replace(targetButtonCode, replacementButtonCode);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated ดำเนินการ QC button to route directly to detail page!");
