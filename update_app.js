const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Remove Voice Mode buttons listener code
content = content.replace(/const modeAutoBtn = document\.getElementById\('mode-auto-btn'\);[\s\S]*?if \(modeAutoBtn\) \{[\s\S]*?updateModeButtons\(\);\n    \}/g, '');

// 2. Remove initBrowserVoice
content = content.replace(/let browserSpeech = null;\n    let browserVoice = null;\n    \n    function initBrowserVoice\(\) \{[\s\S]*?initBrowserVoice\(\);\n    /g, '');

// 3. Remove audioPool and replace with mainAudio initialization
content = content.replace(/\/\/ Pool of 2 audio elements[\s\S]*?let keepAliveAudio = new Audio\(\);\n    keepAliveAudio\.loop = true;\n    keepAliveAudio\.src = SILENT_WAV;/g, "const mainAudio = document.getElementById('main-audio-player');\n    window.currentTimestamps = [];");

// 4. Remove keepalive logic from unlockAudio
content = content.replace(/function unlockAudio\(\) \{[\s\S]*?stopKeepAlive\(\) \{\n        keepAliveAudio\.pause\(\);\n    \}/g, "function unlockAudio() {\n        mainAudio.play().then(() => mainAudio.pause()).catch(() => {});\n    }");

// 5. Replace startPrefetchLoop, stopAndPlay, beginPlay, playWithBrowserVoice
content = content.replace(/let prefetchedBlobs = new Map\(\);[\s\S]*?function playWithBrowserVoice\(index\) \{[\s\S]*?startPrefetchLoop\(\);\n    \}/g, `
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
        if (!mainAudio.src) return showToast('ChÆ°a cÃ³ audio Ä‘á»ƒ phÃ¡t!');
        if (isPlaying && !isPaused) {
            mainAudio.pause();
            isPlaying = false;
            isPaused = true;
        } else {
            mainAudio.play().then(() => {
                isPlaying = true;
                isPaused = false;
            }).catch(e => showToast('KhÃ´ng thá»ƒ phÃ¡t: ' + e.message));
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
`);

// 6. Update rate slider logic
content = content.replace(/prefetchedBlobs\.clear\(\);\n        activeAudios\.forEach\(a => \{ a\.playbackRate = speedRate; \}\);\n        if \(currentVoice === 'normal' && isPlaying\) \{[\s\S]*?beginPlay\(currentIndex\);\n        \}/g, "mainAudio.playbackRate = speedRate;");

// 7. Update loadChapter logic
const loadChapterMatch = content.match(/async function loadChapter\(chapterId, li = null, startIndex = 0\) \{[\s\S]*?} catch \(err\) \{/);
if (loadChapterMatch) {
    const newLoadChapter = `async function loadChapter(chapterId, li = null, startIndex = 0) {
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
            const data = await (await fetch(\`/api/chapters/\${chapterId}\`)).json();
            if (data.error) throw new Error(data.error);
            story = data.content;
            currentIndex = startIndex;
            headerLabelEl.textContent = 'Äang xem';
            storyTitleEl.textContent  = data.title;
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
        } catch (err) {`;
    
    content = content.replace(loadChapterMatch[0], newLoadChapter);
}

// 8. Update checkIdleState to pause mainAudio
content = content.replace(/activeAudios\.forEach\(a => a\.pause\(\)\);/g, "mainAudio.pause();");

// 9. Play button event listener logic replacement
content = content.replace(/playBtn\.addEventListener\('click', togglePlay\);[\s\S]*?stopBtn\.addEventListener\('click', \(\) => \{[\s\S]*?\}\);/g, `playBtn.addEventListener('click', togglePlay);
    stopBtn.addEventListener('click', () => {
        stopPlayback();
    });`);
    
// 10. Update edit chapter prompt
content = content.replace(/const updateData = \{\n            title: editTitle,\n            content: editContent\n        \};/g, `
        const updateAudio = confirm('Báº¡n cÃ³ muá»‘n táº¡o láº¡i Audio MP3 trÃªn Cloud cho ná»™i dung má»›i nÃ y khÃ´ng?\\n\\nOK: XÃ³a file cÅ©, táº¡o file má»›i (sáº½ máº¥t khoáº£ng vÃ i chá»¥c giÃ¢y).\\nCancel: Chá»‰ cáº­p nháº­t chá»¯, giá»¯ nguyÃªn file Audio cÅ©.');
        const updateData = { title: editTitle, content: editContent, updateAudio };
`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete');
