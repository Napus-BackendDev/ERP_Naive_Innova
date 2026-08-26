import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/system.md';
let content = fs.readFileSync(path, 'utf8');

// Replace the status description line
content = content.replace(
  'productionStatus: สถานะขั้นตอนผลิตปัจจุบัน (เช่น ยังไม่ผลิต, รอยืนยัน, กำลังผลิต (บรรจุ), กำลังผลิต (ติดฉลาก), รอตรวจ QA รอบที่ 2, รอลูกค้ายืนยัน, ลูกค้ายืนยันแล้ว, สำเร็จเสร็จสิ้น)',
  'productionStatus: สถานะขั้นตอนผลิตปัจจุบัน (เช่น ยังไม่ผลิต, รอยืนยัน, รอตรวจ QA รอบที่ 1, กำลังผลิต, รอตรวจ QA รอบที่ 2, รอลูกค้ายืนยัน, ลูกค้ายืนยันแล้ว, สำเร็จเสร็จสิ้น)'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated productionStatus details in system.md!");
