document.addEventListener('DOMContentLoaded', () => {

    // List Controls Logic
    const toggleSelectModeBtn = document.getElementById('toggle-select-mode-btn');
    const bulkActions = document.getElementById('bulk-actions');
    const selectAllBtn = document.getElementById('select-all-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (toggleSelectModeBtn) {
        toggleSelectModeBtn.addEventListener('click', () => {
            window.isSelectMode = !window.isSelectMode;
            if (!window.isSelectMode) window.selectedChapters.clear();
            
            toggleSelectModeBtn.textContent = window.isSelectMode ? 'Hủy' : 'Chọn nhiều';
            bulkActions.style.display = window.isSelectMode ? 'flex' : 'none';
            document.getElementById('selected-count').textContent = window.selectedChapters.size;
            renderChapterList(allFiles);
        });

        selectAllBtn.addEventListener('click', () => {
            const visibleFiles = allFiles; // or whatever is filtered
            const allSelected = visibleFiles.every(f => window.selectedChapters.has(f.id));
            if (allSelected) {
                visibleFiles.forEach(f => window.selectedChapters.delete(f.id));
            } else {
                visibleFiles.forEach(f => window.selectedChapters.add(f.id));
            }
            document.getElementById('selected-count').textContent = window.selectedChapters.size;
            renderChapterList(allFiles); // re-render to update checkboxes
        });

        bulkDeleteBtn.addEventListener('click', async () => {
            if (window.selectedChapters.size === 0) return showToast('Chưa chọn chương nào!');
            if (!confirm(`Bạn có chắc chắn muốn xóa ${window.selectedChapters.size} chương đã chọn? Hành động này không thể hoàn tác.`)) return;

            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.textContent = 'Đang xóa...';
            
            try {
                const res = await fetch('/api/chapters/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(window.selectedChapters) })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Đã xóa ${data.deletedCount} chương thành công!`);
                    window.selectedChapters.clear();
                    window.isSelectMode = false;
                    toggleSelectModeBtn.textContent = 'Chọn nhiều';
                    bulkActions.style.display = 'none';
                    fetchChapters(currentBookId);
                } else {
                    showToast('Lỗi khi xóa nhiều: ' + data.error);
                }
            } catch (err) {
                showToast('Lỗi hệ thống khi xóa!');
            }
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.innerHTML = 'Xóa (<span id="selected-count">0</span>)';
        });
    }


    const fileListEl       = document.getElementById('file-list');
    const refreshBtn       = document.getElementById('refresh-btn');
    const storyTitleEl     = document.getElementById('story-title');
    const headerLabelEl    = document.getElementById('header-label');
    const storyContainerEl = document.getElementById('story-container');
    const playerBar        = document.getElementById('player-bar');
    const voiceGrid        = document.getElementById('voice-grid');
    const rateRange        = document.getElementById('rate-range');
    const rateDisplay      = document.getElementById('rate-display');
    const playBtn          = document.getElementById('play-btn');
    const prevBtn          = document.getElementById('prev-btn');
    const nextBtn          = document.getElementById('next-btn');
    const stopBtn          = document.getElementById('stop-btn');
    const prevChapBtn      = document.getElementById('prev-chap-btn');
    const nextChapBtn      = document.getElementById('next-chap-btn');
    const progressText     = document.getElementById('progress-text');
    const progressFill     = document.getElementById('progress-fill');
    const progressBuffer   = document.getElementById('progress-buffer');
    const searchInput      = document.getElementById('search-input');
    
    const resumeCard       = document.getElementById('resume-card');
    const resumeTitle      = document.getElementById('resume-title');
    const resumePara       = document.getElementById('resume-para');
    const resumePlayBtn    = document.getElementById('resume-play-btn');

    const timerBtn         = document.getElementById('timer-btn');
    const timerDisplay     = document.getElementById('timer-display');
    const timerModal       = document.getElementById('timer-modal');
    const cancelTimerBtn   = document.getElementById('cancel-timer-btn');
    const confirmTimerBtn  = document.getElementById('confirm-timer-btn');
    const disableTimerBtn  = document.getElementById('disable-timer-btn');
    const timerHours       = document.getElementById('timer-hours');
    const timerMinutes     = document.getElementById('timer-minutes');

    const idleCheckModal   = document.getElementById('idle-check-modal');
    const idleStopBtn      = document.getElementById('idle-stop-btn');
    const idleContinueBtn  = document.getElementById('idle-continue-btn');

    const mobileMenuBtn    = document.getElementById('mobile-menu-btn');
    const sidebarEl        = document.querySelector('.sidebar');
    const sidebarOverlay   = document.getElementById('sidebar-overlay');

    // Home View Elements
    const homeView         = document.getElementById('home-view');
    const playerView       = document.getElementById('player-view');
    const bookGrid         = document.getElementById('book-grid');
    const backToHomeBtn    = document.getElementById('back-to-home-btn');
    const addBookBtn       = document.getElementById('add-book-btn');
    const globalResumeCard = document.getElementById('global-resume-card');
    const globalResumeBook = document.getElementById('global-resume-book');
    const globalResumeChapter = document.getElementById('global-resume-chapter');
    const globalResumePlayBtn = document.getElementById('global-resume-play-btn');

    // Add Book Modal Elements
    const addBookModal     = document.getElementById('add-book-modal');
    const cancelAddBookBtn = document.getElementById('cancel-add-book-btn');
    const submitAddBookBtn = document.getElementById('submit-add-book-btn');
    const coverTypeUrlBtn  = document.getElementById('cover-type-url');
    const coverTypeFileBtn = document.getElementById('cover-type-file');
    const bookCoverUrlInput= document.getElementById('book-cover-url');
    const bookCoverFileInput= document.getElementById('book-cover-file');
    
    let currentBookId = null;

    

    if (mobileMenuBtn && sidebarEl && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebarEl.classList.add('open');
            sidebarOverlay.style.display = 'block';
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebarEl.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    }

    const ICON_PLAY  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const ICON_PAUSE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;



    let story           = [];
    let currentIndex    = 0;
    let isPlaying       = false;
    let isPaused        = false;
    // Restore speed rate from localStorage, default to 1.0
    let speedRate       = parseFloat(localStorage.getItem('preferredSpeed') || '1.0');
    let currentStoryId  = null;
    let allFiles        = [];
    let allBooks        = [];
    window.isSelectMode = false;
    window.selectedChapters = new Set();

    const mainAudio = document.getElementById('main-audio-player');
    window.currentTimestamps = [];

    function unlockAudio() {
        mainAudio.play().then(() => mainAudio.pause()).catch(() => {});
    }
    let fetchController = null;

    let sleepTimerEnd      = null;
    let sleepTimerInterval = null;
    let idleCheckInterval  = null;
    let playSessionStart   = Date.now();
    const IDLE_TIMEOUT_MS  = 2 * 60 * 60 * 1000; // 2 hours
    let isWaitingForIdleCheck = false;

    // ─── Timer Logic ─────────────────────────────────────────────────────────
    function populateTimerPicker() {
        timerHours.innerHTML = '<div class="timer-picker-spacer"></div>';
        for (let i = 0; i <= 23; i++) {
            const div = document.createElement('div');
            div.className = 'timer-picker-item' + (i === 0 ? ' active' : '');
            div.textContent = i.toString().padStart(2, '0');
            div.dataset.value = i;
            div.onclick = () => timerHours.scrollTo({ top: i * 60, behavior: 'smooth' });
            timerHours.appendChild(div);
        }
        timerHours.insertAdjacentHTML('beforeend', '<div class="timer-picker-spacer"></div>');

        timerMinutes.innerHTML = '<div class="timer-picker-spacer"></div>';
        for (let i = 0; i <= 59; i++) {
            const div = document.createElement('div');
            div.className = 'timer-picker-item' + (i === 0 ? ' active' : '');
            div.textContent = i.toString().padStart(2, '0');
            div.dataset.value = i;
            div.onclick = () => timerMinutes.scrollTo({ top: i * 60, behavior: 'smooth' });
            timerMinutes.appendChild(div);
        }
        timerMinutes.insertAdjacentHTML('beforeend', '<div class="timer-picker-spacer"></div>');

        const updateActive = (container) => {
            const items = container.querySelectorAll('.timer-picker-item');
            const top = container.scrollTop;
            const index = Math.round(top / 60);
            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
        };
        timerHours.addEventListener('scroll', () => updateActive(timerHours));
        timerMinutes.addEventListener('scroll', () => updateActive(timerMinutes));
    }
    populateTimerPicker();

    function getSelectedTimer() {
        const h = Math.round(timerHours.scrollTop / 60);
        const m = Math.round(timerMinutes.scrollTop / 60);
        return { hours: h, minutes: m };
    }

    timerBtn.addEventListener('click', () => {
        timerModal.style.display = 'flex';
        disableTimerBtn.style.display = sleepTimerEnd ? 'block' : 'none';
        if (!sleepTimerEnd) {
            timerHours.scrollTo({ top: 0, behavior: 'auto' });
            timerMinutes.scrollTo({ top: 0, behavior: 'auto' });
        }
    });
    cancelTimerBtn.addEventListener('click', () => timerModal.style.display = 'none');
    
    function startSleepTimer(ms) {
        clearInterval(sleepTimerInterval);
        sleepTimerEnd = Date.now() + ms;
        timerModal.style.display = 'none';
        updateTimerDisplay();
        
        sleepTimerInterval = setInterval(() => {
            const left = sleepTimerEnd - Date.now();
            if (left <= 0) {
                clearInterval(sleepTimerInterval);
                sleepTimerEnd = null;
                updateTimerDisplay();
                stopPlayback();
                showToast('Đã hết thời gian hẹn giờ. Đã dừng phát.');
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }
    
    function updateTimerDisplay() {
        if (!sleepTimerEnd) {
            timerDisplay.textContent = 'Hẹn giờ';
            timerBtn.style.color = '';
            return;
        }
        const totalSecs = Math.max(0, Math.floor((sleepTimerEnd - Date.now()) / 1000));
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        let str = '';
        if (h > 0) str += h + ':';
        str += m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
        timerDisplay.textContent = str;
        timerBtn.style.color = 'var(--accent-2)';
    }

    disableTimerBtn.addEventListener('click', () => {
        clearInterval(sleepTimerInterval);
        sleepTimerEnd = null;
        updateTimerDisplay();
        timerModal.style.display = 'none';
        showToast('Đã tắt hẹn giờ');
    });

    confirmTimerBtn.addEventListener('click', () => {
        const { hours, minutes } = getSelectedTimer();
        const ms = (hours * 60 * 60 + minutes * 60) * 1000;
        if (ms === 0) {
            showToast('Vui lòng chọn thời gian lớn hơn 0');
            return;
        }
        startSleepTimer(ms);
        showToast(`Đã hẹn giờ tắt sau ${hours} giờ ${minutes} phút`);
    });

    // ─── Idle Check Logic ───────────────────────────────────────────────────
    function resetIdleTimer() {
        playSessionStart = Date.now();
    }
    
    function checkIdleState() {
        if (!isPlaying || isPaused) return; // Only count when playing
        if (sleepTimerEnd) return; // Don't ask if sleep timer is active
        if (isWaitingForIdleCheck) return;
        
        const now = Date.now();
        if (now - playSessionStart >= IDLE_TIMEOUT_MS) {
            isWaitingForIdleCheck = true;
            mainAudio.pause();
            isPlaying = false; isPaused = true; updatePlayButton(); // Manually pause
            idleCheckModal.style.display = 'flex';
        }
    }
    
    setInterval(checkIdleState, 30000); // Check every 30s
    
    idleStopBtn.addEventListener('click', () => {
        idleCheckModal.style.display = 'none';
        isWaitingForIdleCheck = false;
        stopPlayback();
    });
    
    idleContinueBtn.addEventListener('click', () => {
        idleCheckModal.style.display = 'none';
        isWaitingForIdleCheck = false;
        resetIdleTimer();
        togglePlay(); // resume
    });



    // Init speed slider display from saved value
    rateRange.value = speedRate;
    rateDisplay.textContent = speedRate.toFixed(1) + 'x';

    rateRange.addEventListener('input', () => {
        speedRate = parseFloat(rateRange.value);
        rateDisplay.textContent = speedRate.toFixed(1) + 'x';
        localStorage.setItem('preferredSpeed', speedRate); // Save preference
        mainAudio.playbackRate = speedRate;
    });

    // ─── Add Book Logic ────────────────────────────────────────────────────────
    let currentCoverType = 'url';
    if (coverTypeUrlBtn) {
        coverTypeUrlBtn.addEventListener('click', () => {
            currentCoverType = 'url';
            coverTypeUrlBtn.style.background = 'var(--surface-2)';
            coverTypeUrlBtn.style.color = 'var(--primary)';
            coverTypeUrlBtn.style.border = '1px solid var(--primary)';
            coverTypeFileBtn.style.background = 'var(--surface-2)';
            coverTypeFileBtn.style.color = 'var(--text)';
            coverTypeFileBtn.style.border = '1px solid var(--border-2)';
            bookCoverUrlInput.style.display = 'block';
            bookCoverFileInput.style.display = 'none';
        });
        coverTypeFileBtn.addEventListener('click', () => {
            currentCoverType = 'file';
            coverTypeFileBtn.style.background = 'var(--surface-2)';
            coverTypeFileBtn.style.color = 'var(--primary)';
            coverTypeFileBtn.style.border = '1px solid var(--primary)';
            coverTypeUrlBtn.style.background = 'var(--surface-2)';
            coverTypeUrlBtn.style.color = 'var(--text)';
            coverTypeUrlBtn.style.border = '1px solid var(--border-2)';
            bookCoverUrlInput.style.display = 'none';
            bookCoverFileInput.style.display = 'block';
        });

        addBookBtn.addEventListener('click', () => {
            addBookModal.style.display = 'flex';
        });
        cancelAddBookBtn.addEventListener('click', () => {
            addBookModal.style.display = 'none';
        });

        submitAddBookBtn.addEventListener('click', async () => {
            const title = document.getElementById('book-title').value.trim();
            const desc = document.getElementById('book-desc').value.trim();
            if (!title) return showToast('Vui lòng nhập tên truyện!');

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', desc);
            formData.append('coverType', currentCoverType);
            
            if (currentCoverType === 'url') {
                formData.append('coverUrl', bookCoverUrlInput.value.trim());
            } else {
                if (bookCoverFileInput.files.length > 0) {
                    formData.append('coverFile', bookCoverFileInput.files[0]);
                }
            }

            const oldText = submitAddBookBtn.textContent;
            submitAddBookBtn.textContent = 'Đang tạo...';
            submitAddBookBtn.disabled = true;

            try {
                const res = await fetch('/api/books', { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    showToast('Tạo truyện thành công!');
                    addBookModal.style.display = 'none';
                    document.getElementById('book-title').value = '';
                    document.getElementById('book-desc').value = '';
                    fetchBooks();
                } else {
                    showToast(`Lỗi: ${data.error}`);
                }
            } catch (err) {
                showToast('Lỗi khi tạo truyện');
            } finally {
                submitAddBookBtn.textContent = oldText;
                submitAddBookBtn.disabled = false;
            }
        });
    }

    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            playerView.style.display = 'none';
            homeView.style.display = 'flex';
            currentBookId = null;
            stopPlayback();
            fetchBooks();
        });
    }

    const tabAllBooks = document.getElementById('tab-all-books');
    const tabHistory = document.getElementById('tab-history');
    const historyGrid = document.getElementById('history-grid');

    if (tabAllBooks && tabHistory) {
        tabAllBooks.addEventListener('click', () => {
            tabAllBooks.style.opacity = '1';
            tabAllBooks.style.borderBottom = '2px solid var(--primary)';
            tabHistory.style.opacity = '0.6';
            tabHistory.style.borderBottom = '2px solid transparent';
            bookGrid.style.display = 'grid';
            historyGrid.style.display = 'none';
            globalResumeCard.style.display = 'flex'; // show global resume if any
        });

        tabHistory.addEventListener('click', () => {
            tabHistory.style.opacity = '1';
            tabHistory.style.borderBottom = '2px solid var(--primary)';
            tabAllBooks.style.opacity = '0.6';
            tabAllBooks.style.borderBottom = '2px solid transparent';
            historyGrid.style.display = 'grid';
            bookGrid.style.display = 'none';
            globalResumeCard.style.display = 'none'; // hide global resume when viewing history
        });
    }

    async function fetchBooks() {
        try {
            bookGrid.innerHTML = '<div class="file-list-loading">Đang tải kho truyện...</div>';
            historyGrid.innerHTML = '<div class="file-list-loading">Đang tải lịch sử...</div>';
            
            const [booksRes, progRes] = await Promise.all([
                fetch('/api/books'),
                fetch('/api/progress')
            ]);
            const booksData = await booksRes.json();
            const progList = await progRes.json(); // Now returns array of progress
            
            allBooks = booksData.books || [];
            renderBookGrid(allBooks);
            renderHistoryGrid(progList || []);
            
            const validProg = (progList || []).find(p => p.bookId);
            if (validProg) {
                globalResumeCard.style.display = 'flex';
                const bTitle = validProg.bookId.title;
                const cTitle = validProg.chapterId ? validProg.chapterId.title : validProg.chapterTitle;
                globalResumeBook.textContent = bTitle;
                globalResumeChapter.textContent = cTitle || '';
                
                globalResumePlayBtn.onclick = () => {
                    const bid = validProg.bookId._id;
                    const cid = validProg.chapterId ? (validProg.chapterId._id || validProg.chapterId) : null;
                    openBook(bid, cid, 0); 
                };
            } else {
                globalResumeCard.style.display = 'none';
            }
        } catch (err) {
            bookGrid.innerHTML = '<div class="file-list-loading" style="color:#ef4444">Lỗi tải dữ liệu.</div>';
        }
    }

    function renderHistoryGrid(historyList) {
        historyGrid.innerHTML = '';
        if (!historyList.length) {
            historyGrid.innerHTML = '<div class="file-list-loading">Bạn chưa đọc truyện nào.</div>';
            return;
        }
        
        historyList.forEach(prog => {
            if (!prog.bookId) return; // Skip if book deleted
            
            const card = document.createElement('div');
            card.className = 'book-card';
            
            const bid = prog.bookId._id || prog.bookId;
            const cid = prog.chapterId ? (prog.chapterId._id || prog.chapterId) : null;
            card.onclick = () => openBook(bid, cid, 0);
            
            let coverHtml = `<div class="book-cover-placeholder">Không có ảnh</div>`;
            if (prog.bookId.coverImage && prog.bookId.coverType !== 'none') {
                coverHtml = `<div class="book-cover" style="background-image: url('${prog.bookId.coverImage}')"></div>`;
            }
            
            const cTitle = prog.chapterId ? prog.chapterId.title : (prog.chapterTitle || 'Đang bắt đầu');
            
            card.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <div class="book-title" title="${prog.bookId.title}">${prog.bookId.title}</div>
                    <div class="book-desc" style="color: var(--primary); font-weight: 600;" title="${cTitle}">Đang đọc: ${cTitle}</div>
                    <div class="book-chapter-count" style="font-size: 0.75rem; color: var(--text-dim);">Cập nhật: ${new Date(prog.updatedAt).toLocaleDateString('vi-VN')}</div>
                </div>
            `;
            historyGrid.appendChild(card);
        });
    }

    function renderBookGrid(books) {
        bookGrid.innerHTML = '';
        if (!books.length) {
            bookGrid.innerHTML = '<div class="file-list-loading">Chưa có truyện nào trong kho.</div>';
            return;
        }
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => openBook(book._id);
            
            let coverHtml = `<div class="book-cover-placeholder">Không có ảnh</div>`;
            if (book.coverImage && book.coverType !== 'none') {
                coverHtml = `<div class="book-cover" style="background-image: url('${book.coverImage}')"></div>`;
            }
            
            card.innerHTML = `
                ${coverHtml}
                <button class="book-edit-btn" title="Chỉnh sửa truyện">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <div class="book-info">
                    <div class="book-title" title="${book.title}">${book.title}</div>
                    <div class="book-desc" title="${book.description}">${book.description || 'Không có mô tả'}</div>
                    <div class="book-chapter-count">${book.chapterCount || 0} chương</div>
                </div>
            `;
            
            const editBtn = card.querySelector('.book-edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditBookModal(book);
            });
            
            bookGrid.appendChild(card);
        });
    }

    async function openBook(bookId, chapterIdToResume = null, paragraphIndex = 0) {
        currentBookId = bookId;
        homeView.style.display = 'none';
        playerView.style.display = 'flex';
        
        await fetchChapters(bookId);
        
        if (chapterIdToResume) {
            loadChapter(chapterIdToResume, null, paragraphIndex);
        } else if (allFiles.length > 0) {
            loadChapter(allFiles[0].id);
        }
    }

    async function fetchChapters(bookId) {
        try {
            fileListEl.innerHTML = '<li class="file-list-loading">Đang tải chương...</li>';
            const res = await fetch(`/api/books/${bookId}/chapters`);
            const data = await res.json();
            allFiles = data.chapters || [];
            renderChapterList(allFiles);
        } catch {
            fileListEl.innerHTML = '<li class="file-list-loading" style="color:#ef4444">Lỗi tải chương.</li>';
        }
    }

    function renderChapterList(filesToRender) {
        fileListEl.innerHTML = '';
        if (!filesToRender.length) {
            fileListEl.innerHTML = '<li class="file-list-loading">Chưa có chương nào.</li>';
            return;
        }
        filesToRender.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            if (file.id === currentStoryId) li.classList.add('active');
            li.innerHTML = `
                <input type="checkbox" class="chapter-checkbox" value="${file.id}" style="display: ${window.isSelectMode ? 'block' : 'none'}; margin-right: 8px;">
                <div style="display:flex; align-items:center; flex:1; gap:10px; overflow:hidden;" class="item-click-area">
                    <div class="file-item-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                    </div>
                    <span class="file-item-name" title="${file.title}">${file.title}</span>
                </div>
                <button class="delete-btn" title="Xóa" style="display: ${window.isSelectMode ? 'none' : 'block'}; background:transparent; border:none; color:#ef4444; cursor:pointer; padding:6px; opacity:0.6;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
            
            const checkbox = li.querySelector('.chapter-checkbox');
            if (checkbox) {
                checkbox.checked = window.selectedChapters.has(file.id);
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) window.selectedChapters.add(file.id);
                    else window.selectedChapters.delete(file.id);
                    document.getElementById('selected-count').textContent = window.selectedChapters.size;
                });
            }
            li.querySelector('.item-click-area').addEventListener('click', () => {
                if (window.isSelectMode) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                } else {
                    loadChapter(file.id, li);
                }
            });

            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('delete-modal');
                const targetName = document.getElementById('delete-target-name');
                const cancelBtn = document.getElementById('cancel-delete-btn');
                const confirmBtn = document.getElementById('confirm-delete-btn');
                
                targetName.textContent = file.title;
                modal.style.display = 'flex';
                
                const cleanup = () => { modal.style.display = 'none'; cancelBtn.onclick=null; confirmBtn.onclick=null; };
                cancelBtn.onclick = cleanup;
                confirmBtn.onclick = async () => {
                    cleanup();
                    try {
                        await fetch(`/api/chapters/${file.id}`, { method: 'DELETE' });
                        fetchChapters(currentBookId);
                    } catch(err) { showToast('Lỗi khi xóa!'); }
                };
            });
            fileListEl.appendChild(li);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allFiles.filter(f => f.title.toLowerCase().includes(term));
        renderChapterList(filtered);
    });

    refreshBtn.addEventListener('click', () => {
        if (currentBookId) fetchChapters(currentBookId);
    });

    
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

    async function loadChapter(chapterId, li = null, startIndex = 0) {
        currentStoryId = chapterId;
        renderChapterList(allFiles);
        if (sidebarEl && sidebarEl.classList.contains('open')) {
            sidebarEl.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        }
        const editBtn = document.getElementById('edit-story-btn');
        if (editBtn) editBtn.style.display = 'none';

        stopPlayback();
        storyContainerEl.innerHTML = '<div class="empty-state"><p>Äang táº£i ná»™i dung chÆ°Æ¡ng...</p></div>';
        
        try {
            const data = await (await fetch(`/api/chapters/${chapterId}`)).json();
            if (data.error) throw new Error(data.error);
            story = data.content;
            currentIndex = startIndex;
            headerLabelEl.textContent = 'Äang xem';
            storyTitleEl.textContent  = data.title;
            saveProgress(chapterId, data.title);
            if (editBtn) editBtn.style.display = 'block';
            renderStoryContents();
            playerBar.style.display = 'flex';
            updateProgress();

            mainAudio.ontimeupdate = null;
            mainAudio.onended = null;

            if (data.audioStatus === 'ready' && data.audioUrl) {
                mainAudio.src = data.audioUrl;
                mainAudio.playbackRate = speedRate;
                window.currentTimestamps = data.audioTimestamps || [];

                mainAudio.ontimeupdate = () => {
                    const ct = mainAudio.currentTime;
                    const ts = window.currentTimestamps.find(t => ct >= t.start && ct < t.end);
                    if (ts && currentIndex !== ts.index) {
                        currentIndex = ts.index;
                        highlightParagraph(ts.index);
                        updateProgress();
                        saveProgress(ts.index);
                    }
                };

                mainAudio.onended = () => {
                    isPlaying = false;
                    updatePlayButton();
                    playNextChapter();
                };

                if (startIndex > 0) {
                    const startTs = window.currentTimestamps.find(t => t.index === startIndex);
                    if (startTs) mainAudio.currentTime = startTs.start;
                }
            } else if (data.audioStatus === 'processing' || data.audioStatus === 'pending') {
                showToast('Audio Ä‘ang Ä‘Æ°á»£c táº¡o, vui lÃ²ng chá» Ã­t phÃºt...');
            }
        } catch (err) {
            storyTitleEl.textContent = 'Lỗi tải chương';
            storyContainerEl.innerHTML = `<div class="empty-state"><p style="color:#ef4444">Không thể tải: ${err.message}</p></div>`;
            playerBar.style.display = 'none';
        }
    }

    function renderStoryContents() {
        storyContainerEl.innerHTML = '';
        story.forEach((para, idx) => {
            const p = document.createElement('p');
            p.id = `para-${idx}`;
            p.textContent = para;
            p.title = 'Nhấp để đọc từ đoạn này';
            p.addEventListener('click', () => stopAndPlay(idx));
            storyContainerEl.appendChild(p);
        });
    }

    
    function stopAndPlay(index) {
        if (!window.currentTimestamps || window.currentTimestamps.length === 0) return;
        const ts = window.currentTimestamps.find(t => t.index === index);
        if (ts) {
            mainAudio.currentTime = ts.start;
            mainAudio.play().then(() => {
                isPlaying = true;
                isPaused = false;
                updatePlayButton();
            }).catch(() => {});
        }
    }

    function togglePlay() {
        if (!mainAudio.src) return showToast('Chưa có audio để phát!');
        if (isPlaying && !isPaused) {
            mainAudio.pause();
            isPlaying = false;
            isPaused = true;
        } else {
            mainAudio.play().then(() => {
                isPlaying = true;
                isPaused = false;
            }).catch(e => showToast('Không thể phát: ' + e.message));
        }
        updatePlayButton();
    }

    function stopPlayback(resetToZero = true) {
        mainAudio.pause();
        if (resetToZero) mainAudio.currentTime = 0;
        isPlaying = false;
        isPaused = false;
        updatePlayButton();
    }



    
    function playNextChapter() {
        if (!currentStoryId) return;
        const idx = allFiles.findIndex(f => f.id === currentStoryId);
        if (idx !== -1 && idx < allFiles.length - 1) {
            loadChapter(allFiles[idx + 1].id).then(() => {
                setTimeout(() => stopAndPlay(0), 500);
            });
        } else {
            showToast('Đã đến chương cuối cùng.');
        }
    }
    
    function playPrevChapter() {
        if (!currentStoryId) return;
        const idx = allFiles.findIndex(f => f.id === currentStoryId);
        if (idx > 0) {
            loadChapter(allFiles[idx - 1].id).then(() => {
                setTimeout(() => stopAndPlay(0), 500);
            });
        } else {
            showToast('Đây là chương đầu tiên.');
        }
    }

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => { 
        if (currentIndex > 0) {
            stopAndPlay(currentIndex - 1); 
        } else {
            playPrevChapter();
        }
    });
    nextBtn.addEventListener('click', () => { 
        stopAndPlay(currentIndex + 1); 
    });
    prevChapBtn.addEventListener('click', playPrevChapter);
    nextChapBtn.addEventListener('click', playNextChapter);
    stopBtn.addEventListener('click',  () => {
        stopPlayback();
        currentIndex = 0;
        highlightParagraph(-1);
        updateProgress();
    });



    function updatePlayButton() {
        const isActuallyPlaying = isPlaying && !isPaused;
        playBtn.innerHTML = isActuallyPlaying ? ICON_PAUSE : ICON_PLAY;
        playBtn.title     = isActuallyPlaying ? 'Tạm dừng' : 'Phát';
    }

    function highlightParagraph(index) {
        document.querySelectorAll('.story-container p').forEach(p => p.classList.remove('reading-active'));
        const el = document.getElementById(`para-${index}`);
        if (el) { el.classList.add('reading-active'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }

    function updateProgress() {
        const total   = story.length;
        const current = total > 0 ? currentIndex + 1 : 0;
        progressText.textContent = `${current} / ${total} đoạn`;
        
        const fillPct = total > 0 ? `${(currentIndex / total) * 100}%` : '0%';
        progressFill.style.width = fillPct;

        // Calculate buffer percentage
        if (total === 0) {
            progressBuffer.style.width = '0%';
        } else {
            progressBuffer.style.width = '100%';
        }
    }

    let toastTimer = null;
    function showToast(msg) {
        let t = document.getElementById('status-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'status-toast';
            t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e2530;border:1px solid rgba(255,255,255,.15);color:#e6edf3;padding:12px 20px;border-radius:10px;font-size:.88rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:opacity .3s;pointer-events:none;';
            document.body.appendChild(t);
        }
        t.textContent = msg; t.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 4000);
    }

    const uploadBtn        = document.getElementById('upload-btn');
    const uploadInput      = document.getElementById('upload-input');
    const pasteBtn         = document.getElementById('paste-btn');
    const pasteModal       = document.getElementById('paste-modal');
    const pasteTitle       = document.getElementById('paste-title');
    const pasteContent     = document.getElementById('paste-content');
    const cancelPasteBtn   = document.getElementById('cancel-paste-btn');
    const submitPasteBtn   = document.getElementById('submit-paste-btn');

    // ─── Paste Document Logic ──────────────────────────────────────────────────
    if (pasteBtn && pasteModal) {
        pasteBtn.addEventListener('click', () => {
            pasteTitle.value = '';
            pasteContent.value = '';
            pasteModal.style.display = 'flex';
        });

        cancelPasteBtn.addEventListener('click', () => {
            pasteModal.style.display = 'none';
        });

        submitPasteBtn.addEventListener('click', async () => {
            const title = pasteTitle.value.trim();
            const content = pasteContent.value.trim();
            
            if (!title) {
                showToast('Vui lòng nhập tên chương!');
                return;
            }
            if (!content) {
                showToast('Vui lòng nhập nội dung!');
                return;
            }

            const oldText = submitPasteBtn.textContent;
            submitPasteBtn.textContent = 'Đang xử lý...';
            submitPasteBtn.disabled = true;

            try {
                const res = await fetch('/api/paste', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId: currentBookId, title, content })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message || 'Đăng chương thành công!');
                    pasteModal.style.display = 'none';
                    fetchChapters(currentBookId); // Refresh list
                } else {
                    showToast(`Lỗi: ${data.error}`);
                }
            } catch (err) {
                console.error(err);
                showToast('Lỗi khi gửi dữ liệu lên máy chủ.');
            } finally {
                submitPasteBtn.textContent = oldText;
                submitPasteBtn.disabled = false;
            }
        });
    }

    // ─── Edit Document Logic ──────────────────────────────────────────────────
    const editModal       = document.getElementById('edit-modal');
    const editTitle       = document.getElementById('edit-title');
    const editContent     = document.getElementById('edit-content');
    const cancelEditBtn   = document.getElementById('cancel-edit-btn');
    const submitEditBtn   = document.getElementById('submit-edit-btn');
    const editStoryBtn    = document.getElementById('edit-story-btn');

    if (editStoryBtn && editModal) {
        editStoryBtn.addEventListener('click', () => {
            if (!currentStoryId || story.length === 0) return;
            editTitle.value = storyTitleEl.textContent;
            editContent.value = story.join('\n\n'); // join paragraphs
            editModal.style.display = 'flex';
        });

        cancelEditBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });

        submitEditBtn.addEventListener('click', async () => {
            if (!currentStoryId) return;
            const title = editTitle.value.trim();
            const content = editContent.value.trim();
            
            if (!title) {
                showToast('Vui lòng nhập tên chương!');
                return;
            }
            if (!content) {
                showToast('Vui lòng nhập nội dung!');
                return;
            }

            const oldText = submitEditBtn.textContent;
            submitEditBtn.textContent = 'Đang xử lý...';
            submitEditBtn.disabled = true;

            try {
                const res = await fetch(`/api/chapters/${currentStoryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message || 'Cập nhật thành công!');
                    editModal.style.display = 'none';
                    // Re-fetch files to update sidebar title
                    fetchChapters(currentBookId);
                    // Re-load current story to show updated content
                    loadChapter(currentStoryId);
                } else {
                    showToast(`Lỗi: ${data.error}`);
                }
            } catch (err) {
                showToast('Lỗi khi gửi dữ liệu lên máy chủ.');
            } finally {
                submitEditBtn.textContent = oldText;
                submitEditBtn.disabled = false;
            }
        });
    }

    // ─── Upload Logic ─────────────────────────────────────────────────────────
    uploadBtn.addEventListener('click', () => uploadInput.click());

    uploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        formData.append('bookId', currentBookId);
        for (let i = 0; i < files.length; i++) {
            formData.append('htmlFiles', files[i]);
        }

        showToast(`Đang xử lý ${files.length} chương truyện...`);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast(data.message || 'Tải lên thành công!');
                fetchChapters(currentBookId); // Refresh list
            } else {
                showToast(`Lỗi: ${data.error}`);
            }
        } catch (err) {
            showToast('Lỗi khi tải file lên máy chủ.');
        } finally {
            uploadInput.value = ''; // Reset input
        }
    });
    // ─── Edit & Delete Book Modal Logic ──────────────────────────────────────────
    const editBookModal = document.getElementById('edit-book-modal');
    const deleteBookModal = document.getElementById('delete-book-modal');
    
    let currentEditingBook = null;
    let editBookCoverType = 'none';

    function openEditBookModal(book) {
        currentEditingBook = book;
        document.getElementById('edit-book-title').value = book.title;
        document.getElementById('edit-book-desc').value = book.description || '';
        
        const urlInput = document.getElementById('edit-book-cover-url');
        const fileInput = document.getElementById('edit-book-cover-file');
        const btnUrl = document.getElementById('edit-cover-type-url');
        const btnFile = document.getElementById('edit-cover-type-file');
        
        editBookCoverType = book.coverType || 'none';
        
        if (editBookCoverType === 'url') {
            urlInput.value = book.coverImage || '';
            fileInput.value = '';
            urlInput.style.display = 'block';
            fileInput.style.display = 'none';
            btnUrl.style.background = 'var(--surface-2)';
            btnUrl.style.color = 'var(--primary)';
            btnUrl.style.border = '1px solid var(--primary)';
            btnFile.style.background = 'transparent';
            btnFile.style.color = 'var(--text)';
            btnFile.style.border = '1px solid transparent';
        } else if (editBookCoverType === 'file') {
            urlInput.value = '';
            fileInput.value = ''; // cannot restore file input
            urlInput.style.display = 'none';
            fileInput.style.display = 'block';
            btnFile.style.background = 'var(--surface-2)';
            btnFile.style.color = 'var(--primary)';
            btnFile.style.border = '1px solid var(--primary)';
            btnUrl.style.background = 'transparent';
            btnUrl.style.color = 'var(--text)';
            btnUrl.style.border = '1px solid transparent';
        } else {
            urlInput.value = '';
            fileInput.value = '';
            urlInput.style.display = 'block';
            fileInput.style.display = 'none';
            btnUrl.style.background = 'var(--surface-2)';
            btnUrl.style.color = 'var(--primary)';
            btnUrl.style.border = '1px solid var(--primary)';
            btnFile.style.background = 'transparent';
            btnFile.style.color = 'var(--text)';
            btnFile.style.border = '1px solid transparent';
            editBookCoverType = 'url';
        }
        
        editBookModal.style.display = 'flex';
    }

    document.getElementById('edit-cover-type-url').addEventListener('click', () => {
        editBookCoverType = 'url';
        document.getElementById('edit-book-cover-url').style.display = 'block';
        document.getElementById('edit-book-cover-file').style.display = 'none';
        document.getElementById('edit-cover-type-url').style.background = 'var(--surface-2)';
        document.getElementById('edit-cover-type-url').style.color = 'var(--primary)';
        document.getElementById('edit-cover-type-url').style.border = '1px solid var(--primary)';
        document.getElementById('edit-cover-type-file').style.background = 'transparent';
        document.getElementById('edit-cover-type-file').style.color = 'var(--text)';
        document.getElementById('edit-cover-type-file').style.border = '1px solid transparent';
    });
    
    document.getElementById('edit-cover-type-file').addEventListener('click', () => {
        editBookCoverType = 'file';
        document.getElementById('edit-book-cover-url').style.display = 'none';
        document.getElementById('edit-book-cover-file').style.display = 'block';
        document.getElementById('edit-cover-type-file').style.background = 'var(--surface-2)';
        document.getElementById('edit-cover-type-file').style.color = 'var(--primary)';
        document.getElementById('edit-cover-type-file').style.border = '1px solid var(--primary)';
        document.getElementById('edit-cover-type-url').style.background = 'transparent';
        document.getElementById('edit-cover-type-url').style.color = 'var(--text)';
        document.getElementById('edit-cover-type-url').style.border = '1px solid transparent';
    });

    document.getElementById('cancel-edit-book-btn').addEventListener('click', () => {
        editBookModal.style.display = 'none';
        currentEditingBook = null;
    });

    document.getElementById('submit-edit-book-btn').addEventListener('click', async () => {
        const title = document.getElementById('edit-book-title').value.trim();
        const desc = document.getElementById('edit-book-desc').value.trim();
        
        if (!title) {
            showToast('Tên truyện không được để trống!');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', desc);
        formData.append('coverType', editBookCoverType);

        if (editBookCoverType === 'url') {
            const url = document.getElementById('edit-book-cover-url').value.trim();
            if (url) formData.append('coverUrl', url);
            else formData.set('coverType', 'none');
        } else if (editBookCoverType === 'file') {
            const fileInput = document.getElementById('edit-book-cover-file');
            if (fileInput.files.length > 0) {
                formData.append('coverFile', fileInput.files[0]);
            } else {
                formData.set('coverType', currentEditingBook.coverType);
            }
        }

        const btn = document.getElementById('submit-edit-book-btn');
        const oldText = btn.textContent;
        btn.textContent = 'Đang lưu...';
        btn.disabled = true;

        try {
            const res = await fetch(`/api/books/${currentEditingBook._id}`, {
                method: 'PUT',
                body: formData
            });
            
            if (res.ok) {
                showToast('Cập nhật truyện thành công!');
                editBookModal.style.display = 'none';
                fetchBooks();
            } else {
                const data = await res.json();
                showToast(`Lỗi: ${data.error}`);
            }
        } catch (err) {
            showToast('Lỗi kết nối máy chủ!');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    document.getElementById('delete-book-btn').addEventListener('click', () => {
        editBookModal.style.display = 'none';
        document.getElementById('delete-book-target-name').textContent = currentEditingBook.title;
        document.getElementById('delete-book-confirm-input').value = '';
        document.getElementById('confirm-delete-book-btn').disabled = true;
        document.getElementById('confirm-delete-book-btn').style.opacity = '0.5';
        document.getElementById('confirm-delete-book-btn').style.cursor = 'not-allowed';
        deleteBookModal.style.display = 'flex';
    });

    document.getElementById('delete-book-confirm-input').addEventListener('input', (e) => {
        const btn = document.getElementById('confirm-delete-book-btn');
        if (e.target.value === currentEditingBook.title) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });

    document.getElementById('cancel-delete-book-btn').addEventListener('click', () => {
        deleteBookModal.style.display = 'none';
        editBookModal.style.display = 'flex';
    });

    document.getElementById('confirm-delete-book-btn').addEventListener('click', async () => {
        try {
            const res = await fetch(`/api/books/${currentEditingBook._id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Đã xóa bộ truyện thành công!');
                deleteBookModal.style.display = 'none';
                currentEditingBook = null;
                fetchBooks();
                if (currentBookId === currentEditingBook?._id) {
                    currentBookId = null;
                    globalResumeCard.style.display = 'none';
                }
            } else {
                showToast('Có lỗi xảy ra khi xóa!');
            }
        } catch(err) {
            showToast('Lỗi kết nối máy chủ!');
        }
    });

    // Initialize
    homeView.style.display = 'flex';
    playerView.style.display = 'none';
    fetchBooks();
    updatePlayButton();

    // ─── Upload Progress Polling ──────────────────────────────────────────
    const uploadWidget = document.getElementById('upload-progress-widget');
    const uploadWidgetBody = document.getElementById('upload-widget-body');
    const uploadTaskList = document.getElementById('upload-task-list');
    const uploadWidgetToggle = document.getElementById('upload-widget-toggle');

    uploadWidgetToggle.addEventListener('click', () => {
        uploadWidget.classList.toggle('minimized');
        const icon = uploadWidget.classList.contains('minimized') 
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
        uploadWidgetToggle.innerHTML = icon;
    });

    async function fetchUploadProgress() {
        try {
            const res = await fetch('/api/tasks/progress');
            if (!res.ok) return;
            const data = await res.json();
            
            if (data.tasks && data.tasks.length > 0) {
                uploadWidget.style.display = 'flex';
                uploadTaskList.innerHTML = '';
                
                data.tasks.forEach(task => {
                    const li = document.createElement('li');
                    li.className = 'upload-task-item';
                    
                    const progress = task.audioProgress || 0;
                    const statusText = task.audioStatus === 'pending' ? 'Đang chờ...' : 'Đang xử lý';
                    
                    li.innerHTML = `
                        <div class="upload-task-title">${task.title}</div>
                        <div class="upload-task-progress">
                            <div class="upload-task-bar-bg">
                                <div class="upload-task-bar-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="upload-task-percent">${progress}%</div>
                        </div>
                    `;
                    uploadTaskList.appendChild(li);
                });
            } else {
                uploadWidget.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to fetch upload progress', error);
        }
    }

    // Poll every 3 seconds
    setInterval(fetchUploadProgress, 3000);
    fetchUploadProgress(); // Initial fetch
});
