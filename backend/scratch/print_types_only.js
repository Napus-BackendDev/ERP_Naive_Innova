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
  
  // print types and count of items in each type
  const counts = {};
  items.forEach(it => {
    counts[it.type] = (counts[it.type] || 0) + 1;
  });
  console.log('Counts:', counts);
  
  // print one sample item per type with name and imageUrl
  const samples = {};
  items.forEach(it => {
    if (!samples[it.type]) {
      samples[it.type] = { name: it.name, imageUrl: it.imageUrl || it.image || it.imagePath || '' };
    }
  });
  console.log('Samples:', samples);
  process.exit(0);
}

run();
