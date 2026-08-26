import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import PackagingItem from '../src/features/packaging/packagingItem.model.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function run() {
  await connectDB();
  const items = await PackagingItem.find({});
  const types = [...new Set(items.map(it => it.type))];
  const counts = {};
  items.forEach(it => { counts[it.type] = (counts[it.type] || 0) + 1; });
  const samples = {};
  items.forEach(it => {
    if (!samples[it.type]) {
      samples[it.type] = { name: it.name, imageUrl: it.imageUrl || it.image || it.imagePath || '' };
    }
  });
  
  const result = { types, counts, samples };
  fs.writeFileSync('scratch/types.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Wrote types.json successfully');
  process.exit(0);
}

run();
