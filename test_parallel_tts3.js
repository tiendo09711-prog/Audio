const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

async function test() {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const texts = Array(50).fill("Đây là một đoạn văn bản thử nghiệm. Xử lý theo từng nhóm.");

    console.time("Batched 5");
    let success = 0;
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((text, idx) => {
            return new Promise(async r => {
                try {
                    const { audioStream } = tts.toStream(text);
                    const chunks = [];
                    for await (const chunk of audioStream) chunks.push(chunk);
                    r(Buffer.concat(chunks).length > 0);
                } catch(e) {
                    console.log('Error at', i + idx, e.message);
                    r(false);
                }
            });
        }));
        success += results.filter(x => x).length;
        // sleep a bit between batches just to be safe
        await new Promise(r => setTimeout(r, 200));
    }
    
    console.timeEnd("Batched 5");
    console.log("Success count:", success);
    
    tts.close();
}

test().catch(console.error);
