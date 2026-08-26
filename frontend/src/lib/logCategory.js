// Mirror of backend/src/features/logs/logCategory.js — the server decides which
// rows a tab contains, this decides which icon a row gets. Same table, so the
// badge on a row can never disagree with the tab it was returned under.

const BY_ACTION_TYPE = {
  SALES_CRM: "sales", SALES: "sales", CRM: "sales", QUOTATION: "sales",
  FORMULA: "rnd", RND: "rnd", BOM: "rnd", RESEARCH: "rnd",
  PRODUCTION: "production", PRODUCTION_SCHEDULE: "production", MACHINE: "production", QC: "production",
  INGREDIENT: "stock", PACKAGING: "stock", STOCK: "stock", FG: "stock", WAREHOUSE: "stock",
  USER: "user", AUTH: "user", ROLE: "user", PERMISSION: "user"
};

export function categoryOfLog(log = {}) {
  return BY_ACTION_TYPE[String(log.actionType || "").toUpperCase()] || "other";
}

export const CATEGORY_LABEL = {
  sales: "Sale (CRM)",
  rnd: "RD (สูตร & วิจัย)",
  production: "Production (ผลิต)",
  stock: "Stock (คลังสินค้า)",
  user: "User (ผู้ใช้งาน)",
  other: "อื่น ๆ"
};
