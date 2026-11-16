export function plainData(input) {
  let budget = 250000;
  function copy(value, depth = 0) {
    if (--budget < 0 || depth > 20) throw Error('Train data exceeds its bounded JSON budget.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object' || !(Array.isArray(value) ? Object.getPrototypeOf(value) === Array.prototype
      : [Object.prototype, null].includes(Object.getPrototypeOf(value)))) {
      throw Error('Train data must be finite plain JSON.');
    }
    const array = Array.isArray(value), keys = Reflect.ownKeys(value), result = array ? [] : {};
    if (keys.some(key => typeof key !== 'string')) throw Error('Train data cannot contain symbols.');
    if (array && (keys.length !== value.length + 1 || !Array.from({length: value.length}, (_, i) => String(i)).every(key => Object.hasOwn(value, key)))) throw Error('Train arrays must be dense and have no extra fields.');
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw Error('Train data cannot contain accessors or hidden fields.');
      Object.defineProperty(result, key, {value: copy(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true});
    }
    return result;
  }
  const result = copy(input);
  if (JSON.stringify(result).length > 4000000) throw Error('Train data exceeds four million JSON characters.');
  return result;
}
export function fields(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) {
    throw Error('Unsupported or missing train record fields.');
  }
}
export function identifier(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 160 || /[\u0000-\u001f]/u.test(value)) throw Error('Supply a bounded stable train/actor/command ID.');
  return value;
}
export function finite(value, lo, hi) {
  if (!Number.isFinite(value) || value < lo || value > hi) throw Error('Train value is outside its supported range.');
  return value;
}
export function revision(value) {
  finite(value, 0, 1e9);
  if (!Number.isInteger(value)) throw Error('Train revisions must be integers.');
  return value;
}
export function point(value) {
  fields(value, ['x', 'y', 'h']);
  for (const n of Object.values(value)) finite(n, -1000000, 1000000);
  return value;
}
export function canonical(value) {
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
export const samePoint = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.h - b.h) < 1e-7;
