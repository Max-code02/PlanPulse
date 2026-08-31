const fs = require('fs');
let content = fs.readFileSync('src/components/BottomLegalBar.tsx', 'utf8');

const regex = /<span className="text-slate-600 font-bold">•<\/span>\s*<a\s*id="btn-bottom-left-linktree"[^>]*>\s*<span[^>]*>Links<\/span>\s*<\/a>/s;
content = content.replace(regex, '');
fs.writeFileSync('src/components/BottomLegalBar.tsx', content);
