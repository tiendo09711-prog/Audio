const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// The duplicate block at the top
const badTopBlockStart = content.indexOf("    // List Controls Logic\n    const toggleSelectModeBtn = document.getElementById('toggle-select-mode-btn');");
let badTopBlockStartCRLF = content.indexOf("    // List Controls Logic\r\n    const toggleSelectModeBtn = document.getElementById('toggle-select-mode-btn');");

const actualStart = badTopBlockStart !== -1 ? badTopBlockStart : badTopBlockStartCRLF;

// End of the duplicate block is right before `const fileListEl`
const endOfBadTopBlock = content.indexOf("    const fileListEl       = document.getElementById('file-list');");

if (actualStart !== -1 && endOfBadTopBlock !== -1) {
    content = content.substring(0, actualStart) + content.substring(endOfBadTopBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully removed duplicate List Controls Logic at top of app.js");
} else {
    console.log("Could not find bounds", {actualStart, endOfBadTopBlock});
}
