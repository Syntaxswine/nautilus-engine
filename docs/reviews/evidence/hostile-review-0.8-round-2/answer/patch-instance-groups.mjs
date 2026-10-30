// Pilot only: group a design's copies by place before instancing. Copies are sorted
// along a Z-order curve of their map position and cut into runs of `group`; each run
// is one InstancedMesh with its own bounds, so a close view draws the runs near it,
// not every copy. A lone copy draws itself. Usage: node patch-instance-groups.mjs <tree> <group>
import fs from 'node:fs';
import path from 'node:path';
const [tree, group] = process.argv.slice(2), file = path.join(tree, 'apps/editor/prefab-scene.js');
let s = fs.readFileSync(file, 'utf8');
const edits = [
  [`const instanceable=node=>node.isMesh&&Array.isArray(node.material);`,
   `const instanceable=node=>node.isMesh&&Array.isArray(node.material);
const zOrder=model=>{const x=Math.max(0,Math.floor(model.root.position.x)),z=Math.max(0,Math.floor(model.root.position.z));let key=0;for(let bit=0;bit<10;bit++)key+=(((x>>bit)&1)*2**(2*bit))+(((z>>bit)&1)*2**(2*bit+1));return key;};
const INSTANCE_GROUP=${Number(group)};`],
  [`    for(const [id,models]of copies){
      const template=this.templates.get(id);if(!template||models.length<2)continue;
      template.model.root.updateMatrixWorld(true);for(const model of models)model.root.updateMatrixWorld(true);
      template.nodes.forEach((node,i)=>{`,
   `    for(const [id,all]of copies){
      const template=this.templates.get(id);if(!template||all.length<2)continue;
      template.model.root.updateMatrixWorld(true);for(const model of all)model.root.updateMatrixWorld(true);
      const ordered=[...all].sort((a,b)=>zOrder(a)-zOrder(b));
      for(let start=0;start<ordered.length;start+=INSTANCE_GROUP){const models=ordered.slice(start,start+INSTANCE_GROUP);if(models.length<2)continue;
      template.nodes.forEach((node,i)=>{`],
  [`        this.scene.add(mesh);this.instanced.push({mesh,node,copies:models.map(model=>model.nodes[i])});
      });
    }`,
   `        this.scene.add(mesh);this.instanced.push({mesh,node,copies:models.map(model=>model.nodes[i])});
      });}
    }`]
];
for (const [from, to] of edits) {
  if (s.split(from).length !== 2) throw Error('anchor not found once: ' + from.slice(0, 80));
  s = s.replace(from, () => to);
}
fs.writeFileSync(file, s);
console.log('patched ' + file + ' with groups of ' + group);
