const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove old togglePlay
const oldTogglePlay = `    function togglePlay() {
        if (!isPlaying) {
            resetIdleTimer();
            if (isPaused && (activeAudios.size > 0 || currentVoice === 'normal')) {
                if (currentVoice === 'normal' && window.speechSynthesis) window.speechSynthesis.resume();
                else activeAudios.forEach(a => a.play().catch(()=>{}));
                isPlaying = true; isPaused = false; updatePlayButton();
            } else {
                beginPlay(currentIndex);
            }
        } else {
            if (currentVoice === 'normal' && window.speechSynthesis) window.speechSynthesis.pause();
            else mainAudio.pause();
            isPlaying = false; isPaused = true; updatePlayButton();
        }
    }`;
content = content.replace(oldTogglePlay, '');

// 2. Remove old stopPlayback
const oldStopPlayback = `    function stopPlayback(clearBuffer = true) {
        if (clearBuffer) {
            prefetchedBlobs.clear();
        }
        isPrefetching = false;
        if (prefetchController) {
            prefetchController.abort();
            prefetchController = null;
        }

        if (window.speechSynthesis) {
            if (browserSpeech) {
                browserSpeech.onend = null;
                browserSpeech.onerror = null;
            }
            window.speechSynthesis.cancel();
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
    }`;
content = content.replace(oldStopPlayback, '');

// 3. Fix playNextChapter and playPrevChapter
content = content.replace('setTimeout(() => beginPlay(0), 500);', 'setTimeout(() => stopAndPlay(0), 500);');
content = content.replace('setTimeout(() => beginPlay(0), 500);', 'setTimeout(() => stopAndPlay(0), 500);');

// 4. Fix updateProgress
const oldUpdateProgress = `        // Calculate buffer percentage
        if (total === 0) {
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
            progressBuffer.style.width = \`\${(bufferedCount / total) * 100}%\`;
        }`;
const newUpdateProgress = `        // Calculate buffer percentage
        if (total === 0) {
            progressBuffer.style.width = '0%';
        } else {
            progressBuffer.style.width = '100%';
        }`;
content = content.replace(oldUpdateProgress, newUpdateProgress);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final cleanup complete.');
