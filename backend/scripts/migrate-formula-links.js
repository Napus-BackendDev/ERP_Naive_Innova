import "dotenv/config";
import mongoose from "mongoose";
import Customer from "../src/features/customers/customer.model.js";
import BomFormula, { normalizeFormulaName } from "../src/features/bom/bomFormula.model.js";

const apply = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
  console.error("MONGODB_URI or MONGO_URI is required");
  process.exitCode = 1;
} else {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const formulas = await BomFormula.find({ isArchived: { $ne: true } }).lean();
  const byOwnerAndName = new Map();
  for (const formula of formulas) {
    const key = `${formula.ownerId}:${formula.normalizedName || normalizeFormulaName(formula.name)}`;
    const list = byOwnerAndName.get(key) || [];
    list.push(formula);
    byOwnerAndName.set(key, list);
  }

  const report = { matched: 0, unmatched: [], ambiguous: [], alreadyLinked: 0, updatedCustomers: 0 };
  const cursor = Customer.find({ orderedProducts: { $exists: true, $ne: [] } }).cursor();
  for await (const customer of cursor) {
    let changed = false;
    const lines = Array.isArray(customer.orderedProducts) ? customer.orderedProducts : [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line || line.formulaId) {
        if (line?.formulaId) report.alreadyLinked += 1;
        continue;
      }
      const name = String(line.formulaName || "").trim();
      if (!name) continue;
      const candidates = byOwnerAndName.get(`${customer.ownerId}:${normalizeFormulaName(name)}`) || [];
      if (candidates.length === 1) {
        report.matched += 1;
        if (apply) {
          line.formulaId = candidates[0]._id;
          line.formulaName = candidates[0].name;
          changed = true;
        }
      } else if (candidates.length === 0) {
        report.unmatched.push({ customerId: String(customer._id), productIndex: index, formulaName: name });
      } else {
        report.ambiguous.push({ customerId: String(customer._id), productIndex: index, formulaName: name, formulaIds: candidates.map(f => String(f._id)) });
      }
    }
    if (changed) {
      customer.markModified("orderedProducts");
      await customer.save();
      report.updatedCustomers += 1;
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...report }, null, 2));
  await mongoose.disconnect();
}
