import { assetUrl } from "@/lib/api";
import { fmtChem } from "@/lib/chemAmount";
import { resolveMfgDate, resolveExpDate } from "@/lib/lotDates";

// ---------------------------------------------------------------------------
// Printable production spec sheet.
//
// One document PER ordered line item (not per deal): an order with two products
// yields two sheets, each carrying its own formula breakdown and its own
// packaging / nozzle / sticker photos.
//
// Shared by Sales (ประวัติใบสั่งผลิต) and Production (พิมพ์ใบงาน) so both screens
// print the exact same paper — the operator on the floor and the salesperson on
// the phone are never looking at differently-shaped documents.
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const dash = (s) => (s === 0 || s ? String(s) : "-");

// Same splits the Sales spec pickers use, so a bottle is never resolved from the
// sticker list (and vice versa) when falling back to a name match.
const isLabel = (p) => {
  const n = (p.type?.name || p.category || p.name || "").toLowerCase();
  return n.includes("ฉลาก") || n.includes("สติกเกอร์");
};
const isNozzle = (p) => (p.type?.name || p.category || "").toLowerCase().includes("หัวฉีด");
const isBottle = (p) => {
  const n = (p.type?.name || p.category || "").toLowerCase();
  return !isLabel(p) && !isNozzle(p) && !n.includes("กล่อง") && !n.includes("ซอง");
};

/**
 * Open a print window for one ordered line item.
 *
 * @param item        one entry of customer.orderedProducts
 * @param customer    the owning customer/lead doc (name, brand, phone, address)
 * @param packagings  full PackagingItem catalog (bottles + nozzles + stickers)
 * @param formulas    BomFormula list (needs bom, phases, procedures, qcSpec)
 * @param meta        { lotNo, dayLabel, time } — shown only when printing a lot
 */
