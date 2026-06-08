require('dotenv').config();
const mongoose = require('mongoose');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const MONGODB_URI = process.env.MONGODB_URI;

const ChapterSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    content: { type: [String], required: true },
    originalFilename: String,
    audioUrl: { type: String, default: null },
    audioPublicId: { type: String, default: null },
    audioTimestamps: { type: Array, default: [] },
    audioStatus: { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Chapter = mongoose.model('Chapter', ChapterSchema);

async function generateChapterAudio(chapterId) {
    let tts;
    try {
        await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'processing' });
        const chapter = await Chapter.findById(chapterId);
        if (!chapter || !chapter.content || chapter.content.length === 0) return;

        console.log(`\n⏳ Đang xử lý: ${chapter.title}...`);

        tts = new MsEdgeTTS();
        await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const buffers = [];
        const timestamps = [];
        let currentDurationSeconds = 0;
        const BYTES_PER_SECOND = 6000;

        for (let i = 0; i < chapter.content.length; i++) {
            const text = chapter.content[i].trim();
            const isPunctuationOnly = !(/\p{L}/u.test(text)) && !(/\d/.test(text));
            if (!text || isPunctuationOnly) {
                timestamps.push({ index: i, start: currentDurationSeconds, end: currentDurationSeconds });
                continue;
            }

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

                const paraBuffer = Buffer.concat(chunkBuffers);
                if (paraBuffer.length > 0) {
                    buffers.push(paraBuffer);
                    const paraDuration = paraBuffer.length / BYTES_PER_SECOND;
                    timestamps.push({ index: i, start: currentDurationSeconds, end: currentDurationSeconds + paraDuration });
                    currentDurationSeconds += paraDuration;
                } else {
                    timestamps.push({ index: i, start: currentDurationSeconds, end: currentDurationSeconds });
                }
                process.stdout.write(`.`); 
                await new Promise(r => setTimeout(r, 200)); 
            } catch (err) {
                console.error(`\nLỗi đoạn ${i}:`, err.message);
                timestamps.push({ index: i, start: currentDurationSeconds, end: currentDurationSeconds });
                if (err.message === 'TTS_TIMEOUT') {
                    console.log('\nKhôi phục kết nối giọng đọc...');
                    try { tts.close(); } catch(e){}
                    tts = new MsEdgeTTS();
                    await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
                }
            }
        }
        
        try { tts.close(); } catch(e){}

        if (buffers.length === 0) {
            await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'error' });
            return;
        }

        const fullAudioBuffer = Buffer.concat(buffers);
        console.log('\nĐang tải lên Cloudinary...');

        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                resource_type: 'video',
                folder: 'audio-reader-chapters',
                format: 'mp3'
            }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
            stream.end(fullAudioBuffer);
        });

        await Chapter.findByIdAndUpdate(chapterId, {
            audioUrl: uploadResponse.secure_url,
            audioPublicId: uploadResponse.public_id,
            audioTimestamps: timestamps,
            audioStatus: 'ready'
        });
        
        console.log(`✅ Thành công: ${chapter.title}`);
    } catch (err) {
        console.error(`❌ Lỗi tổng thể:`, err.message);
        if (tts) { try { tts.close(); } catch(e){} }
        await Chapter.findByIdAndUpdate(chapterId, { audioStatus: 'error' }).catch(()=> {});
    }
}

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối Database. Bắt đầu quét các chương chưa có Audio...');
    
    const chaptersToProcess = await Chapter.find({ audioUrl: null });
    console.log(`Tìm thấy ${chaptersToProcess.length} chương cần xử lý.`);
    
    for (let i = 0; i < chaptersToProcess.length; i++) {
        console.log(`\n--- Đang xử lý chương ${i + 1} / ${chaptersToProcess.length} ---`);
        await generateChapterAudio(chaptersToProcess[i]._id);
        // Nghỉ 5 giây giữa các chương để tránh bị chặn
        await new Promise(r => setTimeout(r, 5000));
    }
    
    console.log('\n🎉 ĐÃ HOÀN THÀNH TOÀN BỘ!');
    mongoose.disconnect();
}

run();
