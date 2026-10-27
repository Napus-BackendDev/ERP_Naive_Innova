import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Role from "../../src/features/users/role.model.js";
import User from "../../src/features/users/user.model.js";

export const JWT_SECRET = "integration_test_secret";
process.env.JWT_SECRET = JWT_SECRET;

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "erp_integration" });
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function resetDb() {
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.ensureIndexes()));
}

export const signFor = (doc) => jwt.sign({ userId: String(doc._id) }, JWT_SECRET);

export const asUser = (req, token) => req.set("Authorization", `Bearer ${token}`);

export async function seedUsers() {
  const adminRole = await Role.create({ name: "Admin" });
  const userRole = await Role.create({ name: "User" });

  const admin = await User.create({
    googleId: "google-admin",
    email: "admin@test.local",
    name: "Admin User",
    role: adminRole._id,
    approvalStatus: "approved"
  });
  const user = await User.create({
    googleId: "google-1",
    email: "user@test.local",
    name: "Test User",
    role: userRole._id,
    approvalStatus: "approved"
  });
  const otherUser = await User.create({
    googleId: "google-2",
    email: "other@test.local",
    name: "Other User",
    role: userRole._id,
    approvalStatus: "approved"
  });

  return {
    adminRole,
    userRole,
    admin,
    user,
    otherUser,
    adminToken: signFor(admin),
    token: signFor(user),
    otherToken: signFor(otherUser)
  };
}
