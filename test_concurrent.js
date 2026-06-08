const fetch = require('node-fetch');

async function test() {
    console.log('Posting Chapter A...');
    const resA = await fetch('http://localhost:3000/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: '6a262312b410b8693c3b0d5c', title: 'Chapter A', content: 'A\n'.repeat(10) })
    });
    console.log('Chapter A queued:', resA.status);

    setTimeout(async () => {
        console.log('Posting Chapter B...');
        const resB = await fetch('http://localhost:3000/api/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: '6a262312b410b8693c3b0d5c', title: 'Chapter B', content: 'B\n'.repeat(10) })
        });
        console.log('Chapter B queued:', resB.status);
    }, 1000); // 1 second later
}

test();
