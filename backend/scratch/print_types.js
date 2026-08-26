import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import PackagingItem from '../src/features/packaging/packagingItem.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await connectDB();
  const items = await PackagingItem.find({});
  const types = [...new Set(items.map(it => it.type))];
  console.log('Unique types:', types);
  
  // Also print packaging items grouped by type
  const grouped = {};
  items.forEach(it => {
    if (!grouped[it.type]) grouped[it.type] = [];
    grouped[it.type].push({ name: it.name, imageUrl: it.imageUrl || it.image, sku: it.sku });
  });
  
  for (const t in grouped) {
    console.log(`\nGroup [${t}]:`, grouped[t].slice(0, 3));
  }
  
  process.exit(0);
}

run();
