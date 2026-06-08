const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes('globalChapterLimit')) {
    // 1. Add globalChapterLimit declaration
    code = code.replace(
        /const globalTTSLimit = new Semaphore\(10\);/g,
        'const globalTTSLimit = new Semaphore(10);\nconst globalChapterLimit = new Semaphore(2);'
    );

    // 2. Add acquire to generateChapterAudio
    code = code.replace(
        /async function generateChapterAudio\(chapterId\) \{\n\s*try \{/g,
        'async function generateChapterAudio(chapterId) {\n    await globalChapterLimit.acquire();\n    try {'
    );

    // 3. Add release to finally block of generateChapterAudio
    // Look for the end of generateChapterAudio. It ends with:
    //         await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'ready', audioUrl, audioTimestamps: timestamps });
    //     } catch (error) { ... }
    // }
    code = code.replace(
        /        await Chapter\.findByIdAndUpdate\(chapterId, \{ audioStatus: 'error' \}\);\n    \}\n\}/g,
        "        await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'error' });\n    } finally {\n        globalChapterLimit.release();\n    }\n}"
    );

    fs.writeFileSync('server.js', code);
    console.log('Added globalChapterLimit');
} else {
    console.log('globalChapterLimit already exists');
}
