import { describe, expect, test, vi } from "vitest";
import {
  SHELF_LIFE_YEARS,
  addYears,
  resolveExpDate,
  resolveMfgDate,
  toDateOnly,
  todayDateOnly,
  withLotDates
} from "@/lib/lotDates";

describe("toDateOnly", () => {
  test("slices ISO strings instead of shifting the UTC day", () => {
    expect(toDateOnly("2026-07-21T00:00:00.000Z")).toBe("2026-07-21");
    expect(toDateOnly("2026-07-21")).toBe("2026-07-21");
  });

  test("handles Date objects in local time", () => {
    expect(toDateOnly(new Date(2026, 6, 21))).toBe("2026-07-21");
  });

  test("returns empty for missing or invalid values", () => {
    expect(toDateOnly("")).toBe("");
    expect(toDateOnly(null)).toBe("");
    expect(toDateOnly(new Date("invalid"))).toBe("");
    expect(toDateOnly("not-a-date")).toBe("");
  });
});

describe("addYears", () => {
  test("adds the two-year shelf life by default", () => {
    expect(SHELF_LIFE_YEARS).toBe(2);
    expect(addYears("2026-07-21")).toBe("2028-07-21");
  });

  test("clamps Feb 29 to Feb 28 in non-leap years", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });

  test("supports negative years and empty input", () => {
    expect(addYears("2026-01-01", -1)).toBe("2025-01-01");
    expect(addYears("")).toBe("");
  });
});

describe("resolveMfgDate / resolveExpDate", () => {
  test("prefers explicit MFG, then the production lot stamp", () => {
    expect(resolveMfgDate({ mfgDate: "2026-01-02", lotStampMfg: "2026-03-04" })).toBe("2026-01-02");
    expect(resolveMfgDate({ lotStampMfg: "2026-03-04" })).toBe("2026-03-04");
    expect(resolveMfgDate({})).toBe("");
  });

  test("prefers explicit EXP, then the lot stamp", () => {
    expect(resolveExpDate({ expDate: "2028-01-02", lotStampExp: "2028-03-04" })).toBe("2028-01-02");
    expect(resolveExpDate({ lotStampExp: "2028-03-04" })).toBe("2028-03-04");
  });

  test("falls back to MFG + shelf life so a sheet never prints a blank EXP", () => {
    expect(resolveExpDate({ mfgDate: "2026-07-21" })).toBe("2028-07-21");
    expect(resolveExpDate({})).toBe("");
  });
});

describe("withLotDates", () => {
  test("fills both dates before save", () => {
    const result = withLotDates({ mfgDate: "2026-07-21" });
    expect(result.mfgDate).toBe("2026-07-21");
    expect(result.expDate).toBe("2028-07-21");
  });

  test("uses today when MFG is missing", () => {
    const result = withLotDates({});
    expect(result.mfgDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.expDate).toBe(addYears(result.mfgDate));
  });
});

describe("todayDateOnly — วันที่วันนี้ในเวลาเครื่อง", () => {
  describe("Basic Flow", () => {
    test("[Positive] คืนค่าวันที่รูปแบบ YYYY-MM-DD ตรงกับวันนี้", () => {
      const today = todayDateOnly();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(today).toBe(toDateOnly(new Date()));
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] ใช้เวลาในเครื่อง (local) ไม่ใช่ UTC จึงไม่เพี้ยนข้ามวัน", () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(2030, 2, 5, 23, 30, 0)); // 5 มี.ค. 2030 23:30 local
        expect(todayDateOnly()).toBe("2030-03-05");
      } finally {
        vi.useRealTimers();
      }
    });

    test("[Positive] withLotDates ใช้วันนี้เมื่อ MFG ว่างและต่ออายุ +2 ปี", () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date(2030, 2, 5, 23, 30, 0));
        const result = withLotDates({});
        expect(result.mfgDate).toBe("2030-03-05");
        expect(result.expDate).toBe("2032-03-05");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] MFG ที่ไม่ใช่วันที่จริงจะถูกทิ้งและใช้วันนี้แทน", () => {
      const result = withLotDates({ mfgDate: "not-a-date", expDate: "" });
      expect(result.mfgDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.expDate).toBe(addYears(result.mfgDate));
    });

    test("[Negative] expDate ที่กรอกไว้เองไม่ถูกเขียนทับ", () => {
      const result = withLotDates({ mfgDate: "2026-07-21", expDate: "2029-12-31" });
      expect(result.mfgDate).toBe("2026-07-21");
      expect(result.expDate).toBe("2029-12-31");
    });
  });
});
