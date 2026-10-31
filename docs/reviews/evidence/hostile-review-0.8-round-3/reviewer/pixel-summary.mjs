// One line per pixel-probe case: differing pixels, max delta, strong-oracle ties,
// the answer's classes, 8-connected components, counts, repeat identity.
//   node pixel-summary.mjs <result.json> [...]
import fs from 'node:fs';
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('\n# ' + file.split(/[\\/]/).pop() + ' A ' + (r.trees.a.head || '').slice(0, 7) + ' B ' + (r.trees.b.head || '(built copy)').slice(0, 7) + ' ' + r.browser + (r.reducedMotion ? ' reduced-motion' : '') + (r.pageErrors ? ' PAGE ERRORS ' + r.pageErrors.length : ''));
  for (const c of r.cases) {
    const k = c.r3 || {}, cls = k.classes || {};
    console.log([c.name.padEnd(44), String(c.differing).padStart(7) + ' px', 'max ' + c.maxDelta, 'strong ties ' + c.strongExplained, 'classes t/e/s/n ' + [cls.tie, cls.edge, cls.shading, cls.neither].join('/'), 'components ' + k.components + ' largest ' + (k.largestComponents || []).join('/'), 'in blobs>=4: ' + k.pixelsInComponentsOf4OrMore,
      'calls ' + c.counts.a.calls + '/' + c.counts.b.calls, 'tri ' + (c.counts.a.triangles / 1e6).toFixed(2) + 'M/' + (c.counts.b.triangles / 1e6).toFixed(2) + 'M', 'repeat ' + c.repeatIdentical.a + '/' + c.repeatIdentical.b, c.doors ? 'door px ' + c.doors.differingWithinOnePixelOfDoors + '/' + c.doors.differing : ''].join('  '));
  }
}
