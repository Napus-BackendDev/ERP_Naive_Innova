import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/.agents/AGENTS.md';
let code = fs.readFileSync(path, 'utf8');

const target = `8. **No Bug Policy**: Treat any compile failure, runtime crash, or missing definition as a critical blocker. Test your own output proactively (e.g., via compiler dry-runs) before reporting completion.`;

const replacement = `8. **No Bug Policy**: Treat any compile failure, runtime crash, or missing definition as a critical blocker. Test your own output proactively (e.g., via compiler dry-runs) before reporting completion.
9. **UI Mockup Image Generation**: Every single time you modify, update, or create frontend UI/UX views (such as components, pages, dashboard layouts, or modals), you MUST proactively call the \`generate_image\` tool to create a visual mockup/screenshot representation of the updated interface and embed it in your final response. This allows the user to review the layout, check the aesthetics, and comment directly on the visual elements.`;

code = code.replace(target, replacement);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated AGENTS.md with UI Mockup Image Generation rule!");
