import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./features/auth/auth.routes.js";
import salesRoutes from "./features/sales/sales.routes.js";
import bomRoutes from "./features/bom/bom.routes.js";
import packagingRoutes from "./features/packaging/packaging.routes.js";
import fgRoutes from "./features/fg/fg.routes.js";
import exportRoutes from "./features/bom/export.routes.js";
import packagingTypesRoutes from "./features/packaging/packagingTypes.routes.js";
import packagingSubTypesRoutes from "./features/packaging/packagingSubTypes.routes.js";
import userRoutes from "./features/users/user.routes.js";
import logRoutes from "./features/logs/activityLog.routes.js";
import productionRoutes from "./features/production/production.routes.js";
import scentRoutes from "./features/catalog/scents.routes.js";
import nozzleRoutes from "./features/catalog/nozzles.routes.js";
import customerLogRoutes from "./features/customerLog/customerLog.routes.js";
import machinesRoutes from "./features/machines/machines.routes.js";
import productsRoutes from "./features/products/products.routes.js";
import supportRoutes from "./features/support/support.routes.js";

import passport from "./config/passport.js";
import imageSizeGuard from "./middleware/imageSizeGuard.js";
import { startAutoMoveScheduler } from "./jobs/autoMoveLeads.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB without preventing the liveness server from starting
const dbConnectionPromise = connectDB();

// Middlewares
const rawClientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const cleanClientUrl = rawClientUrl.endsWith("/") ? rawClientUrl.slice(0, -1) : rawClientUrl;

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Backstop for the 1 MB image rule — the browser already compresses, this keeps
// oversized base64 out of MongoDB even on direct API calls.
app.use(imageSizeGuard);
app.use(passport.initialize());
app.use("/uploads", express.static("public/uploads"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/packaging", packagingRoutes);
app.use("/api/packaging-types", packagingTypesRoutes);
app.use("/api/packaging-subtypes", packagingSubTypesRoutes);
app.use("/api/fg", fgRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/scents", scentRoutes);
app.use("/api/nozzles", nozzleRoutes);
app.use("/api/customer-log", customerLogRoutes);
app.use("/api/machines", machinesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/support", supportRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Naive Ops Backend Server running on port ${PORT}`);
  dbConnectionPromise.then((connected) => {
    if (!connected) {
      console.warn("MongoDB unavailable; Backend stays online, database features remain unavailable.");
      return;
    }

    // Sales board auto-move runs here, not in the browser, so the rule applies even
    // when nobody has the Sales page open. See jobs/autoMoveLeads.js.
    startAutoMoveScheduler();
  });
});
