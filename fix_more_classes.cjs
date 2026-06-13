const fs = require('fs');

const replacements = [
  { search: /border border-white\/5/g, replace: 'border border-black/5 dark:border-white/5' },
  { search: /divide-white\/5/g, replace: 'divide-black/5 dark:divide-white/5' },
  { search: /hover:bg-white\/\[0.02\]/g, replace: 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' },
  { search: /border-b border-white\/5/g, replace: 'border-b border-black/5 dark:border-white/5' }
];

const files = fs.readdirSync('src/components').map(f => 'src/components/' + f).concat(['src/App.tsx']);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    fs.writeFileSync(file, content);
  }
});
console.log("Fixed more classes.");
