import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/types.json', 'utf8'));

console.log('Unique types count:', Object.keys(data.counts).length);
console.log('Sample items list:');
for (const typeId in data.samples) {
  const item = data.samples[typeId];
  console.log(`Type ID: ${typeId} | Name: ${item.name} | Has Image: ${!!item.imageUrl}`);
  if (item.imageUrl && item.imageUrl.startsWith('data:')) {
    console.log(`  -> Base64 Image: length=${item.imageUrl.length}`);
  } else if (item.imageUrl) {
    console.log(`  -> URL Image: ${item.imageUrl}`);
  }
}
