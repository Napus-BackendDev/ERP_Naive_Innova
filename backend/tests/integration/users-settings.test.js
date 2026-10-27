import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import LotPrefixConfig from "../../src/features/fg/lotPrefixConfig.model.js";
import PackagingItem from "../../src/features/packaging/packagingItem.model.js";
import PackagingType from "../../src/features/packaging/packagingType.model.js";
import Role from "../../src/features/users/role.model.js";
import User from "../../src/features/users/user.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

describe("Users — admin-only access", () => {
  test("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  test("blocks a normal user from every user-management route", async () => {
    const list = await asUser(request(app).get("/api/users"), ctx.token);
    expect(list.status).toBe(403);

    const create = await asUser(request(app).post("/api/users"), ctx.token).send({
      name: "Nope",
      email: "nope@test.local"
    });
    expect(create.status).toBe(403);
  });

  test("returns the system roles to an admin", async () => {
    const res = await asUser(request(app).get("/api/users/roles"), ctx.adminToken);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(["Admin", "User"]);
  });

  test("lists all users with populated roles", async () => {
    const res = await asUser(request(app).get("/api/users"), ctx.adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].role).toBeTruthy();
  });
});

describe("Users — create and update", () => {
  test("rejects a missing name or email", async () => {
    const res = await asUser(request(app).post("/api/users"), ctx.adminToken).send({
      name: "No Email"
    });
    expect(res.status).toBe(400);
  });

  test("rejects a duplicate email", async () => {
    const res = await asUser(request(app).post("/api/users"), ctx.adminToken).send({
      name: "Duplicate",
      email: "user@test.local"
    });
    expect(res.status).toBe(400);
  });

  test("creates a pre-approved user with the default User role", async () => {
    const res = await asUser(request(app).post("/api/users"), ctx.adminToken).send({
      name: "New Person",
      email: "new@test.local",
      line: "newline"
    });

    expect(res.status).toBe(201);
    expect(res.body.role.name).toBe("User");
    expect(res.body.line).toBe("newline");
  });

  test("rejects an unknown role on update", async () => {
    const res = await asUser(
      request(app).put(`/api/users/${ctx.user._id}`),
      ctx.adminToken
    ).send({ role: "SuperAdmin" });
    expect(res.status).toBe(400);
  });

  test("returns 404 when updating a missing user", async () => {
    const res = await asUser(
      request(app).put("/api/users/64b000000000000000000000"),
      ctx.adminToken
    ).send({ name: "Ghost" });
    expect(res.status).toBe(404);
  });

  test("promotes a user to Admin", async () => {
    const res = await asUser(
      request(app).put(`/api/users/${ctx.user._id}`),
      ctx.adminToken
    ).send({ role: "Admin" });
    expect(res.status).toBe(200);
    expect(res.body.role.name).toBe("Admin");
  });
});

