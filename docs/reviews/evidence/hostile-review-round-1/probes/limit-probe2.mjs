import {openDocument, blankMap, loadBlueprint, createSave, parseSave} from '../../packages/map-core/index.js';
const m = blankMap('Limit'); m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 8, y: 8}];
m.metadata = {note: 'é'.repeat(1700000)};
const exported = openDocument(JSON.stringify(m)).export(), out = {exportUtf8Bytes: new TextEncoder().encode(exported).length, exportUtf16Units: exported.length};
for (const [k, f] of [['loadBlueprint(exportedText)', () => loadBlueprint(exported)], ['loadBlueprint(JSON.parse(exportedText))', () => loadBlueprint(JSON.parse(exported))], ['openDocument(exportedText)', () => openDocument(exported)], ['createSave(exportedText)', () => createSave(exported)]])
  try { f(); out[k] = 'accepted'; } catch (e) { out[k] = (e.code || e.name) + ': ' + e.message.slice(0, 90); }
// Same effect without exotic text: plain ASCII metadata just under the limit.
const a = blankMap('Ascii'); a.starts = m.starts; a.exits = m.exits; a.metadata = {note: 'x'.repeat(3150000)};
const ax = openDocument(JSON.stringify(a)).export();
out.ascii = {inputBytes: JSON.stringify(a).length, exportBytes: ax.length};
try { loadBlueprint(JSON.stringify(a)); out.ascii.loadInput = 'accepted'; } catch (e) { out.ascii.loadInput = e.code; }
try { loadBlueprint(ax); out.ascii.loadExport = 'accepted'; } catch (e) { out.ascii.loadExport = e.code + ': ' + e.message.slice(0, 80); }
try { openDocument(ax); out.ascii.reopenExport = 'accepted'; } catch (e) { out.ascii.reopenExport = e.message.slice(0, 80); }
console.log(JSON.stringify(out, null, 1));
