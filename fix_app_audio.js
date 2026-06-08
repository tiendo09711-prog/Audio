const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace unlockAudio block
const unlockAudioFind = `    function unlockAudio() {
        if (isAudioUnlocked) return;
        audioPool.forEach(a => {
            a.src = SILENT_WAV;
            a.play().then(() => {
                a.pause();
            }).catch(() => {});
        });`;
        
const unlockAudioReplace = `    function unlockAudio() {
        if (isAudioUnlocked) return;
        if (typeof mainAudio !== 'undefined') {
            mainAudio.src = SILENT_WAV;
            mainAudio.play().then(() => {
                mainAudio.pause();
            }).catch(() => {});
        }`;

content = content.replace(unlockAudioFind, unlockAudioReplace);

// Replace activeAudios block in stopPlayback
const stopPlaybackFind = `        activeAudios.forEach(a => { 
            a.pause(); 
            a.ontimeupdate = null; 
            if (a.blobUrl) {
                URL.revokeObjectURL(a.blobUrl);
                a.blobUrl = null;
            }
            a.src = ''; 
        });
        activeAudios.clear();`;
        
const stopPlaybackReplace = `        if (typeof mainAudio !== 'undefined') {
            mainAudio.pause();
            mainAudio.ontimeupdate = null;
            if (mainAudio.blobUrl) {
                URL.revokeObjectURL(mainAudio.blobUrl);
                mainAudio.blobUrl = null;
            }
            mainAudio.src = '';
        }`;

content = content.replace(stopPlaybackFind, stopPlaybackReplace);

// Remove the idleCheckInterval activeAudios block just in case it's still there
content = content.replace("activeAudios.forEach(a => { a.playbackRate = speedRate; });", "if (typeof mainAudio !== 'undefined') mainAudio.playbackRate = speedRate;");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed audio variables in app.js");
