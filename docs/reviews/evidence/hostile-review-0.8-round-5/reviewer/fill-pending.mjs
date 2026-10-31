// Fill review.md's placeholders from a JSON map {marker: text}; each marker must occur exactly once.
import fs from 'node:fs';
const [file, mapFile] = process.argv.slice(2), map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
let t = fs.readFileSync(file, 'utf8');
for (const [marker, text] of Object.entries(map)) {
  const needle = '[PENDING:' + marker + ']', n = t.split(needle).length - 1;
  if (n !== 1) throw Error(needle + ' occurs ' + n + ' times');
  t = t.replace(needle, () => text);
}
fs.writeFileSync(file, t);
console.log('filled ' + Object.keys(map).length + '; left: ' + (t.match(/\[PENDING:[^\]]+\]/g) || []).join(' '));
