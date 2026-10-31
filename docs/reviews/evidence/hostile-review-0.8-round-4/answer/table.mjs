// Ratios A/B (above 1: B faster) per map and view from a bench result: assets only and whole frame.
import fs from 'node:fs';
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8')); console.log('## ' + file.split(/[\/]/).pop() + '  a=' + (r.trees.a.status || '').slice(0, 60) + ' b=' + (r.trees.b.status || '').slice(0, 60));
  const f = v => v ? '×' + v.median.toFixed(2) + ' (' + v.min.toFixed(2) + '–' + v.max.toFixed(2) + ')' : '—';
  for (const kind of ['assets', 'whole']) {
    console.log('| ' + kind + ' | overview | close | far | cutaway |');
    for (const row of r.summary) {
      const cell = view => {const v = row.views[kind === 'assets' ? view + ':assets' : view]; return v ? f(v.speedup) + ' ' + v.totalMs.a.toFixed(2) + '→' + v.totalMs.b.toFixed(2) : '—';};
      console.log('| ' + row.map + ' | ' + ['overview', 'close', 'far', 'cutaway'].map(cell).join(' | ') + ' |');
    }
  }
}
