const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Replace Queue logic with Semaphore
const queueRegex = /\/\/ ─── Background Audio Generation Queue ──────────────────────────────────────[\s\S]*?(?=\/\/ ─── Background Audio Generation ──────────────────────────────────────────)/;

const semaphoreCode = `// ─── Global Concurrency Limiter ──────────────────────────────────────────
class Semaphore {
    constructor(max) {
        this.max = max;
        this.count = 0;
        this.waiting = [];
    }
    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return;
        }
        return new Promise(resolve => this.waiting.push(resolve));
    }
    release() {
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            resolve();
        } else {
            this.count--;
        }
    }
}
const globalTTSLimit = new Semaphore(30);

`;
code = code.replace(queueRegex, semaphoreCode);


// 2. Rewrite generateChapterAudio inner loop
// We need to match from `const audioBuffers = new Array...` up to `// Gắn timestamps tuần tự`
const audioGenerationLoopRegex = /const audioBuffers = new Array[\s\S]*?(?=\/\/ Gắn timestamps tuần tự)/;

const newLoopCode = `const audioBuffers = new Array(chapter.content.length).fill(null);
        let processedCount = 0;

        await Promise.all(chapter.content.map(async (rawText, idx) => {
            const text = rawText.trim();
            const isPunctuationOnly = !(/\\p{L}/u.test(text)) && !(/\\d/.test(text));
            
            if (!text || isPunctuationOnly) {
                audioBuffers[idx] = Buffer.alloc(0);
                processedCount++;
                return;
            }

            await globalTTSLimit.acquire();
            try {
                const chunkBuffers = await Promise.race([
                    new Promise(async (resolve, reject) => {
                        try {
                            const { audioStream } = tts.toStream(text);
                            const chunks = [];
                            for await (const chunk of audioStream) {
                                chunks.push(chunk);
                            }
                            resolve(chunks);
                        } catch (e) {
                            reject(e);
                        }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TTS_TIMEOUT')), 15000))
                ]);

                audioBuffers[idx] = Buffer.concat(chunkBuffers);
            } catch (err) {
                console.error(\`Error on paragraph \${idx}:\`, err.message);
                audioBuffers[idx] = Buffer.alloc(0);
                // Removed unsafe tts.close() here
            } finally {
                globalTTSLimit.release();
            }
            
            processedCount++;
            
            // Cập nhật tiến độ mỗi 5 đoạn hoặc khi xong hẳn để tránh spam DB
            if (processedCount % 5 === 0 || processedCount === chapter.content.length) {
                let currentProgress = Math.floor((processedCount / chapter.content.length) * 100);
                if (currentProgress > 99 && processedCount < chapter.content.length) currentProgress = 99;
                await Chapter.findByIdAndUpdate(chapterId, { audioProgress: currentProgress }).catch(()=> {});
            }
        }));
        
        tts.close();

        `;

code = code.replace(audioGenerationLoopRegex, newLoopCode);

// 3. Replace addChapterToUploadQueue in routes with generateChapterAudio
code = code.replace(/addChapterToUploadQueue/g, 'generateChapterAudio');

fs.writeFileSync('server.js', code);
console.log('Successfully refactored server.js to use global Semaphore.');
