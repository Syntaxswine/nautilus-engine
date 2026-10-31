// The shader-patch edits must put the two characters backslash-n (and backslash-t) into the
// JavaScript source, as round 4's q7.json does, not a real newline inside a string literal.
import fs from 'node:fs';
for (const file of process.argv.slice(2)) {
  const edits = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const x of edits) x.replace = x.replace.replace('\n\t', '\\n\\t');
  fs.writeFileSync(file, JSON.stringify(edits));
}
