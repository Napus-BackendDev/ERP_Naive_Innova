// Boots the real backend against a throwaway in-memory MongoDB for Playwright
// full-stack E2E runs. Playwright starts this script as a webServer and waits
// for GET /health before running the specs.
//
// The database is created fresh on every run and destroyed on shutdown, so the
// E2E suite never touches a developer database or production data.
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = process.env.E2E_BACKEND_PORT || "5000";
const CLIENT_URL = process.env.E2E_CLIENT_URL || "http://localhost:3100";
const BACKEND_URL = process.env.E2E_BACKEND_URL || `http://localhost:${PORT}`;

const mongod = await MongoMemoryServer.create({ instance: { dbName: "erp_e2e" } });

// Explicit process.env wins over backend/.env because dotenv does not override
// existing keys. NODE_ENV=test keeps the mock-login guard off without being
// "production".
process.env.PORT = PORT;
process.env.MONGODB_URI = mongod.getUri("erp_e2e");
process.env.JWT_SECRET = process.env.E2E_JWT_SECRET || "e2e_fullstack_secret";
process.env.CLIENT_URL = CLIENT_URL;
process.env.BACKEND_URL = BACKEND_URL;
process.env.ENABLE_MOCK_LOGIN = "true";
process.env.NODE_ENV = "test";
// Never send real mail during an E2E run.
process.env.GMAIL_USER = "";
process.env.GMAIL_APP_PASSWORD = "";

await import("../src/index.js");

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await mongod.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
