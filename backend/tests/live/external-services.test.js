import "dotenv/config";
import nodemailer from "nodemailer";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "../integration/testApp.js";
import { resetDb, startDb, stopDb } from "../integration/helpers.js";
import {
  getApproverEmails,
  sendDecisionNotifications,
  sendFirstLoginApproval
} from "../../src/features/auth/approvalEmail.js";
import Role from "../../src/features/users/role.model.js";
import User from "../../src/features/users/user.model.js";

const requireLive = process.env.RUN_LIVE_INTEGRATION === "true";
const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasGmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const liveReady = requireLive && hasGoogle && hasGmail;

const plusAddress = (suffix) => {
  const [local, domain] = String(process.env.GMAIL_USER || "").split("@");
  return `${local}+${suffix}@${domain}`;
};

describe.skipIf(!liveReady)("Live external services — Google OAuth", () => {
  test("redirects to the real Google consent screen with the configured client", async () => {
    const res = await request(app).get("/api/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\//);

    const url = new URL(res.headers.location);
    expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
    expect(url.searchParams.get("scope")).toContain("email");
    expect(url.searchParams.get("redirect_uri")).toContain("/api/auth/google/callback");
  });

  test("fails closed and redirects to the login error page without a code", async () => {
    const res = await request(app).get("/api/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=OAuthFailed");
  });
});

describe.skipIf(!liveReady)("Live external services — Gmail", () => {
  let admin;
  let pending;

  beforeAll(startDb);
  afterAll(stopDb);

  beforeEach(async () => {
    await resetDb();
    const adminRole = await Role.create({ name: "Admin" });
    await Role.create({ name: "User" });

    admin = await User.create({
      googleId: "live-admin",
      email: plusAddress("integration-approver"),
      name: "Live Integration Approver",
      role: adminRole._id,
      approvalStatus: "approved"
    });

    pending = await User.create({
      googleId: "live-pending",
      email: plusAddress("integration-pending"),
      name: "Live Integration Pending",
      approvalStatus: "pending"
    });
  });

  test("authenticates the configured Gmail account", async () => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await expect(transporter.verify()).resolves.toBe(true);
  });

  test("only targets plus-addresses derived from GMAIL_USER for live mail", async () => {
    const approvers = await getApproverEmails();
    expect(approvers).toEqual([admin.email]);
    expect(approvers[0]).toContain("+");
    expect(pending.email).toContain("+");
  });

  test("sends the real first-login approval mail and stores a fresh token", async () => {
    const before = new Date();
    const sent = await sendFirstLoginApproval(pending);
    expect(sent).toBe(true);

    const saved = await User.findById(pending._id)
      .select("+approvalTokenHash +approvalTokenExpiresAt +approvalEmailSentAt");
    expect(saved.approvalTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.approvalTokenExpiresAt.getTime()).toBeGreaterThan(before.getTime());
    expect(saved.approvalEmailSentAt).toBeTruthy();
  });

  test("sends the real approval-decision notifications", async () => {
    await expect(sendDecisionNotifications(pending, "approved")).resolves.toBeUndefined();
  });
});

