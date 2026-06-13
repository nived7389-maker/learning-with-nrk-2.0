const fs = require('fs');

const replacements = [
  { search: /text-slate-[a-zA-Z0-9\/]+ dark:text-slate-[a-zA-Z0-9\/]+ dark:text-white(\/[0-9]+)?/g, replace: 'text-slate-900 dark:text-white$1' },
  { search: /text-slate-900 dark:text-slate-[a-zA-Z0-9\/]+ dark:text-white(\/[0-9]+)?/g, replace: 'text-slate-900 dark:text-white$1' },
  { search: /bg-slate-200 dark:bg-white\/10/g, replace: 'bg-black/5 dark:bg-white/10' },
  { search: /bg-slate-100 dark:bg-white\/5/g, replace: 'bg-black/5 dark:bg-white/5' },
  { search: /bg-slate-100 dark:bg-black\/40/g, replace: 'bg-black/5 dark:bg-black/40' },
  { search: /border-slate-300 dark:border-white\/10/g, replace: 'border-black/10 dark:border-white/10' },
  { search: /border-slate-200 dark:border-white\/5/g, replace: 'border-black/5 dark:border-white/5' },
  { search: /text-gray-700 dark:text-gray-300/g, replace: 'text-slate-600 dark:text-slate-300' },
  { search: /text-gray-600 dark:text-gray-400/g, replace: 'text-slate-500 dark:text-slate-400' },
  { search: /text-slate-[a-zA-Z0-9\/]+ dark:text-white\/60/g, replace: 'text-slate-600 dark:text-white/60' },
  { search: /text-slate-[a-zA-Z0-9\/]+ dark:text-white\/70/g, replace: 'text-slate-700 dark:text-white/70' }
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
console.log("Fixed classes.");
