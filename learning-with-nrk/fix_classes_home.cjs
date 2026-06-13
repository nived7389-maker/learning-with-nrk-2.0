const fs = require('fs');
let content = fs.readFileSync('src/components/Home.tsx', 'utf8');
content = content.replace(/border-white\/5/g, 'border-slate-200 dark:border-white/5');
fs.writeFileSync('src/components/Home.tsx', content);
