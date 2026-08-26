import fs from "fs";
import path from "path";

const searchDir = (dir, query) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (stat.isFile() && (file.endsWith(".js") || file.endsWith(".md") || file.endsWith(".json"))) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found query "${query}" in: ${fullPath}`);
      }
    }
  }
};

console.log("Searching specs...");
searchDir("..", "productstock");
searchDir("..", "stockmanagerdb");
