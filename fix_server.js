const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Insert Queue variables before generateChapterAudio
const queueInjection = `
// ─── Background Audio Generation Queue ──────────────────────────────────────
const uploadQueue = [];
let isProcessingQueue = false;

async function processUploadQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (uploadQueue.length > 0) {
        const chapterId = uploadQueue.shift();
        try {
            await generateChapterAudio(chapterId);
        } catch (err) {
            console.error("Queue process error for", chapterId, err);
            await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'error' }).catch(()=>{});
        }
    }
    isProcessingQueue = false;
}

function addChapterToUploadQueue(chapterId) {
    if (!uploadQueue.includes(chapterId)) {
        uploadQueue.push(chapterId);
    }
    processUploadQueue();
}

// ─── Background Audio Generation ──────────────────────────────────────────
`;
code = code.replace('// ─── Background Audio Generation ──────────────────────────────────────────\n', queueInjection);

// 2. Replace generateChapterAudio calls in routes
code = code.replace(/generateChapterAudio\(newChapter\._id\);/g, 'addChapterToUploadQueue(newChapter._id);');

// 3. Remove the dangerous tts.close() and tts = new MsEdgeTTS() inside the parallel block
const dangerousBlock = `
                    if (err.message === 'TTS_TIMEOUT' || err.message.includes('ENOTFOUND')) {
                        try {
                            tts.close();
                            tts = new MsEdgeTTS();
                            await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
                        } catch(e){}
                    }`;
code = code.replace(dangerousBlock, `
                    // Removed tts.close() here because 'tts' is shared among concurrent streams.
`);

// 4. Update the start script to recover pending chapters
const runMigrationInjection = `
// Run migration after connection
mongoose.connection.once('open', async () => {
    await runMigration();
    try {
        const stuckChapters = await Chapter.find({ audioStatus: { $in: ['processing', 'pending'] } });
        for (const chap of stuckChapters) {
            addChapterToUploadQueue(chap._id);
        }
        if (stuckChapters.length > 0) {
            console.log(\`Đã đưa \${stuckChapters.length} chương lỗi/dở dang vào hàng đợi xử lý.\`);
        }
    } catch(err) { console.error('Recovery error:', err); }
});
`;
code = code.replace(`// Run migration after connection
mongoose.connection.once('open', () => {
    runMigration();
});`, runMigrationInjection);


fs.writeFileSync('server.js', code);
console.log('Applied Queue to server.js');
