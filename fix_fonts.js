const fs = require('fs');
let code = fs.readFileSync('public/style.css', 'utf8');

// Replace Google Fonts import
const importRegex = /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[\s\S]*?'\);/;
code = code.replace(importRegex, "@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');");

// Replace all font-family declarations
code = code.replace(/font-family:\s*'Inter',\s*sans-serif;/g, "font-family: 'Roboto', system-ui, sans-serif;");
code = code.replace(/font-family:\s*'Outfit',\s*sans-serif;/g, "font-family: 'Roboto', system-ui, sans-serif;");

fs.writeFileSync('public/style.css', code);
console.log('Fonts updated in style.css');
