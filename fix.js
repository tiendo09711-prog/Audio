const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

const before = lines.slice(0, 348);
const after = lines.slice(558);

const fixed = [
    ...before,
    '            </div>',
    '        </div>',
    '    </div>',
    '',
    '    <!-- Idle Check Modal -->',
    '    <div id="idle-check-modal" class="modal-overlay" style="display:none;">',
    '        <div class="modal-content">',
    '            <h3>Bạn còn nghe không?</h3>',
    '            <p>Truyện đã phát liên tục 2 giờ. Bạn có muốn tiếp tục nghe không?</p>',
    '            <div class="modal-actions">',
    '                <button id="idle-stop-btn" class="modal-btn cancel-btn">Dừng lại</button>',
    '                <button id="idle-continue-btn" class="modal-btn" style="background: var(--grad); color: white;">Tiếp tục phát</button>',
    '            </div>',
    '        </div>',
    '    </div>',
    ...after
];

fs.writeFileSync('public/index.html', fixed.join('\n'));
console.log('Fixed index.html');
