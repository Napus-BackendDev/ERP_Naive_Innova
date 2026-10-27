import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import scentRoutes from "../../src/features/catalog/scents.routes.js";
import productRoutes from "../../src/features/products/products.routes.js";
import bomRoutes from "../../src/features/bom/bom.routes.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import BomFormula from "../../src/features/bom/bomFormula.model.js";
import Ingredient from "../../src/features/bom/ingredient.model.js";
import Product from "../../src/features/products/product.model.js";
import Scent from "../../src/features/catalog/scent.model.js";
import Role from "../../src/features/users/role.model.js";
import User from "../../src/features/users/user.model.js";

const JWT_SECRET = "integration_test_secret";
process.env.JWT_SECRET = JWT_SECRET;

const app = express();
app.use(express.json({ limit: "10mb" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/scents", scentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bom", bomRoutes);

let mongod;
let user;
let otherUser;
let token;
let otherToken;

const signFor = (doc) => jwt.sign({ userId: String(doc._id) }, JWT_SECRET);
const asUser = (req, bearer = token) => req.set("Authorization", `Bearer ${bearer}`);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "erp_integration" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    ActivityLog.deleteMany({}),
    BomFormula.deleteMany({}),
    Ingredient.deleteMany({}),
    Product.deleteMany({}),
    Scent.deleteMany({}),
    User.deleteMany({}),
    Role.deleteMany({})
  ]);

  const adminRole = await Role.create({ name: "Admin" });
  const userRole = await Role.create({ name: "User" });

  user = await User.create({
    googleId: "google-1",
    email: "user@test.local",
    name: "Test User",
    role: userRole._id,
    approvalStatus: "approved"
  });
  otherUser = await User.create({
    googleId: "google-2",
    email: "other@test.local",
    name: "Other User",
    role: userRole._id,
    approvalStatus: "approved"
  });
  await User.create({
    googleId: "google-admin",
    email: "admin@test.local",
    name: "Admin User",
    role: adminRole._id,
    approvalStatus: "approved"
  });

  token = signFor(user);
  otherToken = signFor(otherUser);
});

describe("app wiring and auth middleware", () => {
  test("health endpoint is public", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("protected route rejects a missing token", async () => {
    const res = await request(app).get("/api/scents");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Unauthenticated/);
  });

  test("protected route rejects an invalid token", async () => {
    const res = await request(app).get("/api/scents").set("Authorization", "Bearer nonsense");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Invalid or expired/);
  });

  test("pending users are blocked with PENDING_APPROVAL", async () => {
    const pending = await User.create({
      googleId: "google-pending",
      email: "pending@test.local",
      name: "Pending User",
      approvalStatus: "pending"
    });
    const res = await asUser(request(app).get("/api/scents"), signFor(pending));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PENDING_APPROVAL");
  });

  test("rejected users are blocked with ACCESS_REJECTED", async () => {
    const rejected = await User.create({
      googleId: "google-rejected",
      email: "rejected@test.local",
      name: "Rejected User",
      approvalStatus: "rejected"
    });
    const res = await asUser(request(app).get("/api/scents"), signFor(rejected));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCESS_REJECTED");
  });
});

