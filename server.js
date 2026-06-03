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
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        runMigration();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    coverImage: String, // URL or base64
    coverType: { type: String, enum: ['url', 'file', 'none'], default: 'none' },
    createdAt: { type: Date, default: Date.now }
});
const Book = mongoose.model('Book', BookSchema);

const ChapterSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    content: { type: [String], required: true },
    originalFilename: String,
    createdAt: { type: Date, default: Date.now }
});
const Chapter = mongoose.model('Chapter', ChapterSchema);

// Old Story schema for migration purposes only
const StorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: [String], required: true },
    originalFilename: String,
    createdAt: { type: Date, default: Date.now }
});
const Story = mongoose.model('Story', StorySchema);

const ProgressSchema = new mongoose.Schema({
    userId: { type: String, default: 'default_user' },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    bookTitle: String,
    chapterTitle: String,
    updatedAt: { type: Date, default: Date.now }
});
const Progress = mongoose.model('Progress', ProgressSchema);

// ─── Migration Script ──────────────────────────────────────────────────────
async function runMigration() {
    try {
        const oldStoriesCount = await Story.countDocuments();
        if (oldStoriesCount > 0) {
            console.log(`Found ${oldStoriesCount} old stories. Migrating...`);
            
            // Check if default book exists
            let defaultBook = await Book.findOne({ title: 'Tụ Bảo Tiên Bồn' });
            if (!defaultBook) {
                defaultBook = new Book({
                    title: 'Tụ Bảo Tiên Bồn',
                    description: 'Hay1',
                    coverType: 'none'
                });
                await defaultBook.save();
                console.log('Created default book: Tụ Bảo Tiên Bồn');
            }

            const oldStories = await Story.find();
            for (const s of oldStories) {
                const newChapter = new Chapter({
                    bookId: defaultBook._id,
                    title: s.title,
                    content: s.content,
                    originalFilename: s.originalFilename,
                    createdAt: s.createdAt
                });
                await newChapter.save();
                await Story.findByIdAndDelete(s._id);
            }
            console.log('Migration completed. Removed old stories.');
        }
        
        // Drop unique index on userId if it exists so we can store progress per book
        try {
            await Progress.collection.dropIndex('userId_1');
            console.log('Dropped unique userId index on Progress collection');
        } catch (err) {
            if (err.code !== 27) { // 27 is IndexNotFound
                console.log('Error dropping index (may not exist or other error):', err.message);
            }
        }
    } catch (err) {
        console.error('Migration error:', err);
    }
}
// Run migration after connection
mongoose.connection.once('open', () => {
    runMigration();
});

// ─── Multer Setup (for memory storage) ─────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Progress API ──────────────────────────────────────────────────────────
app.get('/api/progress', async (req, res) => {
    try {
        const progList = await Progress.find({ userId: 'default_user' })
            .populate('bookId', 'title coverImage coverType')
            .populate('chapterId', 'title')
            .sort({ updatedAt: -1 });
        res.json(progList);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy tiến độ' });
    }
});

