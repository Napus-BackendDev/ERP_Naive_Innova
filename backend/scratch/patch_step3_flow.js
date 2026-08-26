import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionDetailView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Play to imports
const oldImports = `import { 
  CheckCircle2, Camera, Video, Trash2, Check, Loader2, AlertTriangle, Beaker, PackageOpen, ListTodo, Award, ClipboardList, ChevronRight, UploadCloud,
  Tag, Droplet, BadgeCheck, Barcode, Clock, Box, Sparkles
} from "lucide-react";`;

const newImports = `import { 
  CheckCircle2, Camera, Video, Trash2, Check, Loader2, AlertTriangle, Beaker, PackageOpen, ListTodo, Award, ClipboardList, ChevronRight, UploadCloud,
  Tag, Droplet, BadgeCheck, Barcode, Clock, Box, Sparkles, Play
} from "lucide-react";`;

code = code.replace(oldImports, newImports);

// 2. Modify handleConfirmStep2 to transition to "รอยืนยัน" instead of "กำลังผลิต"
code = code.replace('productionStatus: "กำลังผลิต",', 'productionStatus: "รอยืนยัน",');
console.log("Successfully changed Step 2 transition status to 'รอยืนยัน'!");

// 3. Replace Step 3 JSX block
const startMarker = '{/* Step 3: บรรจุผลิตภัณฑ์ */}';
const endMarker = '{/* Step 4: ติดฉลาก & ห่อหุ้ม */}';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const oldText = code.substring(startIdx, endIdx);
  const newText = `{/* Step 3: บรรจุผลิตภัณฑ์ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-green-600" />
                  <span>3. บรรจุผลิตภัณฑ์</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">ตรวจสอบรายการตรวจสอบขั้นตอนการเตรียมขวดและสารเคมีสำหรับการบรรจุผลิตภัณฑ์ลงในขวด</p>
              </div>

              {cust.productionStatus === "รอยืนยัน" ? (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
                  <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto animate-bounce">
                    <Play className="h-6 w-6 text-blue-600" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">สเต็ปนี้อยู่ในสถานะ: ยืนยันการผลิต</h5>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    ระบบตรวจสอบความพร้อมของวัตถุดิบและผลตรวจ QA รอบที่ 1 ผ่านเกณฑ์เรียบร้อยแล้ว กรุณากดยืนยันการผลิตด้านล่างเพื่อเริ่มทำการเบิกจ่ายและตัดสต็อกบรรจุภัณฑ์ ขวด ฝาขวด และฉลากสติกเกอร์ ออกจากคลังสินค้าอัตโนมัติ
                  </p>
                  <Button
                    disabled={uploading}
                    onClick={async () => {
                      setUploading(true);
                      try {
                        if (onUpdateStep) {
                          await onUpdateStep({
                            productionStep: 3,
                            productionStatus: "กำลังผลิต"
                          });
                        }
                      } catch (err) {
                        setUploadError("เกิดข้อผิดพลาดในการกดยืนยันการผลิตเพื่อตัดสต็อก");
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-150 transition-all cursor-pointer flex items-center gap-2 mx-auto active:scale-98"
                  >
                    {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Play className="h-4.5 w-4.5" />}
                    <span>ยืนยันเริ่มผลิต & ตัดสต็อกคลังบรรจุภัณฑ์</span>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 border border-slate-100 rounded-2xl shadow-xs w-full text-left">
                    {/* 1 */}
                    <label className={\`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group \${
                      check1 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }\`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">ข้อ 1</span>
                        <input 
                          type="checkbox" 
                          checked={check1}
                          onChange={(e) => setCheck1(e.target.checked)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <PackageOpen className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[11.5px] font-extrabold text-slate-700">1. เตรียมบรรจุภัณฑ์</p>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-1 leading-normal">จัดเตรียมขวด ปลอกหัวปั๊ม และทำความสะอาดฝาปิดทั้งหมด</p>
                      </div>
                    </label>

                    {/* 2 */}
                    <label className={\`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group \${
                      check2 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }\`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">ข้อ 2</span>
                        <input 
                          type="checkbox" 
                          checked={check2}
                          onChange={(e) => setCheck2(e.target.checked)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Tag className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[11.5px] font-extrabold text-slate-700">2. เตรียมสติกเกอร์พร้อมผลิต</p>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-1 leading-normal">ตรวจสอบความถูกต้องและจำนวนฉลากสินค้าของยี่ห้อนี้</p>
                      </div>
                    </label>

                    {/* 3 */}
                    <label className={\`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group \${
                      check3 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }\`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">ข้อ 3</span>
                        <input 
                          type="checkbox" 
                          checked={check3}
                          onChange={(e) => setCheck3(e.target.checked)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Beaker className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[11.5px] font-extrabold text-slate-700">3. เตรียมสาร</p>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-1 leading-normal">นำเนื้อสารผสม (Bulk Chemical) เข้าสู่เครื่องจ่ายบรรจุ</p>
                      </div>
                    </label>

                    {/* 4 */}
                    <label className={\`flex flex-col justify-between gap-3 p-4 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all aspect-square w-full group \${
                      check4 ? "border-green-500 bg-green-50/10" : "border-slate-100"
                    }\`}>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9.5px] text-slate-400 font-extrabold font-mono">ข้อ 4</span>
                        <input 
                          type="checkbox" 
                          checked={check4}
                          onChange={(e) => setCheck4(e.target.checked)}
                          className="h-5 w-5 accent-green-600 cursor-pointer shrink-0"
                        />
                      </div>
                      
                      <div className="my-auto py-1 flex items-center justify-center">
                        <Droplet className="h-10 w-10 text-slate-400/80 transition-transform group-hover:scale-110 duration-200" />
                      </div>

                      <div className="text-left mt-auto">
                        <p className="text-[11.5px] font-extrabold text-slate-700">4. บรรจุผลิตภัณฑ์</p>
                        <p className="text-[9.5px] text-slate-400 font-semibold mt-1 leading-normal">บรรจุผลิตภัณฑ์ได้ครบถ้วนตามปริมาตร มล. และปิดหัวปั๊มแน่นหนา</p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <Button
                      disabled={uploading || !check1 || !check2 || !check3 || !check4}
                      onClick={handleConfirmStep3}
                      className={\`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98 \${
                        check1 && check2 && check3 && check4 
                          ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-100 cursor-pointer" 
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }\`}>
                      {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                      <span>ยืนยันขั้นตอนบรรจุภัณฑ์และไปติดฉลาก</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          )
          }`;

  code = code.replace(oldText, newText);
  console.log("Successfully patched Step 3 with conditional Start Production block!");
} else {
  console.log("Could not find start/end comments for Step 3!");
}

fs.writeFileSync(path, code, 'utf8');
