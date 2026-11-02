// Verdict-by-verdict comparison of a re-run of the author's round4-mut.mjs with the committed
// round4-mut.json: same ids, same verdicts, same killing tests. Usage: node compare-sweep.mjs <rerun> <committed>
import fs from 'node:fs';
const [rerun, committed] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const byId = r => new Map(r.mutants.map(m => [m.id, m]));
const a = byId(rerun), b = byId(committed), rows = [];
for (const id of new Set([...a.keys(), ...b.keys()])) {
  const x = a.get(id), y = b.get(id);
  rows.push({id, rerun: x?.verdict, committed: y?.verdict, sameVerdict: x?.verdict === y?.verdict, sameKillers: JSON.stringify([...(x?.failed || [])].sort()) === JSON.stringify([...(y?.failed || [])].sort()), restored: x?.restored});
}
const tally = r => r.mutants.reduce((t, m) => ({...t, [m.verdict]: (t[m.verdict] || 0) + 1}), {});
console.log(JSON.stringify({rerunHead: rerun.head, committedHead: committed.head, rerunStatus: [rerun.statusBefore, rerun.statusAfter], rerunBaseline: rerun.baseline.pass + '/' + rerun.baseline.tests,
  counts: {rerun: rerun.mutants.length, committed: committed.mutants.length}, tallies: {rerun: tally(rerun), committed: tally(committed)},
  verdictMismatches: rows.filter(r => !r.sameVerdict), killerMismatches: rows.filter(r => r.sameVerdict && !r.sameKillers).map(r => r.id), allRestored: rows.every(r => r.restored)}, null, 1));
