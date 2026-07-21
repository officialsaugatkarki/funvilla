const fs = require('fs');
const content = fs.readFileSync('app/menu/page.tsx', 'utf-8');

// Find the start and end of menuData
const startStr = "const menuData = {";
const startIndex = content.indexOf(startStr);
if (startIndex === -1) {
    console.error("menuData not found");
    process.exit(1);
}

// Find matching closing brace
let openBraces = 0;
let endIndex = -1;
for (let i = startIndex + startStr.length - 1; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            endIndex = i + 1;
            break;
        }
    }
}

const menuDataStr = content.substring(startIndex, endIndex);

fs.writeFileSync('app/menu/data.ts', `export ${menuDataStr}\n`);
console.log("Extracted menuData to app/menu/data.ts");
