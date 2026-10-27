import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import BomFormula from "../../src/features/bom/bomFormula.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import Ingredient from "../../src/features/bom/ingredient.model.js";
import Machine from "../../src/features/machines/machine.model.js";
import PackagingItem from "../../src/features/packaging/packagingItem.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const moduleEndpoints = [
  "/api/sales",
  "/api/sales/columns",
  "/api/bom/ingredients",
  "/api/bom/formulas",
  "/api/packaging",
  "/api/packaging-types",
  "/api/packaging-subtypes",
  "/api/fg/lots",
  "/api/fg/prefix-configs",
  "/api/production/orders",
  "/api/users",
  "/api/logs",
  "/api/support",
  "/api/customer-log",
  "/api/machines",
  "/api/scents",
  "/api/nozzles",
  "/api/products?sample=true"
];

describe("Dashboard — module reachability", () => {
  test("every module list endpoint rejects unauthenticated requests", async () => {
    for (const endpoint of moduleEndpoints) {
      const res = await request(app).get(endpoint);
      expect(res.status, endpoint).toBe(401);
    }
  });

  test("an admin can load every module list endpoint", async () => {
    for (const endpoint of moduleEndpoints) {
      const res = await asUser(request(app).get(endpoint), ctx.adminToken);
      expect(res.status, endpoint).toBe(200);
      expect(res.body, endpoint).toBeTruthy();
    }
  });

  test("a normal user cannot load the admin-only Users module", async () => {
    const res = await asUser(request(app).get("/api/users"), ctx.token);
    expect(res.status).toBe(403);
  });
});

describe("Dashboard — cockpit composition", () => {
  test("the six cockpit data sources all return arrays", async () => {
    const [leads, ingredients, packaging, lots, columns, machines] = await Promise.all(
      ["/api/sales", "/api/bom/ingredients", "/api/packaging", "/api/fg/lots", "/api/sales/columns", "/api/machines"]
        .map((endpoint) => asUser(request(app).get(endpoint), ctx.token))
    );

    for (const res of [leads, ingredients, packaging, lots, columns, machines]) {
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }
    expect(columns.body).toHaveLength(5);
  });

  test("seeded operational data is reflected in the dashboard sources", async () => {
    await Customer.create({
      ownerId: ctx.user._id,
      name: "Dashboard Customer",
      orderType: "lot",
      orderedProducts: [{ formulaName: "Dashboard Formula", quantityPcs: 5 }]
    });
    await BomFormula.create({
      ownerId: ctx.user._id,
      name: "Dashboard Formula",
      normalizedName: "dashboard formula"
    });
    await Ingredient.create({ ownerId: ctx.user._id, name: "Aqua", openingStock: 100 });
    await PackagingItem.create({
      ownerId: ctx.user._id,
      name: "Bottle",
      customer: "ระบบ",
      currentQuantity: 50
    });
    await ProductLot.create({
      ownerId: ctx.user._id,
      lotNo: "DASH-1",
      formulaName: "Dashboard Formula",
      mfgDate: new Date("2026-07-01"),
      expDate: new Date("2028-07-01"),
      quantity: 5
    });
    await Machine.create({ ownerId: ctx.user._id, name: "Mixer 1" });

    const [leads, ingredients, packaging, lots, machines] = await Promise.all(
      ["/api/sales", "/api/bom/ingredients", "/api/packaging", "/api/fg/lots", "/api/machines"]
        .map((endpoint) => asUser(request(app).get(endpoint), ctx.token))
    );

    expect(leads.body).toHaveLength(1);
    expect(ingredients.body).toHaveLength(1);
    expect(packaging.body).toHaveLength(1);
    expect(lots.body).toHaveLength(1);
    expect(machines.body).toHaveLength(1);
  });
});
