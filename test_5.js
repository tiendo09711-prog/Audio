const fetch = require('node-fetch');

async function test() {
    for (let i = 0; i < 5; i++) {
        setTimeout(async () => {
            console.log(`Posting Chapter ${i}...`);
            const res = await fetch('http://localhost:3000/api/paste', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId: '6a262312b410b8693c3b0d5c', title: `Chapter ${i}`, content: 'A\n'.repeat(50) })
            });
            console.log(`Chapter ${i} queued:`, res.status);
        }, i * 500);
    }
}

test();
