import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/backend/src/features/users/user.model.js';
let code = fs.readFileSync(path, 'utf8');

const target = `    qaStatus: { type: String, default: "pending" }`;
const replacement = `    qaStatus: { type: String, default: "pending" },
    isStockDeducted: { type: Boolean, default: false }`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code, 'utf8');
console.log("Successfully added isStockDeducted to User model schema!");
