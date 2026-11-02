// Optional presentation only. Collider and visibility truth remain host-owned.
import * as T from '../render-effects/three.js';

const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const FARMYARD_DOOR_VISUAL_RESOURCE_PATHS = freeze({
  wood: 'vendor/farmyard-door-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png'
});
export const FARMYARD_DOOR_VISUAL_SOURCE = freeze({
  repository: 'https://github.com/Syntaxswine/farmyard-commando',
  commit: '251bf8094b5f9ebe44208443084c1a6d6658512a',
  reference: 'sites/tactical-animal/dist/interaction-view.js',
  profile: 'farmyard-single-ground-leaf-endpoint-v1',
  nativeMetres: { width: 1.12, height: 2, thickness: .16 },
  wood: { originalPath: 'sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png',
    bytes: 2757790, sha256: 'fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021' },
  material: { type: 'MeshStandardMaterial', color: 0xb5ad86, roughness: .9, metalness: 0 },
  triangles: 12, instantEndpoint: true, fog: 'known-only; visible does not recolor the source leaf',
  sharedThree: '../render-effects/three.js', presentationOnly: true
});
export function farmyardDoorVisualResourceURLs() {
  return Object.fromEntries(Object.entries(FARMYARD_DOOR_VISUAL_RESOURCE_PATHS).map(([key, value]) => [key, new URL('../../' + value, import.meta.url).href]));
}

const EPS = 1e-7;
const abortError = () => Object.assign(new Error('Farmyard door visual preparation was cancelled.'), { name: 'AbortError' });
// Never inspect a borrowed error through getters, coercion hooks or prototypes.
function errorMessage(error) {
  try {
    if (typeof error === 'string') return error.slice(0, 512);
    if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
      const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
      if (descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string') return descriptor.value.slice(0, 512);
    }
  } catch {}
  return 'Resource service threw a value without a safe data message.';
}
function invalid(path, message) { const error = new TypeError(path + ': ' + message); error.code = 'INVALID_DOOR_VISUAL'; error.path = path; throw error; }
function record(value, path) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(path, 'Supply a plain data record.');
  const entries = Object.getOwnPropertyDescriptors(value);
  for (const [key, entry] of Object.entries(entries)) if (!('value' in entry)) invalid(path + '/' + key, 'Accessors are unsupported.');
  return entries;
}
function read(entries, key, path) { if (!Object.hasOwn(entries, key)) invalid(path + '/' + key, 'Required field is absent.'); return entries[key].value; }
function frameData(value, expectedId) {
  const entries = record(value, '/frame'), boxEntries = record(read(entries, 'collider', '/frame'), '/frame/collider');
  const box = {};
  for (const key of ['id', 'interactionId', 'kind', 'x0', 'x1', 'y0', 'y1', 'z0', 'height']) box[key] = read(boxEntries, key, '/frame/collider');
  if (typeof box.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}$/.test(box.id)) invalid('/frame/collider/id', 'Supply the public bounded door identity.');
  if (box.interactionId !== box.id || expectedId !== undefined && box.id !== expectedId) invalid('/frame/collider/interactionId', 'Keep the bound door identity unchanged.');
  if (box.kind !== 'wall') invalid('/frame/collider/kind', 'The source leaf is a wall collider.');
  for (const key of ['x0', 'x1', 'y0', 'y1', 'z0', 'height']) if (!Number.isFinite(box[key]) || Math.abs(box[key]) > 10001) invalid('/frame/collider/' + key, 'Supply a finite bounded metre coordinate.');
  const width = box.x1 - box.x0, depth = box.y1 - box.y0, native = (a, b) => Math.abs(a - b) <= EPS;
  if (!(native(width, 1.12) && native(depth, .16) || native(width, .16) && native(depth, 1.12)) ||
      box.z0 !== 0 || box.height !== 2) invalid('/frame/collider', 'Use the native ground leaf: 1.12 × 2 × .16 metres at its current axis-aligned endpoint. Opening sizes are not rescaled.');
  const known = read(entries, 'known', '/frame'), visible = read(entries, 'visible', '/frame');
  if (typeof known !== 'boolean') invalid('/frame/known', 'Supply confirmed remembered-fog visibility.');
  if (typeof visible !== 'boolean') invalid('/frame/visible', 'Supply confirmed current visibility.');
  return { collider: box, known, visible };
}
function lifetime(external) {
  const controller = new AbortController(), cleanups = [], released = new Set(), errors = [];
  let closed = false, rejectAbort;
  const cancelled = new Promise((_, reject) => { rejectAbort = reject; }); cancelled.catch(() => {});
  function release(resource) {
    if (released.has(resource)) return;
    released.add(resource); resource.dispose();
  }
  function own(resource) {
    if (closed) { try { release(resource); } catch (error) { errors.push(error); } throw abortError(); }
    cleanups.push(() => release(resource)); return resource;
  }
  function close(report = false) {
    if (closed) return;
    closed = true; external?.removeEventListener('abort', onAbort);
    for (const cleanup of cleanups.reverse()) try { cleanup(); } catch (error) { errors.push(error); }
    cleanups.length = 0; controller.abort(); rejectAbort(abortError());
    if (report && errors.length) throw new AggregateError(errors, 'Farmyard door visual cleanup reported errors.');
  }
  function onAbort() { close(); }
  if (external?.aborted) close(); else external?.addEventListener('abort', onAbort, { once: true });
  return { signal: controller.signal, own, close, errors,
    defer(fn) { if (closed) fn(); else cleanups.push(fn); },
    assertOpen() { if (closed) throw new Error('Farmyard door visual is disposed or cancelled.'); },
    wait(promise) { return Promise.race([promise, cancelled]); },
    get closed() { return closed; } };
}

