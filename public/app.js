document.addEventListener('DOMContentLoaded', () => {

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

    const VOICES = [
        { id: 'female-1', label: 'Nữ Tự Nhiên',   icon: '👩', desc: 'Giọng chuẩn tự nhiên' },
        { id: 'female-2', label: 'Nữ Dịu Dàng',   icon: '🎙️', desc: 'Chậm hơn, cao hơn' },
        { id: 'female-3', label: 'Nữ Linh Hoạt',  icon: '📻', desc: 'Nhanh hơn, trầm hơn' },
        { id: 'male-1',   label: 'Nam Trầm Ấm',   icon: '👨', desc: 'Giọng chuẩn trầm ấm' },
        { id: 'male-2',   label: 'Nam Điềm Tĩnh', icon: '🎤', desc: 'Chậm hơn, trầm hơn' },
        { id: 'male-3',   label: 'Nam Rõ Ràng',   icon: '📢', desc: 'Nhanh hơn, cao hơn' },
    ];

    let story           = [];
    let currentIndex    = 0;
    let isPlaying       = false;
    let isPaused        = false;
    let selectedVoiceId = 'female-1';
    let speedRate       = 1.0;
    let currentStoryId  = null;
    let allFiles        = [];

    // Pool of 2 audio elements to avoid iOS memory limits and NotAllowed errors from creating too many
    const audioPool = [new Audio(), new Audio()];
    let poolIndex = 0;

    let activeAudios    = new Set();
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
            activeAudios.forEach(a => a.pause());
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

    function buildVoiceChips() {
        voiceGrid.innerHTML = '';
        VOICES.forEach(v => {
            const chip = document.createElement('button');
            chip.className = 'voice-chip' + (v.id === selectedVoiceId ? ' selected' : '');
            chip.title     = v.desc;
            chip.innerHTML = `<span>${v.icon}</span> ${v.label}`;
            chip.addEventListener('click', () => {
                if (selectedVoiceId === v.id) return;
                selectedVoiceId = v.id;
                prefetchedBlobs.clear();
                document.querySelectorAll('.voice-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                if (isPlaying) stopAndPlay(currentIndex);
            });
            voiceGrid.appendChild(chip);
        });
    }
    buildVoiceChips();

    rateRange.addEventListener('input', () => {
        speedRate = parseFloat(rateRange.value);
        rateDisplay.textContent = speedRate.toFixed(1) + 'x';
        prefetchedBlobs.clear();
        activeAudios.forEach(a => { a.playbackRate = speedRate; });
    });

    async function fetchFiles() {
        try {
            fileListEl.innerHTML = '<li class="file-list-loading">Đang tải danh sách...</li>';
            const [dataRes, progRes] = await Promise.all([
                fetch('/api/files'),
                fetch('/api/progress')
            ]);
            const data = await dataRes.json();
            const prog = await progRes.json();
            
            allFiles = data.files || [];
            renderFileList(allFiles);
            
            if (prog && prog.storyId) {
                resumeCard.style.display = 'block';
                resumeTitle.textContent = prog.title || 'Chương không tên';
                resumePara.textContent = `Đang đọc đoạn ${prog.paragraphIndex + 1}`;
                
                resumePlayBtn.onclick = () => {
                    loadStory(prog.storyId).then(() => {
                        setTimeout(() => stopAndPlay(prog.paragraphIndex), 500);
                    });
                };
            }
        } catch {
            fileListEl.innerHTML = '<li class="file-list-loading" style="color:#ef4444">Lỗi: Kiểm tra server đang chạy.</li>';
        }
    }

    function renderFileList(filesToRender) {
        fileListEl.innerHTML = '';
        if (!filesToRender.length) {
            fileListEl.innerHTML = '<li class="file-list-loading">Không có kết quả nào.</li>';
            return;
        }
        filesToRender.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            if (file.id === currentStoryId) li.classList.add('active');
            li.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; gap:10px; overflow:hidden;" class="item-click-area">
                    <div class="file-item-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                    </div>
                    <span class="file-item-name" title="${file.title}">${file.title}</span>
                </div>
                <button class="delete-btn" title="Xóa" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:6px; opacity:0.6;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
            li.querySelector('.item-click-area').addEventListener('click', () => loadStory(file.id, li));
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('delete-modal');
                const targetName = document.getElementById('delete-target-name');
                const cancelBtn = document.getElementById('cancel-delete-btn');
                const confirmBtn = document.getElementById('confirm-delete-btn');
                
                targetName.textContent = file.title;
                modal.style.display = 'flex';
                
                const cleanup = () => {
                    modal.style.display = 'none';
                    cancelBtn.removeEventListener('click', onCancel);
                    confirmBtn.removeEventListener('click', onConfirm);
                };
                
                const onCancel = () => cleanup();
                
                const onConfirm = async () => {
                    cleanup();
                    try {
                        await fetch(`/api/story/${file.id}`, { method: 'DELETE' });
                        fetchFiles();
                    } catch(err) {
                        showToast('Lỗi khi xóa!');
                    }
                };
                
                cancelBtn.addEventListener('click', onCancel);
                confirmBtn.addEventListener('click', onConfirm);
            });
            fileListEl.appendChild(li);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allFiles.filter(f => f.title.toLowerCase().includes(term));
        renderFileList(filtered);
    });

    refreshBtn.addEventListener('click', fetchFiles);

    async function loadStory(storyId, li) {
        currentStoryId = storyId;
        renderFileList(allFiles);
        
        if (sidebarEl && sidebarEl.classList.contains('open')) {
            sidebarEl.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        }

        stopPlayback();
        storyContainerEl.innerHTML = `<div class="empty-state"><div class="empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg></div><p>Đang tải nội dung chương...</p></div>`;
        try {
            const data = await (await fetch(`/api/story/${storyId}`)).json();
            if (data.error) throw new Error(data.error);
            story        = data.content;
            currentIndex = 0;
            headerLabelEl.textContent = 'Đang xem';
            storyTitleEl.textContent  = data.title;
            renderStoryContents();
            playerBar.style.display = 'flex';
            updateProgress();
            
            // Initiate buffering immediately so it's ready when play begins
            startPrefetchLoop();
        } catch (err) {
            storyTitleEl.textContent = 'Lỗi tải truyện';
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

    let prefetchedBlobs = new Map();
    let prefetchController = null;
    let isPrefetching = false;

    function stopAndPlay(index) {
        resetIdleTimer();
        stopPlayback(false); // Don't clear the buffer, just stop current audio
        setTimeout(() => beginPlay(index), 50);
    }

    async function startPrefetchLoop() {
        if (isPrefetching) return;
        isPrefetching = true;

        try {
            if (prefetchController) prefetchController.abort();
            prefetchController = new AbortController();

            let nextToFetch = currentIndex;

            while (nextToFetch < story.length) {
                if (prefetchController.signal.aborted) break;

                // Skip if already prefetched or in the past
                if (nextToFetch < currentIndex || prefetchedBlobs.has(nextToFetch)) {
                    nextToFetch++;
                    continue;
                }

                const text = story[nextToFetch];
                const url = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(selectedVoiceId)}`;
                
                try {
                    const res = await fetch(url, { signal: prefetchController.signal });
                    
                    if (res.ok) {
                        const blob = await res.blob();
                        if (blob.size > 0) {
                            prefetchedBlobs.set(nextToFetch, blob);
                            updateProgress();
                        }
                        nextToFetch++;
                        // No delay - load at maximum speed
                    } else {
                        // Rate limit or server error: wait then retry
                        await new Promise(r => setTimeout(r, 2000));
                    }
                } catch (e) {
                    if (e.name === 'AbortError') break;
                    // Network error: wait and retry
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        } finally {
            isPrefetching = false;
        }
    }

    let progressTimeout = null;
    function saveProgress(index) {
        if (!currentStoryId || !story || story.length === 0) return;
        const currentTitle = allFiles.find(f => f.id === currentStoryId)?.title || 'Chương không tên';
        clearTimeout(progressTimeout);
        progressTimeout = setTimeout(() => {
            fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: currentStoryId, title: currentTitle, paragraphIndex: index })
            }).catch(() => {});
        }, 1500);
        
        resumeCard.style.display = 'block';
        resumeTitle.textContent = currentTitle;
        resumePara.textContent = `Đang đọc đoạn ${index + 1}`;
        resumePlayBtn.onclick = () => stopAndPlay(index);
    }

    async function beginPlay(index, isAutoAdvance = false) {
        if (!story || story.length === 0) return;
        
        if (index >= story.length) {
            isPlaying = false;
            updatePlayButton();
            playNextChapter();
            return;
        }

        currentIndex = index;
        isPlaying    = true;
        isPaused     = false;
        updatePlayButton();
        updateProgress();
        highlightParagraph(index);
        
        saveProgress(index);

        try {
            let blob = prefetchedBlobs.get(index);

            if (!blob) {
                showToast('Đang tải đệm âm thanh (Buffering)...');
                document.getElementById(`para-${index}`)?.classList.add('para-loading');
                
                startPrefetchLoop(); // ensure prefetch is running
                
                let waitTime = 0;
                // Wait up to 30 seconds for the prefetch loop to download this paragraph
                while (!prefetchedBlobs.has(index) && waitTime < 30000) {
                    if (!isPlaying || currentIndex !== index) return;
                    await new Promise(r => setTimeout(r, 500));
                    waitTime += 500;
                }
                
                document.getElementById(`para-${index}`)?.classList.remove('para-loading');
                blob = prefetchedBlobs.get(index);
                
                if (!blob) throw new Error('Timeout waiting for buffer');
            }
            
            // Remove from buffer once we are about to play it
            prefetchedBlobs.delete(index);

            const blobUrl = URL.createObjectURL(blob);

            if (!isPlaying || currentIndex !== index) {
                URL.revokeObjectURL(blobUrl);
                return;
            }

            if (!isAutoAdvance) {
                activeAudios.forEach(a => { 
                    a.pause(); 
                    a.ontimeupdate = null; 
                    if (a.blobUrl) {
                        URL.revokeObjectURL(a.blobUrl);
                        a.blobUrl = null;
                    }
                });
                activeAudios.clear();
            }

            const audio = audioPool[poolIndex];
            poolIndex = (poolIndex + 1) % 2;
            
            // Cleanup previous blob on this audio element if any
            if (audio.blobUrl && audio.blobUrl !== blobUrl) {
                URL.revokeObjectURL(audio.blobUrl);
            }

            audio.src = blobUrl;
            audio.playbackRate = speedRate;
            audio.blobUrl = blobUrl;
            activeAudios.add(audio);
            
            let hasStartedNext = false;

            audio.ontimeupdate = () => {
                if (audio.duration && (audio.duration - audio.currentTime) <= 0.4 && !hasStartedNext) {
                    hasStartedNext = true;
                    if (isPlaying) beginPlay(currentIndex + 1, true);
                }
            };
            
            audio.onended = () => {
                activeAudios.delete(audio);
                if (audio.blobUrl === blobUrl) {
                    URL.revokeObjectURL(blobUrl);
                    audio.blobUrl = null;
                }
            };

            audio.onerror = () => {
                console.error('Audio object error', audio.error);
                showToast('Lỗi phát âm thanh. Đang thử đoạn tiếp...');
                if (isPlaying && !hasStartedNext) {
                    hasStartedNext = true;
                    setTimeout(() => beginPlay(currentIndex + 1, true), 1000);
                }
            };

            try {
                await audio.play();
            } catch (playErr) {
                activeAudios.delete(audio);
                URL.revokeObjectURL(blobUrl);
                if (playErr.name === 'NotAllowedError') {
                    isPlaying = false; isPaused = true; updatePlayButton();
                    showToast('Trình duyệt chặn tự động phát. Vui lòng bấm Phát thủ công.');
                    return; 
                }
                throw playErr;
            }
            
            updatePlayButton();

            startPrefetchLoop();

        } catch (err) {
            if (err.name === 'AbortError' || err.message.includes('interrupted')) return;
            console.error('Fetch/Play error:', err.message);
            showToast('Lỗi tải đoạn âm thanh này. Bỏ qua...');
            if (isPlaying) setTimeout(() => beginPlay(currentIndex + 1, true), 1000);
        }
    }

    function togglePlay() {
        if (!isPlaying) {
            resetIdleTimer();
            if (isPaused && activeAudios.size > 0) {
                activeAudios.forEach(a => a.play().catch(()=>{}));
                isPlaying = true; isPaused = false; updatePlayButton();
            } else {
                beginPlay(currentIndex);
            }
        } else {
            activeAudios.forEach(a => a.pause());
            isPlaying = false; isPaused = true; updatePlayButton();
        }
    }
    
    function playNextChapter() {
        if (!currentStoryId) return;
        const idx = allFiles.findIndex(f => f.id === currentStoryId);
        if (idx !== -1 && idx < allFiles.length - 1) {
            loadStory(allFiles[idx + 1].id).then(() => {
                setTimeout(() => beginPlay(0), 500);
            });
        } else {
            showToast('Đã đến chương cuối cùng.');
        }
    }
    
    function playPrevChapter() {
        if (!currentStoryId) return;
        const idx = allFiles.findIndex(f => f.id === currentStoryId);
        if (idx > 0) {
            loadStory(allFiles[idx - 1].id).then(() => {
                setTimeout(() => beginPlay(0), 500);
            });
        } else {
            showToast('Đây là chương đầu tiên.');
        }
    }

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => { if (currentIndex > 0) stopAndPlay(currentIndex - 1); });
    nextBtn.addEventListener('click', () => { if (currentIndex < story.length - 1) stopAndPlay(currentIndex + 1); });
    prevChapBtn.addEventListener('click', playPrevChapter);
    nextChapBtn.addEventListener('click', playNextChapter);
    stopBtn.addEventListener('click',  () => {
        stopPlayback();
        currentIndex = 0;
        highlightParagraph(-1);
        updateProgress();
    });

    function stopPlayback(clearBuffer = true) {
        if (clearBuffer) {
            prefetchedBlobs.clear();
        }
        isPrefetching = false;
        if (prefetchController) {
            prefetchController.abort();
            prefetchController = null;
        }

        
        activeAudios.forEach(a => { 
            a.pause(); 
            a.ontimeupdate = null; 
            if (a.blobUrl) {
                URL.revokeObjectURL(a.blobUrl);
                a.blobUrl = null;
            }
        });
        activeAudios.clear();
        
        isPlaying = false; isPaused = false;
        document.querySelectorAll('.story-container p').forEach(p => p.classList.remove('reading-active'));
        updatePlayButton();
        updateProgress();
    }

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
        const current = isPlaying ? currentIndex + 1 : 0;
        progressText.textContent = `${current} / ${total} đoạn`;
        
        const fillPct = total > 0 && isPlaying ? `${(currentIndex / total) * 100}%` : '0%';
        progressFill.style.width = fillPct;

        // Calculate buffer percentage
        if (!isPlaying || total === 0) {
            progressBuffer.style.width = '0%';
        } else {
            // Find consecutive buffered paragraphs
            let bufferedCount = 0;
            for (let i = 0; i < total; i++) {
                if (i <= currentIndex || prefetchedBlobs.has(i)) {
                    bufferedCount++;
                } else {
                    break;
                }
            }
            progressBuffer.style.width = `${(bufferedCount / total) * 100}%`;
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

    // ─── Upload Logic ─────────────────────────────────────────────────────────
    uploadBtn.addEventListener('click', () => uploadInput.click());

    uploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
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
                fetchFiles(); // Refresh list
            } else {
                showToast(`Lỗi: ${data.error}`);
            }
        } catch (err) {
            showToast('Lỗi khi tải file lên máy chủ.');
        } finally {
            uploadInput.value = ''; // Reset input
        }
    });

    fetchFiles();
    updatePlayButton();
});
