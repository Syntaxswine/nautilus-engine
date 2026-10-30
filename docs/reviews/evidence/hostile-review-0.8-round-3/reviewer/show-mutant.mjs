// Print one mutant's record from a harness result file.
//   node show-mutant.mjs <result.json> <id prefix>
import fs from 'node:fs';
const [file, prefix] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const m of r.mutants.filter(m => m.id.startsWith(prefix)))
  console.log(JSON.stringify({id: m.id, hooks: m.hooks, runs: m.runs.map(x => ({cmd: x.cmd.slice(0, 70), exit: x.exit, pass: x.pass, fail: x.fail, cancelled: x.cancelled, failing: x.failing, tail: x.tail})), restored: m.restored, status: m.statusAfterRestore, removedNewExport: m.removedNewExport}, null, 1));
