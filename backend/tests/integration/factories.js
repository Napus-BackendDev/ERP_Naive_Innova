import BomFormula, { normalizeFormulaName } from "../../src/features/bom/bomFormula.model.js";
import Ingredient from "../../src/features/bom/ingredient.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";
import PackagingItem from "../../src/features/packaging/packagingItem.model.js";

let sequence = 0;
export const nextName = (prefix) => `${prefix}-${++sequence}`;

export async function makeFormula(ownerId, overrides = {}) {
  const name = overrides.name || nextName("Formula");
  return BomFormula.create({
    ownerId,
    name,
    normalizedName: normalizeFormulaName(name),
    bom: { Water: 500, Glycerin: 300 },
    phases: { Water: "A", Glycerin: "B" },
    ...overrides
  });
}

export async function makeIngredient(ownerId, overrides = {}) {
  return Ingredient.create({
    ownerId,
    name: overrides.name || nextName("Ingredient"),
    openingStock: 1000,
    ...overrides
  });
}

export async function makePackagingItem(ownerId, overrides = {}) {
  return PackagingItem.create({
    ownerId,
    name: overrides.name || nextName("Packaging"),
    customer: "ระบบ",
    currentQuantity: 100,
    ...overrides
  });
}

export async function makeOrder(ownerId, overrides = {}) {
  return Customer.create({
    ownerId,
    name: overrides.name || nextName("Order"),
    orderType: "lot",
    section: "s11",
    orderedProducts: [{ formulaName: "Formula", quantityPcs: 10 }],
    ...overrides
  });
}

export async function makeLot(ownerId, overrides = {}) {
  return ProductLot.create({
    ownerId,
    lotNo: overrides.lotNo || nextName("LOT"),
    formulaName: "Formula",
    mfgDate: new Date("2026-01-01"),
    expDate: new Date("2028-01-01"),
    quantity: 10,
    status: "active",
    ...overrides
  });
}
