import fs from 'fs';

const path = 'C:/Users/asus/.gemini/antigravity/brain/ae529d9e-4576-449e-a0b3-7db09867f3ca/deployment_guide.md';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Normalize line endings
  content = content.replace(/\r\n/g, '\n');

  // Replace names and domains
  content = content.replaceAll('naive-ops-frontend.vercel.app', 'naive-erp.vercel.app');
  content = content.replaceAll('naive-ops-frontend', 'naive-erp');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully updated vercel project name to naive-erp in deployment_guide.md!");
} else {
  console.log("deployment_guide.md not found!");
}
