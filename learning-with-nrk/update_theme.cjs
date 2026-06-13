const fs = require('fs');

const replacements = [
  { search: /\bbg-slate-950\b/g, replace: 'bg-slate-50 dark:bg-slate-950' },
  { search: /\bbg-slate-900\b/g, replace: 'bg-white dark:bg-slate-900' },
  { search: /\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
  { search: /\btext-gray-400\b/g, replace: 'text-gray-600 dark:text-gray-400' },
  { search: /\btext-gray-300\b/g, replace: 'text-gray-700 dark:text-gray-300' },
  { search: /\bbg-white\/5\b/g, replace: 'bg-slate-100 dark:bg-white/5' },
  { search: /\border-white\/5\b/g, replace: 'border-slate-200 dark:border-white/5' },
  { search: /\btext-slate-400\b/g, replace: 'text-slate-600 dark:text-slate-400' },
  { search: /\bbg-white\/10\b/g, replace: 'bg-slate-200 dark:bg-white/10' },
  { search: /\border-white\/10\b/g, replace: 'border-slate-300 dark:border-white/10' },
  { search: /\btext-white\/50\b/g, replace: 'text-slate-500 dark:text-white/50' },
  { search: /\btext-white\/60\b/g, replace: 'text-slate-600 dark:text-white/60' },
  { search: /\btext-white\/70\b/g, replace: 'text-slate-700 dark:text-white/70' },
  { search: /\btext-white\/90\b/g, replace: 'text-slate-900 dark:text-white/90' },
  { search: /\bbg-black\/40\b/g, replace: 'bg-slate-100 dark:bg-black/40' },
  { search: /\bbg-black\/30\b/g, replace: 'bg-slate-200 dark:bg-black/30' },
  { search: /\bbg-black\b/g, replace: 'bg-white dark:bg-black' }
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

console.log('Theme classes updated.');
