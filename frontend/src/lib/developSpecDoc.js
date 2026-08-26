import { assetUrl } from "@/lib/api";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const dash = (s) => (s === 0 || s ? String(s) : "-");
const fmtGram = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("th-TH", { maximumFractionDigits: 2 });
};

/**
 * Open a printable 2-page Develop Order Sheet ("ใบสั่งพัฒนาสูตร 2 หน้า")
 * - Page 1: Requirements & Development Brief Specifications
 * - Page 2: Formula Formulations & Preparation Procedures (สูตรและวิธีการทำ)
 *
 * @param item     Ordered product line (formulaName, brand, briefSpec, customFormulas, etc.)
 * @param customer Owning customer / lead doc (name, brand, phone, address, contactPerson)
 * @param formulas Full BomFormula list to lookup ingredient details & procedures if needed
 */
export function openDevelopSpecDoc({ item = {}, customer = {}, formulas = [], pageMode = "auto" }) {
  const c = customer || {};
  const p = item || {};

  // Extract brief fields both from p.briefSpec object AND directly from product properties
  const briefObj = p.briefSpec || {};
  const productCategory = p.productCategory || briefObj.productCategory;
  const targetSkinPet = p.targetSkinPet || briefObj.targetSkinPet;
  const claims = p.desiredClaim || briefObj.claims || briefObj.desiredClaim;
  const activeIngredients = p.activeIngredients || briefObj.activeIngredients;
  const textureColorScent = p.textureColorScent || briefObj.textureColorScent;
  const prohibitedIngredients = p.ingredientsMustHaveAvoid || briefObj.prohibitedIngredients || briefObj.ingredientsMustHaveAvoid;
  const budgetAndQty = p.budgetAndQty || briefObj.budgetAndQty;
  const timeline = p.timelineTarget || briefObj.timeline || briefObj.timelineTarget;
  const benchmarkSample = p.referenceSample || briefObj.benchmarkSample || briefObj.referenceSample;
  const packagingDetails = p.targetPackaging || briefObj.packagingDetails || briefObj.targetPackaging;
  const marketAndStandard = p.marketStandard || briefObj.marketAndStandard || briefObj.marketStandard;
  const shelfLife = p.shelfLife || briefObj.shelfLife;
  const formulaIP = p.ipNdaAgreement || briefObj.formulaIP || briefObj.ipNdaAgreement;
  const briefNote = p.brief || briefObj.briefNote || briefObj.brief || p.notes || c.notes;

  const customFormulas = Array.isArray(p.customFormulas) ? p.customFormulas : [];
  const statusText = String(p.productionStatus || c.productionStatus || "");
  const isRndDone = Boolean(
    p.rndQcAt ||
    c.rndQcAt ||
    statusText.includes("ผ่าน QC") ||
    statusText.includes("QC เสร็จ")
  );
  const showRequirementsPage = pageMode !== "formula";
  const showFormulaPage = pageMode === "formula" || (pageMode === "auto" && isRndDone);
  const totalPages = (showRequirementsPage ? 1 : 0) + (showFormulaPage ? 1 : 0);
  const requirementsPageNo = showRequirementsPage ? 1 : 0;
  const formulaPageNo = showRequirementsPage ? 2 : 1;

  // Match full BOM formulas for each develop option if available
  const baseFormulaList = customFormulas.length > 0
    ? customFormulas
    : ((p.formulaId || p.formulaName)
      ? [{ formulaId: p.formulaId, name: p.formulaName, resultStatus: p.resultStatus, resultNote: p.resultNote }]
      : []);
  const customFormulasWithDetail = baseFormulaList.map(cf => {
    const cfName = String(cf.name || cf.formulaName || "");
    const normalizedCfName = cfName.replace(/\s*\([^)]*\)\s*$/g, "").trim();
    const fullF = (formulas || []).find(f => {
      const formulaName = String(f.name || "");
      const normalizedFormulaName = formulaName.replace(/\s*\([^)]*\)\s*$/g, "").trim();
      return (cf.formulaId && String(f._id) === String(cf.formulaId))
        || formulaName === cfName
        || normalizedFormulaName === normalizedCfName
        || formulaName.includes(cfName)
        || cfName.includes(formulaName);
    }) || null;
    return {
      ...cf,
      fullFormula: fullF
    };
  }).filter(f => f.resultStatus === "pass" || baseFormulaList.length === 1);

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบสั่งพัฒนาสูตร - ${esc(c.name || "ลูกค้า")}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px;
      min-height: 270mm;
      position: relative;
    }
    .page-break {
      page-break-before: always;
      margin-top: 10px;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 8px;
    }
    .brand-logo {
      font-size: 22px;
      font-weight: 900;
      color: #16a34a;
      letter-spacing: -0.5px;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      text-align: right;
    }
    .doc-sub {
      font-size: 11px;
      color: #64748b;
      text-align: right;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #14532d;
      background: #f0fdf4;
      padding: 6px 12px;
      border-radius: 6px;
      margin-top: 14px;
      margin-bottom: 8px;
      border-left: 4px solid #16a34a;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .grid-table th, .grid-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      vertical-align: top;
    }
    .grid-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      text-align: left;
      width: 25%;
    }

    .brief-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .brief-grid td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      width: 50%;
      vertical-align: top;
      background: #fafafa;
    }
    .brief-label {
      font-size: 11px;
      font-weight: 700;
      color: #15803d;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .brief-val {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      white-space: pre-line;
    }

    .formula-card {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .formula-header {
      font-size: 13px;
      font-weight: 800;
      color: #15803d;
      border-bottom: 1px solid #dcfce7;
      padding-bottom: 6px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }

    .bom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 8px;
    }
    .bom-table th, .bom-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 11px;
      text-align: left;
    }
    .bom-table th {
      background: #e2e8f0;
      color: #334155;
      font-weight: 700;
    }

    .proc-list {
      margin: 4px 0 0 0;
      padding-left: 18px;
      font-size: 11.5px;
      color: #334155;
    }

    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    .signature-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: bottom;
      padding: 10px;
    }
    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      height: 45px;
      margin-bottom: 6px;
    }

    .page-footer-mark {
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 10px;
      color: #94a3b8;
      font-weight: bold;
    }

    @media print {
      body { background: #fff; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="position: fixed; top: 12px; right: 12px; z-index: 9999;">
    <button onclick="window.print()" style="background: #16a34a; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
      🖨️ พิมพ์ / บันทึก PDF ใบสั่งพัฒนาสูตร (${totalPages} หน้า)
    </button>
  </div>

  <!-- ==================== PAGE 1: REQUIREMENT & BRIEF SPECIFICATIONS ==================== -->
  <div class="page" style="${showRequirementsPage ? "" : "display: none;"}">
    <table class="header-table">
      <tr>
        <td>
          <div class="brand-logo">NAIVE INNOVA</div>
          <div style="font-size: 11px; color: #64748b;">Naive Production Execution System — R&D Department</div>
        </td>
        <td>
          <div class="doc-title">ใบสั่งพัฒนาสูตร (FORMULA DEVELOPMENT ORDER)</div>
          <div class="doc-sub">หน้า ${requirementsPageNo}/${totalPages}: ข้อกำหนดความต้องการ (Requirements) | วันที่: ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</div>
        </td>
      </tr>
    </table>

    <!-- Customer & Basic Details -->
    <div class="section-title">1. ข้อมูลลูกค้าและผลิตภัณฑ์เป้าหมาย (CUSTOMER & TARGET PRODUCT)</div>
    <table class="grid-table">
      <tr>
        <th>ชื่อลูกค้า / บริษัท</th>
        <td><strong>${esc(c.name || "-")}</strong></td>
        <th>แบรนด์ (Brand)</th>
        <td><strong>${esc(p.brand || c.brand || "-")}</strong></td>
      </tr>
      <tr>
        <th>เบอร์โทรศัพท์</th>
        <td>${esc(c.phone || c.tel || "-")}</td>
        <th>สูตรที่ต้องการพัฒนา</th>
        <td><strong style="color: #16a34a;">${esc(p.formulaName || "-")}</strong></td>
      </tr>
      <tr>
        <th>ที่อยู่จัดส่ง / ติดต่อ</th>
        <td colspan="3">${esc(c.address || "-")}</td>
      </tr>
    </table>

    <!-- Brief Details -->
    <div class="section-title">2. รายละเอียดข้อกำหนดการพัฒนาสูตร (DEVELOPMENT BRIEF SPECIFICATIONS)</div>
    <table class="brief-grid">
      <tr>
        <td>
          <div class="brief-label">1. ประเกทผลิตภัณฑ์ / กลุ่มเป้าหมาย</div>
          <div class="brief-val">${esc([productCategory, targetSkinPet].filter(Boolean).join(" / ") || "-")}</div>
        </td>
        <td>
          <div class="brief-label">2. Claim ที่อยากได้</div>
          <div class="brief-val">${esc(claims || "-")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="brief-label">3. สารสกัดออกฤทธิ์ (Active Ingredients)</div>
          <div class="brief-val">${esc(activeIngredients || "-")}</div>
        </td>
        <td>
          <div class="brief-label">4. ลักษณะเนื้อ + สี + กลิ่น</div>
          <div class="brief-val">${esc(textureColorScent || "-")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="brief-label">5. สารต้องมี / สารต้องห้ามเว้น</div>
          <div class="brief-val">${esc(prohibitedIngredients || "-")}</div>
        </td>
        <td>
          <div class="brief-label">6. งบต่อหน่วย + จำนวน</div>
          <div class="brief-val">${esc(budgetAndQty || "-")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="brief-label">7. Timeline กำหนดส่ง</div>
          <div class="brief-val">${esc(timeline || "-")}</div>
        </td>
        <td>
          <div class="brief-label">8. ตัวอย่างอ้างอิง (Benchmark Sample)</div>
          <div class="brief-val">${esc(benchmarkSample || "-")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="brief-label">9. บรรจุภัณฑ์ที่จะใช้</div>
          <div class="brief-val">${esc(packagingDetails || "-")}</div>
        </td>
        <td>
          <div class="brief-label">10. ตลาด + มาตรฐาน (FDA / อย.)</div>
          <div class="brief-val">${esc(marketAndStandard || "-")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="brief-label">11. Shelf life ที่ต้องการ</div>
          <div class="brief-val">${esc(shelfLife || "-")}</div>
        </td>
        <td>
          <div class="brief-label">12. สิทธิของสูตร (IP / NDA)</div>
          <div class="brief-val">${esc(formulaIP || "-")}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="brief-label">หมายเหตุสรุปรวม / Brief Note เพิ่มเติม</div>
          <div class="brief-val">${esc(briefNote || "-")}</div>
        </td>
      </tr>
    </table>

    <!-- Signatures Page 1 -->
    <table class="signature-table">
      <tr>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">ผู้รับบรีฟ / ฝ่ายขาย (Sales)</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">นักวิจัยและพัฒนาสูตร (R&D Chemist)</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">ผู้อนุมัติสูตร (R&D Manager)</div>
        </td>
      </tr>
    </table>
    <div class="page-footer-mark">หน้า ${requirementsPageNo} / ${totalPages} (Requirements Brief)</div>
  </div>


  <!-- ==================== PAGE 2: FORMULA FORMULATIONS & PREPARATION PROCEDURES ==================== -->
  <div class="${showRequirementsPage ? "page page-break" : "page"}" style="${showFormulaPage ? "" : "display: none;"}">
    <table class="header-table">
      <tr>
        <td>
          <div class="brand-logo">NAIVE INNOVA</div>
          <div style="font-size: 11px; color: #64748b;">Naive Production Execution System — R&D Department</div>
        </td>
        <td>
          <div class="doc-title">สูตรและวิธีการทำ (FORMULATIONS & PROCEDURES)</div>
          <div class="doc-sub">หน้า ${formulaPageNo}/${totalPages}: สูตรทางเลือกและขั้นตอนผลิต | วันที่: ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</div>
        </td>
      </tr>
    </table>

    <div class="section-title">3. รายการสูตรทางเลือกและขั้นตอนวิธีการผสม (FORMULATION DETAILS & PROCEDURES)</div>

    ${customFormulasWithDetail.length > 0 ? customFormulasWithDetail.map((f, i) => {
      const fullF = f.fullFormula || f;
      const ingList = fullF?.ingredients || [];
      const procList = fullF?.procedures || [];
      const notesList = fullF?.note || [];

      return `
        <div class="formula-card">
          <div class="formula-header">
            <span>🧪 ${esc(f.name || "")}</span>
            <span>${f.resultStatus === "pass" ? "อนุมัติแล้ว" : f.resultStatus === "fail" ? "ไม่ผ่าน" : ""}</span>
          </div>

          <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">
            <strong>รายละเอียด/สเปกสูตร:</strong> ${esc(f.description || "-")}
          </div>

          ${procList.length > 0 ? `
            <div style="font-weight: 700; font-size: 11px; color: #16a34a; margin-top: 6px;">วิธีการผลิต / ขั้นตอนการผสม</div>
            <ol class="proc-list">
              ${procList.map(step => `<li>${esc(step)}</li>`).join("")}
            </ol>
          ` : ""}

          ${notesList.length > 0 ? `
            <div style="font-size: 11px; color: #475569; margin-top: 6px;"><strong>หมายเหตุของสูตร:</strong> ${notesList.map(n => esc(n)).join(" · ")}</div>
          ` : ""}

          ${ingList.length > 0 ? `
            <div style="font-weight: 700; font-size: 11px; color: #16a34a; margin-top: 8px;">ตารางสูตร</div>
            <table class="bom-table">
              <thead>
                <tr>
                  <th style="width: 10%;">ขั้นตอน</th>
                  <th style="width: 42%;">ชื่อสารเคมี</th>
                  <th style="width: 14%;">กลุ่ม</th>
                  <th style="width: 17%; text-align: right;">100 ก.</th>
                  <th style="width: 17%; text-align: right;">ต่อ 1 กก.</th>
                </tr>
              </thead>
              <tbody>
                ${ingList.map((row, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${esc(row.name || "-")}</td>
                    <td><strong style="color: #16a34a;">${esc(row.phase || row.group || "-")}</strong></td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;">${fmtGram((Number(row.ratio) || 0) * 100)} ก.</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold;">${fmtGram((Number(row.ratio) || 0) * 1000)} ก.</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          ` : `
            <div style="font-size: 11px; color: #94a3b8; italic; margin-top: 4px;">* ยังไม่ได้บันทึกตารางสารเคมี BOM รายตัวในระบบ</div>
          `}

          ${f.resultNote ? `
            <div style="font-size: 11px; background: #fff; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1; color: #475569; margin-top: 6px;">
              <strong>💬 ข้อเสนอแนะ/ความคิดเห็นลูกค้า:</strong> ${esc(f.resultNote)}
            </div>
          ` : ""}
        </div>
      `;
    }).join("") : `
      <div style="padding: 24px; text-align: center; font-size: 13px; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 8px; background: #fafafa;">
        ยังไม่ได้สร้างรายการสูตรทางเลือกในระบบ — กรุณาสร้างสูตรพัฒนาทางเลือกในระบบ R&D
      </div>
    `}

    <!-- Signatures Page 2 -->
    <table class="signature-table">
      <tr>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">นักวิจัยและพัฒนาสูตร (Formulator)</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">ผู้ตรวจสอบสูตร (QC Checker)</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700; font-size: 11px;">( ____________________________ )</div>
          <div style="font-size: 11px; color: #64748b;">ผู้อนุมัติสูตร (R&D Manager)</div>
        </td>
      </tr>
    </table>
    <div class="page-footer-mark">หน้า ${formulaPageNo} / ${totalPages} (Formulations & Procedures)</div>
  </div>

  <script>
    setTimeout(function(){ window.print(); }, 450);
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export default openDevelopSpecDoc;
