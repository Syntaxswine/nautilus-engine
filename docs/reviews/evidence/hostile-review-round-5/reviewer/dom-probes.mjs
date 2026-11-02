// The page double's DOM rules against the real browser. The same probe functions run (a) in headless
// Edge on an empty page and (b) on the page double from tests/editor-host-bridge.test.mjs, whose page()
// is evaluated from the test file's own text with a no-op bridge. Each probe returns a log of what its
// observers saw, or the error it threw. Usage: node dom-probes.mjs <checkout> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]);

// Each probe gets {doc, MO, tick} and returns a JSON-able result. tick() lets queued records deliver.
const PROBES = {
  'P01 disabled=true twice, then false twice': async ({doc, MO, tick}) => {
    const b = doc.createElement('button'); doc.body.append(b); const seen = [];
    new MO(r => seen.push(...r.map(x => x.attributeName))).observe(b, {attributes: true, attributeFilter: ['disabled']});
    b.disabled = true; b.disabled = true; await tick(); seen.push('|'); b.disabled = false; b.disabled = false; await tick();
    return seen;
  },
  'P02 title set to the same value twice': async ({doc, MO, tick}) => {
    const b = doc.createElement('button'); doc.body.append(b); const seen = [];
    new MO(r => seen.push(...r.map(x => x.attributeName))).observe(b, {attributes: true});
    b.title = 'x'; b.title = 'x'; await tick(); return seen;
  },
  'P03 textContent vs characterData, then a text node data write': async ({doc, MO, tick}) => {
    const p = doc.createElement('p'); doc.body.append(p); const seen = [];
    new MO(r => seen.push(...r.map(x => x.type))).observe(p, {characterData: true, subtree: true});
    p.textContent = 'Send'; await tick(); seen.push('|'); p.childNodes[0].data = 'Send now'; await tick(); seen.push(p.textContent);
    return seen;
  },
  'P04 textContent empty on empty, then the same text twice': async ({doc, MO, tick}) => {
    const p = doc.createElement('p'); doc.body.append(p); const seen = [];
    new MO(r => seen.push(...r.map(x => x.type))).observe(p, {childList: true});
    p.textContent = ''; await tick(); seen.push('|'); p.textContent = 'a'; p.textContent = 'a'; await tick(); seen.push('|'); p.textContent = ''; await tick();
    return seen;
  },
  'P05 attributeOldValue implies attributes': async ({doc, MO, tick}) => {
    const b = doc.createElement('button'); doc.body.append(b); const seen = [];
    new MO(r => seen.push(...r.map(x => x.attributeName))).observe(b, {attributeOldValue: true}); b.title = 't'; await tick(); return seen;
  },
  'P06 characterDataOldValue implies characterData': async ({doc, MO, tick}) => {
    const p = doc.createElement('p'); doc.body.append(p); p.textContent = 'a'; const seen = [];
    new MO(r => seen.push(...r.map(x => x.type))).observe(p, {characterDataOldValue: true, subtree: true}); p.childNodes[0].data = 'b'; await tick(); return seen;
  },
  'P07 subtree alone throws': async ({doc, MO}) => {
    try { new MO(() => {}).observe(doc.body, {subtree: true}); return 'accepted'; } catch (e) { return e.name; }
  },
  'P08 attributeFilter as a string': async ({doc, MO, tick}) => {
    const b = doc.createElement('button'); doc.body.append(b); const seen = [];
    try { new MO(r => seen.push(...r.map(x => x.attributeName))).observe(b, {attributes: true, attributeFilter: 'disabled'}); } catch (e) { return 'throws ' + e.name; }
    b.disabled = true; b.title = 'x'; await tick(); return ['accepted', ...seen];
  },
  'P09 observe(null)': async ({MO}) => {
    try { new MO(() => {}).observe(null, {childList: true}); return 'accepted'; } catch (e) { return 'throws ' + e.name; }
  },
  'P10 attributes false with a filter throws': async ({doc, MO}) => {
    try { new MO(() => {}).observe(doc.body, {attributes: false, attributeFilter: ['x']}); return 'accepted'; } catch (e) { return 'throws ' + e.name; }
  },
  'P11 delivery order: creation order, whatever the write order': async ({doc, MO, tick}) => {
    const one = doc.createElement('i'), two = doc.createElement('b'); doc.body.append(one, two); const log = [];
    new MO(() => log.push('A')).observe(one, {attributes: true}); new MO(() => log.push('B')).observe(two, {attributes: true});
    two.title = '1'; one.title = '1'; await tick(); return log;
  },
  'P12 a record for an observer that was not pending: same pass, or a later microtask': async ({doc, MO, tick}) => {
    const one = doc.createElement('i'), two = doc.createElement('b'); doc.body.append(one, two); const log = [];
    new MO(() => {log.push('A'); Promise.resolve().then(() => log.push('promise')); two.title = 'x';}).observe(one, {attributes: true});
    new MO(() => log.push('B')).observe(two, {attributes: true});
    one.title = '1'; await tick(); return log;
  },
  'P13 a finite cascade of 12 self-writes': async ({doc, MO, tick, settle}) => {
    const b = doc.createElement('button'); doc.body.append(b); let n = 0;
    new MO(() => {if (++n < 12) b.title = String(n);}).observe(b, {attributes: true});
    b.title = '0'; await tick(); try { if (settle) await settle(); return 'settled after ' + n + ' deliveries'; } catch (e) { return 'fails: ' + e.message.slice(0, 80) + ' (' + n + ' deliveries)'; }
  },
  'P14 hidden reflects; setting it twice records twice': async ({doc, MO, tick}) => {
    const p = doc.createElement('p'); doc.body.append(p); const seen = [];
    new MO(r => seen.push(...r.map(x => x.attributeName + ':' + x.target.getAttribute('hidden')))).observe(p, {attributes: true});
    p.hidden = true; p.hidden = true; await tick(); seen.push('|'); p.hidden = false; await tick(); return seen;
  },
  'P15 classList.toggle with and without a change': async ({doc, MO, tick}) => {
    const b = doc.body, seen = [];
    const mo = new MO(r => seen.push(...r.map(x => x.attributeName))); mo.observe(b, {attributes: true});
    b.classList.toggle('k', false); await tick(); seen.push('|'); b.classList.toggle('k', true); await tick(); seen.push('|'); b.classList.toggle('k', true); await tick(); b.classList.toggle('k', false); mo.disconnect();
    return seen;
  },
  'P16 append moves a node: records on the old and new parent': async ({doc, MO, tick}) => {
    const a = doc.createElement('div'), b = doc.createElement('div'), x = doc.createElement('span'); doc.body.append(a, b); a.append(x); const seen = [];
    new MO(r => seen.push(...r.map(item => item.target === a ? 'old' : item.target === b ? 'new' : '?'))).observe(doc.body, {childList: true, subtree: true});
    b.append(x); await tick(); return seen;
  },
  'P17 a node removed from an observed subtree keeps reporting until delivery (transient observer)': async ({doc, MO, tick}) => {
    const box = doc.createElement('div'), x = doc.createElement('span'); doc.body.append(box); box.append(x); const seen = [];
    new MO(r => seen.push(...r.map(item => item.type))).observe(box, {childList: true, attributes: true, subtree: true});
    box.textContent = ''; x.title = 'after removal'; await tick(); return seen;
  },
  'P18 observing the document sees the body subtree': async ({doc, MO, tick}) => {
    const seen = []; const mo = new MO(r => seen.push(...r.map(item => item.type))); mo.observe(doc, {childList: true, subtree: true});
    doc.body.append(doc.createElement('em')); await tick(); mo.disconnect(); return seen;
  },
  'P19 takeRecords exists': async ({MO}) => typeof new MO(() => {}).takeRecords,
  'P20 setAttribute upper case on an HTML element': async ({doc, MO, tick}) => {
    const b = doc.createElement('button'); doc.body.append(b); const seen = [];
    new MO(r => seen.push(...r.map(x => x.attributeName))).observe(b, {attributeFilter: ['disabled']}); b.setAttribute('Disabled', ''); await tick();
    return [...seen, 'disabled=' + b.disabled];
  },
  'P21 disabled on a p element': async ({doc}) => {const p = doc.createElement('p'); p.disabled = true; return [p.disabled, p.getAttribute('disabled')];},
  'P22 className reflects class': async ({doc}) => {const d = doc.createElement('dialog'); d.className = 'k'; return d.getAttribute('class');},
};

