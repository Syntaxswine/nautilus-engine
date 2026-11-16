import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};
const write=process.argv.includes('--write');
const definitions=[
  {id:'fighters',repository:'https://github.com/Syntaxswine/farmyard-fighters',commit:'541b0facc0597eaa719fd78cf391b417f12473da',repo:arg('--fighters'),files:['crawl-pose.js','crawl-motion.js','crawl-equipment.js','locomotion-sample.js','field-view.js'].map(f=>'sites/tactical-animal/dist/'+f).concat('sites/tactical-animal/tests/locomotion-timing.test.mjs')},
  {id:'aft-motion',repository:'https://github.com/Syntaxswine/animal-factory-tactics-3d',commit:'25d0e91858be0fa5ea7d54132a4a642624bd9aa7',repo:arg('--aft'),files:['crawl-motion.js','crawl-equipment.js','crawl-state.js','animal-motion-catalog.js','battle-posture.js','idle-rig-math.js','roof-mantle-equipment.js','painted-fire-equipment.js'].map(f=>'dist/tactics/'+f).concat(['tests/crawl-motion.test.mjs','tests/crawl-loadouts.test.mjs'])},
  {id:'aft-query',repository:'https://github.com/Syntaxswine/animal-factory-tactics-3d',commit:'a20b343a0234b5d8b365a4e1668961ca1bf37653',repo:arg('--aft'),files:['dist/tactics/foliage-obstacles.js','dist/tactics/core/visibility.js']}
];
const sha=data=>createHash('sha256').update(data).digest('hex');
const sources=[];
for(const {repo,files,...source} of definitions){
  if(!repo)throw Error('Supply --aft and --fighters read-only checkout paths.');
  const git=args=>execFileSync('git',['-C',repo,...args],{windowsHide:true,maxBuffer:8*1024*1024});
  if(git(['rev-parse',source.commit+'^{commit}']).toString().trim()!==source.commit)throw Error('Commit unavailable.');
  source.files=[];
  for(const file of files){
    const bytes=git(['show',source.commit+':'+file]),original='vendor/shared-stealth/'+source.id+'/'+source.commit+'/original/'+file+'.original';
    if(write){const target=path.join(root,original);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw Error('Immutable original differs: '+original);fs.writeFileSync(target,bytes);}
    source.files.push({path:file,gitBlob:git(['rev-parse',source.commit+':'+file]).toString().trim(),bytes:bytes.length,sha256:sha(bytes),original});
  }
  sources.push(source);
}
const baseline='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641';
const base='7e9052dcf6a2aa00c6d38130f5f2345b86ceb593',files=['core/engine.js','awareness.js','core/perception.js','core/woodland.js','foliage-data.js','foliage-presets.js','foliage-obstacles.js','combat-state.js','stamina.js','goat-worker.js','horse-light-model.js','horse-rifle.js'];
sources.push({id:'aft-semantics',repository:'https://github.com/Syntaxswine/animal-factory-tactics-3d',commit:'781246a668c723d5a4c5463e70534cc04b6a5641',files:files.map(file=>{const original=baseline+'/dist/tactics/'+file,bytes=execFileSync('git',['show',base+':'+original],{cwd:root,windowsHide:true});return {path:'dist/tactics/'+file,gitBlob:execFileSync('git',['rev-parse',base+':'+original],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),original,bytes:bytes.length,sha256:sha(bytes)};})});
const manifest={kind:'nautilus-shared-stealth-sources',version:1,base,sources,briefs:{commit:'b12ff6c397763e63eb12e1c2648b1eacfe56292e',paths:['docs/intake/2026-11-07-shared-sneaking-and-foliage.md','docs/intake/2026-11-16-weekly-scout.md','docs/intake/2026-11-16-weekly-scout.sources.json']},adaptations:['Pure v1 host-confirmed movement, hearing and exposure boundaries; raw/effective Sneak remain distinct.','Original foliage geometry plus ordered smaller buckets/boolean early-out, cached only within immutable map revisions.','Native goat/hands/rifle only, selected original shirt/limb/carry math, mutually exclusive gait/crawl/action owner.','Study root compensated once; a strict durable signed-travel cursor replaces Fighters temporary samples.','Body uses original normal paint at native resolution; rifle retains its native geometry/default materials.'],scope:'Original files are reference-only slices, not executable module closures. Runtime adapters reuse the existing pinned goat, native rifle, geometry and single Three closure. Original imports remain byte-preserved. No donor game runtime is imported.',rights:'Source provenance grants no additional rights. No blanket license was found in the reviewed donor roots. Retain existing artwork and Three notices; no new art or Three copy is adopted.'};
if(write){fs.mkdirSync(path.join(root,'docs/reviews/shared-stealth'),{recursive:true});fs.writeFileSync(path.join(root,'docs/reviews/shared-stealth/sources.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify({sources:sources.length,files:sources.reduce((n,s)=>n+s.files.length,0),write}));
