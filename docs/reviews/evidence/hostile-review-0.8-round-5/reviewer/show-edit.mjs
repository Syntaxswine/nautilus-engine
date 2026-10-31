// Prints each edit's replace text around 'dithering' with every character visible (JSON-quoted).
import fs from 'node:fs';
for (const file of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    const at = x.replace.indexOf('dithering_fragment>\'');
    console.log(file.split(/[\\/]/).pop(), JSON.stringify(at < 0 ? x.replace.slice(0, 120) : x.replace.slice(at, at + 60)), 'newlines:', (x.replace.match(/\n/g) || []).length, 'backslashes:', (x.replace.match(/\\/g) || []).length);
  }
}
