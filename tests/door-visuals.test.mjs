import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as T from '../packages/render-effects/three.js';
import { doorFootprint } from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/interactions.js';
import { createFarmyardDoorPresentation, FARMYARD_DOOR_VISUAL_SOURCE as SOURCE,
  FARMYARD_DOOR_VISUAL_RESOURCE_PATHS as PATHS, farmyardDoorVisualResourceURLs } from '../packages/door-visuals/three.js';
import { checkDoorVisuals } from '../tools/check-door-visuals.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = 'vendor/farmyard-door-visuals/' + SOURCE.commit + '/';
const evidence = JSON.parse(fs.readFileSync(new URL('../' + snapshot + 'provenance.json', import.meta.url)));
const rawView = fs.readFileSync(new URL('../' + snapshot + SOURCE.reference, import.meta.url), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-7, actual + ' != ' + expected);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tracked = () => { const texture = new T.Texture(); let disposals = 0; texture.addEventListener('dispose', () => disposals++); return { texture, get disposals() { return disposals; } }; };
const turn = () => new Promise(resolve => setImmediate(resolve));
const door = (axis = 'e', swing = 1, open = false) => ({ id: 'source-door', kind: 'door', edge: axis + ':20:20',
  x: 20 + (axis === 'e' ? .5 : 0), y: 20 + (axis === 's' ? .5 : 0), swing, open });
const collider = object => ({ id: object.id, interactionId: object.id, kind: 'wall', ...doorFootprint(object), z0: 0 });
const frame = (object = door(), known = true, visible = true) => ({ collider: collider(object), known, visible });
const options = extra => ({ ...frame(), loadTexture: async () => new T.Texture(), ...extra });
function bounds(mesh, box) {
  const bound = new T.Box3().setFromObject(mesh);
  for (const [actual, expected] of [[bound.min.x, box.x0], [bound.max.x, box.x1], [bound.min.z, box.y0],
    [bound.max.z, box.y1], [bound.min.y, 0], [bound.max.y, 2]]) near(actual, expected);
}
function sample(visual) { return { diagnostics: visual.diagnostics(), position: visual.leaf.position.toArray(), scale: visual.leaf.scale.toArray(),
  visible: visual.leaf.visible, color: visual.leaf.material.color.getHex(), textureVersion: visual.leaf.material.map.version }; }

// Execute the byte-preserved mixed view body with explicit rendering/data imports.
// Only module declarations and import.meta.url are bridged; its class is unchanged.
// Mission/clue behavior and resident-window selection are outside this door proof.
function originalView() {
  const imports = rawView.match(/^import .*;$/gm); assert.equal(imports.length, 6);
  const text = rawView.replace(/^import .*;\r?\n/gm, '').replace('export class InteractionScenery', 'class InteractionScenery')
    .replaceAll('import.meta.url', JSON.stringify(new URL('../' + snapshot + SOURCE.reference, import.meta.url).href)) + '\nInteractionScenery;';
  const art = Object.fromEntries(evidence.deferred.chestPaints.map(record => [record.id, {
    file: record.path.split('/aft/assets/environment/')[1], crop: record.crop
  }]));
  return vm.runInNewContext(text, { T, PROP_ART: art, doorFootprint, URL,
    missionForState() { throw Error('Door proof must not invoke mission rules'); },
    clueAnchorHeight() { throw Error('Door proof must not invoke clue placement'); },
    blockWindow: () => ({ x: 0, y: 0, w: 100, h: 100 }), pointInWorldRect: () => true });
}
function sourceState(object, known = true, visible = true) {
  const cells = [Math.floor(object.x) + ',' + Math.floor(object.y), Math.ceil(object.x) + ',' + Math.ceil(object.y)];
  return { interactables: [object], units: [], solo: {}, seen: new Set(known ? cells : []), visible: new Set(visible ? cells : []) };
}

