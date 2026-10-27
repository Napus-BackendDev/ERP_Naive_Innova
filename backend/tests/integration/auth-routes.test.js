import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, signFor, startDb, stopDb } from "./helpers.js";
import {
  hashApprovalToken,
  sendDecisionNotifications
} from "../../src/features/auth/approvalEmail.js";
import User from "../../src/features/users/user.model.js";

vi.mock("../../src/features/auth/approvalEmail.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendDecisionNotifications: vi.fn().mockResolvedValue(undefined)
  };
});

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
  sendDecisionNotifications.mockClear();
  process.env.ENABLE_MOCK_LOGIN = "false";
});

const makePending = async (overrides = {}) => User.create({
  googleId: overrides.googleId || "pending-google",
  email: overrides.email || "pending@test.local",
  name: overrides.name || "Pending User",
  approvalStatus: "pending",
  ...overrides
});

describe("Auth — current session", () => {
  test("returns a null user when no token is supplied", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  test("rejects an invalid token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Invalid or expired token/);
  });

  test("returns the current user with a role name", async () => {
    const res = await asUser(request(app).get("/api/auth/me"), ctx.adminToken);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@test.local");
    expect(res.body.user.role).toBe("Admin");
  });

  test("blocks a pending user with PENDING_APPROVAL", async () => {
    const pending = await makePending();
    const res = await asUser(request(app).get("/api/auth/me"), signFor(pending));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PENDING_APPROVAL");
  });

  test("blocks a rejected user with ACCESS_REJECTED", async () => {
    const rejected = await makePending({
      googleId: "rejected-google",
      email: "rejected@test.local",
      approvalStatus: "rejected"
    });
    const res = await asUser(request(app).get("/api/auth/me"), signFor(rejected));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCESS_REJECTED");
  });

  test("clears the auth cookie on logout", async () => {
    const res = await request(app).post("/api/auth/logout").set("Cookie", "token=abc");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toMatch(/token=;/);
  });
});

describe("Auth — first-login approval links", () => {
  test("rejects a malformed approval token on GET", async () => {
    const res = await request(app).get("/api/auth/approve-first-login?token=bad");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?approval=invalid");
  });

  test("renders the approval form for a well-formed token", async () => {
    const token = "a".repeat(64);
    const res = await request(app).get(`/api/auth/approve-first-login?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("ยืนยันผู้เข้าใช้ระบบ");
    expect(res.text).toContain(`value="${token}"`);
  });

  test("approves a pending user through a valid token", async () => {
    const token = "b".repeat(64);
    const pending = await makePending({
      approvalTokenHash: hashApprovalToken(token),
      approvalTokenExpiresAt: new Date(Date.now() + 60_000)
    });

    const res = await request(app)
      .post("/api/auth/approve-first-login")
      .send({ token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?approval=approved");

    const updated = await User.findById(pending._id);
    expect(updated.approvalStatus).toBe("approved");
    expect(updated.approvedAt).toBeTruthy();
    expect(sendDecisionNotifications).toHaveBeenCalledTimes(1);
    const [approvedUser, approvedDecision] = sendDecisionNotifications.mock.calls[0];
    expect(String(approvedUser._id)).toBe(String(pending._id));
    expect(approvedDecision).toBe("approved");
  });

  test("rejects a pending user through a valid token and locks for four hours", async () => {
    const token = "c".repeat(64);
    const pending = await makePending({
      approvalTokenHash: hashApprovalToken(token),
      approvalTokenExpiresAt: new Date(Date.now() + 60_000)
    });

    const res = await request(app)
      .post("/api/auth/reject-first-login")
      .send({ token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("approval=rejected");
    expect(res.headers.location).toContain("lockHours=4");

    const updated = await User.findById(pending._id);
    expect(updated.approvalStatus).toBe("rejected");
    expect(updated.rejectedUntil.getTime() - Date.now()).toBeGreaterThan(3 * 60 * 60 * 1000);
    expect(sendDecisionNotifications).toHaveBeenCalledTimes(1);
    const [rejectedUser, rejectedDecision] = sendDecisionNotifications.mock.calls[0];
    expect(String(rejectedUser._id)).toBe(String(pending._id));
    expect(rejectedDecision).toBe("rejected");
  });

  test("rejects an expired approval token without changing the user", async () => {
    const token = "d".repeat(64);
    const pending = await makePending({
      approvalTokenHash: hashApprovalToken(token),
      approvalTokenExpiresAt: new Date(Date.now() - 60_000)
    });

    const res = await request(app)
      .post("/api/auth/approve-first-login")
      .send({ token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?approval=invalid");
    expect((await User.findById(pending._id)).approvalStatus).toBe("pending");
    expect(sendDecisionNotifications).not.toHaveBeenCalled();
  });
});

describe("Auth — mock login", () => {
  test("is disabled unless ENABLE_MOCK_LOGIN is true", async () => {
    const res = await request(app).post("/api/auth/mock-login");
    expect(res.status).toBe(404);
  });

  test("creates and logs in the mock admin when enabled", async () => {
    process.env.ENABLE_MOCK_LOGIN = "true";

    const res = await request(app).post("/api/auth/mock-login");
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      email: "mock.admin@naiveops.com",
      role: "Admin"
    });
    expect(res.headers["set-cookie"].join(";")).toMatch(/token=/);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("mock.admin@naiveops.com");
  });
});
