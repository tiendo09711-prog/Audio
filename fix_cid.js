const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

// Fix globalResumePlayBtn
code = code.replace(
    /const cid = validProg\.chapterId \? validProg\.chapterId\._id : validProg\.chapterId;/g,
    'const cid = validProg.chapterId ? (validProg.chapterId._id || validProg.chapterId) : null;'
);

// Fix historyGrid card onclick
code = code.replace(
    /const cid = prog\.chapterId \? \(prog\.chapterId\._id \|\| prog\.chapterId\) : null;/g,
    'const cid = prog.chapterId ? (prog.chapterId._id || prog.chapterId) : null;'
); // this one might already be correct

fs.writeFileSync('public/app.js', code);
console.log('Fixed cid extraction');
