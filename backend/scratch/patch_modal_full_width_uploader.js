import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the centered w-[200px] wrappers with w-full aspect-square
const targetUploaderBlock = `                  {/* Machine Photo Upload 1:1 Large Square */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-extrabold text-slate-500 block">ภาพถ่ายเครื่องจักร (สัดส่วน 1:1)</label>
                    <div className="w-full flex justify-center py-2">
                      {newMachineImage ? (
                        <div className="w-[200px] aspect-square rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative p-1 shadow-2xs">
                          <img src={newMachineImage} className="h-full w-full object-cover rounded-2xl" alt="Machine Preview" />
                          <button
                            type="button"
                            onClick={() => setNewMachineImage("")}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            ลบรูป
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 w-[200px] aspect-square bg-slate-50 hover:bg-slate-100/50 text-slate-655 rounded-2xl text-[10px] font-extrabold transition-all cursor-pointer border border-dashed border-slate-355 shadow-3xs active:scale-98">
                          <UploadCloud className="h-6 w-6 text-slate-400" />
                          <span>📸 อัปโหลดรูปภาพ</span>
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
                  </div>`;

const replacementUploaderBlock = `                  {/* Machine Photo Upload 1:1 Full Column Width */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-extrabold text-slate-500 block">ภาพถ่ายเครื่องจักร (สัดส่วน 1:1 เต็มคอลัมน์)</label>
                    <div className="w-full py-1">
                      {newMachineImage ? (
                        <div className="w-full aspect-square rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative p-1 shadow-2xs">
                          <img src={newMachineImage} className="h-full w-full object-cover rounded-2xl" alt="Machine Preview" />
                          <button
                            type="button"
                            onClick={() => setNewMachineImage("")}
                            className="absolute top-3 right-3 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95 z-10"
                          >
                            ลบรูป
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 w-full aspect-square bg-slate-50 hover:bg-slate-100/50 text-slate-655 rounded-2xl text-[10.5px] font-extrabold transition-all cursor-pointer border border-dashed border-slate-300 shadow-3xs active:scale-98">
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
                  </div>`;

code = code.replace(targetUploaderBlock, replacementUploaderBlock);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated image uploader to take full column width!");