test('native evidence preserves both original byte streams, deferred closure hashes, MIT and one shared Three', () => {
  const result = checkDoorVisuals(root);
  assert.equal(result.originalFiles, 2); assert.equal(result.staticReferenceModules, 17); assert.equal(result.duplicateThreeModules, 0);
  assert.equal(SOURCE.commit, evidence.commit); assert.equal(SOURCE.presentationOnly, true);
  const png = fs.readFileSync(new URL(farmyardDoorVisualResourceURLs().wood));
  assert.equal(png.length, SOURCE.wood.bytes); assert.equal(sha(png), SOURCE.wood.sha256);
  assert.ok(PATHS.wood.endsWith(SOURCE.wood.originalPath));
  assert.ok(Object.isFrozen(SOURCE.nativeMetres) && Object.isFrozen(SOURCE.material) && Object.isFrozen(PATHS));
  assert.throws(() => { SOURCE.material.roughness = .1; }, TypeError);
});

test('both axes and both swings match the original door view at closed/open/closed endpoints', async () => {
  const Original = originalView();
  for (const axis of ['e', 's']) for (const swing of [-1, 1]) {
    const object = door(axis, swing), rawTextures = [], loader = { load(_url, loaded) {
      const value = tracked(); value.texture.image = { width: 2048, height: 2048 }; rawTextures.push(value);
      loaded?.(value.texture); return value.texture;
    } };
    const source = new Original(sourceState(object), { loader }), visual = await createFarmyardDoorPresentation(options(frame(object)));
    try {
      assert.equal(visual.root instanceof T.Group, true); assert.equal(visual.leaf instanceof T.Mesh, true);
      assert.equal(visual.root.children.length, 1); assert.equal(visual.leaf.geometry.index.count / 3, 12);
      assert.equal(visual.leaf.material instanceof T.MeshStandardMaterial, true);
      for (const open of [false, true, false]) {
        object.open = open; source.update(sourceState(object)); visual.update(frame(object));
        const leaf = source.records.get(object.id).leaf;
        bounds(visual.root, collider(object));
        assert.deepEqual(visual.leaf.position.toArray(), leaf.position.toArray());
        assert.deepEqual(visual.leaf.scale.toArray(), leaf.scale.toArray());
        assert.equal(visual.leaf.rotation.y, 0);
        assert.equal(visual.leaf.material.color.getHex(), leaf.material.color.getHex());
        assert.equal(visual.leaf.material.roughness, leaf.material.roughness);
        assert.equal(visual.leaf.material.metalness, leaf.material.metalness);
        assert.equal(visual.leaf.castShadow, leaf.castShadow); assert.equal(visual.leaf.receiveShadow, leaf.receiveShadow);
        assert.equal(visual.leaf.userData.interactionId, object.id);
        assert.equal(visual.leaf.material.map.colorSpace, T.SRGBColorSpace);
      }
    } finally { source.dispose(); visual.dispose(); }
    assert.ok(rawTextures.every(value => value.disposals === 1));
  }
});

test('fog uses original remembered visibility without tinting or allocating on quiet updates', async () => {
  const Original = originalView(), object = door(), source = new Original(sourceState(object), { loader: { load: () => new T.Texture() } });
  const visual = await createFarmyardDoorPresentation(options()), geometry = visual.leaf.geometry, material = visual.leaf.material, paint = material.map;
  try {
    const before = sample(visual), version = material.version, positionSet = visual.leaf.position.set, scaleSet = visual.leaf.scale.set;
    let writes = 0; visual.leaf.position.set = function(...args) { writes++; return positionSet.apply(this, args); };
    visual.leaf.scale.set = function(...args) { writes++; return scaleSet.apply(this, args); };
    for (let i = 0; i < 12; i++) assert.equal(visual.update(frame(object)), false);
    assert.equal(writes, 0); assert.deepEqual(sample(visual), before);
    for (const [known, visible] of [[true, false], [false, false], [false, true], [true, true]]) {
      source.update(sourceState(object, known, visible)); visual.update(frame(object, known, visible));
      assert.equal(visual.leaf.visible, source.records.get(object.id).leaf.visible);
      assert.equal(material.color.getHex(), 0xb5ad86); assert.equal(material.version, version);
      assert.equal(visual.leaf.geometry, geometry); assert.equal(visual.leaf.material, material); assert.equal(material.map, paint);
    }
    assert.equal(visual.diagnostics().poseUpdates, 1);
  } finally { source.dispose(); visual.dispose(); }
});

