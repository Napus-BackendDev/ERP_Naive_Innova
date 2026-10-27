import { describe, expect, test } from "vitest";
import {
  LOG_CATEGORIES,
  actionTypesForCategory,
  categoryOfLog
} from "../../src/features/logs/logCategory.js";

describe("categoryOfLog — actionType is the authority", () => {
  test.each([
    ["SALES_CRM", "sales"],
    ["sales", "sales"],
    ["QUOTATION", "sales"],
    ["FORMULA", "rnd"],
    ["BOM", "rnd"],
    ["PRODUCTION", "production"],
    ["production_schedule", "production"],
    ["QC", "production"],
    ["INGREDIENT", "stock"],
    ["FG", "stock"],
    ["USER", "user"],
    ["AUTH", "user"]
  ])("%s -> %s", (actionType, expected) => {
    expect(categoryOfLog({ actionType })).toBe(expected);
  });

  test("actionType wins even when the description mentions another module", () => {
    expect(categoryOfLog({
      actionType: "PRODUCTION",
      description: "ปรับปรุงสต็อกวัตถุดิบให้ลูกค้า ABC"
    })).toBe("production");
  });

  test("unknown actionType falls back to description keywords", () => {
    expect(categoryOfLog({ description: "เข้าสู่ระบบด้วย Google" })).toBe("user");
    expect(categoryOfLog({ description: "รับเข้าคลังบรรจุภัณฑ์" })).toBe("stock");
    expect(categoryOfLog({ description: "จัดคิวเครื่องจักรผลิต" })).toBe("production");
    expect(categoryOfLog({ description: "บันทึกสูตร R&D ใหม่" })).toBe("rnd");
    expect(categoryOfLog({ description: "สร้างดีลลูกค้าใหม่" })).toBe("sales");
  });

  test("falls back to other when nothing matches", () => {
    expect(categoryOfLog({})).toBe("other");
    expect(categoryOfLog({ actionType: "UNKNOWN", description: "อะไรสักอย่าง" })).toBe("other");
  });
});

describe("actionTypesForCategory", () => {
  test("returns every actionType that maps to the category", () => {
    expect(actionTypesForCategory("stock")).toEqual(
      expect.arrayContaining(["INGREDIENT", "PACKAGING", "STOCK", "FG", "WAREHOUSE"])
    );
    expect(actionTypesForCategory("sales")).toEqual(
      expect.arrayContaining(["SALES_CRM", "SALES", "CRM", "QUOTATION"])
    );
  });

  test("unknown category returns an empty list", () => {
    expect(actionTypesForCategory("nope")).toEqual([]);
  });

  test("category list is stable", () => {
    expect(LOG_CATEGORIES).toEqual(["sales", "rnd", "production", "stock", "user"]);
  });
});
