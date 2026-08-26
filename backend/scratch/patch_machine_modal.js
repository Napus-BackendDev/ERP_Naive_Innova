import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Insert Add Machine Modal above the final two closing divs/statements
const target = `      {/* Edit Status Modal */}
      {isModalOpen && selectedCust && (`;

const modalJSX = `      {/* Add Machine Modal */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsMachineModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                <span>เพิ่มเครื่องจักรเครื่องใหม่</span>
              </h3>
              <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">ป้อนชื่อและตั้งค่าข้อจำกัดสูตรสารผสมของเครื่องจักร</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-extrabold text-slate-500 block">ชื่อเครื่องจักร *</label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: เครื่องบรรจุหัวเดี่ยว 03"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-extrabold text-slate-500 block">สูตรที่อนุญาตให้ผลิต (ถ้าไม่เลือกเลย = ผลิตได้ทุกสูตร)</label>
                <div className="max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50 space-y-2">
                  {formulas.map(f => {
                    const isChecked = newMachineAllowed.includes(f.name);
                    return (
                      <label key={f._id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewMachineAllowed([...newMachineAllowed, f.name]);
                            } else {
                              setNewMachineAllowed(newMachineAllowed.filter(x => x !== f.name));
                            }
                          }}
                          className="h-4 w-4 accent-blue-600 rounded"
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-extrabold text-slate-500 block">สูตรที่ห้ามผลิต (ข้อห้าม / Disallowed)</label>
                <div className="max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50 space-y-2">
                  {formulas.map(f => {
                    const isChecked = newMachineDisallowed.includes(f.name);
                    return (
                      <label key={f._id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewMachineDisallowed([...newMachineDisallowed, f.name]);
                            } else {
                              setNewMachineDisallowed(newMachineDisallowed.filter(x => x !== f.name));
                            }
                          }}
                          className="h-4 w-4 accent-rose-600 rounded"
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsMachineModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddMachine}
                disabled={!newMachineName.trim()}
                className={\`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 active:scale-95 \${
                  newMachineName.trim()
                    ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }\`}
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มเครื่องจักร</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Status Modal */}
      {isModalOpen && selectedCust && (`;

code = code.replace(target, modalJSX);

// Run string template cleanups
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully inserted Add Machine modal into ProductionView.js!");