test('invalid poses and identities reject before loader work or any existing visual mutation', async () => {
  let loads = 0;
  const bad = frame(); bad.collider.x1 += .2;
  await assert.rejects(createFarmyardDoorPresentation({ ...bad, loadTexture() { loads++; } }), { code: 'INVALID_DOOR_VISUAL', path: '/frame/collider' });
  assert.equal(loads, 0);
  const visual = await createFarmyardDoorPresentation(options()), before = sample(visual);
  try {
    const cases = [
      { ...frame(), known: 1 }, { ...frame(), visible: 'yes' },
      ...[{ height: 1.65 }, { z0: 1 }, { x0: NaN }, { x1: Infinity }, { x1: 99 }, { kind: 'door' }, { interactionId: 'different' }, { id: 'different', interactionId: 'different' }]
        .map(change => ({ ...frame(), collider: { ...frame().collider, ...change } }))
    ];
    const accessor = frame(); Object.defineProperty(accessor.collider, 'x0', { get() { throw Error('Getter ran'); }, enumerable: true });
    cases.push(accessor);
    for (const value of cases) {
      assert.throws(() => visual.update(value), { code: 'INVALID_DOOR_VISUAL' }); assert.deepEqual(sample(visual), before);
    }
    const input = frame(door('e', -1, true)); Object.freeze(input.collider); Object.freeze(input);
    assert.equal(visual.update(input), true); bounds(visual.root, input.collider);
  } finally { visual.dispose(); }
});

test('borrowed paint is privately copied; owned leaf resources dispose once and retained scene resources survive', async () => {
  const paint = tracked(); paint.texture.colorSpace = T.LinearSRGBColorSpace;
  paint.texture.repeat.set(.4, .6); paint.texture.offset.set(.1, .2);
  const retainedMaterial = new T.MeshStandardMaterial({ map: paint.texture }), retainedGeometry = new T.BoxGeometry();
  let retainedDisposals = 0; retainedMaterial.addEventListener('dispose', () => retainedDisposals++); retainedGeometry.addEventListener('dispose', () => retainedDisposals++);
  const retained = new T.Mesh(retainedGeometry, retainedMaterial), scene = new T.Group(); scene.add(retained);
  const visual = await createFarmyardDoorPresentation({ ...frame(), texture: paint.texture, loadTexture() { throw Error('Borrowed paint must not load'); } });
  scene.add(visual.root);
  const privatePaint = visual.leaf.material.map, geometry = visual.leaf.geometry, material = visual.leaf.material; let privateDisposals = 0;
  for (const resource of [privatePaint, geometry, material]) resource.addEventListener('dispose', () => privateDisposals++);
  assert.notEqual(privatePaint, paint.texture); assert.equal(privatePaint.colorSpace, T.SRGBColorSpace);
  assert.equal(paint.texture.colorSpace, T.LinearSRGBColorSpace);
  assert.deepEqual(paint.texture.repeat.toArray(), [.4, .6]); assert.deepEqual(paint.texture.offset.toArray(), [.1, .2]);
  visual.dispose(); visual.dispose();
  assert.equal(privateDisposals, 3); assert.equal(paint.disposals, 0); assert.equal(retainedDisposals, 0);
  assert.deepEqual(scene.children, [retained]); assert.equal(visual.root.parent, null);
  assert.equal(visual.diagnostics().disposed, true); assert.throws(() => visual.update(frame()), /disposed/);
  retainedMaterial.dispose(); retainedGeometry.dispose(); paint.texture.dispose();
});

test('two provider instances share only borrowed source image and have independent disposal and poses', async () => {
  const input = tracked(), a = await createFarmyardDoorPresentation({ ...frame(), texture: input.texture }),
    b = await createFarmyardDoorPresentation({ ...frame(), texture: input.texture });
  try {
    assert.notEqual(a.leaf.geometry, b.leaf.geometry); assert.notEqual(a.leaf.material, b.leaf.material); assert.notEqual(a.leaf.material.map, b.leaf.material.map);
    const before = sample(b); a.update(frame(door('e', 1, true))); a.dispose();
    assert.deepEqual(sample(b), before); assert.equal(input.disposals, 0);
  } finally { a.dispose(); b.dispose(); input.texture.dispose(); }
});

