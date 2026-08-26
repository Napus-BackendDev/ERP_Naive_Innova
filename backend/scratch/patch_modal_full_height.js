import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the Allowed Formulas section header and box
const targetAllowed = `                {/* Allowed Checkboxes Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-extrabold text-slate-500 block">สูตรที่อนุญาตให้ผลิต (ติ๊ก Checkbox เลือก)</label>
                  <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">`;

const replacementAllowed = `                {/* Allowed Checkboxes Grid */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center w-full mb-1">
                    <label className="text-[10.5px] font-extrabold text-slate-500">สูตรที่อนุญาตให้ผลิต (เลือกแผงการ์ด)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        setNewMachineAllowed(allNames);
                        setNewMachineDisallowed([]);
                      }}
                      className="px-2 py-0.8 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                    >
                      ✓ อนุญาตทุกสูตร (เลือกทั้งหมด)
                    </button>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">`;

code = code.replace(targetAllowed, replacementAllowed);

// 2. Replace the Disallowed Formulas section scroll box to allow full height
const targetDisallowed = `                  <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">`;

// Note: since this appears twice (once in allowed, once in disallowed), we need to replace carefully.
// Wait! Let's check: in targetAllowed we already replaced the allowed one's max-h wrapper with:
// `border border-slate-100 rounded-xl p-3 bg-slate-50`
// So now, the only remaining `max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50` is the disallowed one!
// Let's replace it:
code = code.replace(targetDisallowed, `                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">`);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully removed scroll container constraints and added allowed-all button!");
