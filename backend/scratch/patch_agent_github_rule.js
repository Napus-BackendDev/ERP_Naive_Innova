import fs from 'fs';

// 1. Update .agents/AGENTS.md
const agentsPath = 'C:/Users/asus/Desktop/naive/MES/.agents/AGENTS.md';
if (fs.existsSync(agentsPath)) {
  let content = fs.readFileSync(agentsPath, 'utf8').replace(/\r\n/g, '\n');
  
  const ruleText = `10. **GitHub Push Control**: Do NOT run git commit or push commands to upload code to GitHub unless the user explicitly says "อัพขึ้น github" (or contains the words "ขึ้น github") in their request. If the user does not specify this phrase, perform all file changes and code edits purely in the local workspace and do not execute git commit or git push.`;

  if (!content.includes('GitHub Push Control')) {
    content += '\n' + ruleText + '\n';
    fs.writeFileSync(agentsPath, content, 'utf8');
    console.log("Successfully appended Git Rule to .agents/AGENTS.md!");
  } else {
    console.log("Git Rule already exists in .agents/AGENTS.md.");
  }
}

// 2. Update .agent in the root
const agentPath = 'C:/Users/asus/Desktop/naive/MES/.agent';
if (fs.existsSync(agentPath)) {
  let content = fs.readFileSync(agentPath, 'utf8').replace(/\r\n/g, '\n');

  const ruleTextRoot = `
## กฎการทำงานร่วมกับ GitHub (GitHub Git Rule)
- **เงื่อนไขการอัปโหลด**: ห้ามทำการรันคำสั่ง \`git commit\` หรือ \`git push\` ขึ้น GitHub โดยเด็ดขาด เว้นแต่ผู้ใช้จะสั่งคำว่า **"อัพขึ้น github"** หรือมีคำว่า **"ขึ้น github"** อยู่ในคำร้องขอรอบนั้นๆ เท่านั้น หากไม่มีคำสั่งดังกล่าว ให้ทำการแก้ไขโค้ดเฉพาะในระบบเครื่องของผู้ใช้ (Local) เท่านั้น`;

  if (!content.includes('กฎการทำงานร่วมกับ GitHub')) {
    content += '\n' + ruleTextRoot + '\n';
    fs.writeFileSync(agentPath, content, 'utf8');
    console.log("Successfully appended Git Rule to .agent!");
  } else {
    console.log("Git Rule already exists in .agent.");
  }
}