// Three's TextureLoader cannot cancel a request. Its placeholder and a distinct
// late result are both owned here; cancellation still rejects promptly.
function loaderTexture(url, { signal, cleanupErrors }, loader) {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let placeholder, returned = false, settled = false, accepted = false, loadedReceived = false, failed = false, loaded, failure;
    const released = new Set(), pending = new Set();
    const release = texture => {
      try { if (texture?.isTexture && !released.has(texture)) { released.add(texture); texture.dispose(); } }
      catch (error) { cleanupErrors.push(error); }
    };
    // A loader may emit several synchronous successes before returning its
    // placeholder. Retain all transferred results until acceptance is known.
    const retire = keep => {
      if (placeholder !== keep) release(placeholder);
      for (const texture of pending) if (texture !== keep) release(texture);
      pending.clear();
    };
    const finish = () => signal.removeEventListener('abort', onAbort);
    function flush() {
      if (!returned || settled) return;
      if (failed) { settled = true; finish(); retire(); reject(failure); }
      else if (loadedReceived) { settled = true; accepted = true; finish(); retire(loaded); resolve(loaded); }
    }
    function onAbort() {
      if (settled) return;
      failed = true; failure = abortError(); settled = true; finish(); retire(); reject(failure);
    }
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      placeholder = loader.load(url, texture => {
        if (settled) { if (!accepted || texture !== loaded) release(texture); return; }
        pending.add(texture); loaded = texture; loadedReceived = true; flush();
      }, undefined, error => {
        if (settled) return;
        failed = true; failure = new Error('Cannot load Farmyard door paint: ' + url + ' (' + errorMessage(error) + ')', { cause: error }); flush();
      });
      returned = true;
      if (settled) release(placeholder); else flush();
    } catch (error) {
      returned = true;
      if (!settled) { failed = true; failure = new Error('Cannot load Farmyard door paint: ' + url + ' (' + errorMessage(error) + ')', { cause: error }); flush(); } else release(placeholder);
    }
  });
}
function validateTexture(value) {
  if (!(value instanceof T.Texture)) invalid('/texture', 'Supply a Texture from Nautilus shared Three; loaders transfer texture ownership.');
  return value;
}
function paintResource(options) {
  const original = farmyardDoorVisualResourceURLs().wood, url = options.resolveResource?.('wood', original) ?? original;
  if (typeof url !== 'string' || !url.length || /^javascript:/i.test(url)) invalid('/resolveResource', 'Resolve wood to a nonempty resource URL.');
  return url;
}
function loadPaint(scope, options) {
  if (options.texture !== undefined) {
    const borrowed = validateTexture(options.texture), texture = scope.own(new borrowed.constructor());
    texture.copy(borrowed);
    texture.colorSpace = T.SRGBColorSpace; return Promise.resolve(texture);
  }
  return Promise.resolve().then(() => {
    scope.assertOpen();
    return options.loadTexture ? options.loadTexture(paintResource(options), { signal: scope.signal, kind: 'wood' }) :
      loaderTexture(paintResource(options), { signal: scope.signal, cleanupErrors: scope.errors }, options.loader ?? new T.TextureLoader());
  }).then(value => {
    if (value?.isTexture && typeof value.dispose === 'function') scope.own(value);
    const texture = validateTexture(value); texture.colorSpace = T.SRGBColorSpace; return texture;
  });
}

