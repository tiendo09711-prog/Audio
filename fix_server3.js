const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

const crashHandlers = `
// ─── Bulletproof Server Crash Handlers ──────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});
`;

if (!code.includes('unhandledRejection')) {
    // Insert after requires
    code = code.replace(/(const .*? = require\('.*?'\);\n)+/g, match => match + crashHandlers);
    fs.writeFileSync('server.js', code);
    console.log('Added crash handlers');
} else {
    console.log('Crash handlers already exist');
}
