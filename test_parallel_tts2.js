const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

async function test() {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('vi-VN-NamMinhNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const texts = Array(50).fill("Đây là một đoạn văn bản thử nghiệm để kiểm tra khả năng xử lý song song nhiều request cùng lúc của thư viện này. Nếu nó thành công, tốc độ sẽ tăng lên đáng kể.");

    console.time("Parallel 50");
    const results = await Promise.all(texts.map((text, i) => {
        return new Promise(async r => {
            try {
                const { audioStream } = tts.toStream(text);
                const chunks = [];
                for await (const chunk of audioStream) chunks.push(chunk);
                r(Buffer.concat(chunks).length > 0);
            } catch(e) {
                console.log('Error at', i, e.message);
                r(false);
            }
        });
    }));
    console.timeEnd("Parallel 50");
    console.log("Success count:", results.filter(x => x).length);
    
    tts.close();
}

test().catch(console.error);
