import { describe, expect, test } from "vitest";
import { stockMovementDescription } from "../../src/features/logs/stockMovementLog.js";

describe("stockMovementDescription", () => {
  test("formats an inbound movement", () => {
    expect(stockMovementDescription({
      itemName: "น้ำหอม A",
      direction: "in",
      amount: 100,
      unit: "ชิ้น",
      afterQuantity: 250
    })).toBe('ปรับปรุงสต็อก "น้ำหอม A": รับเข้า 100 ชิ้น (สต็อกคงเหลือปัจจุบัน: 250 ชิ้น)');
  });

  test("formats an outbound movement", () => {
    const text = stockMovementDescription({
      itemName: "สาร B",
      direction: "out",
      amount: 25.5,
      unit: "kg",
      afterQuantity: 74.5
    });
    expect(text).toContain("เบิกออก 25.5 kg");
    expect(text).toContain("74.5 kg");
  });

  test("appends the note only when provided", () => {
    const withNote = stockMovementDescription({
      itemName: "C",
      direction: "in",
      amount: 1,
      unit: "ชิ้น",
      afterQuantity: 1,
      note: "ปรับยอดนับจริง"
    });
    expect(withNote).toContain("| หมายเหตุ: ปรับยอดนับจริง");

    const withoutNote = stockMovementDescription({
      itemName: "C",
      direction: "in",
      amount: 1,
      unit: "ชิ้น",
      afterQuantity: 1
    });
    expect(withoutNote).not.toContain("หมายเหตุ");
  });
});
