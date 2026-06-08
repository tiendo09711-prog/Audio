const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// The bad block starts at:
const badStart = "    async function fetchChapters(bookId) {\r\n        try {\r\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\r\n            } else {";

// The bad block ends just before the real `async function fetchChapters(bookId) {`
const realFetchStart = "    async function fetchChapters(bookId) {\r\n        try {\r\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\r\n            const res = await fetch(`/api/books/${bookId}/chapters`);";

// Let's use indexOf
let iStart = content.indexOf("    async function fetchChapters(bookId) {\n        try {\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\n            } else {");

if (iStart === -1) {
    iStart = content.indexOf("    async function fetchChapters(bookId) {\r\n        try {\r\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\r\n            } else {");
}

let iEnd = content.indexOf("    async function fetchChapters(bookId) {\n        try {\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\n            const res = await fetch(");

if (iEnd === -1) {
    iEnd = content.indexOf("    async function fetchChapters(bookId) {\r\n        try {\r\n            fileListEl.innerHTML = '<li class=\"file-list-loading\">Đang tải chương...</li>';\r\n            const res = await fetch(");
}

if (iStart !== -1 && iEnd !== -1) {
    content = content.substring(0, iStart) + content.substring(iEnd);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully removed the duplicated and corrupted block.");
} else {
    console.log("Could not find the bounds for the bad block.");
    console.log("iStart:", iStart);
    console.log("iEnd:", iEnd);
}
