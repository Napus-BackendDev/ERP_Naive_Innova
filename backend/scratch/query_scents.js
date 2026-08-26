import mongoose from "mongoose";
import dotenv from "dotenv";
import Scent from "../src/features/catalog/scent.model.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/ERP";
  await mongoose.connect(uri);
  
  const scents = await Scent.find({});
  console.log("Total scents in DB:", scents.length);
  
  scents.slice(0, 20).forEach((s, idx) => {
    console.log(`[${idx}] id=${s._id} owner=${s.ownerId} name="${s.name}"`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
