import fs from "fs";
import path from "path";

const searchDir = (dir, query) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (stat.isFile() && file.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found query "${query}" in: ${fullPath}`);
      }
    }
  }
};

console.log("Searching backend...");
searchDir("src", "google");
searchDir("src", "sheet");
searchDir("src", "script");
searchDir("src", "fetch");

console.log("\nSearching frontend...");
// Let's also check frontend if there is any script
try {
  searchDir("../frontend/src", "google");
  searchDir("../frontend/src", "sheet");
  searchDir("../frontend/src", "script");
} catch (e) {
  console.log("No frontend src found or accessible");
}
