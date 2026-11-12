export const clone = value => structuredClone(value);
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])]));
  return value;
}
export function insist(condition, code, reason) { if (!condition) throw Object.assign(Error(reason), {code}); }
export const refusal = (code, reason) => ({version:1,ok:false,committed:false,code,reason});
export const accepted = extra => ({version:1,ok:true,committed:true,code:null,reason:null,...extra});
export function fields(value, keys) { insist(value && Object.getPrototypeOf(value) === Object.prototype && canonical(Object.keys(value).sort()) === canonical([...keys].sort()), 'INVALID_RECORD', 'Use exactly these fields: '+keys.join(', ')); }
