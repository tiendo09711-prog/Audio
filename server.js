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
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/progress', express.json(), async (req, res) => {
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
    const voiceId = req.query.voice || 'female-1';

    if (!text) return res.status(400).send('Missing text');
    const cfg = VOICE_CONFIGS[voiceId] || VOICE_CONFIGS['female-1'];

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

app.get('/api/voices', (req, res) => {
    res.json({ voices: Object.entries(VOICE_CONFIGS).map(([id, cfg]) => ({ id, label: cfg.label })) });
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

// Xóa file (Bonus functionality for managing DB)
app.delete('/api/story/:id', async (req, res) => {
    try {
        await Story.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🎧 Audio Reader đang chạy tại: http://localhost:${PORT}\n`);
});
