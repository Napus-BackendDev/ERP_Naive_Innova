import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { makeFormula, makeIngredient, makeOrder } from "./factories.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import BomFormula from "../../src/features/bom/bomFormula.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import Ingredient from "../../src/features/bom/ingredient.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const confirmPayload = (formula, overrides = {}) => ({
  formulaId: String(formula._id),
  quantityKg: 2,
  productId: "PROD-1",
  lotNo: "LOT-CONFIRM-1",
  mfgDate: "2026-08-01",
  expDate: "2028-08-01",
  lotQuantity: 20,
  customer: "Order Customer",
  ...overrides
});

describe("BOM — raw-material import and adjustment", () => {
  test("rejects unauthenticated ingredient access", async () => {
    const res = await request(app).get("/api/bom/ingredients");
    expect(res.status).toBe(401);
  });

  test("bulk-imports ingredients and skips rows without a name", async () => {
    const res = await asUser(request(app).post("/api/bom/ingredients/bulk"), ctx.token).send({
      items: [
        { name: "Water", openingStock: 5000, supplier: "A", pricePerKg: 12 },
        { name: "Glycerin", openingStock: 2500 },
        { openingStock: 999 }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(await Ingredient.countDocuments({ ownerId: ctx.user._id })).toBe(2);
  });

  test("adjusts ingredient stock in and out with movement logs", async () => {
    const ingredient = await makeIngredient(ctx.user._id, { openingStock: 100 });

    const inbound = await asUser(request(app).post("/api/bom/ingredients/tx"), ctx.token).send({
      itemId: ingredient._id,
      type: "in",
      amount: 25,
      note: "receive"
    });
    expect(inbound.status).toBe(200);
    expect(inbound.body.item.openingStock).toBe(125);

    const outbound = await asUser(request(app).post("/api/bom/ingredients/tx"), ctx.token).send({
      itemId: ingredient._id,
      type: "out",
      amount: 40
    });
    expect(outbound.status).toBe(200);
    expect(outbound.body.item.openingStock).toBe(85);

    const logs = await ActivityLog.find({ "stockMovement.itemId": ingredient._id });
    expect(logs).toHaveLength(2);
    expect(await ActivityLog.countDocuments({
      "stockMovement.itemId": ingredient._id,
      "stockMovement.direction": "out",
      "stockMovement.amount": 40
    })).toBe(1);
  });

  test("rejects invalid ingredient transaction arguments", async () => {
    const res = await asUser(request(app).post("/api/bom/ingredients/tx"), ctx.token).send({
      itemId: "not-an-object-id",
      type: "sideways",
      amount: 0
    });
    expect(res.status).toBe(400);
  });
});

describe("BOM — formula import, rename and archive", () => {
  test("bulk-imports formulas and increments the version on re-import", async () => {
    const res = await asUser(request(app).post("/api/bom/formulas/bulk"), ctx.token).send({
      formulas: [
        { name: "Bulk Formula", bom: { Water: 1000 } },
        { name: "bulk formula", bom: { Water: 900 } }
      ]
    });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].version).toBe(1);
    expect(res.body.results[1].version).toBe(2);
    expect(await BomFormula.countDocuments({ ownerId: ctx.user._id })).toBe(1);
  });

  test("renames a formula and propagates the name to pending order lines", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Old Formula" });
    const order = await makeOrder(ctx.user._id, {
      orderedProducts: [{ formulaId: formula._id, formulaName: "Old Formula", quantityPcs: 5 }]
    });

    const res = await asUser(request(app).put(`/api/bom/formulas/${formula._id}`), ctx.token).send({
      name: "New Formula",
      bom: { Water: 600 }
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Formula");
    expect(res.body.version).toBe(2);

    const updated = await Customer.findById(order._id);
    expect(updated.orderedProducts[0].formulaName).toBe("New Formula");
  });

  test("refuses to archive a formula still used by a pending order", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Pending Formula" });
    await makeOrder(ctx.user._id, {
      orderedProducts: [{ formulaId: formula._id, formulaName: "Pending Formula" }]
    });

    const res = await asUser(request(app).delete(`/api/bom/formulas/${formula._id}`), ctx.token);
    expect(res.status).toBe(409);
    expect(res.body.pendingOrderCount).toBe(1);
    expect((await BomFormula.findById(formula._id)).isArchived).toBe(false);
  });

  test("archives an unused formula and hides it from the default list", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Unused Formula" });

    const res = await asUser(request(app).delete(`/api/bom/formulas/${formula._id}`), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.formula.isArchived).toBe(true);

    const list = await asUser(request(app).get("/api/bom/formulas"), ctx.token);
    expect(list.body.map((f) => f.name)).not.toContain("Unused Formula");

    const all = await asUser(
      request(app).get("/api/bom/formulas?includeArchived=true"),
      ctx.token
    );
    expect(all.body.map((f) => f.name)).toContain("Unused Formula");
  });
});

