import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/backend/src/index.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

const targetCors = `// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));`;

const replacementCors = `// Middlewares
const rawClientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const cleanClientUrl = rawClientUrl.endsWith("/") ? rawClientUrl.slice(0, -1) : rawClientUrl;

app.use(cors({
  origin: [cleanClientUrl, cleanClientUrl + "/"],
  credentials: true
}));`;

if (code.includes(targetCors)) {
  code = code.replace(targetCors, replacementCors);
  fs.writeFileSync(path, code, 'utf8');
  console.log("Successfully patched CORS settings in index.js!");
} else {
  console.log("CORS target block not found!");
}
