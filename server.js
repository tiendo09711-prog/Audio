try {
    require('dotenv').config();
} catch (e) {
    console.log('dotenv is not loaded');
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const multer = require('multer');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css'))  res.setHeader('Content-Type', 'text/css; charset=utf-8');
        if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
}));

// ─── Mongoose Setup ────────────────────────────────────────────────────────
// Using standard mongodb:// URI to bypass local DNS querySrv ECONNREFUSED issues on Windows
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://tiendodev:Tien290105@ac-1eo65x2-shard-00-00.gz2riy5.mongodb.net:27017,ac-1eo65x2-shard-00-01.gz2riy5.mongodb.net:27017,ac-1eo65x2-shard-00-02.gz2riy5.mongodb.net:27017/audio?ssl=true&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const StorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: [String], required: true },
    originalFilename: String,
    createdAt: { type: Date, default: Date.now }
});

const Story = mongoose.model('Story', StorySchema);

const ProgressSchema = new mongoose.Schema({
    userId: { type: String, default: 'default_user', unique: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    title: String,
    paragraphIndex: Number,
    updatedAt: { type: Date, default: Date.now }
});

const Progress = mongoose.model('Progress', ProgressSchema);

// ─── Multer Setup (for memory storage) ─────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Progress API ──────────────────────────────────────────────────────────
app.get('/api/progress', async (req, res) => {
    try {
        const prog = await Progress.findOne({ userId: 'default_user' });
        res.json(prog || { status: 'none' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy tiến độ' });
    }
});

app.post('/api/progress', async (req, res) => {
    try {
        const { storyId, title, paragraphIndex } = req.body;
        if (!storyId) return res.status(400).json({ error: 'Missing storyId' });
        
        await Progress.findOneAndUpdate(
            { userId: 'default_user' },
            { storyId, title, paragraphIndex, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lưu tiến độ' });
    }
});

// ─── Voice Configurations (Microsoft Edge Neural) ───────────────────────────
const VOICE_CONFIGS = {
    'female-1': { voice: 'vi-VN-HoaiMyNeural',   rate: '+0%',  pitch: '+0Hz',   label: 'Nữ Tự Nhiên'  },
    'female-2': { voice: 'vi-VN-HoaiMyNeural',   rate: '-12%', pitch: '+8Hz',   label: 'Nữ Dịu Dàng'  },
    'female-3': { voice: 'vi-VN-HoaiMyNeural',   rate: '+15%', pitch: '-6Hz',   label: 'Nữ Linh Hoạt' },
    'male-1':   { voice: 'vi-VN-NamMinhNeural',  rate: '+0%',  pitch: '+0Hz',   label: 'Nam Trầm Ấm'  },
    'male-2':   { voice: 'vi-VN-NamMinhNeural',  rate: '-10%', pitch: '-8Hz',   label: 'Nam Điềm Tĩnh' },
    'male-3':   { voice: 'vi-VN-NamMinhNeural',  rate: '+18%', pitch: '+5Hz',   label: 'Nam Rõ Ràng'  },
};

app.get('/api/tts', async (req, res) => {
    const text = req.query.text;
    const voiceId = 'male-1'; // Force male voice

    if (!text) return res.status(400).send('Missing text');
    const cfg = VOICE_CONFIGS[voiceId];

    let tts = null;
    try {
        tts = new MsEdgeTTS();
        await tts.setMetadata(cfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const { audioStream } = tts.toStream(text, { rate: cfg.rate, pitch: cfg.pitch });

        const chunks = [];
        let errored = false;

        audioStream.on('data', chunk => chunks.push(chunk));

        audioStream.on('close', () => {
            if (tts) { tts.close(); tts = null; }
            if (errored) return;
            const audio = Buffer.concat(chunks);
            if (audio.length === 0) {
                return res.status(500).json({ error: 'Empty TTS response' });
            }
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audio.length);
            res.end(audio);
        });

        audioStream.on('error', err => {
            errored = true;
            if (tts) { tts.close(); tts = null; }
            console.error('Edge TTS stream error:', err.message);
            if (!res.headersSent) res.status(500).json({ error: err.message });
        });

    } catch (err) {
        if (tts) { tts.close(); tts = null; }
        console.error('TTS error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// ─── Database Endpoints ────────────────────────────────────────────────────

app.get('/api/files', async (req, res) => {
    try {
        const stories = await Story.find({}, '_id title createdAt');
        
        // Sắp xếp tăng dần theo số chương (nếu có chữ Chương XXX)
        const extractChapterNum = (title) => {
            const match = title.match(/Chương\s+(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
        };
        
        stories.sort((a, b) => {
            const numA = extractChapterNum(a.title);
            const numB = extractChapterNum(b.title);
            if (numA !== numB) return numA - numB;
            // Nếu cùng số chương hoặc không có số, xếp theo tên chữ cái
            return a.title.localeCompare(b.title);
        });

        res.json({ files: stories.map(s => ({ id: s._id, title: s.title })) });
    } catch (error) {
        console.error('Fetch DB error:', error);
        res.status(500).json({ error: 'Failed to fetch stories from DB' });
    }
});

app.get('/api/story/:id', async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: 'Story not found' });
        res.json({ title: story.title, content: story.content, id: story._id });
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID or DB error' });
    }
});

app.get('/api/download-chapter/:id', async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).send('Story not found');
        
        const encodedTitle = encodeURIComponent(story.title || 'Chuong_Khong_Ten');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedTitle}.mp3`);
        
        const voiceId = 'male-1';
        const cfg = VOICE_CONFIGS[voiceId];

        // Không gộp (chunk) text nữa vì việc nối các đoạn bằng \n có thể khiến Microsoft TTS 
        // tự động ngắt câu và nuốt chữ ở các đoạn sau.
        // Mỗi đoạn văn sẽ được xử lý riêng biệt y như lúc nghe online để đảm bảo 100% đủ chữ.
        const validParagraphs = story.content
            .map(p => p.trim())
            .filter(text => text && (/\p{L}/u.test(text) || /\d/.test(text)));
            
        const textChunks = validParagraphs; // Giữ nguyên từng đoạn
        
        // Giảm giới hạn luồng xuống 5 và thêm cơ chế thử lại (Retry) để vượt qua bộ lọc Rate Limit của Microsoft
        const concurrencyLimit = 5;
        const results = new Array(textChunks.length);
        const readyPromises = new Array(textChunks.length).fill(null).map(() => {
            let resolveFn;
            const promise = new Promise(r => { resolveFn = r; });
            return { promise, resolve: resolveFn };
        });

        let currentIndex = 0;

        const worker = async () => {
            while (currentIndex < textChunks.length) {
                const i = currentIndex++;
                const text = textChunks[i];
                let attempt = 0;
                let success = false;
                
                while (attempt < 4 && !success) {
                    let tts = null;
                    try {
                        tts = new MsEdgeTTS();
                        await tts.setMetadata(cfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
                        const { audioStream } = tts.toStream(text, { rate: cfg.rate, pitch: cfg.pitch });
                        
                        const buffers = [];
                        await new Promise((resolve, reject) => {
                            audioStream.on('data', chunk => buffers.push(chunk));
                            audioStream.on('close', resolve);
                            audioStream.on('error', reject);
                        });
                        
                        const buf = Buffer.concat(buffers);
                        // Kích thước buffer rỗng hoặc quá nhỏ chứng tỏ Microsoft từ chối trả file do Rate Limit
                        if (buf.length > 50) {
                            results[i] = buf;
                            success = true;
                        } else {
                            throw new Error('Máy chủ TTS trả về audio rỗng');
                        }
                    } catch (err) {
                        attempt++;
                        console.log(`Đoạn ${i} bị từ chối, đang thử lại (lần ${attempt}/4)...`);
                        if (attempt >= 4) {
                            results[i] = Buffer.alloc(0); 
                        } else {
                            // Chờ 1-2s trước khi thử lại để tránh bị block tiếp
                            await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                        }
                    } finally {
                        if (tts) { tts.close(); }
                    }
                }
                readyPromises[i].resolve();
            }
        };

        // Bắt đầu các worker chạy song song
        const workers = Array(Math.min(concurrencyLimit, textChunks.length)).fill(0).map(worker);

        // Chờ và ghi từng phần vào stream ngay khi nó sẵn sàng (theo đúng thứ tự)
        // Điều này giúp trình duyệt bắt đầu tải về ngay lập tức thay vì phải chờ tất cả xong
        for (let i = 0; i < textChunks.length; i++) {
            await readyPromises[i].promise;
            if (results[i] && results[i].length > 0) {
                res.write(results[i]);
            }
        }
        
        res.end();
    } catch (error) {
        console.error('Download chapter error:', error);
        if (!res.headersSent) res.status(500).send('Failed to download chapter');
        else res.end();
    }
});

app.post('/api/upload', upload.array('htmlFiles'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedStories = [];

        for (const file of req.files) {
            const html = file.buffer.toString('utf-8');
            const $ = cheerio.load(html);
            // Fix Multer's default latin1 encoding for filenames to UTF-8
            const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

            let title = filename.replace('.html', '').trim();
            if (!title) {
                title = $('h1[itemProp="name"]').text().trim() || $('title').text().trim() || 'Chương không tên';
            }
            
            const paragraphs = [];
            
            $('.prose-novel p, #original-content-tab p').each((i, el) => {
                const text = $(el).text().trim();
                if (text) paragraphs.push(text);
            });
            
            if (paragraphs.length === 0) {
                $('p').each((i, el) => {
                    const text = $(el).text().trim();
                    if (text) paragraphs.push(text);
                });
            }
            
            if (paragraphs.length === 0) {
                paragraphs.push($('body').text().trim() || 'Không tìm thấy nội dung.');
            }

            const newStory = new Story({
                title,
                content: paragraphs,
                originalFilename: filename
            });

            await newStory.save();
            uploadedStories.push(newStory._id);
        }

        res.json({ success: true, message: `Upload thành công ${req.files.length} chương!`, ids: uploadedStories });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Lỗi khi xử lý và lưu file' });
    }
});

app.post('/api/paste', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Missing title or content' });
        }

        const paragraphs = content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (paragraphs.length === 0) {
            return res.status(400).json({ error: 'Nội dung trống' });
        }

        const newStory = new Story({
            title: title.trim(),
            content: paragraphs,
            originalFilename: 'pasted_document'
        });

        await newStory.save();
        res.json({ success: true, message: 'Đăng chương thành công!', id: newStory._id });
    } catch (error) {
        console.error('Paste Error:', error);
        res.status(500).json({ error: 'Lỗi khi lưu chương' });
    }
});

// Xóa file (Bonus functionality for managing DB)
app.delete('/api/story/:id', async (req, res) => {
    try {
        await Story.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Sửa file
app.put('/api/story/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Missing title or content' });
        }

        const paragraphs = content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (paragraphs.length === 0) {
            return res.status(400).json({ error: 'Nội dung trống' });
        }

        const updatedStory = await Story.findByIdAndUpdate(
            req.params.id, 
            { title: title.trim(), content: paragraphs }, 
            { new: true }
        );

        if (!updatedStory) {
            return res.status(404).json({ error: 'Không tìm thấy truyện' });
        }

        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'Lỗi khi cập nhật chương' });
    }
});

// Catch-all for unmatched routes – helps diagnose 404s
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
    }
    // For everything else, serve index.html (SPA fallback)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🎧 Audio Reader đang chạy tại: http://localhost:${PORT}\n`);
});
