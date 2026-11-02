// Tools-only input ledger. Never evaluates a reference, game or browser module.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { root, distribution } from './distribution.mjs';
import { moduleReferencesBatch } from './module-references.mjs';

export const FARMYARD_DOOR_REFERENCE_ENTRY = 'examples/farmyard-door-reference.html';
export const FARMYARD_DOOR_REFERENCE_PACKAGE = '@nautilus-engine/map-core';
const mandatory = ['farmyard-door-reference.html', 'farmyard-door-reference.css', 'farmyard-door-reference.js',
  'farmyard-door-reference-host.js', 'farmyard-door-reference-view.js', 'farmyard-door-reference-controls.js',
  'farmyard-door-reference.fixture.json'].map(name => 'examples/' + name);
const requiredPublic = ['/adapters/farmyard/doors', '/adapters/farmyard/doors/three', '/render-effects/three'].map(name => FARMYARD_DOOR_REFERENCE_PACKAGE + name);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = name => name.replaceAll('\\', '/');
const fail = message => { throw Error('Farmyard door reference: ' + message); };
function regular(project, name) {
  if (typeof name !== 'string' || name.includes('\\') || path.posix.normalize(name) !== name || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..')) fail('Unsafe input path: ' + name);
  const file = path.resolve(project, name);
  if (!file.startsWith(project + path.sep)) fail('Input escapes project: ' + name);
  let current = project;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) fail('Linked inputs are unsupported: ' + name);
  }
  if (!fs.lstatSync(file).isFile()) fail('Input must be a regular file: ' + name);
  return fs.readFileSync(file);
}
function local(importer, specifier) {
  if (typeof specifier !== 'string' || !/^(?:\.\/)?[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.(?:m?js|css|json|png|svg|jpe?g|webp)$/.test(specifier)) fail('Only explicit sibling reference files are allowed: ' + importer + ' -> ' + specifier);
  const target = path.posix.join(path.posix.dirname(importer), specifier);
  if (!/^examples\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(target)) fail('Fixture escapes examples: ' + target);
  return target;
}
function attributes(text) {
  const result = Object.create(null);
  for (const match of text.matchAll(/([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (Object.hasOwn(result, name)) fail('Duplicate HTML attribute: ' + name);
    result[name] = match[2] ?? match[3] ?? match[4] ?? null;
  }
  return result;
}
// Conservatively inspect raw source, including strings/templates/comments. This
// bounded fixture scanner may refuse ambiguous text; it must never mask a call
// because a regex literal contains quotes or a template contains interpolation.
function assetCalls(source, importer) {
  const references = [];
  const trivia = /(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r\n|[\r\n]|$))*/.source;
  const quoted = /(['"])([^'"\\\r\n]*)\1/.source;
  const calls = new RegExp('\\b(fetch|new' + trivia + 'URL)' + trivia + '(?:\\?\\.' + trivia + ')?\\(', 'g');
  const literalArgument = new RegExp('^' + trivia + quoted + trivia + '([,)])');
  const meta = 'import' + trivia + '\\.' + trivia + 'meta' + trivia + '\\.' + trivia + 'url';
  const nestedURL = new RegExp('^' + trivia + 'new' + trivia + 'URL' + trivia + '\\(' + trivia + quoted + trivia + ',' + trivia + meta + trivia + '\\)' + trivia + '[,)]');
  const metaEnd = new RegExp('^' + trivia + meta + trivia + '\\)');
  for (const match of source.matchAll(calls)) {
    if (match[0].includes('?.')) fail('Optional/ambiguous resource calls are unsupported: ' + importer);
    const tail = source.slice(match.index + match[0].length), isFetch = match[1] === 'fetch';
    const nested = isFetch && nestedURL.exec(tail);
    if (nested) { references.push(local(importer, nested[2])); continue; }
    const literal = literalArgument.exec(tail);
    if (!literal) fail('Computed/ambiguous fetch/URL resources are unsupported: ' + importer);
    if (!isFetch && (literal[3] !== ',' || !metaEnd.test(tail.slice(literal[0].length)))) fail('Resource URL must use import.meta.url: ' + importer);
    if (/^(?:data:|#)/i.test(literal[2])) continue;
    references.push(local(importer, literal[2]));
  }
  return references;
}

/** Actual Root fixture closure only; projectRoot override supports synthetic tools tests.
 * Relative module imports and literal fetch/new URL assets must be sibling files.
 * Browser-created URLs/workers/eval are deliberately outside this narrow policy.
 */
export function farmyardDoorReferenceClosure({ projectRoot = root } = {}) {
  const project = path.resolve(projectRoot);
  if (fs.realpathSync(project) !== project) fail('Use the canonical project root.');
  const pkg = JSON.parse(regular(project, 'package.json'));
  if (pkg.name !== FARMYARD_DOOR_REFERENCE_PACKAGE || !pkg.exports || typeof pkg.exports !== 'object') fail('Expected the compatibility package manifest.');
  const buffers = new Map(), publicImports = new Set(), links = [], seen = new Set();
  const read = name => { if (!buffers.has(name)) buffers.set(name, regular(project, name)); return buffers.get(name); };
  const html = read(FARMYARD_DOOR_REFERENCE_ENTRY).toString('utf8');
  if (/<base\b/i.test(html)) fail('A base URL would change fixture resource authority.');
  let importMapTag, importMap;
  const seeds = [...mandatory];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs.type === 'importmap') {
      if (importMap) fail('Exactly one import map is required.');
      if (attrs.src !== undefined) fail('External import maps are unsupported.');
      importMap = JSON.parse(match[2]); importMapTag = match[0];
    } else {
      if (attrs.type !== 'module' || !attrs.src || match[2].trim()) fail('Only explicit local module scripts are supported.');
      seeds.push(local(FARMYARD_DOOR_REFERENCE_ENTRY, attrs.src));
    }
  }
  if (!importMap || Object.keys(importMap).some(key => key !== 'imports') || !importMap.imports || Array.isArray(importMap.imports)) fail('Use one explicit imports-only map.');
  for (const [name, value] of Object.entries(importMap.imports)) {
    if (!name.startsWith(FARMYARD_DOOR_REFERENCE_PACKAGE + '/') || name.endsWith('/')) fail('Unexpected import map namespace: ' + name);
    const entry = pkg.exports['.' + name.slice(FARMYARD_DOOR_REFERENCE_PACKAGE.length)];
    if (typeof entry !== 'string' || !entry.startsWith('./') || value !== '../' + entry.slice(2)) fail('Source import map must target a declared public export: ' + name);
    regular(project, entry.slice(2));
  }
  for (const match of html.matchAll(/<(?:a|link)\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]), href = attrs.href;
    if (typeof href !== 'string') continue;
    if (href === 'data:,' || href.startsWith('#')) continue;
    if (href === '../index.html') links.push({ source: href, packagePath: 'README.md', kind: 'home' });
    else if (/^\.\.\/docs\/[A-Za-z0-9_./-]+\.md(?:#[A-Za-z0-9_.-]+)?$/.test(href) && !href.slice(3).split('/').includes('..')) {
      links.push({ source: href, packagePath: href.slice(3).split('#')[0], fragment: href.includes('#') ? '#' + href.split('#')[1] : '', kind: 'guide' });
    } else seeds.push(local(FARMYARD_DOOR_REFERENCE_ENTRY, href));
  }
  let pending = seeds;
  while (pending.length) {
    const batch = [...new Set(pending)].filter(name => !seen.has(name)).sort(); pending = [];
    for (const name of batch) { seen.add(name); read(name); }
    const modules = batch.filter(name => /\.m?js$/.test(name));
    for (const record of moduleReferencesBatch(modules.map(filename => ({ filename, source: read(filename).toString('utf8') })))) {
      for (const specifier of record.specifiers) {
        if (specifier.startsWith('./')) {
          if (!/\.m?js$/.test(specifier)) fail('Relative module imports need an explicit JS extension: ' + specifier);
          pending.push(local(record.filename, specifier));
        } else {
          if (!specifier.startsWith(FARMYARD_DOOR_REFERENCE_PACKAGE + '/') || !Object.hasOwn(importMap.imports, specifier)) fail('Private/undeclared engine import: ' + record.filename + ' -> ' + specifier);
          publicImports.add(specifier);
        }
      }
      pending.push(...assetCalls(read(record.filename).toString('utf8'), record.filename));
    }
    for (const name of batch.filter(name => name.endsWith('.css'))) {
      const css = read(name).toString('utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/@import\s+(['"])([^'"]+)\1/g)) pending.push(local(name, match[2]));
      for (const match of css.matchAll(/url\(\s*(?:(['"])(.*?)\1|([^\s)]+))\s*\)/g)) {
        const url = match[2] ?? match[3]; if (!/^(?:data:|#)/i.test(url)) pending.push(local(name, url));
      }
    }
    if (seen.size > 64 || [...buffers.values()].reduce((n, value) => n + value.length, 0) > 12 * 1024 * 1024) fail('Fixture closure exceeds its reviewed file/byte budget.');
  }
  for (const name of requiredPublic) if (!publicImports.has(name)) fail('Reference must actually use public native door entries: ' + name);
  if (!links.some(link => link.kind === 'guide') || !links.some(link => link.kind === 'home')) fail('Reference guide/home links are missing.');
  const files = [...seen].sort().map(name => ({ path: name, bytes: read(name).length, sha256: hash(read(name)) }));
  const linkedDocuments = [...new Set(links.map(link => link.packagePath))].sort().map(name => {
    const bytes = regular(project, name); return { path: name, bytes: bytes.length, sha256: hash(bytes) };
  });
  return { linkedDocuments, entry: FARMYARD_DOOR_REFERENCE_ENTRY, files, publicImports: [...publicImports].sort(), importMap, importMapTag, links };
}

function toolInputs(project) {
  const directory = path.join(project, 'tools');
  const seeds = ['tools/prepare-farmyard-door-installed.mjs', 'tools/farmyard-door-reference-inputs.mjs',
    'tools/distribution.mjs', 'tools/module-references.mjs', 'tools/art-review-browser.mjs',
    ...fs.readdirSync(directory).filter(name => /(?:farmyard[-_]door|door[-_]reference).*\.mjs$|^check-door-visuals\.mjs$|\.py$/.test(name)).map(name => 'tools/' + name)];
  const seen = new Set(); let pending = seeds;
  while (pending.length) {
    const batch = [...new Set(pending)].filter(name => !seen.has(name)).sort(); pending = [];
    batch.forEach(name => { seen.add(name); regular(project, name); });
    for (const record of moduleReferencesBatch(batch.filter(name => /\.m?js$/.test(name)).map(filename => ({ filename, source: regular(project, filename).toString('utf8') })))) {
      for (const specifier of record.specifiers) {
        if (specifier.startsWith('node:') || specifier.startsWith(FARMYARD_DOOR_REFERENCE_PACKAGE + '/')) continue;
        if (!specifier.startsWith('./') && !specifier.startsWith('../')) fail('Untracked external tool dependency: ' + specifier);
        if (/[\\?#%]/.test(specifier)) fail('Unsupported tool reference: ' + specifier);
        pending.push(path.posix.normalize(path.posix.join(path.posix.dirname(record.filename), specifier)));
      }
    }
    if (seen.size > 1024) fail('Tool input closure exceeds its reviewed bound.');
  }
  return [...seen];
}
export function farmyardDoorReviewInputs() {
  const reference = farmyardDoorReferenceClosure(), compatibility = distribution('compatibility');
  const names = [...new Set([...compatibility.files, 'package.json', ...reference.files.map(file => file.path), ...reference.linkedDocuments.map(file => file.path), ...toolInputs(root)])].sort();
  const files = names.map(name => { const bytes = regular(root, name); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; });
  return { schemaVersion: 1, inputSha256: hash(JSON.stringify(files)), files, reference,
    compatibility: { name: compatibility.name, exports: compatibility.exports, files: compatibility.files } };
}
export function farmyardDoorReviewInputFingerprint() { return farmyardDoorReviewInputs().inputSha256; }

// Hash only plain finite JSON data; never invoke report getters or toJSON hooks.
export function farmyardDoorReviewPayloadHash(value) {
  let nodes = 0; const active = new Set();
  function copy(input, depth) {
    if (++nodes > 500000 || depth > 32) fail('Review payload exceeds its node/depth budget.');
    if (input === null || typeof input === 'boolean' || typeof input === 'string' || typeof input === 'number' && Number.isFinite(input)) return input;
    if (!input || typeof input !== 'object' || active.has(input)) fail('Review payload must be finite acyclic JSON data.');
    const array = Array.isArray(input);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail('Review payload must use plain records.');
    const descriptors = Object.getOwnPropertyDescriptors(input), keys = Reflect.ownKeys(descriptors).filter(key => !(array && key === 'length'));
    if (array && keys.length !== input.length) fail('Sparse/extended review arrays are unsupported.');
    const result = array ? [] : Object.create(null); active.add(input);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length)) fail('Review payload accessors/symbols/hidden fields are unsupported.');
      result[key] = copy(descriptor.value, depth + 1);
    }
    active.delete(input); return result;
  }
  const bytes = JSON.stringify(copy(value, 0));
  if (Buffer.byteLength(bytes) > 16 * 1024 * 1024) fail('Review payload exceeds its byte budget.');
  return hash(bytes);
}
function resultDTO(results) {
  assert.ok(Array.isArray(results) && results.length > 0, 'Missing behavior groups.');
  const names = new Set();
  return results.map(result => {
    assert.ok(typeof result?.name === 'string' && result.name.trim() && result.name.length <= 512, 'Invalid behavior group name.');
    assert.equal(result.status, 'pass', 'A behavior group failed.');
    assert.ok(!names.has(result.name), 'Duplicate behavior group.'); names.add(result.name);
    return { name: result.name, status: result.status };
  });
}
export function farmyardDoorReviewResultsHash(results) {
  // Validate the original records before selecting the deterministic DTO.
  farmyardDoorReviewPayloadHash(results);
  return farmyardDoorReviewPayloadHash(resultDTO(results));
}
export function assertFarmyardDoorReviewReport(report, mode, inputSha256, {
  expectedGroups, minimumCaptures = 1, minimumResources = 1, requiredCaptures = []
} = {}) {
  farmyardDoorReviewPayloadHash(report);
  assert.ok(['source', 'built', 'installed'].includes(mode), 'Unexpected proof mode.');
  assert.equal(report?.mode, mode, 'Unexpected browser proof mode.');
  assert.match(inputSha256, /^[a-f0-9]{64}$/, 'Invalid expected input fingerprint.');
  assert.equal(report.inputSha256, inputSha256, 'Browser proof uses different input bytes.');
  assert.ok(Array.isArray(expectedGroups) && expectedGroups.length > 0 && expectedGroups.every(name => typeof name === 'string' && name.trim()), 'Supply expected named behavior groups.');
  assert.equal(new Set(expectedGroups).size, expectedGroups.length, 'Duplicate expected group.');
  const results = resultDTO(report.results);
  assert.deepEqual(results.map(result => result.name).sort(), [...expectedGroups].sort(), 'Incomplete/unexpected behavior groups.');
  assert.equal(report.resultsSha256, farmyardDoorReviewPayloadHash(results), 'Behavior digest does not bind the result DTO.');
  assert.ok(Object.hasOwn(report, 'projection') && report.projection !== null && typeof report.projection === 'object', 'Missing deterministic authority projection.');
  assert.equal(report.projectionSha256, farmyardDoorReviewPayloadHash(report.projection), 'Final projection digest does not bind its JSON bytes.');
  for (const key of ['errors', 'failedRequests']) assert.ok(Array.isArray(report[key]) && report[key].length === 0, 'Unexpected or missing browser error record.');
  assert.ok(Number.isSafeInteger(minimumResources) && minimumResources >= 1 && Number.isSafeInteger(report.resourceCount) && report.resourceCount >= minimumResources, 'Missing native resource proof.');
  assert.ok(Number.isSafeInteger(minimumCaptures) && minimumCaptures >= 0 && Array.isArray(report.captures) && report.captures.length >= minimumCaptures, 'Missing visual captures.');
  const captures = new Set();
  for (const capture of report.captures) {
    assert.ok(typeof capture?.name === 'string' && capture.name && !captures.has(capture.name), 'Invalid/duplicate capture name.'); captures.add(capture.name);
    assert.ok(typeof capture.file === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]*\.png$/.test(capture.file), 'Unsafe capture filename.');
    assert.match(capture.sha256, /^[a-f0-9]{64}$/, 'Missing capture byte digest.');
  }
  assert.ok(Array.isArray(requiredCaptures) && requiredCaptures.every(name => captures.has(name)), 'Missing required named captures.');
  return { inputSha256, projectionSha256: report.projectionSha256, resultsSha256: report.resultsSha256, results };
}
export function assertFarmyardDoorReviewParity(baseline, installed, inputSha256, options) {
  assert.ok(['source', 'built'].includes(baseline?.mode), 'Use a source/built baseline.');
  const before = assertFarmyardDoorReviewReport(baseline, baseline.mode, inputSha256, options);
  const after = assertFarmyardDoorReviewReport(installed, 'installed', inputSha256, options);
  assert.deepEqual(after.results, before.results, 'Installed behavior groups differ.');
  assert.equal(after.resultsSha256, before.resultsSha256, 'Installed behavior bytes differ.');
  assert.equal(after.projectionSha256, before.projectionSha256, 'Installed authority projection differs.');
  return { inputSha256, modes: [baseline.mode, 'installed'], resultsSha256: after.resultsSha256,
    projectionSha256: after.projectionSha256, sameBehaviorGroups: true, sameFinalProjection: true };
}
