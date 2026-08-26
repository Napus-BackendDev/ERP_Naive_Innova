import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Insert zoomedImage state
const targetState = `  // Machines Scheduler State
  const [machines, setMachines] = useState([]);`;

const replacementState = `  // Zoom/Lightbox Image State
  const [zoomedImage, setZoomedImage] = useState(null);

  // Machines Scheduler State
  const [machines, setMachines] = useState([]);`;

code = code.replace(targetState, replacementState);
console.log("Successfully inserted zoomedImage state!");

// 2. Update allowedFormulas display logic in Machine Card list to check for "ทั้งหมด"
const targetAllowedCardDisplay = `{mach.allowedFormulas && mach.allowedFormulas.length > 0 ? (
                            mach.allowedFormulas.map(f => (
                              <span key={f} className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold text-[9px]">✓ ทุกสูตร</span>
                          )}`;

const replacementAllowedCardDisplay = `{mach.allowedFormulas && mach.allowedFormulas.length > 0 && mach.allowedFormulas.length < formulas.length ? (
                            mach.allowedFormulas.map(f => (
                              <span key={f} className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">✓ ทั้งหมด</span>
                          )}`;

code = code.replace(targetAllowedCardDisplay, replacementAllowedCardDisplay);

// 3. Update disallowedFormulas display logic in Machine Card list to check for "ห้ามทั้งหมด"
const targetDisallowedCardDisplay = `{mach.disallowedFormulas && mach.disallowedFormulas.length > 0 ? (
                            mach.disallowedFormulas.map(f => (
                              <span key={f} className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">- ไม่มี</span>
                          )}`;

const replacementDisallowedCardDisplay = `{mach.disallowedFormulas && mach.disallowedFormulas.length > 0 ? (
                            mach.disallowedFormulas.length === formulas.length ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px] font-black animate-pulse">
                                ⛔ ห้ามทั้งหมด
                              </span>
                            ) : (
                              mach.disallowedFormulas.map(f => (
                                <span key={f} className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                                  {f}
                                </span>
                              ))
                            )
                          ) : (
                            <span className="text-slate-400">- ไม่มี</span>
                          )}`;

code = code.replace(targetDisallowedCardDisplay, replacementDisallowedCardDisplay);
console.log("Successfully updated allowed/disallowed labels!");

// 4. Update the machine image tag in the card list to be clickable for zooming
const targetCardImg = `{mach.image ? (
                          <img src={mach.image} className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200" alt="Machine" />
                        )`;

const replacementCardImg = `{mach.image ? (
                          <img 
                            src={mach.image} 
                            onClick={() => setZoomedImage(mach.image)}
                            className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity" 
                            alt="Machine" 
                            title="คลิกเพื่อซูมดูภาพใหญ่"
                          />
                        )`;

code = code.replace(targetCardImg, replacementCardImg);

// Also update the image preview in the modal to be clickable for zooming
const targetModalImg = `<img src={newMachineImage} className="h-full w-full object-cover rounded-2xl" alt="Machine Preview" />`;
const replacementModalImg = `<img 
                          src={newMachineImage} 
                          onClick={() => setZoomedImage(newMachineImage)}
                          className="h-full w-full object-cover rounded-2xl cursor-zoom-in hover:opacity-80 transition-opacity" 
                          alt="Machine Preview" 
                          title="คลิกเพื่อซูมดูภาพใหญ่"
                        />`;

code = code.replace(targetModalImg, replacementModalImg);
console.log("Successfully set image click zoom actions!");

// 5. Append the Lightbox Zoom Modal JSX at the bottom of the component (right before the final </div>)
const targetEndDiv = `      {/* Edit Status Modal */}
      {isModalOpen && selectedCust && (`;

const lightboxModalJSX = `      {/* Lightbox Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-200 select-none">
            <button
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors cursor-pointer bg-slate-800/40 p-2 rounded-full z-10"
              title="ปิดหน้าต่างซูม"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={zoomedImage} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700/50 shadow-2xl" 
              alt="Zoomed Machine View" 
            />
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {isModalOpen && selectedCust && (`;

code = code.replace(targetEndDiv, lightboxModalJSX);
console.log("Successfully appended Lightbox Zoom Modal JSX!");

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully completed ProductionView.js changes!");
