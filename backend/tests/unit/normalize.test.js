import { describe, expect, test } from "vitest";
import { normalizeFormulaName } from "../../src/features/bom/bomFormula.model.js";
import { normalizeIngredientName } from "../../src/features/bom/bom.routes.js";

describe("normalizeFormulaName", () => {
  test("trims, lowercases and normalizes unicode", () => {
    expect(normalizeFormulaName("  Eco Guard Plus  ")).toBe("eco guard plus");
    expect(normalizeFormulaName("ＳＯＦＴ　ＣＡＲＥ")).toBe("soft care");
  });

  test("removes zero-width and non-breaking spaces", () => {
    expect(normalizeFormulaName("สูตร\u200Bดี\u00A0มาก")).toBe("สูตร ดี มาก");
  });

  test("treats blank input as an empty key", () => {
    expect(normalizeFormulaName()).toBe("");
    expect(normalizeFormulaName(null)).toBe("");
  });
});

describe("normalizeIngredientName", () => {
  test("ignores case, whitespace and punctuation", () => {
    const key = normalizeIngredientName("Eco-guard Plus");
    expect(key).toBe("ecoguardplus");
    expect(normalizeIngredientName("ecoguard_plus")).toBe(key);
    expect(normalizeIngredientName("  ECO GUARD (PLUS) ")).toBe(key);
  });

  test("removes invisible marks", () => {
    expect(normalizeIngredientName("Butylated\uFEFF hydroxytoluene"))
      .toBe("butylatedhydroxytoluene");
  });

  test("blank input yields an empty key", () => {
    expect(normalizeIngredientName("")).toBe("");
    expect(normalizeIngredientName(undefined)).toBe("");
  });
});
