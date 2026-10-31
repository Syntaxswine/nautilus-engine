// Split each transparent double-sided glass copy of an original-building batch into
// two fixed-side copies: the renderer otherwise draws it in two halves and marks the
// material changed before each, re-deriving the program twice per object per frame.
// Usage: node patch-glass-halves.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2], 'packages/prefab-core/display-batches.js');
let s = fs.readFileSync(file, 'utf8');
const edits = [
  [`// Original buildings: every opaque mesh, door leaves included, merges per
// material; glass stays one mesh per source batch so it still sorts back to
// front.`,
   `// The renderer draws a transparent double-sided material in two halves, back faces
// then front, and marks the material changed before each half, so every half
// re-derives its program. Two fixed-side copies draw the same halves, with the same
// programs and uniforms, in the same order: they share the object's depth and the back
// copy is created first, so it sorts first. The front copy casts the shadow,
// double-sided as before; the back copy casts none. The daylight rig prepares each
// copy itself (it adds its shader patch to every lit material on first sight).
function halves(T,mesh,cache){
  const source=mesh.material;
  if(source.side!==T.DoubleSide||source.forceSinglePass)return [mesh.clone()];
  let pair=cache.get(source);
  if(!pair){
    pair=[T.BackSide,T.FrontSide].map(side=>{const material=source.clone();material.side=side;delete material.userData.daylightPrepared;return material;});
    pair[1].shadowSide=T.DoubleSide;cache.set(source,pair);
  }
  return pair.map((material,i)=>{const copy=mesh.clone();copy.material=material;if(!i)copy.userData={...copy.userData,noShadow:true};return copy;});
}

// Original buildings: every opaque mesh, door leaves included, merges per
// material; glass stays one object per source batch so it still sorts back to
// front.`],
  [`  const pieces=[],glass=[],root=new T.Group();root.name=source.root.name;let order=0;`,
   `  const pieces=[],glass=[],sided=new Map(),root=new T.Group();root.name=source.root.name;let order=0;`],
  [`      if(mesh.material.transparent){if(mesh!==top)throw Error('Transparent door parts are not batched.');const copy=mesh.clone();copy.visible=top.visible;glass.push({top,mesh:copy});return;}`,
   `      if(mesh.material.transparent){if(mesh!==top)throw Error('Transparent door parts are not batched.');const copies=halves(T,mesh,sided);for(const copy of copies)copy.visible=top.visible;glass.push({top,mesh:copies[copies.length-1],copies});return;}`],
  [`  for(const {mesh}of records)root.add(mesh);for(const {mesh}of glass)root.add(mesh);
  function sync(){applyRuns(records);for(const {top,mesh}of glass)mesh.visible=top.visible;}`,
   `  for(const {mesh}of records)root.add(mesh);for(const {copies}of glass)root.add(...copies);
  function sync(){applyRuns(records);for(const {top,copies}of glass)for(const copy of copies)copy.visible=top.visible;}`],
  [`  return {root,records,glass,pieces,sync,runs:()=>runs(records)+glass.filter(({mesh})=>mesh.visible).length,dispose(){release(root,records);}};`,
   `  return {root,records,glass,pieces,sync,runs:()=>runs(records)+glass.filter(({mesh})=>mesh.visible).length,dispose(){release(root,records);for(const pair of sided.values())for(const material of pair)material.dispose();}};`]
];
for (const [from, to] of edits) {
  if (s.split(from).length !== 2) throw Error('anchor not found once: ' + from.slice(0, 80));
  s = s.replace(from, () => to);
}
fs.writeFileSync(file, s);
console.log('patched ' + file);