/**
 * Source-native visual only. The host supplies a public current collider plus
 * known/current visibility, and attaches root in the same metre coordinate frame.
 * texture is borrowed and privately cloned. loadTexture/loader results transfer
 * ownership; neither a supplied loader nor a retained renderer/material is owned.
 */
export async function createFarmyardDoorPresentation(options = {}) {
  record(options, '/options');
  const first = frameData(options);
  if (options.signal?.aborted) throw abortError();
  if (options.loadTexture !== undefined && typeof options.loadTexture !== 'function') invalid('/options/loadTexture', 'Supply an async texture function.');
  if (options.loader !== undefined && typeof options.loader?.load !== 'function') invalid('/options/loader', 'Supply a borrowed Three-compatible texture loader.');
  if (options.resolveResource !== undefined && typeof options.resolveResource !== 'function') invalid('/options/resolveResource', 'Supply a resource resolver.');
  if (options.loadTexture && options.loader) invalid('/options', 'Choose loadTexture or loader.');
  const scope = lifetime(options.signal);
  try {
    const texture = await scope.wait(loadPaint(scope, options)); scope.assertOpen();
    const geometry = scope.own(new T.BoxGeometry(1, 1, 1));
    const material = scope.own(new T.MeshStandardMaterial({ map: texture, color: 0xb5ad86, roughness: .9 }));
    const root = new T.Group(), leaf = new T.Mesh(geometry, material);
    root.name = 'farmyard-native-door'; root.userData.presentationOnly = true;
    leaf.name = 'native-painted-door-leaf'; leaf.userData.interactionId = first.collider.id;
    leaf.castShadow = leaf.receiveShadow = true; root.add(leaf);
    scope.defer(() => { root.removeFromParent(); root.clear(); });
    let current = null, poseUpdates = 0;
    function apply(frame) {
      const before = current?.collider, box = frame.collider;
      const poseChanged = !before || ['x0', 'x1', 'y0', 'y1', 'z0', 'height'].some(key => before[key] !== box[key]);
      const changed = poseChanged || current.known !== frame.known || current.visible !== frame.visible;
      if (poseChanged) {
        leaf.position.set((box.x0 + box.x1) / 2, box.height / 2, (box.y0 + box.y1) / 2);
        leaf.scale.set(box.x1 - box.x0, box.height, box.y1 - box.y0); poseUpdates++;
      }
      if (!current || current.known !== frame.known) leaf.visible = frame.known;
      current = frame; return changed;
    }
    apply(first);
    return Object.freeze({
      root, leaf,
      update(frame) { scope.assertOpen(); return apply(frameData(frame, first.collider.id)); },
      diagnostics() { return { disposed: scope.closed, doorId: first.collider.id, triangles: 12, meshes: 1,
        coordinateFrame: 'presentation-root-local (x,height,y)', instantEndpoint: true, poseUpdates,
        collider: { ...current.collider }, known: current.known, visible: current.visible,
        textureOwnership: options.texture !== undefined ? 'private-clone-of-borrowed' : 'owned-loader-result',
        cleanupErrors: scope.errors.map(errorMessage) }; },
      dispose() { scope.close(true); }
    });
  } catch (error) { scope.close(); throw error; }
}
