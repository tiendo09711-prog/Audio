const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

code = code.replace(/Ä ang táº£i ná»™i dung chÆ°Æ¡ng\.\.\./g, 'Đang tải nội dung chương...');
code = code.replace(/Ä ang xem/g, 'Đang xem');
code = code.replace(/Audio Ä‘ang Ä‘Æ°á»£c táº¡o, vui lÃ²ng chá»  Ã­t phÃºt\.\.\./g, 'Audio đang được tạo, vui lòng chờ ít phút...');
code = code.replace(/ChÆ°a cÃ³ audio Ä‘á»ƒ phÃ¡t!/g, 'Chưa có audio để phát!');
code = code.replace(/KhÃ´ng thá»ƒ phÃ¡t: /g, 'Không thể phát: ');

fs.writeFileSync('public/app.js', code);
console.log('Fixed broken encoding strings in app.js');
