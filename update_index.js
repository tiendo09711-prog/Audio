const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetHtml = <div style="padding: 0 16px 12px 16px;">
                <input type="text" id="search-input" placeholder="Tìm kiếm chương..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-size: 0.9rem; outline: none;">
            </div>;

const newHtml = <div style="padding: 0 16px 12px 16px;">
                <input type="text" id="search-input" placeholder="Tìm kiếm chương..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-size: 0.9rem; outline: none;">
            </div>
            <div id="list-controls" style="padding: 0 16px 8px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <button id="toggle-select-mode-btn" style="background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 600;">Chọn nhiều</button>
                <div id="bulk-actions" style="display: none; gap: 12px; align-items: center;">
                    <button id="select-all-btn" style="background: none; border: none; color: var(--text); cursor: pointer;">Chọn tất cả</button>
                    <button id="bulk-delete-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: 600;">Xóa (<span id="selected-count">0</span>)</button>
                </div>
            </div>;

content = content.replace(targetHtml, newHtml);

fs.writeFileSync(filePath, content, 'utf8');
console.log('index.html updated');