describe("Users — first-login approval", () => {
  test("rejects an invalid decision", async () => {
    const pending = await User.create({
      googleId: "pending-1",
      email: "pending@test.local",
      name: "Pending",
      approvalStatus: "pending"
    });
    const res = await asUser(
      request(app).post(`/api/users/${pending._id}/approval`),
      ctx.adminToken
    ).send({ decision: "maybe" });
    expect(res.status).toBe(400);
  });

  test("approves a pending request and assigns the User role", async () => {
    const pending = await User.create({
      googleId: "pending-2",
      email: "pending2@test.local",
      name: "Pending Two",
      approvalStatus: "pending"
    });

    const res = await asUser(
      request(app).post(`/api/users/${pending._id}/approval`),
      ctx.adminToken
    ).send({ decision: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.approvalStatus).toBe("approved");
    expect(res.body.role.name).toBe("User");

    const again = await asUser(
      request(app).post(`/api/users/${pending._id}/approval`),
      ctx.adminToken
    ).send({ decision: "approved" });
    expect(again.status).toBe(409);
  });

  test("rejects an already-approved account", async () => {
    const res = await asUser(
      request(app).post(`/api/users/${ctx.user._id}/approval`),
      ctx.adminToken
    ).send({ decision: "rejected" });
    expect(res.status).toBe(409);
  });
});

describe("Users — deletion safety", () => {
  test("refuses to delete the last approved admin", async () => {
    const res = await asUser(
      request(app).delete(`/api/users/${ctx.admin._id}`),
      ctx.adminToken
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Admin/);
    expect(await User.countDocuments({ _id: ctx.admin._id })).toBe(1);
  });

  test("deletes a normal user and reports whether it was self-deletion", async () => {
    const res = await asUser(
      request(app).delete(`/api/users/${ctx.user._id}`),
      ctx.adminToken
    );
    expect(res.status).toBe(200);
    expect(res.body.selfDeleted).toBe(false);
    expect(await User.countDocuments({ _id: ctx.user._id })).toBe(0);
  });
});

describe("Settings — packaging categories", () => {
  test("rejects an empty packaging type name", async () => {
    const res = await asUser(request(app).post("/api/packaging-types"), ctx.token).send({
      name: "   "
    });
    expect(res.status).toBe(400);
  });

  test("creates, lists and rejects a duplicate packaging type", async () => {
    const created = await asUser(request(app).post("/api/packaging-types"), ctx.token).send({
      name: "Bottle"
    });
    expect(created.status).toBe(201);

    const duplicate = await asUser(request(app).post("/api/packaging-types"), ctx.token).send({
      name: "Bottle"
    });
    expect(duplicate.status).toBe(400);

    const list = await asUser(request(app).get("/api/packaging-types"), ctx.token);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe("Bottle");
  });

  test("cannot delete a packaging type that is still in use", async () => {
    const type = await PackagingType.create({ ownerId: ctx.user._id, name: "Bottle" });
    await PackagingItem.create({
      ownerId: ctx.user._id,
      name: "Bottle 50ml",
      customer: "ระบบ",
      type: type._id
    });

    const res = await asUser(
      request(app).delete(`/api/packaging-types/${type._id}`),
      ctx.token
    );
    expect(res.status).toBe(400);
    expect(await PackagingType.countDocuments({ _id: type._id })).toBe(1);
  });

  test("deletes an unused packaging type and reports missing ones", async () => {
    const type = await PackagingType.create({ ownerId: ctx.user._id, name: "Bottle" });
    const deleted = await asUser(
      request(app).delete(`/api/packaging-types/${type._id}`),
      ctx.token
    );
    expect(deleted.status).toBe(200);

    const missing = await asUser(
      request(app).delete("/api/packaging-types/64b000000000000000000000"),
      ctx.token
    );
    expect(missing.status).toBe(404);
  });

  test("packaging subtypes require a parent type", async () => {
    const res = await asUser(request(app).post("/api/packaging-subtypes"), ctx.token).send({
      name: "Pump"
    });
    expect(res.status).toBe(400);
  });

  test("creates a packaging subtype under a parent", async () => {
    const type = await PackagingType.create({ ownerId: ctx.user._id, name: "Bottle" });
    const res = await asUser(request(app).post("/api/packaging-subtypes"), ctx.token).send({
      name: "Pump",
      parentType: String(type._id)
    });
    expect(res.status).toBe(201);
    expect(res.body.parentType._id).toBe(String(type._id));
  });
});

describe("Settings — catalog and lot prefixes", () => {
  test("nozzles require a name and are idempotent by name", async () => {
    const empty = await asUser(request(app).post("/api/nozzles"), ctx.token).send({
      name: "  "
    });
    expect(empty.status).toBe(400);

    const first = await asUser(request(app).post("/api/nozzles"), ctx.token).send({
      name: "Pump Head"
    });
    expect(first.status).toBe(201);

    const second = await asUser(request(app).post("/api/nozzles"), ctx.token).send({
      name: "Pump Head"
    });
    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
  });

  test("lot prefix configs require formulaName and prefix, then normalize the prefix", async () => {
    const missing = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaName: "Formula A"
    });
    expect(missing.status).toBe(400);

    const created = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaName: "Formula A",
      prefix: "bs"
    });
    expect(created.status).toBe(200);
    expect(created.body.prefix).toBe("BS");

    const list = await asUser(request(app).get("/api/fg/prefix-configs"), ctx.token);
    expect(list.body).toHaveLength(1);
  });

  test("rejects a lot prefix for an unknown formula id", async () => {
    const res = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaId: "64b000000000000000000000",
      formulaName: "Ghost",
      prefix: "GH"
    });
    expect(res.status).toBe(404);
  });

  test("lot prefix configs are owner-scoped for deletion", async () => {
    const config = await LotPrefixConfig.create({
      ownerId: ctx.user._id,
      formulaName: "Formula A",
      prefix: "BS"
    });

    const denied = await asUser(
      request(app).delete(`/api/fg/prefix-configs/${config._id}`),
      ctx.otherToken
    );
    expect(denied.status).toBe(404);

    const deleted = await asUser(
      request(app).delete(`/api/fg/prefix-configs/${config._id}`),
      ctx.token
    );
    expect(deleted.status).toBe(200);
  });
});
