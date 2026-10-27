import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import BomFormula from "../../src/features/bom/bomFormula.model.js";
import Customer from "../../src/features/customers/customer.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

describe("R&D — formula create", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/bom/formulas");
    expect(res.status).toBe(401);
  });

  test("rejects an empty formula name", async () => {
    const res = await asUser(request(app).post("/api/bom/formulas"), ctx.token).send({
      name: "   "
    });
    expect(res.status).toBe(400);
  });

  test("creates a formula with a normalized name and version 1", async () => {
    const res = await asUser(request(app).post("/api/bom/formulas"), ctx.token).send({
      name: "  Bio Shampoo  ",
      bom: { Aqua: 500, Glycerin: 100 }
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Bio Shampoo");
    expect(res.body.version).toBe(1);
    expect(res.body.bom).toMatchObject({ Aqua: 500, Glycerin: 100 });
  });

  test("rejects a duplicate active formula name", async () => {
    await asUser(request(app).post("/api/bom/formulas"), ctx.token).send({
      name: "Bio Shampoo"
    });
    const again = await asUser(request(app).post("/api/bom/formulas"), ctx.token).send({
      name: "  BIO SHAMPOO  "
    });
    expect(again.status).toBe(409);
  });
});

describe("R&D — formula list and update", () => {
  test("lists only the owner's active formulas", async () => {
    await BomFormula.create({ ownerId: ctx.user._id, name: "Mine", normalizedName: "mine" });
    await BomFormula.create({ ownerId: ctx.user._id, name: "Archived", normalizedName: "archived", isArchived: true });
    await BomFormula.create({ ownerId: ctx.otherUser._id, name: "Theirs", normalizedName: "theirs" });

    const active = await asUser(request(app).get("/api/bom/formulas"), ctx.token);
    expect(active.body.map((f) => f.name)).toEqual(["Mine"]);

    const all = await asUser(
      request(app).get("/api/bom/formulas?includeArchived=true"),
      ctx.token
    );
    expect(all.body.map((f) => f.name).sort()).toEqual(["Archived", "Mine"]);
  });

  test("updates a formula and bumps the version when content changes", async () => {
    const created = await asUser(request(app).post("/api/bom/formulas"), ctx.token).send({
      name: "Bio Shampoo",
      bom: { Aqua: 500 }
    });

    const updated = await asUser(
      request(app).put(`/api/bom/formulas/${created.body._id}`),
      ctx.token
    ).send({ bom: { Aqua: 450, Glycerin: 50 } });

    expect(updated.status).toBe(200);
    expect(updated.body.version).toBe(2);
    expect(updated.body.bom).toMatchObject({ Aqua: 450, Glycerin: 50 });
  });

  test("cannot update another owner's formula", async () => {
    const formula = await BomFormula.create({
      ownerId: ctx.user._id,
      name: "Mine",
      normalizedName: "mine"
    });
    const res = await asUser(
      request(app).put(`/api/bom/formulas/${formula._id}`),
      ctx.otherToken
    ).send({ name: "Hijacked" });
    expect(res.status).toBe(404);
  });

  test("rejects renaming to an existing formula name", async () => {
    await BomFormula.create({ ownerId: ctx.user._id, name: "One", normalizedName: "one" });
    const two = await BomFormula.create({ ownerId: ctx.user._id, name: "Two", normalizedName: "two" });

    const res = await asUser(
      request(app).put(`/api/bom/formulas/${two._id}`),
      ctx.token
    ).send({ name: "one" });
    expect(res.status).toBe(409);
  });
});

describe("R&D — formula archive", () => {
  test("archives an unreferenced formula", async () => {
    const formula = await BomFormula.create({
      ownerId: ctx.user._id,
      name: "Unused",
      normalizedName: "unused"
    });

    const res = await asUser(
      request(app).delete(`/api/bom/formulas/${formula._id}`),
      ctx.token
    );
    expect(res.status).toBe(200);

    const stored = await BomFormula.findById(formula._id);
    expect(stored.isArchived).toBe(true);
  });

  test("refuses to archive a formula used by a pending production order", async () => {
    const formula = await BomFormula.create({
      ownerId: ctx.user._id,
      name: "In Use",
      normalizedName: "in use"
    });
    await Customer.create({
      ownerId: ctx.user._id,
      name: "Customer",
      orderedProducts: [{ formulaId: formula._id, formulaName: formula.name }]
    });

    const res = await asUser(
      request(app).delete(`/api/bom/formulas/${formula._id}`),
      ctx.token
    );
    expect(res.status).toBe(409);
    expect(res.body.pendingOrderCount).toBe(1);
  });

  test("cannot archive another owner's formula", async () => {
    const formula = await BomFormula.create({
      ownerId: ctx.user._id,
      name: "Mine",
      normalizedName: "mine"
    });
    const res = await asUser(
      request(app).delete(`/api/bom/formulas/${formula._id}`),
      ctx.otherToken
    );
    expect(res.status).toBe(404);
  });
});
