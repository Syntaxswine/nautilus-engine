// Adapted from Tinderbox fb0628605c274550ff8abad50b151843f08747d1:
// src/ui/train-control-model.js. Original bytes and hashes remain in vendor/.
export const COMPACT_NOTCHES = Object.freeze([
  Object.freeze({label:'Forward II',mark:'F II',direction:'forward',power:1}),
  Object.freeze({label:'Forward I',mark:'F I',direction:'forward',power:.5}),
  Object.freeze({label:'Neutral',mark:'N',direction:'neutral',power:0}),
  Object.freeze({label:'Reverse',mark:'R',direction:'reverse',power:.5})
]);
export function compactDetent(position,current) {
  if (!Number.isFinite(position)) return current;
  const bounded = Math.max(0,Math.min(3,position)),distance = bounded-current;
  if (Math.abs(distance) <= .62 + 1e-9) return current;
  return Math.max(0,Math.min(3,Math.round(bounded-Math.sign(distance)*.12)));
}
export function compactNotchOf(controls) {
  if (!controls || controls.brake > 0 || controls.direction === 'neutral') return 2;
  if (controls.direction === 'reverse') return 3;
  return controls.power > .75 ? 0 : 1;
}
