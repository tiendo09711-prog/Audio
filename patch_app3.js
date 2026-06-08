const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// The multi_replace_file_content tool incorrectly deleted variables.
// Let's restore them. The code right now has:
//     let currentIndex    = 0;
//     
//     // iOS Web Audio Unlock & KeepAlive

if (!content.includes('let isPlaying       = false;')) {
    content = content.replace(/let currentIndex    = 0;\n    \n    \/\/ iOS Web Audio Unlock & KeepAlive/,
`let currentIndex    = 0;
    let isPlaying       = false;
    let isPaused        = false;
    let speedRate       = parseFloat(localStorage.getItem('preferredSpeed') || '1.0');
    let currentStoryId  = null;
    let allFiles        = [];
    let allBooks        = [];
    window.isSelectMode = false;
    window.selectedChapters = new Set();

    // List Controls Logic
    setTimeout(() => {
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
                if (typeof renderChapterList === 'function') {
                    renderChapterList(allFiles);
                }
            });

            selectAllBtn.addEventListener('click', () => {
                const visibleFiles = allFiles;
                const allSelected = visibleFiles.every(f => window.selectedChapters.has(f.id));
                if (allSelected) {
                    visibleFiles.forEach(f => window.selectedChapters.delete(f.id));
                } else {
                    visibleFiles.forEach(f => window.selectedChapters.add(f.id));
                }
                document.getElementById('selected-count').textContent = window.selectedChapters.size;
                renderChapterList(allFiles);
            });

            bulkDeleteBtn.addEventListener('click', async () => {
                if (window.selectedChapters.size === 0) {
                    if (typeof showToast === 'function') showToast('Chưa chọn chương nào!');
                    return;
                }
                if (!confirm(\`Bạn có chắc chắn muốn xóa \${window.selectedChapters.size} chương đã chọn? Hành động này không thể hoàn tác.\`)) return;

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
                        if (typeof showToast === 'function') showToast(\`Đã xóa \${data.deletedCount} chương thành công!\`);
                        window.selectedChapters.clear();
                        window.isSelectMode = false;
                        toggleSelectModeBtn.textContent = 'Chọn nhiều';
                        bulkActions.style.display = 'none';
                        if (typeof fetchChapters === 'function' && currentBookId) {
                            fetchChapters(currentBookId);
                        }
                    } else {
                        if (typeof showToast === 'function') showToast('Lỗi khi xóa nhiều: ' + data.error);
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('Lỗi hệ thống khi xóa!');
                }
                bulkDeleteBtn.disabled = false;
                bulkDeleteBtn.innerHTML = 'Xóa (<span id="selected-count">0</span>)';
            });
        }
    }, 100);

    // iOS Web Audio Unlock & KeepAlive`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Variables restored and logic injected');
