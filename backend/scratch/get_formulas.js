import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import BomFormula from '../src/features/bom/bomFormula.model.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function run() {
  await connectDB();
  const formulas = await BomFormula.find({});
  console.log('Formulas count:', formulas.length);
  const result = formulas.map(f => ({
    name: f.name,
    code: f.code,
    volumeMl: f.volumeMl || f.volume || 100, // volume per bottle
    ingredients: f.ingredients
  }));
  fs.writeFileSync('scratch/formulas.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Wrote formulas.json successfully');
  process.exit(0);
}

run();
