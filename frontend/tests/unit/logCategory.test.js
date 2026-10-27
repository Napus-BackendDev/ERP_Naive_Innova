import { describe, expect, test } from "vitest";
import { CATEGORY_LABEL, categoryOfLog } from "@/lib/logCategory";

describe("categoryOfLog (frontend mirror)", () => {
  test.each([
    ["SALES_CRM", "sales"],
    ["QUOTATION", "sales"],
    ["FORMULA", "rnd"],
    ["BOM", "rnd"],
    ["PRODUCTION", "production"],
    ["QC", "production"],
    ["INGREDIENT", "stock"],
    ["WAREHOUSE", "stock"],
    ["USER", "user"],
    ["AUTH", "user"]
  ])("%s -> %s", (actionType, expected) => {
    expect(categoryOfLog({ actionType })).toBe(expected);
  });

  test("unknown or missing types fall back to other", () => {
    expect(categoryOfLog({})).toBe("other");
    expect(categoryOfLog({ actionType: "WHATEVER" })).toBe("other");
  });

  test("every category has a label", () => {
    for (const key of ["sales", "rnd", "production", "stock", "user", "other"]) {
      expect(CATEGORY_LABEL[key]).toBeTruthy();
    }
  });
});
