import { describe, expect, test } from "vitest";
import { stockMovementDescription } from "../../src/features/logs/stockMovementLog.js";

describe("stockMovementDescription — flow ข้อความ audit การปรับสต็อก", () => {
  describe("Basic Flow", () => {
    test("[Positive] รับเข้า แสดงจำนวน หน่วย และสต็อกคงเหลือครบทุกส่วน", () => {
      const text = stockMovementDescription({
        itemName: "ขวดพลาสติก 100ml",
        direction: "in",
        amount: 500,
        unit: "ชิ้น",
        afterQuantity: 1500
      });
      expect(text).toContain('ปรับปรุงสต็อก "ขวดพลาสติก 100ml"');
      expect(text).toContain("รับเข้า 500 ชิ้น");
      expect(text).toContain("สต็อกคงเหลือปัจจุบัน: 1500 ชิ้น");
      expect(text).not.toContain("หมายเหตุ");
    });

    test("[Positive] เบิกออก แสดงเครื่องหมายหักออกพร้อมสต็อกคงเหลือ", () => {
      const text = stockMovementDescription({
        itemName: "ฝาปั๊ม",
        direction: "out",
        amount: 120,
        unit: "ชิ้น",
        afterQuantity: 80
      });
      expect(text).toContain("เบิกออก 120 ชิ้น");
      expect(text).toContain("สต็อกคงเหลือปัจจุบัน: 80 ชิ้น");
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] มีหมายเหตุจะถูกต่อท้ายด้วยเครื่องหมาย |", () => {
      const text = stockMovementDescription({
        itemName: "สติกเกอร์",
        direction: "out",
        amount: 10,
        unit: "แผ่น",
        afterQuantity: 40,
        note: "นับจริงรอบปลายเดือน"
      });
      expect(text).toContain("| หมายเหตุ: นับจริงรอบปลายเดือน");
    });

    test("[Positive] จำนวนทศนิยมถูกแสดงตามที่ส่งมาโดยไม่ปัดเศษ", () => {
      const text = stockMovementDescription({
        itemName: "น้ำหอมเข้มข้น",
        direction: "out",
        amount: 2.75,
        unit: "L",
        afterQuantity: 17.25
      });
      expect(text).toContain("เบิกออก 2.75 L");
      expect(text).toContain("17.25 L");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] direction ที่ไม่ตรงกับ in (รวมตัวพิมพ์ใหญ่) ถูกจัดเป็นการเบิกออก", () => {
      expect(stockMovementDescription({
        itemName: "A", direction: "IN", amount: 1, unit: "ชิ้น", afterQuantity: 1
      })).toContain("เบิกออก 1 ชิ้น");

      expect(stockMovementDescription({
        itemName: "A", direction: "OUT", amount: 1, unit: "ชิ้น", afterQuantity: 1
      })).toContain("เบิกออก 1 ชิ้น");
    });

    test("[Negative] เรียกโดยไม่มี field ใดๆ จะแสดงเป็นค่าว่างและไม่โยน exception", () => {
      expect(() => stockMovementDescription({})).not.toThrow();
      const text = stockMovementDescription({});
      expect(text).toContain("เบิกออก");
      expect(text).toContain("undefined");
    });
  });
});
