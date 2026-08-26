import fs from "fs";

const file = "c:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/BomCalculatorView.js";

function run() {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("bomCalcResult") || line.includes("calculate")) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
}

run();