async function inBrowser() {
  const require = createRequire(import.meta.url);
  let playwright; try { playwright = require('playwright'); } catch { playwright = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'))('playwright'); }
  const browser = await playwright.chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage(); const results = {}, version = browser.version();
    for (const [name, probe] of Object.entries(PROBES)) {
      await page.setContent('<!doctype html><html><body></body></html>');
      results[name] = await page.evaluate(async source => {
        const probe = (0, eval)('(' + source + ')');
        const tick = () => new Promise(resolve => setTimeout(resolve, 0));
        try { return await probe({doc: document, MO: MutationObserver, tick}); } catch (e) { return 'error ' + e.name + ': ' + e.message; }
      }, probe.toString());
    }
    return {version, results};
  } finally { await browser.close(); }
}

async function inDouble() {
  const text = fs.readFileSync(path.join(root, 'tests/editor-host-bridge.test.mjs'), 'utf8');
  const from = text.indexOf('const LOOP = 10'), to = text.indexOf('const editorMap');
  if (from < 0 || to < 0) throw Error('The double was not found in the test file');
  const stubTest = {afterEach() {}};
  const makePage = new Function('test', 'runBridge', 'BRIDGE_IMPORTS', 'LIBRARIES', text.slice(from, to) + '\nreturn page;')(stubTest, () => {}, {}, []);
  const results = {};
  for (const [name, probe] of Object.entries(PROBES)) {
    const ui = await makePage();
    const tick = () => new Promise(resolve => setImmediate(resolve));
    try { results[name] = await probe({doc: ui.document, MO: ui.MutationObserver, tick, settle: ui.settle}); } catch (e) { results[name] = 'error ' + e.name + ': ' + e.message; }
    try { await ui.settle(); } catch (e) { results[name] = [].concat(results[name], 'settle: ' + e.message.slice(0, 80)); }
  }
  return {results};
}

const browser = await inBrowser(), double = await inDouble();
const rows = Object.keys(PROBES).map(name => ({probe: name, browser: browser.results[name], double: double.results[name],
  agree: JSON.stringify(browser.results[name]) === JSON.stringify(double.results[name])}));
const out = {browser: browser.version, testFileSha: (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(path.join(root, 'tests/editor-host-bridge.test.mjs'))).digest('hex'), rows};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const row of rows) console.log((row.agree ? 'same ' : 'DIFF ') + row.probe + '\n   browser: ' + JSON.stringify(row.browser) + '\n   double:  ' + JSON.stringify(row.double));
