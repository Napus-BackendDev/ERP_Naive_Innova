// ---------------------------------------------------------------------------
// The one place that decides which module an audit-log row belongs to.
//
// The Logs screen used to guess from the Thai description, and because nearly
// every production and stock message names the customer ("...ลูกค้า X..."), the
// "ลูกค้า" test matched first and swallowed everything: Sale 179, Production 0,
// Stock 0, on a database holding 219 PRODUCTION and 178 PRODUCTION_SCHEDULE
// rows. actionType is the authority; the keywords are only a last resort for
// rows written before a type existed.
// ---------------------------------------------------------------------------

export const LOG_CATEGORIES = ["sales", "rnd", "production", "stock", "user"];

const BY_ACTION_TYPE = {
  SALES_CRM: "sales",
  SALES: "sales",
  CRM: "sales",
  QUOTATION: "sales",

  FORMULA: "rnd",
  RND: "rnd",
  BOM: "rnd",
  RESEARCH: "rnd",

  PRODUCTION: "production",
  PRODUCTION_SCHEDULE: "production",
  MACHINE: "production",
  QC: "production",

  INGREDIENT: "stock",
  PACKAGING: "stock",
  STOCK: "stock",
  FG: "stock",
  WAREHOUSE: "stock",

  USER: "user",
  AUTH: "user",
  ROLE: "user",
  PERMISSION: "user"
};

// Only reached when actionType is missing or unrecognised. Ordered most- to
// least-specific: "ลูกค้า" is deliberately absent — it appears in every module.
const BY_KEYWORD = [
  ["user", ["ผู้ใช้งาน", "รหัสผ่าน", "สิทธิ์", "เข้าสู่ระบบ", "login"]],
  ["stock", ["คลัง", "บรรจุภัณฑ์", "สต็อก", "สต๊อก", "วัตถุดิบ", "รับเข้า", "ตัดสต็อก"]],
  ["production", ["ผลิต", "เครื่องจักร", "คิว", "qc", "ล็อต", "บรรจุ"]],
  ["rnd", ["สูตร", "r&d", "วิจัย", "bom"]],
  ["sales", ["ดีล", "lead", "crm", "เสนอราคา", "ลูกค้า"]]
];

export function categoryOfLog(log = {}) {
  const byType = BY_ACTION_TYPE[String(log.actionType || "").toUpperCase()];
  if (byType) return byType;

  const desc = String(log.description || "").toLowerCase();
  for (const [cat, words] of BY_KEYWORD) {
    if (words.some(w => desc.includes(w))) return cat;
  }
  return "other";
}

// The actionType values that map to one category — used to build a Mongo filter
// so paging and counting happen in the database, not after loading everything.
export function actionTypesForCategory(category) {
  return Object.entries(BY_ACTION_TYPE)
    .filter(([, cat]) => cat === category)
    .map(([type]) => type);
}
