// Hash every file under a dist folder: node dist-hash.mjs <dist> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [dist, out] = process.argv.slice(2), files = {};
const walk = folder => {
  for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else files[path.relative(dist, file).split(path.sep).join('/')] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
};
walk(dist);
const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : 1));
const digest = createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
fs.writeFileSync(out, JSON.stringify({count: Object.keys(sorted).length, digest, files: sorted}, null, 1));
console.log(Object.keys(sorted).length + ' files, digest ' + digest);