export function openProductionSpecDoc({ item = {}, customer = {}, packagings = [], formulas = [], meta = {} }) {
  const c = customer || {};

  // Resolve the catalog rows id-first (the stored *Id is authoritative; the
  // *Type string is only a denormalized snapshot for legacy records).
  const byId = (id) => (id ? packagings.find((p) => String(p._id) === String(id)) : null);
  const byName = (name, pred) => (name ? packagings.filter(pred).find((p) => p.name === name) : null);
  const bottle = byId(item.packagingItemId) || byName(item.packagingType, isBottle) || null;
  const nozzle = byId(item.nozzleId) || byName(item.nozzleType, isNozzle) || null;
  const sticker = byId(item.labelItemId) || byName(item.labelType, isLabel) || null;

  const formula = (item.formulaId && formulas.find((f) => String(f._id) === String(item.formulaId)))
    || formulas.find((f) => f.name === item.formulaName)
    || null;
  const bomObj = formula?.bom instanceof Map ? Object.fromEntries(formula.bom) : (formula?.bom || {});
  const phaseObj = formula?.phases instanceof Map ? Object.fromEntries(formula.phases) : (formula?.phases || {});
  const bomEntries = Object.entries(bomObj);
  // bom values are grams per 1 kg of finished formula.
  const totalG = bomEntries.reduce((s, [, g]) => s + (Number(g) || 0), 0);
  const batchKg = Number(item.quantityKg) || 0;

  const groups = {};
  bomEntries.forEach(([name, g]) => {
    const letter = phaseObj[name];
    const key = letter ? String(letter).toUpperCase() : "อื่นๆ";
    (groups[key] = groups[key] || []).push({ name, g: Number(g) || 0 });
  });
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "อื่นๆ") return 1;
    if (b === "อื่นๆ") return -1;
    return a.localeCompare(b);
  });

  // Phase sits right after the name, one cell per ingredient (not merged), so
  // every row states its own group even when the table breaks across pages.
  const bomRows = groupKeys.map((k) => groups[k].map(({ name, g }) => `<tr>
      <td>${esc(name)}</td>
      <td class="ph">${esc(k === "อื่นๆ" ? k : "กลุ่ม " + k)}</td>
      <td class="num">${fmtChem(g)}</td>
      <td class="num">${batchKg ? fmtChem(g * batchKg) : "-"}</td>
    </tr>`).join("")).join("");

  // Photo card — falls back to a dashed placeholder so the operator can see at
  // a glance which spec is still missing an image. assetUrl() passes data: and
  // http(s) through untouched and absolutizes stored upload paths.
  const card = (title, name, img, extra = "") => {
    const src = assetUrl(img);
    return `
    <div class="card">
      <div class="ct">${esc(title)}</div>
      ${src ? `<img src="${esc(src)}" alt="${esc(name)}">` : `<div class="noimg">ไม่มีรูป</div>`}
      <div class="cn">${esc(name || "-")}</div>
      ${extra ? `<div class="cx">${esc(extra)}</div>` : ""}
    </div>`;
  };

  const qc = formula?.qcSpec || {};
  const qcRows = [
    ["pH", qc.ph], ["ความหนืด", qc.viscosity], ["ลักษณะ", qc.appearance],
    ["กลิ่น", qc.scent], ["ปริมาณบรรจุ", qc.fillVolume]
  ].filter(([, v]) => v);

  // The <title> becomes the default filename in the browser's "Save as PDF"
  // dialog, so it is built as "ลูกค้า - สูตร - เวลา". Characters Windows
  // rejects in filenames are stripped, else the save dialog silently mangles it.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}${pad(now.getMinutes())}`;
  const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, "").trim();
  const title = [safe(c.name) || "ไม่ระบุลูกค้า", safe(item.formulaName) || "ไม่ระบุสูตร", stamp].join(" - ");

  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
   *{box-sizing:border-box;font-family:'Sarabun','TH Sarabun New',system-ui,sans-serif}
   body{margin:0;padding:32px;color:#0f172a}
   /* Pinned to the printable width of A4 minus the side margins (210-24 = 186mm
      ≈ 703px @96dpi) so what is measured on screen is exactly what paginates. */
   .sheet{width:703px;max-width:100%;margin:auto}
   .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10b981;padding-bottom:12px}
   .brand{font-size:22px;font-weight:800;color:#10b981;line-height:1.1}
   .brand small{display:block;font-size:10px;color:#64748b;font-weight:700;letter-spacing:1.5px;margin-top:3px}
   h1{font-size:18px;margin:0;text-align:right}
   .meta{font-size:12px;color:#475569;text-align:right;margin-top:6px;line-height:1.5}
   .sec{margin-top:13px;break-inside:avoid}
   .sec h2{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin:0 0 6px;border-bottom:1px solid #f1f5f9;padding-bottom:3px}
   .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}
   .row{font-size:12.5px;margin:2px 0}
   .row b{color:#334155}
   .k{color:#64748b}
   table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
   th{background:#f8fafc;text-align:left;padding:5px 9px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#475569}
   td{padding:4px 9px;border-bottom:1px solid #f1f5f9}
   .num{font-variant-numeric:tabular-nums;font-weight:600;text-align:right}
   td.ph{background:#eff6ff;color:#1e40af;font-weight:800;font-size:10px;letter-spacing:1px;text-align:center;vertical-align:middle;width:78px;border-left:1px solid #dbeafe;border-right:1px solid #dbeafe}
   th.phh{text-align:center;width:78px}
   .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}
   .card{border:1px solid #e2e8f0;border-radius:10px;padding:8px;text-align:center;break-inside:avoid}
   .card img{width:100%;height:88px;object-fit:contain;background:#f8fafc;border-radius:6px}
   .noimg{width:100%;height:88px;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px}
   .ct{font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px}
   .cn{font-size:11px;font-weight:700;margin-top:5px;word-break:break-word}
   .cx{font-size:10px;color:#64748b;margin-top:2px}
   .note{font-size:11.5px;color:#475569;white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:8px 10px;margin-top:6px}
   .warn{font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:6px}
   .foot{margin-top:26px;display:flex;justify-content:space-around;break-inside:avoid}
   .sign{border-top:1px dashed #cbd5e1;padding-top:6px;text-align:center;width:190px;font-size:12px;color:#64748b}
   .sign small{display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-top:2px}
   /* The signature block sits at the bottom of the page, pushed there by
      margin-top:auto inside a full-height flex column.
      NOT position:fixed with a negative offset — that parks the block outside
      the page box, and Chrome answers by adding the blank second page this was
      meant to remove. Everything stays inside the flow; nothing can overflow. */
   @page{size:A4;margin:12mm}
   @media print{
     body{padding:0}
     /* 297 - 12 - 12 = 273mm of printable height, minus 5mm. Filling the page
        box exactly is what produced the blank second sheet: the browser and the
        printer round mm→dots differently, and one stray dot starts a new page. */
     .sheet{min-height:268mm;display:flex;flex-direction:column}
     .foot{margin-top:auto;padding-top:10px}
     .sign{width:29%}
   }
  </style></head><body><div class="sheet"><div class="content">
   <div class="head">
     <div class="brand">Naive Ops<small>NAIVE INNOVA · ECO-TECH ERP</small></div>
     <div><h1>ใบข้อมูลจำเพาะการผลิต</h1><div class="meta">
       ${meta.lotNo ? `เลขล็อต: ${esc(meta.lotNo)}<br>` : ""}
       ${meta.dayLabel ? `วันที่ผลิต: ${esc(meta.dayLabel)} ${esc(meta.time ? meta.time + " น." : "")}<br>` : ""}
       ลูกค้า: ${esc(c.name || "-")}
     </div></div>
   </div>

   <div class="sec"><h2>ข้อมูลลูกค้า</h2>
     <div class="grid">
       <div class="row"><span class="k">ชื่อ:</span> <b>${esc(c.name || "-")}</b></div>
       <div class="row"><span class="k">แบรนด์:</span> <b>${esc(item.brand || c.brand || "-")}</b></div>
       <div class="row"><span class="k">โทร:</span> ${esc(c.phone || "-")}</div>
       <div class="row"><span class="k">ที่อยู่:</span> ${esc(c.address || "-")}</div>
     </div>
   </div>

   <div class="sec"><h2>ข้อมูลสินค้า</h2>
     <div class="grid">
       <div class="row"><span class="k">สูตร:</span> <b>${esc(item.formulaName || "-")}</b></div>
       <div class="row"><span class="k">ประเภทสูตร:</span> <b>${esc(item.customerFormulaType || "-")}</b></div>
       <div class="row"><span class="k">จำนวน:</span> <b>${dash(item.quantityPcs && Number(item.quantityPcs).toLocaleString())} ชิ้น</b></div>
       <div class="row"><span class="k">ปริมาณเนื้อ:</span> <b>${batchKg ? batchKg.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "-"} กก.</b></div>
       <div class="row"><span class="k">ขนาดบรรจุ:</span> ${dash(item.fillVolume || item.bottleSize)} ml</div>
       <div class="row"><span class="k">กลิ่น:</span> ${dash(item.scentType)}</div>
       <div class="row"><span class="k">วันผลิต (MFG):</span> ${dash(resolveMfgDate(item))}</div>
       <div class="row"><span class="k">วันหมดอายุ (EXP):</span> ${dash(resolveExpDate(item))}</div>
       <div class="row"><span class="k">ตำแหน่งยิงล็อต:</span> ${dash(item.printLocation)}</div>
       <div class="row"><span class="k">สถานะสติกเกอร์:</span> ${dash(item.stickerStatus)}</div>
     </div>
   </div>

   <div class="sec"><h2>ภาพประกอบสเปค</h2>
     <div class="cards">
       ${card("สินค้า", item.formulaName, item.productImageUrl)}
       ${card("บรรจุภัณฑ์", bottle?.name || item.packagingType, bottle?.image, item.bottleCount ? `จำนวน ${item.bottleCount}` : "")}
       ${card("หัวปั๊ม / หัวฉีด", nozzle?.name || item.nozzleType, nozzle?.image, item.nozzleCount ? `จำนวน ${item.nozzleCount}` : "")}
       ${card("สติกเกอร์ / ฉลาก", sticker?.name || item.labelType, item.labelArtworkUrl || sticker?.image,
              (item.stickerWidth && item.stickerHeight) ? `${item.stickerWidth} x ${item.stickerHeight} มม.` : "")}
     </div>
   </div>

   <div class="sec"><h2>สูตรและสารเคมีที่ใช้${batchKg ? ` (ล็อต ${batchKg.toLocaleString(undefined, { maximumFractionDigits: 3 })} กก.)` : ""}</h2>
     ${bomEntries.length ? `<table>
       <thead><tr><th>ชื่อสารเคมี</th><th class="phh">กลุ่ม</th><th class="num">กรัม / 1 กก.</th><th class="num">ปริมาณทั้งหมดที่ต้องใช้ (ก.)</th></tr></thead>
       <tbody>${bomRows}</tbody>
       <tfoot><tr><th>รวม</th><th></th><th class="num">${fmtChem(totalG)}</th><th class="num">${batchKg ? fmtChem(totalG * batchKg) : "-"}</th></tr></tfoot>
     </table>` : `<div class="warn">ไม่พบสูตร "${esc(item.formulaName || "-")}" ในระบบ B.O.M. — ยังไม่มีรายการสารเคมี</div>`}
   </div>

   ${formula?.procedures?.length ? `<div class="sec"><h2>ขั้นตอนการผลิต</h2>
     <div class="note">${formula.procedures.map((p, i) => `${i + 1}. ${esc(p)}`).join("\n")}</div></div>` : ""}

   ${formula?.note?.length ? `<div class="sec"><h2>หมายเหตุของสูตร</h2>
     <div class="warn"><ul style="margin:0;padding-left:20px;">${formula.note.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div></div>` : ""}

   ${c.notes ? `<div class="sec"><h2>หมายเหตุลูกค้าของ SALE</h2><div class="note">${esc(c.notes)}</div></div>` : ""}
   ${String(item.notes || "").trim() ? `<div class="sec"><h2>หมายเหตุจากใบสั่งผลิต Sale</h2><div class="note">${esc(item.notes)}</div></div>` : ""}

   ${qcRows.length ? `<div class="sec"><h2>สเปคการตรวจ QC</h2>
     <table><tbody>${qcRows.map(([k, v]) => `<tr><td style="width:180px;color:#64748b">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}</tbody></table></div>` : ""}

   </div>
   <div class="foot">
     <div class="sign">Incoming QC<small>ฝ่ายผลิต (Production)</small></div>
     <div class="sign">In-Process QC<small>ฝ่ายวิจัยและพัฒนา (R&amp;D)</small></div>
     <div class="sign">Final QC<small>ฝ่ายขาย (Sales)</small></div>
   </div>
  </div>
  <scr`+`ipt>
  // Always exactly one page. A long formula used to spill a few rows onto a
  // second sheet that the operator then has to keep track of on the floor, so
  // the sheet is shrunk to fit instead. window.onload (not DOMContentLoaded)
  // because the packaging photos must be laid out before anything is measured.
  window.onload=function(){
    var PAGE_H=1031;              // A4 297mm minus 12mm top and bottom, at 96dpi
    var content=document.querySelector('.content');
    var foot=document.querySelector('.foot');
    // The signature block is part of the page now, so the room left for the body
    // is the page minus the footer. 12px of slack absorbs the rounding between
    // the browser's mm→px conversion and the printer's own.
    var BUDGET=PAGE_H-(foot?foot.offsetHeight+10:0)-12;
    // zoom is applied to .content alone: shrinking .sheet would shrink the
    // full-height flex column too, and the signatures would float mid-page.
    function h(){return content.scrollHeight*(parseFloat(content.style.zoom)||1);}
    if(h()>BUDGET){
      // Floor at 0.55: below that the 10px table text stops being readable, and
      // an unreadable one-pager is worse than two honest pages.
      content.style.zoom=Math.max(0.55,(BUDGET/h())-0.01);
      // zoom reflows text, which can rewrap lines and grow the content again.
      if(h()>BUDGET){
        content.style.zoom=Math.max(0.55,(parseFloat(content.style.zoom)*BUDGET/h())-0.01);
      }
    }
    setTimeout(function(){window.print();},450);
  };
  </scr`+`ipt>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("กรุณาอนุญาต popup เพื่อบันทึกเอกสารเป็น PDF"); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default openProductionSpecDoc;
