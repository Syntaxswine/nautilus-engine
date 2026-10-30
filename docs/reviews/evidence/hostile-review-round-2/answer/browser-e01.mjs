// MF1's browser half: wire a capability bypass into the page (editor.js), rebuild, and run the
// browser acceptance. It must fail by its call-count assertion, quickly, not by a 30 s timeout.
// editor.js is restored and the bundle rebuilt in a finally. Usage: node browser-e01.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = process.argv[2], file = path.join(root, 'apps/editor/editor.js'), original = fs.readFileSync(file);
const find = '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame';
const replace = '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}';
const node = (script, label) => { const t0 = Date.now(), r = spawnSync(process.execPath, [script], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000, windowsHide: true});
  const text = (r.stdout || '') + (r.stderr || '');
  return {label, exit: r.status, seconds: Math.round((Date.now() - t0) / 1000), error: (/(?:AssertionError|Error)[^\n]*/.exec(text) || [''])[0].slice(0, 220)}; };
if (original.toString('utf8').split(find).length !== 2) throw Error('needle');
const out = {};
try {
  fs.writeFileSync(file, original.toString('utf8').replace(find, replace));
  out.build = node('tools/build.mjs', 'build with E01');
  out.acceptance = node('tools/review-engine-integration.mjs', 'review:integration with E01');
} finally {
  fs.writeFileSync(file, original);
  out.rebuild = node('tools/build.mjs', 'rebuild after restore');
}
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
