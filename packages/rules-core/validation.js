export const plain = value => !!value && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
export function fields(value, allowed, label) {
  if (!plain(value)) throw new TypeError(label + ' must be a plain object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new TypeError('Unknown ' + label + ' field: ' + key);
}
export function finite(value, minimum, maximum, label) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) throw new TypeError('Invalid ' + label + '.');
  return value;
}
export function integer(value, minimum, maximum, label) {
  finite(value, minimum, maximum, label);
  if (!Number.isInteger(value)) throw new TypeError(label + ' must be a whole number.');
  return value;
}
export function modifiers(value = []) {
  if (!Array.isArray(value) || value.length > 64) throw new TypeError('At most 64 modifiers are supported.');
  const ids = new Set();
  return value.map(item => {
    fields(item, ['id', 'add'], 'modifier');
    if (typeof item.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(item.id) || ids.has(item.id)) throw new TypeError('Invalid or duplicate modifier ID.');
    ids.add(item.id);
    return {id: item.id, add: finite(item.add, -1000, 1000, 'modifier amount')};
  });
}
