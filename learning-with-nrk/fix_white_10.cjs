const fs = require('fs');

const replacements = [
  { search: /border-white\/10/g, replace: 'border-slate-200 dark:border-white/10' },
  { search: /border-white\/20/g, replace: 'border-slate-300 dark:border-white/20' }
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
console.log("Fixed white/10 and white/20 classes.");
