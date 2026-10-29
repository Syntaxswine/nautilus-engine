// Fixed 65c0673 surface primitives; bathroom forms and material mapping are original.
import {Surfaces as BaseSurfaces, add, sub, mul, cross, dot, len, unit, lerp, unionPrism} from '../fort-variants/geometry.js';
export {add, sub, mul, cross, dot, len, unit, lerp, unionPrism};
export const BATHROOM_MATERIALS = Object.freeze({
  ceramic: {tile: 0, repeat: .65, color: [.97, .97, .94], roughness: .34},
  paint: {tile: 1, repeat: 1.2, color: [.87, .95, .91], roughness: .8},
  blue: {tile: 1, repeat: 1.2, color: [.47, .7, .84], roughness: .8},
  timber: {tile: 2, repeat: 1.5, color: [.92, .86, .73], roughness: .96},
  stone: {tile: 3, repeat: 1.4, color: [.93, .92, .86], roughness: .98},
  carved: {tile: 0, repeat: .7, color: [.64, .64, .58], roughness: .99},
  tile: {tile: 4, repeat: 1, color: [.96, .96, .92], roughness: .86},
  slate: {tile: 5, repeat: 1.5, color: [.87, .91, .95], roughness: .94},
  metal: {tile: null, color: [.53, .59, .59], roughness: .46, metalness: .68},
  dark: {tile: null, color: [.12, .17, .16], roughness: .9},
  water: {tile: null, color: [.31, .48, .47], roughness: .22},
  paper: {tile: null, color: [.93, .91, .82], roughness: .98},
  mirror: {tile: null, color: [.58, .71, .7], roughness: .12, metalness: .75}
});
for (const material of Object.values(BATHROOM_MATERIALS)) Object.freeze(material);
export class Surfaces extends BaseSurfaces {
  constructor(lod = 'game', uvMode = 'metres') { super(lod, uvMode, 'bathroom'); }
  triangle(a, b, c, material) {
    const normal = cross(sub(b, a), sub(c, a)); if (len(normal) < 1e-10) return;
    const n = unit(normal), spec = BATHROOM_MATERIALS[material]; if (!spec) throw Error('Unknown bathroom material: ' + material);
    let u = Math.abs(n[1]) > .999 ? [1, 0, 0] : unit([n[2], 0, -n[0]]), v = unit(cross(n, u));
    if (v[1] < 0) { u = mul(u, -1); v = mul(v, -1); }
    const vertices = [a, b, c].map(p => ({p, uv: [dot(p, u) / (spec.repeat || 1), dot(p, v) / (spec.repeat || 1)]}));
    if (this.uvMode === 'metres' || spec.tile === null) { this.emit([a, b, c], material, n, vertices.map(q => q.uv)); return; }
    const cols = 3, rows = 2, col = spec.tile % cols, row = rows - 1 - Math.floor(spec.tile / cols), inset = .018;
    const clip = (polygon, axis, bound, greater) => {
      const output = [], inside = q => greater ? q.uv[axis] >= bound - 1e-9 : q.uv[axis] <= bound + 1e-9;
      for (let i = 0; i < polygon.length; i++) {
        const p = polygon[i], q = polygon[(i + 1) % polygon.length], ip = inside(p), iq = inside(q);
        if (ip) output.push(p);
        if (ip !== iq) { const t = (bound - p.uv[axis]) / (q.uv[axis] - p.uv[axis]); output.push({p: lerp(p.p, q.p, t), uv: lerp(p.uv, q.uv, t)}); }
      }
      return output;
    };
    const lo = [0, 1].map(i => Math.floor(Math.min(...vertices.map(q => q.uv[i])))), hi = [0, 1].map(i => Math.ceil(Math.max(...vertices.map(q => q.uv[i]))));
    for (let x = lo[0]; x < hi[0]; x++) for (let y = lo[1]; y < hi[1]; y++) {
      let polygon = vertices;
      for (const [axis, bound, greater] of [[0, x, true], [0, x + 1, false], [1, y, true], [1, y + 1, false]]) polygon = clip(polygon, axis, bound, greater);
      for (let i = 1; i < polygon.length - 1; i++) {
        const tri = [polygon[0], polygon[i], polygon[i + 1]]; if (len(cross(sub(tri[1].p, tri[0].p), sub(tri[2].p, tri[0].p))) < 1e-10) continue;
        this.emit(tri.map(q => q.p), material, n, tri.map(q => [(col + inset + (q.uv[0] - x) * (1 - 2 * inset)) / cols, (row + inset + (q.uv[1] - y) * (1 - 2 * inset)) / rows]));
      }
    }
  }
}
export function append(s, batches, origin = [0, 0, 0], yaw = 0) {
  const c = Math.cos(yaw), sn = Math.sin(yaw), prior = [s.kind, s.level];
  for (const batch of batches) {
    s.channel(batch.kind, batch.level); const out = s.batch(batch.material);
    for (let i = 0; i < batch.positions.length; i += 3) {
      const [x, y, z] = batch.positions.slice(i, i + 3), [nx, ny, nz] = batch.normals.slice(i, i + 3);
      out.positions.push(origin[0] + x * c + z * sn, origin[1] + y, origin[2] - x * sn + z * c); out.normals.push(nx * c + nz * sn, ny, -nx * sn + nz * c);
    }
    for (const uv of batch.uvs) out.uvs.push(uv);
  }
  s.channel(...prior);
}
export function revolve(s, center, profile, material, count = s.lod === 'source' ? 72 : 24) {
  const point = (p, angle) => [center[0] + p[1] * Math.cos(angle), center[1] + p[0], center[2] + p[2] * Math.sin(angle)];
  for (let j = 0; j < profile.length; j++) for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2, b = (i + 1) / count * Math.PI * 2;
    const pts = [point(profile[j], a), point(profile[(j + 1) % profile.length], a), point(profile[(j + 1) % profile.length], b), point(profile[j], b)];
    for (let k = 1; k < 3; k++) s.triangle(pts[0], pts[k], pts[k + 1], material);
  }
}
export function ring(s, center, outer, inner, thickness, material) { revolve(s, center, [[-thickness, ...outer], [0, ...outer], [0, ...inner], [-thickness, ...inner]], material); }
export function oval(s, center, radius, thickness, material) { revolve(s, center, [[-thickness / 2, 0, 0], [-thickness / 2, ...radius], [thickness / 2, ...radius], [thickness / 2, 0, 0]], material); }
export function rod(s, a, b, radius, material = 'metal') {
  const axis = unit(sub(b, a)), ref = Math.abs(axis[1]) > .95 ? [1, 0, 0] : [0, 1, 0], u = unit(cross(axis, ref)), v = unit(cross(axis, u)), count = s.lod === 'source' ? 16 : 8;
  const circle = p => Array.from({length: count}, (_, i) => add(p, add(mul(u, Math.cos(i / count * Math.PI * 2) * radius), mul(v, Math.sin(i / count * Math.PI * 2) * radius))));
  const A = circle(a), B = circle(b); s.face([...A].reverse(), material, mul(axis, -1)); s.face(B, material, axis);
  for (let i = 0; i < count; i++) { const j = (i + 1) % count; s.face([A[i], A[j], B[j], B[i]], material, sub(lerp(A[i], A[j], .5), a)); }
}
