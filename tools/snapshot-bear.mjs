// Read committed Git objects only. No donor checkout/config/index writes.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const BEAR_PIN='4f5f53917990ec03b2f14c65f067e4b99ec8fcaa';
export const RUNTIME_ROOTS=['bear-worker','bear-paint','red-hat-model','weapon-models','armed-idle-motion','worker-locomotion','battle-posture','animal-motion','animal-prone-motion','crawl-motion','grenade-throw-motion','ladder-motion','roof-mantle','ledge-descent','horse-chair-motion','painted-fire-motion','speaking-head'].map(name=>'dist/tactics/'+name+'.js');
export const RESOURCES=[
  'dist/tactics/bear-10k-data.json','dist/tactics/pig-foreman-10k-data.json','dist/tactics/speaking-heads/bear-10k.json',
  'dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png',
  'dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png',
  'dist/assets/characters/lowpoly-proof/pig-foreman-model-paint-v1.png',
  'dist/assets/characters/lowpoly-proof/horse-worker-light-atlas.png',
  'dist/assets/equipment/painted-ui/grenade-surface.png'
];
export const REFERENCES=['README.md','dist/tactics/vendor/THREE-LICENSE.txt','dist/tactics/animal-motion-catalog.js','dist/tactics/animal-motion-paint.js','dist/tactics/armed-idle-actor.js','dist/tactics/idle-fits.js','tests/bear-integration.test.mjs','tests/bear-worker.test.mjs','docs/tactics/review-images/bear/validation.json','docs/tactics/review-images/bear/animation-integration-validation.json'];
const root=fileURLToPath(new URL('../',import.meta.url)),destination=path.join(root,'vendor/aft-bear',BEAR_PIN);
export function inspectBear(repo){
  const git=args=>execFileSync('git',['-c','safe.directory='+path.resolve(repo).replaceAll('\\','/'),'-C',repo,...args],{windowsHide:true,maxBuffer:128*1024*1024});
  if(git(['rev-parse',BEAR_PIN+'^{commit}']).toString().trim()!==BEAR_PIN)throw Error('Bear source pin mismatch.');
  const inventory=new Map(git(['ls-tree','-r','-z',BEAR_PIN]).toString().split('\0').filter(Boolean).map(line=>{const [meta,name]=line.split('\t'),[mode,type,oid]=meta.split(' ');return [name,{mode,type,oid}];})),data=new Map(),runtime=new Set(),edges=[];
  function read(name){if(!inventory.has(name)||inventory.get(name).type!=='blob')throw Error('Missing fixed source blob: '+name);if(!data.has(name))data.set(name,git(['cat-file','blob',inventory.get(name).oid]));return data.get(name);}
  function visit(name){if(runtime.has(name))return;runtime.add(name);const source=read(name).toString();
    for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)){
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));
      if(!dependency.startsWith('dist/tactics/'))throw Error('Bear dependency escapes selected source: '+dependency);
      const external=dependency==='dist/tactics/vendor/three.module.js';edges.push({from:name,to:dependency,external});if(!external)visit(dependency);
    }
  }
  RUNTIME_ROOTS.forEach(visit);for(const name of [...RESOURCES,...REFERENCES])read(name);
  const files=[...data].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>({path:name,blob:inventory.get(name).oid,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),usage:runtime.has(name)?'runtime-source':RESOURCES.includes(name)?'runtime-resource':'reference-only'}));
  const manifest={schemaVersion:1,donor:'aft-bear',repository:'https://github.com/Syntaxswine/animal-factory-tactics-3d',commit:BEAR_PIN,
    runtimeRoots:RUNTIME_ROOTS,dynamicResources:RESOURCES,referenceOnly:REFERENCES,externalBindings:[{source:'dist/tactics/vendor/three.module.js',replacement:'packages/render-effects/three.js',commit:'781246a668c723d5a4c5463e70534cc04b6a5641',notice:'dist/tactics/vendor/THREE-LICENSE.txt'}],
    edges,files,adaptations:'None in vendor. Engine execution adaptations are generated separately with exact-match checks.',rightsStatus:'Original source and embedded notices retained; provenance adds no blanket license grant.'};
  return {manifest,data,summary:{commit:BEAR_PIN,runtimeModules:runtime.size,runtimeSourceBytes:files.filter(f=>f.usage==='runtime-source').reduce((n,f)=>n+f.bytes,0),resources:RESOURCES.length,resourceBytes:files.filter(f=>f.usage==='runtime-resource').reduce((n,f)=>n+f.bytes,0),referenceFiles:REFERENCES.length,importedFiles:files.length,importedBytes:files.reduce((n,f)=>n+f.bytes,0)}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--repo'),repo=index<0?null:process.argv[index+1];if(!repo)throw Error('Use --repo <read-only donor>; --write creates the immutable snapshot; --report writes only the source audit.');
  const audit=inspectBear(repo);
  if(process.argv.includes('--write')){if(fs.existsSync(destination))throw Error('Immutable bear snapshot already exists.');for(const [name,bytes]of audit.data){const file=path.join(destination,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}fs.writeFileSync(path.join(destination,'provenance.json'),JSON.stringify(audit.manifest,null,2)+'\n');}
  if(process.argv.includes('--report'))fs.writeFileSync(path.join(root,'docs/reviews/bear/source-closure.json'),JSON.stringify({...audit.summary,...audit.manifest},null,2)+'\n');
  console.log(JSON.stringify({...audit.summary,written:process.argv.includes('--write')}));
}
