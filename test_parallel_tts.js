const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

async function test() {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const texts = [
        "Đoạn văn thứ nhất để kiểm tra tốc độ.",
        "Đoạn văn thứ hai có nội dung dài hơn một chút.",
        "Đoạn văn thứ ba.",
        "Đoạn văn thứ tư cũng vậy.",
        "Đoạn văn thứ năm kết thúc."
    ];

    console.time("Sequential");
    for (const text of texts) {
        await new Promise(async r => {
            try {
                const { audioStream } = tts.toStream(text);
                const chunks = [];
                for await (const chunk of audioStream) chunks.push(chunk);
                r(Buffer.concat(chunks));
            } catch(e) { r(null); }
        });
    }
    console.timeEnd("Sequential");

    console.time("Parallel");
    await Promise.all(texts.map(text => {
        return new Promise(async r => {
            try {
                const { audioStream } = tts.toStream(text);
                const chunks = [];
                for await (const chunk of audioStream) chunks.push(chunk);
                r(Buffer.concat(chunks));
            } catch(e) { r(null); }
        });
    }));
    console.timeEnd("Parallel");
    
    tts.close();
}

test().catch(console.error);