describe("BOM — production confirm and revert", () => {
  test("confirms production, deducts ingredients and creates an FG lot", async () => {
    const formula = await makeFormula(ctx.user._id, {
      name: "Confirm Formula",
      bom: { Water: 500, Glycerin: 300 }
    });
    const water = await makeIngredient(ctx.user._id, { name: "Water", openingStock: 5000 });
    const glycerin = await makeIngredient(ctx.user._id, { name: "Glycerin", openingStock: 5000 });
    const order = await makeOrder(ctx.user._id, {
      name: "Confirm Customer",
      orderedProducts: [{ formulaId: formula._id, formulaName: "Confirm Formula", quantityPcs: 20 }]
    });

    const res = await asUser(request(app).post("/api/bom/confirm-production"), ctx.token).send(
      confirmPayload(formula, { customerId: String(order._id), customer: order.name })
    );

    expect(res.status).toBe(201);
    expect(res.body.deductedIngredients).toEqual({ Water: 1000, Glycerin: 600 });
    expect((await Ingredient.findById(water._id)).openingStock).toBe(4000);
    expect((await Ingredient.findById(glycerin._id)).openingStock).toBe(4400);

    const lot = await ProductLot.findOne({ orderId: order._id, source: "bom-confirm" });
    expect(lot).toBeTruthy();
    expect(lot.lotNo).toBe("LOT-CONFIRM-1");
    expect(lot.quantity).toBe(20);

    const savedOrder = await Customer.findById(order._id);
    expect(savedOrder.productionStatus).toBe("รอยืนยัน");
    expect(savedOrder.orderedProducts[0].isConfirmed).toBe(true);
    expect(String(savedOrder.orderedProducts[0].producedLotId)).toBe(String(lot._id));
  });

  test("blocks production confirmation for a development order", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Dev Formula" });
    await makeIngredient(ctx.user._id, { name: "Water", openingStock: 5000 });
    await makeIngredient(ctx.user._id, { name: "Glycerin", openingStock: 5000 });
    const order = await makeOrder(ctx.user._id, {
      orderType: "develop",
      orderedProducts: [{ formulaId: formula._id, formulaName: "Dev Formula" }]
    });

    const res = await asUser(request(app).post("/api/bom/confirm-production"), ctx.token).send(
      confirmPayload(formula, { customerId: String(order._id), customer: order.name })
    );

    expect(res.status).toBe(409);
    expect(await ProductLot.countDocuments({ orderId: order._id })).toBe(0);
  });

  test("rejects confirmation when ingredient stock is insufficient", async () => {
    const formula = await makeFormula(ctx.user._id, {
      name: "Short Formula",
      bom: { Water: 500 }
    });
    const water = await makeIngredient(ctx.user._id, { name: "Water", openingStock: 100 });
    const order = await makeOrder(ctx.user._id, {
      orderedProducts: [{ formulaId: formula._id, formulaName: "Short Formula" }]
    });

    const res = await asUser(request(app).post("/api/bom/confirm-production"), ctx.token).send(
      confirmPayload(formula, { customerId: String(order._id), quantityKg: 2 })
    );

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/ไม่เพียงพอ/);
    expect((await Ingredient.findById(water._id)).openingStock).toBe(100);
    expect(await ProductLot.countDocuments({ orderId: order._id })).toBe(0);
  });

  test("reverts production, restores ingredients and deletes the FG lot", async () => {
    const formula = await makeFormula(ctx.user._id, {
      name: "Revert Formula",
      bom: { Water: 500, Glycerin: 300 }
    });
    const water = await makeIngredient(ctx.user._id, { name: "Water", openingStock: 5000 });
    const glycerin = await makeIngredient(ctx.user._id, { name: "Glycerin", openingStock: 5000 });
    const order = await makeOrder(ctx.user._id, {
      name: "Revert Customer",
      orderedProducts: [{ formulaId: formula._id, formulaName: "Revert Formula" }]
    });

    await asUser(request(app).post("/api/bom/confirm-production"), ctx.token).send(
      confirmPayload(formula, { customerId: String(order._id), customer: order.name })
    );

    const res = await asUser(request(app).post("/api/bom/revert-production"), ctx.token).send({
      customerId: String(order._id),
      formulaId: String(formula._id)
    });

    expect(res.status).toBe(200);
    expect((await Ingredient.findById(water._id)).openingStock).toBe(5000);
    expect((await Ingredient.findById(glycerin._id)).openingStock).toBe(5000);
    expect(await ProductLot.countDocuments({ orderId: order._id })).toBe(0);

    const savedOrder = await Customer.findById(order._id);
    expect(savedOrder.productionStatus).toBe("ยังไม่ผลิต");
    expect(savedOrder.orderedProducts[0].isConfirmed).toBeUndefined();
    expect(savedOrder.orderedProducts[0].producedLotId).toBeUndefined();
  });
});
