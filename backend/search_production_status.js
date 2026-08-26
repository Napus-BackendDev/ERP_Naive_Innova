import fs from "fs";
import path from "path";

const dir = "c:/Users/asus/Desktop/naive/MES/backend/src";

function search(currentDir) {
  const files = fs.readdirSync(currentDir);
  files.forEach(file => {
    const fullPath = path.join(currentDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (file.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("productionStatus")) {
        console.log(`Found in: ${fullPath}`);
      }
    }
  });
}

search(dir);