test('custom loading uses declared resource URL and disposes late owned results after cancellation', async () => {
  const pending = deferred(), started = deferred(), controller = new AbortController(); let received;
  const task = createFarmyardDoorPresentation(options({ signal: controller.signal,
    resolveResource(key, url) { assert.equal(key, 'wood'); assert.ok(url.endsWith('wood-factory-v2.png')); return 'https://assets.example/wood.png'; },
    loadTexture(url, context) { received = { url, context }; started.resolve(); return pending.promise; }
  }));
  await started.promise; controller.abort(); await assert.rejects(task, { name: 'AbortError' });
  assert.equal(received.url, 'https://assets.example/wood.png'); assert.equal(received.context.signal.aborted, true);
  const late = tracked(); pending.resolve(late.texture); await turn(); assert.equal(late.disposals, 1);
});

test('borrowed loader failure disposes its owned placeholder; synchronous callbacks and duplicate callbacks are safe', async () => {
  const failed = tracked(), failure = Error('Unavailable'), loader = { load(_url, _loaded, _progress, error) { queueMicrotask(() => error(failure)); return failed.texture; } };
  await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: undefined, loader })), /Cannot load Farmyard door paint/);
  assert.equal(failed.disposals, 1);
  const input = tracked(); let callback, loaderDisposals = 0;
  const synchronous = { dispose() { loaderDisposals++; }, load(_url, loaded) { callback = loaded; loaded(input.texture); return input.texture; } };
  const visual = await createFarmyardDoorPresentation(options({ loadTexture: undefined, loader: synchronous }));
  assert.equal(input.disposals, 0); callback(input.texture); assert.equal(input.disposals, 0);
  const extra = tracked(); callback(extra.texture); assert.equal(extra.disposals, 1);
  visual.dispose(); assert.equal(input.disposals, 1); assert.equal(loaderDisposals, 0);
});

test('default TextureLoader abort retires placeholder and distinct late load exactly once', async () => {
  const original = T.TextureLoader.prototype.load, started = deferred(), controller = new AbortController(), placeholder = tracked(); let loaded;
  T.TextureLoader.prototype.load = function(_url, callback) { loaded = callback; started.resolve(); return placeholder.texture; };
  try {
    const task = createFarmyardDoorPresentation({ ...frame(), signal: controller.signal }); await started.promise;
    controller.abort(); await assert.rejects(task, { name: 'AbortError' }); assert.equal(placeholder.disposals, 1);
    loaded(placeholder.texture); const different = tracked(); loaded(different.texture); loaded(different.texture); await turn();
    assert.equal(placeholder.disposals, 1); assert.equal(different.disposals, 1);
  } finally { T.TextureLoader.prototype.load = original; }
});

test('already aborted preparation loads nothing; abort after readiness releases all owned resources', async () => {
  const controller = new AbortController(); controller.abort(); let loads = 0;
  await assert.rejects(createFarmyardDoorPresentation(options({ signal: controller.signal, loadTexture() { loads++; } })), { name: 'AbortError' });
  assert.equal(loads, 0);
  const ready = new AbortController(), input = tracked(), visual = await createFarmyardDoorPresentation(options({ signal: ready.signal, loadTexture: async () => input.texture }));
  let disposed = 0; visual.leaf.geometry.addEventListener('dispose', () => disposed++); visual.leaf.material.addEventListener('dispose', () => disposed++);
  ready.abort(); assert.equal(visual.diagnostics().disposed, true); assert.equal(disposed, 2); assert.equal(input.disposals, 1); visual.dispose();
  assert.equal(disposed, 2); assert.equal(input.disposals, 1);
});

test('failed borrowed clone and malformed loader output retire partial owned textures without touching original input', async () => {
  const input = tracked(), original = T.Texture.prototype.dispose; input.texture.userData.cycle = input.texture.userData; let partial = 0;
  T.Texture.prototype.dispose = function() { if (this !== input.texture) partial++; return original.call(this); };
  try { await assert.rejects(createFarmyardDoorPresentation({ ...frame(), texture: input.texture }), /circular/i); }
  finally { T.Texture.prototype.dispose = original; }
  assert.equal(partial, 1); assert.equal(input.disposals, 0); delete input.texture.userData.cycle; input.texture.dispose();
  let released = 0;
  await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: async () => ({ isTexture: true, dispose() { released++; } }) })), { code: 'INVALID_DOOR_VISUAL', path: '/texture' });
  assert.equal(released, 1);
  const placeholder = tracked();
  await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: undefined, loader: { load(_url, loaded) { loaded(null); return placeholder.texture; } } })), { code: 'INVALID_DOOR_VISUAL' });
  assert.equal(placeholder.disposals, 1);
});

