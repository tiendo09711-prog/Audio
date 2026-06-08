const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Wrap tts.close() in try-catch
code = code.replace(/tts\.close\(\);/g, 'try { tts.close(); } catch(e) {}');

// Reduce semaphore limit from 30 to 15
code = code.replace(/const globalTTSLimit = new Semaphore\(30\);/g, 'const globalTTSLimit = new Semaphore(10);');

fs.writeFileSync('server.js', code);
console.log('Fixed tts.close() and reduced Semaphore limit');