app.post('/api/progress', async (req, res) => {
    try {
        const { bookId, chapterId, bookTitle, chapterTitle } = req.body;
        if (!bookId || !chapterId) return res.status(400).json({ error: 'Missing bookId or chapterId' });
        
        await Progress.findOneAndUpdate(
            { userId: 'default_user', bookId },
            { chapterId, bookTitle, chapterTitle, updatedAt: Date.now() },
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

// ─── Book & Chapter Endpoints ────────────────────────────────────────────────

app.get('/api/books', async (req, res) => {
    try {
        const books = await Book.aggregate([
            {
                $lookup: {
                    from: 'chapters',
                    localField: '_id',
                    foreignField: 'bookId',
                    as: 'chapters'
                }
            },
            {
                $addFields: {
                    chapterCount: { $size: "$chapters" }
                }
            },
            {
                $project: {
                    chapters: 0
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);
        res.json({ books });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

app.post('/api/books', upload.single('coverFile'), async (req, res) => {
    try {
        const { title, description, coverType, coverUrl } = req.body;
        if (!title) return res.status(400).json({ error: 'Missing book title' });

        let coverImage = '';
        let type = coverType || 'none';

        if (type === 'file' && req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            coverImage = `data:${req.file.mimetype};base64,${b64}`;
        } else if (type === 'url' && coverUrl) {
            coverImage = coverUrl;
        } else {
            type = 'none';
        }

        const newBook = new Book({
            title: title.trim(),
            description: description ? description.trim() : '',
            coverImage,
            coverType: type
        });
        await newBook.save();
        res.json({ success: true, book: newBook });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ error: 'Failed to create book' });
    }
});

app.put('/api/books/:id', upload.single('coverFile'), async (req, res) => {
    try {
        const { title, description, coverType, coverUrl } = req.body;
        if (!title) return res.status(400).json({ error: 'Missing book title' });

        const updateData = {
            title: title.trim(),
            description: description ? description.trim() : ''
        };

        let type = coverType || 'none';
        if (type === 'file' && req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            updateData.coverImage = `data:${req.file.mimetype};base64,${b64}`;
            updateData.coverType = 'file';
        } else if (type === 'url' && coverUrl) {
            updateData.coverImage = coverUrl;
            updateData.coverType = 'url';
        } else if (type === 'none') {
            updateData.coverImage = '';
            updateData.coverType = 'none';
        }

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, book: updatedBook });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

app.delete('/api/books/:id', async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        await Chapter.deleteMany({ bookId: req.params.id });
        await Progress.deleteMany({ bookId: req.params.id });
        res.json({ success: true, message: 'Đã xóa truyện thành công' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

app.get('/api/books/:id/chapters', async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') {
            return res.json({ chapters: [] });
        }
        const chapters = await Chapter.find({ bookId: req.params.id }, '_id title createdAt');
        
        const extractChapterNum = (title) => {
            const match = title.match(/Chương\s+(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
        };
        
        chapters.sort((a, b) => {
            const numA = extractChapterNum(a.title);
            const numB = extractChapterNum(b.title);
            if (numA !== numB) return numA - numB;
            return a.title.localeCompare(b.title);
        });

        res.json({ chapters: chapters.map(c => ({ id: c._id, title: c.title })) });
    } catch (error) {
        console.error('Fetch DB error:', error);
        res.status(500).json({ error: 'Failed to fetch chapters' });
    }
});

app.get('/api/chapters/:id', async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
        res.json({ title: chapter.title, content: chapter.content, id: chapter._id, bookId: chapter.bookId });
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID or DB error' });
    }
});


app.post('/api/upload', upload.array('htmlFiles'), async (req, res) => {
    try {
        const bookId = req.body.bookId;
        if (!bookId) return res.status(400).json({ error: 'Missing bookId' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedChapters = [];

        for (const file of req.files) {
            const html = file.buffer.toString('utf-8');
            const $ = cheerio.load(html);
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

            const newChapter = new Chapter({
                bookId,
                title,
                content: paragraphs,
                originalFilename: filename
            });

            await newChapter.save();
            uploadedChapters.push(newChapter._id);
        }

        res.json({ success: true, message: `Upload thành công ${req.files.length} chương!`, ids: uploadedChapters });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Lỗi khi xử lý và lưu file' });
    }
});

app.post('/api/paste', async (req, res) => {
    try {
        const { bookId, title, content } = req.body;
        if (!bookId || !title || !content) {
            return res.status(400).json({ error: 'Missing bookId, title or content' });
        }

        const paragraphs = content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (paragraphs.length === 0) {
            return res.status(400).json({ error: 'Nội dung trống' });
        }

        const newChapter = new Chapter({
            bookId,
            title: title.trim(),
            content: paragraphs,
            originalFilename: 'pasted_document'
        });

        await newChapter.save();
        res.json({ success: true, message: 'Đăng chương thành công!', id: newChapter._id });
    } catch (error) {
        console.error('Paste Error:', error);
        res.status(500).json({ error: 'Lỗi khi lưu chương' });
    }
});

// Xóa file (Bonus functionality for managing DB)
app.delete('/api/chapters/:id', async (req, res) => {
    try {
        await Chapter.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Sửa file
app.put('/api/chapters/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Missing title or content' });
        }

        const paragraphs = content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (paragraphs.length === 0) {
            return res.status(400).json({ error: 'Nội dung trống' });
        }

        const updatedChapter = await Chapter.findByIdAndUpdate(
            req.params.id, 
            { title: title.trim(), content: paragraphs }, 
            { new: true }
        );

        if (!updatedChapter) {
            return res.status(404).json({ error: 'Không tìm thấy chương' });
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
