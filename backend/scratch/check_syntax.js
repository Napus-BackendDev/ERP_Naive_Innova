import fs from 'fs';

const code = fs.readFileSync('C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js', 'utf8');

let curlyCount = 0;
let parenCount = 0;
let squareCount = 0;

for (let i = 0; i < code.length; i++) {
  const char = code[i];
  if (char === '{') curlyCount++;
  if (char === '}') curlyCount--;
  if (char === '(') parenCount++;
  if (char === ')') parenCount--;
  if (char === '[') squareCount++;
  if (char === ']') squareCount--;
}

console.log('Curly mismatch (should be 0):', curlyCount);
console.log('Paren mismatch (should be 0):', parenCount);
console.log('Square mismatch (should be 0):', squareCount);