describe("scents API (integration with MongoDB)", () => {
  test("rejects an empty name", async () => {
    const res = await asUser(request(app).post("/api/scents")).send({ name: "   " });
    expect(res.status).toBe(400);
  });

  test("creates a scent, trims the name and reports it in the list", async () => {
    const created = await asUser(request(app).post("/api/scents")).send({ name: "  Vanilla  " });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Vanilla");

    const list = await asUser(request(app).get("/api/scents"));
    expect(list.status).toBe(200);
    expect(list.body.map((s) => s.name)).toEqual(["Vanilla"]);
  });

  test("creating the same scent twice is idempotent", async () => {
    const first = await asUser(request(app).post("/api/scents")).send({ name: "Vanilla" });
    const second = await asUser(request(app).post("/api/scents")).send({ name: "Vanilla" });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
    expect(await Scent.countDocuments({ ownerId: user._id })).toBe(1);
  });

  test("list is owner-scoped", async () => {
    await Scent.create({ ownerId: user._id, name: "Mine" });
    await Scent.create({ ownerId: otherUser._id, name: "Theirs" });

    const res = await asUser(request(app).get("/api/scents"));
    expect(res.body.map((s) => s.name)).toEqual(["Mine"]);
  });

  test("renames and deletes only the owner's scent", async () => {
    const mine = await Scent.create({ ownerId: user._id, name: "Old" });
    const theirs = await Scent.create({ ownerId: otherUser._id, name: "Other" });

    const renamed = await asUser(request(app).put(`/api/scents/${mine._id}`)).send({ name: "New" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("New");

    const forbidden = await asUser(request(app).delete(`/api/scents/${theirs._id}`));
    expect(forbidden.status).toBe(404);

    const deleted = await asUser(request(app).delete(`/api/scents/${mine._id}`));
    expect(deleted.status).toBe(200);
    expect(await Scent.countDocuments({ ownerId: user._id })).toBe(0);
  });
});

describe("products API — stock movement audit trail", () => {
  test("rejects a product without a name", async () => {
    const res = await asUser(request(app).post("/api/products")).send({ sku: "X" });
    expect(res.status).toBe(400);
  });

  test("creating stock writes an inbound movement log", async () => {
    const res = await asUser(request(app).post("/api/products")).send({
      name: "Sample A",
      currentQuantity: 40
    });
    expect(res.status).toBe(201);
    expect(res.body.currentQuantity).toBe(40);

    const log = await ActivityLog.findOne({ "stockMovement.itemId": res.body._id });
    expect(log).toBeTruthy();
    expect(log.actionType).toBe("STOCK");
    expect(log.stockMovement).toMatchObject({
      itemType: "sampleProduct",
      direction: "in",
      amount: 40,
      beforeQuantity: 0,
      afterQuantity: 40
    });
  });

  test("changing stock writes an outbound movement with exact arithmetic", async () => {
    const created = await asUser(request(app).post("/api/products")).send({
      name: "Sample B",
      currentQuantity: 40
    });
    const productId = created.body._id;

    const updated = await asUser(request(app).put(`/api/products/${productId}`))
      .send({ currentQuantity: 15 });
    expect(updated.status).toBe(200);
    expect(updated.body.currentQuantity).toBe(15);

    const movement = await ActivityLog.findOne({
      "stockMovement.itemId": productId,
      "stockMovement.direction": "out"
    });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement.amount).toBe(25);
    expect(movement.stockMovement.beforeQuantity).toBe(40);
    expect(movement.stockMovement.afterQuantity).toBe(15);
  });

  test("products are owner-scoped and cannot be deleted by another owner", async () => {
    const mine = await asUser(request(app).post("/api/products")).send({ name: "Mine" });
    const theirs = await Product.create({ ownerId: otherUser._id, name: "Theirs" });

    const list = await asUser(request(app).get("/api/products"));
    expect(list.body.map((p) => p.name)).toEqual(["Mine"]);

    const forbidden = await asUser(request(app).delete(`/api/products/${theirs._id}`));
    expect(forbidden.status).toBe(404);

    const deleted = await asUser(request(app).delete(`/api/products/${mine.body._id}`));
    expect(deleted.status).toBe(200);
  });
});

describe("BOM calculation — core production math", () => {
  test("calculates required grams, stock and shortage", async () => {
    const formula = await BomFormula.create({
      ownerId: user._id,
      name: "Formula One",
      normalizedName: "formula one",
      bom: { Aqua: 300, Glycerin: 200 }
    });
    await Ingredient.create({ ownerId: user._id, name: "Aqua", openingStock: 100 });
    await Ingredient.create({ ownerId: user._id, name: "Glycerin", openingStock: 1000 });

    const res = await asUser(request(app).post("/api/bom/calculate"))
      .send({ formulaId: String(formula._id), quantityKg: 2 });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);

    const aqua = res.body.results.find((r) => r.name === "Aqua");
    expect(aqua).toEqual({
      name: "Aqua",
      required: 600,
      stock: 100,
      sufficient: false,
      shortage: 500
    });

    const glycerin = res.body.results.find((r) => r.name === "Glycerin");
    expect(glycerin).toEqual({
      name: "Glycerin",
      required: 400,
      stock: 1000,
      sufficient: true,
      shortage: 0
    });
  });

  test("returns 404 for an unknown or archived formula", async () => {
    const archived = await BomFormula.create({
      ownerId: user._id,
      name: "Archived",
      normalizedName: "archived",
      bom: { Aqua: 100 },
      isArchived: true
    });

    const unknown = await asUser(request(app).post("/api/bom/calculate"))
      .send({ formulaId: String(new mongoose.Types.ObjectId()), quantityKg: 1 });
    expect(unknown.status).toBe(404);

    const archivedRes = await asUser(request(app).post("/api/bom/calculate"))
      .send({ formulaId: String(archived._id), quantityKg: 1 });
    expect(archivedRes.status).toBe(404);
  });

  test("empty or zero quantities produce an empty result set", async () => {
    const res = await asUser(request(app).post("/api/bom/calculate"))
      .send({ plan: { "Formula One": 0 } });
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  test("ingredient create reuses near-duplicate names instead of splitting stock", async () => {
    const first = await asUser(request(app).post("/api/bom/ingredients"))
      .send({ name: "Eco-guard Plus", openingStock: 12 });
    expect(first.status).toBe(201);

    const second = await asUser(request(app).post("/api/bom/ingredients"))
      .send({ name: "ecoguard plus", openingStock: 99 });
    expect(second.status).toBe(200);
    expect(second.body._reusedExisting).toBe(true);
    expect(second.body._id).toBe(first.body._id);
    expect(await Ingredient.countDocuments({ ownerId: user._id })).toBe(1);
  });
});
