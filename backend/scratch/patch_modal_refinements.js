import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the entire Add Machine Modal block
const startModal = '{/* Add Machine Modal */}';
const endModal = '{/* Edit Status Modal */}';

const startIdx = code.indexOf(startModal);
const endIdx = code.indexOf(endModal);

if (startIdx !== -1 && endIdx !== -1) {
  const oldModalText = code.substring(startIdx, endIdx);
  const newModalText = `{/* Add Machine Modal */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none text-left max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsMachineModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                <span>เพิ่มเครื่องจักรเครื่องใหม่ (สองคอลัมน์)</span>
              </h3>
              <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">จัดทำโปรไฟล์เครื่องจักรและจำกัดเงื่อนไขประเภทสูตรสารเคมีที่อนุญาตผลิต</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: Machine Info */}
              <div className="space-y-4 border-r border-slate-100 pr-0 md:pr-6 flex flex-col justify-between">
                <div className="space-y-4 w-full">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">1. ข้อมูลทั่วไปของเครื่องจักร</h4>
                  
                  {/* Name */}
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

                  {/* Machine Photo Upload 1:1 Aspect-square */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-extrabold text-slate-500 block">ภาพถ่ายเครื่องจักร (สัดส่วน 1:1)</label>
                    
                    {newMachineImage ? (
                      <div className="space-y-2">
                        <div className="w-full aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative p-1">
                          <img src={newMachineImage} className="h-full w-full object-cover rounded-xl" alt="Machine Preview" />
                          <button
                            type="button"
                            onClick={() => setNewMachineImage("")}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-extrabold transition-all cursor-pointer shadow-sm"
                          >
                            ลบรูปภาพ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 w-full aspect-square bg-slate-50 hover:bg-slate-100/50 text-slate-650 rounded-xl text-[10px] font-bold transition-all cursor-pointer border border-dashed border-slate-300">
                        <UploadCloud className="h-6 w-6 text-slate-400" />
                        <span>📸 อัปโหลดรูปภาพเครื่องจักร</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              try {
                                const base64 = await fileToBase64(file);
                                setNewMachineImage(base64);
                              } catch (err) {
                                console.error("Image Conversion Error:", err);
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Allowed/Disallowed Formulas */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">2. สูตรสารเคมีดิบที่ผลิตได้/ไม่ได้</h4>
                
                {/* Allowed Checkboxes Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-extrabold text-slate-500 block">สูตรที่อนุญาตให้ผลิต (ติ๊ก Checkbox เลือก)</label>
                  <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">
                      {formulas.map(f => {
                        const isChecked = newMachineAllowed.includes(f.name);
                        return (
                          <label
                            key={f._id}
                            className={\`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all select-none gap-1.5 \${
                              isChecked 
                                ? "border-blue-500 bg-blue-50/20 text-blue-700 shadow-3xs font-black" 
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold"
                            }\`}
                          >
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
                              className="h-3.5 w-3.5 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-[9.5px] leading-tight truncate w-full text-center" title={f.name}>{f.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Disallowed Checkboxes Grid */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center w-full mb-1">
                    <label className="text-[10.5px] font-extrabold text-slate-500">สูตรที่ห้ามผลิต (ข้อห้าม)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = formulas.map(f => f.name);
                        setNewMachineDisallowed(allNames);
                        setNewMachineAllowed([]);
                      }}
                      className="px-2 py-0.8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                    >
                      ⛔ ห้ามผลิตทั้งหมด (ไม่ได้สักสูตร)
                    </button>
                  </div>
                  
                  <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                    <div className="grid grid-cols-3 gap-2">
                      {formulas.map(f => {
                        const isChecked = newMachineDisallowed.includes(f.name);
                        return (
                          <label
                            key={f._id}
                            className={\`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all select-none gap-1.5 \${
                              isChecked 
                                ? "border-rose-500 bg-rose-50/20 text-rose-700 shadow-3xs font-black" 
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold"
                            }\`}
                          >
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
                              className="h-3.5 w-3.5 accent-rose-600 cursor-pointer"
                            />
                            <span className="text-[9.5px] leading-tight truncate w-full text-center" title={f.name}>{f.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
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

      `;
  code = code.replace(oldModalText, newModalText);
  console.log("Successfully replaced Old Modal JSX with refined layout!");
} else {
  console.log("Could not find old modal boundaries to replace!");
}

// Clean up backslashes
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully completed ProductionView.js refinements!");
