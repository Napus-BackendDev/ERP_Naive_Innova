import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  endRequest,
  getPending,
  startRequest,
  subscribePending
} from "@/lib/pendingRequests";

// ตัวนับเป็น state ระดับโมดูล (shared) ทุกเคสจึงต้องคืนค่ากลับเป็น 0 ก่อนรัน
const settle = () => {
  while (getPending() > 0) endRequest();
};

describe("pendingRequests — ตัวนับ API request ระหว่างทาง", () => {
  beforeEach(settle);

  describe("Basic Flow", () => {
    test("[Positive] เริ่ม request หนึ่งตัวแล้วจบ ตัวนับกลับเป็น 0", () => {
      expect(getPending()).toBe(0);
      startRequest();
      expect(getPending()).toBe(1);
      endRequest();
      expect(getPending()).toBe(0);
    });

    test("[Positive] request พร้อมกันสองตัว นับได้ 2 และลดทีละ 1", () => {
      startRequest();
      startRequest();
      expect(getPending()).toBe(2);
      endRequest();
      expect(getPending()).toBe(1);
      endRequest();
      expect(getPending()).toBe(0);
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] ผู้ติดตามได้รับค่าปัจจุบันทันทีที่ลงทะเบียน", () => {
      startRequest();
      const listener = vi.fn();
      const unsubscribe = subscribePending(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1);
      unsubscribe();
      settle();
    });

    test("[Positive] ผู้ติดตามถูกแจ้งทุกครั้งที่ค่าเปลี่ยน และ unsubscribe หยุดการแจ้ง", () => {
      const listener = vi.fn();
      const unsubscribe = subscribePending(listener);
      startRequest();
      endRequest();
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenLastCalledWith(0);

      unsubscribe();
      startRequest();
      expect(listener).toHaveBeenCalledTimes(3);
      settle();
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] endRequest โดยยังไม่ได้เริ่ม ไม่ทำให้ตัวนับติดลบ", () => {
      endRequest();
      endRequest();
      expect(getPending()).toBe(0);
    });

    test("[Negative] interceptor ที่ยิงทั้ง success และ error (จบคู่ซ้ำ) ไม่ทำให้ตัวนับติดลบ", () => {
      startRequest();
      endRequest();
      endRequest();
      endRequest();
      expect(getPending()).toBe(0);
    });
  });
});
