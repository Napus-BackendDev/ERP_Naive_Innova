import fs from 'fs';
import path from 'path';

const searchDirs = [
  'C:/Users/asus/Desktop/naive/MES/frontend/src',
  'C:/Users/asus/Desktop/naive/MES/backend/src'
];

function scan(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scan(full);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (/qa/i.test(content)) {
        console.log(`Found QA in: ${full}`);
      }
    }
  });
}

searchDirs.forEach(dir => scan(dir));
