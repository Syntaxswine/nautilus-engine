// Render the mutant table for the report from mutants.json (verdicts and killing tests are
// taken from the sweep, never retyped). Usage: node table.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const r = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/r2/mutants.json'), 'utf8'));
const short = {
  'wall and save versions, unsafe JSON, options and bear clearance have actionable diagnostics': 'bear clearance (aim)',
  'loading and saving return the authored JSON, not the editor-normalized copy': 'authored JSON (aim)',
  'imported maps keep the 32-building limit that the authoring tools apply': '32-building limit (aim)',
  'the game handoff never calls a host that lacks an authored feature': 'never calls (aim)',
  'a host that declares every authored feature receives exactly one validated copy': 'one validated copy (aim)',
  'the handoff refuses a missing host, a block and a malformed adapter before any call': 'refuses before any call (aim)',
};
const where = {
  'A-M05': 'adapter `:157`', 'A-M05b': 'adapter `:157`', 'A-M14': 'persistence `:51`', 'A-M18': 'prefab-core `:39`', 'A-M18b': 'prefab-core `:39`',
  'A-M16': 'handoff `:15-16`', 'A-M16a': 'handoff `:15`', 'A-M16b': 'handoff `:16`', 'A-M16c': 'handoff `:16`', 'A-M16d': 'handoff `:17`',
  C01: 'adapter `:157`', C02: 'adapter `:157`', C03: 'adapter `:157`', C04: 'adapter `:157`', C05: 'adapter `:157`', C06: 'adapter `:156`', C07: 'adapter `:157`', C08: 'adapter `:157`',
  C09: 'adapter `:8`', C10: 'adapter `:8`', C11: 'adapter `:157`', C12: 'adapter `:157`', C13: 'adapter `:155`', C14: 'adapter `:155`', C15: 'adapter `:155`', C16: 'adapter `:155`', C17: 'adapter `:155`',
  P00: 'persistence `:51`', P01: 'persistence `:95`', P02: 'persistence `:76`', P03: 'persistence `:51`', P04: 'persistence `:51`',
  B01: 'prefab-core `:39`', B02: 'prefab-core `:10`', B03: 'prefab-core `:39`', B04: 'prefab-core `:39`', B05: 'prefab-core `:39` + prefab-document `:9`',
  H00: 'handoff `:15`', H01: 'handoff `:14`', H02: 'handoff `:17`', H03: 'handoff `:16`', H04: 'handoff `:16`', H05: 'handoff `:7`', H06: 'handoff `:13`', H07: 'handoff `:11`',
  E01: 'editor `:21`', E02: 'editor `:19`', E03: 'editor `:21`', E04: 'editor `:21`',
};
const note = {
  C01: 'Corner witness falsely refused', C02: 'Corner witness accepted; Tinderbox then fails at start-up', C03: 'Spawn beside a vertical wall, off its centre, accepted',
  C04: 'Spawn beside an off-centre horizontal wall accepted', C06: 'Backward horizontal wall misread', C07: 'Spawn beside a horizontal wall accepted',
  C09: 'Face 0.58 m falsely refused', C10: 'Face 0.545 m accepted', C13: 'Near wall listed first ignored', C14: 'Top-row spawn accepted', C15: 'Right-column spawn accepted',
  C16: 'Bottom-row spawn accepted', C17: 'Bottom-row spawn accepted', P00: 'Neutral control: must survive', P01: 'Loading a save mints identities; two loads differ',
  B04: '33 buildings accepted under the combined catalogue', B05: '33 buildings accepted by parseMap, validateMap, prefabErrors', H00: 'Neutral control: must survive',
  H01: 'Map failing validate() handed to the host', H02: 'A class-based host breaks', H03: 'Silent host treated as wall-run capable', H04: 'Silent host treated as prefab capable',
  H05: "null gets the engine's TypeError, not the message", E01: 'Capability checks bypassed; see MF1', E02: 'Host without openMap connects', E03: 'sendToGame(json) sends the current document',
  E04: 'sendToGame() with no argument fails',
};
const rows = r.mutants.map(m => {
  const [id, ...rest] = m.id.split(' ');
  const aimed = m.failed.map(n => short[n]).filter(Boolean);
  const by = m.verdict !== 'KILLED' ? '' : m.failed.length === 1 ? short[m.failed[0]] || m.failed[0] : m.failed.length + ' tests' + (aimed.length ? ', including ' + aimed.join(', ') : ', all pre-existing');
  return `| ${id} | ${rest.join(' ')} | ${where[id] || ''} | ${m.verdict === 'SURVIVED' ? '**SURVIVED**' : m.verdict} ${m.pass}/${m.tests} | ${by || note[id] || ''} |`;
});
console.log(`baseline ${r.baseline.verdict} ${r.baseline.pass}/${r.baseline.tests}; status after: ${JSON.stringify(r.statusAfter)}; all restored: ${r.mutants.every(m => m.restored)}`);
console.log('| ID | Mutation | Where | Suite (pass/tests) | Killed by, or what the survivor does |\n| --- | --- | --- | --- | --- |\n' + rows.join('\n'));