test('cleanup continues after a failing resource disposer and repeated disposal stays quiet', async () => {
  const input = tracked(), visual = await createFarmyardDoorPresentation(options({ loadTexture: async () => input.texture })); let geometry = 0;
  visual.leaf.material.addEventListener('dispose', () => { throw Error('Host listener failed'); });
  visual.leaf.geometry.addEventListener('dispose', () => geometry++);
  assert.throws(() => visual.dispose(), AggregateError); assert.equal(input.disposals, 1); assert.equal(geometry, 1);
  assert.equal(visual.diagnostics().cleanupErrors.length, 1); visual.dispose(); assert.equal(geometry, 1);
});

test('presentation seek/update requires no renderer, DOM, clock, RNG, timer or action callbacks', async () => {
  const input = tracked(), visual = await createFarmyardDoorPresentation({ ...frame(), texture: input.texture });
  const descriptor = name => Object.getOwnPropertyDescriptor(globalThis, name), keys = ['document', 'window', 'localStorage', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval'];
  const saved = new Map(keys.map(key => [key, descriptor(key)])), now = Date.now, random = Math.random;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { throw Error('Unexpected ' + key); } });
    Date.now = () => { throw Error('Unexpected wall clock'); }; Math.random = () => { throw Error('Unexpected RNG'); };
    visual.update(frame(door('s', -1, true))); visual.update(frame(door('s', -1, false), true, false)); visual.dispose();
  } finally {
    for (const [key, value] of saved) if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key];
    Date.now = now; Math.random = random; visual.dispose(); input.texture.dispose();
  }
});

test('falsy synchronous loader throws and arbitrary onError values settle safely without invoking message hooks', { timeout: 1500 }, async () => {
  let hooks = 0;
  const hostile = { get message() { hooks++; throw Error('Message accessor ran'); },
    toString() { hooks++; throw Error('Formatter ran'); }, [Symbol.toPrimitive]() { hooks++; throw Error('Coercion ran'); } };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const values = [null, undefined, false, 0, '', NaN, hostile, revoked.proxy];
  for (const value of values) {
    await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: undefined,
      loader: { load() { throw value; } }
    })), error => error instanceof Error && /Cannot load Farmyard door paint/.test(error.message) && Object.is(error.cause, value));
    const placeholder = tracked();
    await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: undefined,
      loader: { load(_url, _loaded, _progress, failed) { failed(value); return placeholder.texture; } }
    })), error => error instanceof Error && /Cannot load Farmyard door paint/.test(error.message) && Object.is(error.cause, value));
    assert.equal(placeholder.disposals, 1);
  }
  assert.equal(hooks, 0);
});

