// E1/E2 against the count tool: the editor's wiring with instancing / the roof merge off.
const fs = require('fs'), {spawnSync} = require('child_process');
const cases = [
  ['E1', 'apps/editor/prefab-scene.js', "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();});", "this.prefabs=new PrefabLayer(this.scene,this.renderer,()=>this.changed(),error=>{this.diagnostics.push('Building prefabs: '+error.message);this.changed();},{instancing:false});"],
  ['E2', 'apps/editor/roof-scene.js', 'this.slopedRoofs=new RoofLayer(this.scene);', 'this.slopedRoofs=new RoofLayer(this.scene,{merge:false});']
];
for (const [id, file, from, to] of cases) {
  const original = fs.readFileSync(file, 'utf8');
  if (original.split(from).length !== 2) {console.log(id, 'needle not unique'); continue;}
  try {
    fs.writeFileSync(file, original.replace(from, to));
    const r = spawnSync(process.execPath, ['tools/asset-draw-counts.mjs'], {encoding: 'utf8', maxBuffer: 1 << 28});
    console.log(id, r.status === 0 ? 'SURVIVED' : 'killed (exit ' + r.status + ')', (r.stdout || '').split('\n').filter(l => l && !l.startsWith('  ')).join(', ').slice(0, 160));
  } finally {fs.writeFileSync(file, original);}
  if (fs.readFileSync(file, 'utf8') !== original) throw Error('restore failed: ' + file);
}
