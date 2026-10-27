import express from "express";

import salesRoutes from "../../src/features/sales/sales.routes.js";
import bomRoutes from "../../src/features/bom/bom.routes.js";
import packagingRoutes from "../../src/features/packaging/packaging.routes.js";
import packagingTypesRoutes from "../../src/features/packaging/packagingTypes.routes.js";
import packagingSubTypesRoutes from "../../src/features/packaging/packagingSubTypes.routes.js";
import fgRoutes from "../../src/features/fg/fg.routes.js";
import userRoutes from "../../src/features/users/user.routes.js";
import logRoutes from "../../src/features/logs/activityLog.routes.js";
import productionRoutes from "../../src/features/production/production.routes.js";
import scentRoutes from "../../src/features/catalog/scents.routes.js";
import nozzleRoutes from "../../src/features/catalog/nozzles.routes.js";
import customerLogRoutes from "../../src/features/customerLog/customerLog.routes.js";
import machinesRoutes from "../../src/features/machines/machines.routes.js";
import productRoutes from "../../src/features/products/products.routes.js";
import supportRoutes from "../../src/features/support/support.routes.js";
import authRoutes from "../../src/features/auth/auth.routes.js";
import exportRoutes from "../../src/features/bom/export.routes.js";
import imageSizeGuard from "../../src/middleware/imageSizeGuard.js";
import passport from "../../src/config/passport.js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(imageSizeGuard);
app.use(passport.initialize());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/sales", salesRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/packaging", packagingRoutes);
app.use("/api/packaging-types", packagingTypesRoutes);
app.use("/api/packaging-subtypes", packagingSubTypesRoutes);
app.use("/api/fg", fgRoutes);
app.use("/api/users", userRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/scents", scentRoutes);
app.use("/api/nozzles", nozzleRoutes);
app.use("/api/customer-log", customerLogRoutes);
app.use("/api/machines", machinesRoutes);
app.use("/api/products", productRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/export", exportRoutes);

export default app;
