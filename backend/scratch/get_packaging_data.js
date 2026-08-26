import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import PackagingItem from '../src/features/packaging/packagingItem.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await connectDB();
  const items = await PackagingItem.find({});
  console.log('Packaging items count:', items.length);
  console.log('Packaging items:', JSON.stringify(items.slice(0, 15), null, 2));
  process.exit(0);
}

run();
