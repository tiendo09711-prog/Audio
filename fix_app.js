const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

// 1. Fix encodings
code = code.replace(/Ä ang táº£i ná»™i dung chÆ°Æ¡ng\.\.\./g, 'Đang tải nội dung chương...');
code = code.replace(/Ä ang xem/g, 'Đang xem');
code = code.replace(/Audio Ä‘ang Ä‘Æ°á»£c táº¡o, vui lÃ²ng chá»  Ã­t phÃºt\.\.\./g, 'Audio đang được tạo, vui lòng chờ ít phút...');
code = code.replace(/ChÆ°a cÃ³ audio Ä‘á»ƒ phÃ¡t!/g, 'Chưa có audio để phát!');
code = code.replace(/KhÃ´ng thá»ƒ phÃ¡t:/g, 'Không thể phát:');

// If the regex above failed because of utf8 reading, let's also do a hard string replace
code = code.replace('Ä ang táº£i ná»™i dung chÆ°Æ¡ng...', 'Đang tải nội dung chương...');
code = code.replace("headerLabelEl.textContent = 'Ä ang xem';", "headerLabelEl.textContent = 'Đang xem';");
code = code.replace("showToast('Audio Ä‘ang Ä‘Æ°á»£c táº¡o, vui lÃ²ng chá»  Ã­t phÃºt...');", "showToast('Audio đang được tạo, vui lòng chờ ít phút...');");
code = code.replace("showToast('ChÆ°a cÃ³ audio Ä‘á»ƒ phÃ¡t!');", "showToast('Chưa có audio để phát!');");
code = code.replace("'KhÃ´ng thá»ƒ phÃ¡t: '", "'Không thể phát: '");

// 2. Inject saveProgress function
const saveProgressFunc = `
    async function saveProgress(chapterId, chapterTitle) {
        if (!currentBookId) return;
        try {
            const b = allBooks.find(b => b._id === currentBookId);
            await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: currentBookId,
                    chapterId: chapterId,
                    bookTitle: b ? b.title : '',
                    chapterTitle: chapterTitle
                })
            });
        } catch (e) { console.error('Lỗi lưu tiến độ', e); }
    }

    async function loadChapter(chapterId, li = null, startIndex = 0) {`;

code = code.replace("async function loadChapter(chapterId, li = null, startIndex = 0) {", saveProgressFunc);

// 3. Call saveProgress inside loadChapter
const callSaveProgress = `
            storyTitleEl.textContent  = data.title;
            saveProgress(chapterId, data.title);
            if (editBtn) editBtn.style.display = 'block';
`;
code = code.replace(`
            storyTitleEl.textContent  = data.title;
            if (editBtn) editBtn.style.display = 'block';
`, callSaveProgress);

// 4. Fix openBook which currently expects paragraphIndex but isn't storing book context
// When history card is clicked, currentBookId must be set
const openBookFix = `
    async function openBook(bookId, chapterIdToResume = null, paragraphIndex = 0) {
        currentBookId = bookId;
        homeView.style.display = 'none';
        readerView.style.display = 'flex';
        fetchChapters(bookId, chapterIdToResume, paragraphIndex);
    }
`;
code = code.replace(/async function openBook\(bookId, chapterIdToResume = null, paragraphIndex = 0\) \{[\s\S]*?fetchChapters\(bookId, chapterIdToResume, paragraphIndex\);\s*\}/, openBookFix.trim());

fs.writeFileSync('public/app.js', code);
console.log('Fixed app.js: added saveProgress, fixed encoding, updated openBook');
