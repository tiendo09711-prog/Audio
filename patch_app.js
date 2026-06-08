const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Inject select state variables
if (!content.includes('window.isSelectMode = false;')) {
    content = content.replace(/let allFiles        = \[\];\n    let allBooks        = \[\];/, 
`let allFiles        = [];
    let allBooks        = [];
    window.isSelectMode = false;
    window.selectedChapters = new Set();`);
}

// Modify renderChapterList
const oldRenderListHTML = `li.innerHTML = \`
                <div style="display:flex; align-items:center; flex:1; gap:10px; overflow:hidden;" class="item-click-area">`;
                
const newRenderListHTML = `li.innerHTML = \`
                <input type="checkbox" class="chapter-checkbox" value="\${file.id}" style="display: \${window.isSelectMode ? 'block' : 'none'}; margin-right: 8px;">
                <div style="display:flex; align-items:center; flex:1; gap:10px; overflow:hidden;" class="item-click-area">`;

if (!content.includes('class="chapter-checkbox"')) {
    content = content.replace(oldRenderListHTML, newRenderListHTML);
}

const oldDeleteBtn = `<button class="delete-btn" title="XÃ³a" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:6px; opacity:0.6;">`;
const newDeleteBtn = `<button class="delete-btn" title="XÃ³a" style="display: \${window.isSelectMode ? 'none' : 'block'}; background:transparent; border:none; color:#ef4444; cursor:pointer; padding:6px; opacity:0.6;">`;

if (!content.includes('window.isSelectMode ? \'none\' : \'block\'')) {
    content = content.replace(oldDeleteBtn, newDeleteBtn);
}

// Add checkbox listener in renderChapterList
const oldAddEventListener = `li.querySelector('.item-click-area').addEventListener('click', () => loadChapter(file.id, li));`;
const newAddEventListener = `
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
`;

if (!content.includes('checkbox.checked = window.selectedChapters.has(file.id)')) {
    content = content.replace(oldAddEventListener, newAddEventListener);
}

// Add UI logic for list controls
const logicToAdd = `
    // List Controls Logic
    const toggleSelectModeBtn = document.getElementById('toggle-select-mode-btn');
    const bulkActions = document.getElementById('bulk-actions');
    const selectAllBtn = document.getElementById('select-all-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (toggleSelectModeBtn) {
        toggleSelectModeBtn.addEventListener('click', () => {
            window.isSelectMode = !window.isSelectMode;
            if (!window.isSelectMode) window.selectedChapters.clear();
            
            toggleSelectModeBtn.textContent = window.isSelectMode ? 'Há»§y' : 'Chá»n nhiá»u';
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
            if (window.selectedChapters.size === 0) return showToast('ChÆ°a chá»n chÆ°Æ¡ng nÃ o!');
            if (!confirm(\`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a \${window.selectedChapters.size} chÆ°Æ¡ng Ä‘Ã£ chá»n? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.\`)) return;

            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.textContent = 'Äang xÃ³a...';
            
            try {
                const res = await fetch('/api/chapters/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(window.selectedChapters) })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(\`ÄÃ£ xÃ³a \${data.deletedCount} chÆ°Æ¡ng thÃ nh cÃ´ng!\`);
                    window.selectedChapters.clear();
                    window.isSelectMode = false;
                    toggleSelectModeBtn.textContent = 'Chá»n nhiá»u';
                    bulkActions.style.display = 'none';
                    fetchChapters(currentBookId);
                } else {
                    showToast('Lá»—i khi xÃ³a nhiá»u: ' + data.error);
                }
            } catch (err) {
                showToast('Lá»—i há»‡ thá»‘ng khi xÃ³a!');
            }
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.innerHTML = 'XÃ³a (<span id="selected-count">0</span>)';
        });
    }
`;

if (!content.includes('toggleSelectModeBtn.addEventListener(\'click\'')) {
    content = content.replace(/document\.addEventListener\('DOMContentLoaded', \(\) => \{/, "document.addEventListener('DOMContentLoaded', () => {\n" + logicToAdd);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch complete.');
