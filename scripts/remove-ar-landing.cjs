const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'translations', 'ar.ts');
let s = fs.readFileSync(p, 'utf8');
const st = s.indexOf('  "_landing_removed": {');
if (st === -1) {
  console.log('ar _landing_removed not found');
  process.exit(1);
}
let d = 0;
let i = st;
for (; i < s.length; i++) {
  if (s[i] === '{') d++;
  else if (s[i] === '}') d--;
  if (d === 0 && i > st) break;
}
const n = s.indexOf('  "leave": {', i + 1);
s = s.slice(0, st) + s.slice(n);
fs.writeFileSync(p, s);
console.log('ar landing removed');