test('hostile and falsy cleanup errors retire every owned resource and keep diagnostics readable', async () => {
  let hooks = 0;
  const hostile = Object.defineProperty({}, 'message', { get() { hooks++; throw Error('Cleanup getter ran'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [null, undefined, false, 0, hostile, revoked.proxy, { message: 'Safe data message' }]) {
    const input = tracked(), visual = await createFarmyardDoorPresentation(options({ loadTexture: async () => input.texture }));
    let geometry = 0, material = 0;
    visual.leaf.material.addEventListener('dispose', () => { material++; throw value; });
    visual.leaf.geometry.addEventListener('dispose', () => { geometry++; throw value; });
    input.texture.addEventListener('dispose', () => { throw value; });
    assert.throws(() => visual.dispose(), AggregateError);
    assert.equal(material, 1); assert.equal(geometry, 1); assert.equal(input.disposals, 1);
    const diagnostics = visual.diagnostics();
    assert.equal(diagnostics.disposed, true); assert.equal(diagnostics.cleanupErrors.length, 3);
    assert.ok(diagnostics.cleanupErrors.every(message => typeof message === 'string'));
    if (value !== hostile && value !== revoked.proxy && Object.hasOwn(value ?? {}, 'message')) assert.deepEqual(diagnostics.cleanupErrors, ['Safe data message', 'Safe data message', 'Safe data message']);
    assert.doesNotThrow(() => visual.dispose());
    assert.equal(material, 1); assert.equal(geometry, 1); assert.equal(input.disposals, 1);
  }
  assert.equal(hooks, 0);
});

test('loader failure cleanup cannot be interrupted by a falsy placeholder or late texture disposal error', { timeout: 1500 }, async () => {
  const placeholder = tracked(); let late;
  placeholder.texture.addEventListener('dispose', () => { throw null; });
  await assert.rejects(createFarmyardDoorPresentation(options({ loadTexture: undefined,
    loader: { load(_url, loaded, _progress, failed) { late = loaded; failed(0); return placeholder.texture; } }
  })), /Cannot load Farmyard door paint/);
  assert.equal(placeholder.disposals, 1);
  const extra = tracked(); extra.texture.addEventListener('dispose', () => { throw undefined; });
  assert.doesNotThrow(() => late(extra.texture)); assert.doesNotThrow(() => late(extra.texture));
  assert.equal(extra.disposals, 1); assert.equal(placeholder.disposals, 1);
});

test('pre-return duplicate successes retire every superseded result and shared or distinct placeholder exactly once', async () => {
  for (const sequence of ['ab', 'aa', 'aba', 'aab', 'abb']) for (const placeholderName of ['a', 'b', 'p']) {
    const names = new Set([...sequence, placeholderName]), textures = new Map([...names].map(name => [name, tracked()]));
    let callback;
    const visual = await createFarmyardDoorPresentation(options({ loadTexture: undefined, loader: {
      load(_url, loaded) { callback = loaded; for (const name of sequence) loaded(textures.get(name).texture); return textures.get(placeholderName).texture; }
    } }));
    const accepted = textures.get(sequence.at(-1));
    assert.equal(visual.leaf.material.map, accepted.texture);
    for (const value of textures.values()) assert.equal(value.disposals, value === accepted ? 0 : 1);
    for (const value of textures.values()) assert.doesNotThrow(() => callback(value.texture));
    assert.equal(accepted.disposals, 0);
    visual.dispose(); visual.dispose();
    for (const value of textures.values()) { assert.equal(value.disposals, 1); callback(value.texture); assert.equal(value.disposals, 1); }
  }
});

test('pre-return duplicate results all retire on error, throw or abort even when disposal callbacks throw', { timeout: 1500 }, async () => {
  for (const mode of ['ready', 'onError', 'throw', 'abort']) for (const placeholderName of ['a', 'b', 'p']) {
    const names = new Set(['a', 'b', ...(mode === 'throw' ? [] : [placeholderName])]);
    const textures = new Map([...names].map(name => [name, tracked()])), controller = new AbortController();
    for (const value of textures.values()) value.texture.addEventListener('dispose', () => { throw null; });
    let callback;
    const task = createFarmyardDoorPresentation(options({ signal: controller.signal, loadTexture: undefined, loader: {
      load(_url, loaded, _progress, failed) {
        callback = loaded; loaded(textures.get('a').texture); loaded(textures.get('b').texture); loaded(textures.get('a').texture);
        if (mode === 'throw') throw false;
        if (mode === 'onError') failed(undefined);
        if (mode === 'abort') controller.abort();
        return textures.get(placeholderName).texture;
      }
    } }));
    if (mode === 'ready') {
      const visual = await task;
      assert.equal(visual.leaf.material.map, textures.get('a').texture);
      assert.throws(() => visual.dispose(), AggregateError);
      assert.equal(visual.diagnostics().cleanupErrors.length, textures.size);
      assert.ok(visual.diagnostics().cleanupErrors.every(value => typeof value === 'string'));
      visual.dispose();
    } else if (mode === 'abort') await assert.rejects(task, { name: 'AbortError' });
    else await assert.rejects(task, /Cannot load Farmyard door paint/);
    for (const value of textures.values()) {
      assert.equal(value.disposals, 1); assert.doesNotThrow(() => callback(value.texture)); assert.equal(value.disposals, 1);
    }
  }
});
