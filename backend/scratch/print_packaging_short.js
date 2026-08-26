import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import PackagingItem from '../src/features/packaging/packagingItem.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await connectDB();
  const items = await PackagingItem.find({});
  const list = items.map(it => ({
    name: it.name,
    sku: it.sku,
    type: it.type, // e.g. "ขวด", "ปั๊ม", "สติกเกอร์"
    imageUrl: it.imageUrl || it.image || '',
    stock: it.stock
  }));
  console.log('Short List:', JSON.stringify(list, null, 2));
  process.exit(0);
}

run();
