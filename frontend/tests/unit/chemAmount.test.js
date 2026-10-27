import { describe, expect, test } from "vitest";
import { exactChem, fmtChem } from "@/lib/chemAmount";

describe("exactChem — never round a weighed amount", () => {
  test("removes IEEE-754 float noise only", () => {
    expect(exactChem(1498.7500000000002)).toBe(1498.75);
    expect(exactChem(0.29975 * 5000)).toBe(1498.75);
  });

  test("keeps every real digit", () => {
    expect(exactChem(1498.75)).toBe(1498.75);
    expect(exactChem(0.123456)).toBe(0.123456);
    expect(exactChem(299.75)).toBe(299.75);
  });

  test("coerces strings and guards invalid values", () => {
    expect(exactChem("250.5")).toBe(250.5);
    expect(exactChem("abc")).toBe(0);
    expect(exactChem(Infinity)).toBe(0);
    expect(exactChem(undefined)).toBe(0);
  });
});

describe("fmtChem — exact value with thousands separators", () => {
  test("formats without padding or rounding", () => {
    expect(fmtChem(1498.75)).toBe("1,498.75");
    expect(fmtChem(250)).toBe("250");
    expect(fmtChem(0.5)).toBe("0.5");
  });

  test("never shows the float artifact", () => {
    expect(fmtChem(0.29975 * 5000)).toBe("1,498.75");
  });
});
