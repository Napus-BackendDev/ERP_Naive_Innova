import { describe, expect, test } from "vitest";
import {
  formatStructuredMovement,
  formatThaiStockDateTime,
  stockItemTypeForTab
} from "@/lib/stockMovement";

describe("stockItemTypeForTab", () => {
  test.each([
    ["ingredients", "ingredient"],
    ["packagings", "packaging"],
    ["sampleProducts", "sampleProduct"],
    ["fglots", "fgLot"]
  ])("%s -> %s", (tab, expected) => {
    expect(stockItemTypeForTab(tab)).toBe(expected);
  });

  test("unknown tabs return an empty type", () => {
    expect(stockItemTypeForTab("nope")).toBe("");
    expect(stockItemTypeForTab()).toBe("");
  });
});

describe("formatStructuredMovement", () => {
  test("formats an inbound movement with all fields", () => {
    const text = formatStructuredMovement({
      direction: "in",
      amount: 100,
      unit: "ชิ้น",
      beforeQuantity: 50,
      afterQuantity: 150,
      stage: "รับเข้า",
      note: "ตรวจรับแล้ว"
    });
    expect(text).toBe("รับเข้า 100 ชิ้น | ก่อนหน้า: 50 ชิ้น | คงเหลือ: 150 ชิ้น | ขั้นตอน: รับเข้า | หมายเหตุ: ตรวจรับแล้ว");
  });

  test("formats an outbound movement with defaults", () => {
    const text = formatStructuredMovement({
      direction: "out",
      amount: 25,
      beforeQuantity: 100,
      afterQuantity: 75
    });
    expect(text).toBe("ตัดออก 25 ชิ้น | ก่อนหน้า: 100 ชิ้น | คงเหลือ: 75 ชิ้น");
  });

  test("returns empty text for a missing movement", () => {
    expect(formatStructuredMovement(null)).toBe("");
    expect(formatStructuredMovement(undefined)).toBe("");
  });
});

describe("formatThaiStockDateTime", () => {
  test("renders a UTC timestamp in Bangkok time", () => {
    const text = formatThaiStockDateTime("2026-01-01T00:00:00.000Z");
    expect(text).toContain("2569");
    expect(text).toContain("07:00:00");
    expect(text).toContain("น.");
  });

  test("returns a dash for empty input", () => {
    expect(formatThaiStockDateTime("")).toBe("-");
    expect(formatThaiStockDateTime(null)).toBe("-");
  });
});
