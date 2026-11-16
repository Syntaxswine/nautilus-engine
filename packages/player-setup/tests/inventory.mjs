import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {moduleReferenceGraph} from '../../../tools/module-references.mjs';
import {nativeActorResources} from '../../native-actors/index.js';
import {PLAYER_SKIN_RESOURCES} from '../../player-ui/resources.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const relative=file=>path.relative(root,file).replaceAll('\\','/');
export const record=file=>{const bytes=fs.readFileSync(path.resolve(root,file));return {path:relative(path.resolve(root,file)),bytes:bytes.length,sha256:sha(bytes)};};
export function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export function inventory(){
  const entryNames=['packages/player-setup/index.js','packages/player-setup/browser.js','packages/native-actors/index.js','packages/native-actors/three.js'];
  const graph=moduleReferenceGraph(entryNames.map(p=>path.join(root,p)),{root});
  const files=new Set(graph.map(r=>relative(r.filename))),assets=new Set();
  const addResource=file=>{file=path.resolve(file);if(!file.startsWith(root+path.sep))throw Error('Resource escapes candidate root.');const rel=relative(file);if(assets.has(rel))return;assets.add(rel);files.add(rel);
    if(path.extname(file)==='.css'){const text=fs.readFileSync(file,'utf8'),refs=[...text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)].map(m=>m[1]);refs.push(...[...text.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(m=>m[1]));for(const ref of refs){if(ref.startsWith('data:'))continue;if(!ref.startsWith('./')&&!ref.startsWith('../'))throw Error('Unenumerated stylesheet resource: '+ref);addResource(path.resolve(path.dirname(file),ref));}}
  };
  addResource(path.join(root,'packages/player-ui/style.css'));
  for(const list of Object.values(PLAYER_SKIN_RESOURCES))for(const url of list)addResource(fileURLToPath(url));
  for(const model of ['goat','donkey'])for(const r of nativeActorResources(model)){addResource(fileURLToPath(r.url));const actual=record(r.path);if(actual.bytes!==r.bytes||actual.sha256!==r.sha256)throw Error('Native resource changed: '+r.path);}
  const aft='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641',tinder='vendor/tinderbox-train-controls/fb0628605c274550ff8abad50b151843f08747d1',farm='vendor/farmyard/b2f2b6bd033cc3dbc8b572caa251244d283829c8';
  const notices=['NOTICE.md',aft+'/provenance.json',aft+'/dist/tactics/vendor/THREE-LICENSE.txt',tinder+'/NOTICE.md',tinder+'/source.json',tinder+'/assets/art/ui/typography/besley/OFL.txt',tinder+'/assets/art/ui/typography/oldstandardtt/OFL.txt',farm+'/provenance.json','packages/native-actors/NOTICE.md','packages/native-actors/source/worker-locomotion.js.original'];
  const metadata=['upstream.json','packages/assets/bindings/actor-intake-v1.json','packages/native-actors/catalogue.json','packages/native-actors/source.json','packages/player-setup/source.json'];
  for(const dir of ['native-actors','player-setup','player-ui','train-ui','train-core'])for(const file of walk(path.join(root,'packages',dir)))if(file.endsWith('.d.ts'))files.add(relative(file));
  for(const dir of ['native-actors','player-setup','player-ui','train-ui'])for(const name of ['README.md','USAGE-CARD.md','COMPACT-PROFILE.md','usage-card.json']){const file='packages/'+dir+'/'+name;if(fs.existsSync(path.join(root,file)))files.add(file);}
  for(const p of [...notices,...metadata])if(fs.existsSync(path.join(root,p)))files.add(p);else if(!p.endsWith('source.json')||!p.startsWith('packages/player-setup/'))throw Error('Required notice/input missing: '+p);
  const runtime=graph.map(r=>({...record(r.filename),imports:r.specifiers})).sort((a,b)=>a.path.localeCompare(b.path));
  const resources=[...assets].sort().map(record);
  const headless=moduleReferenceGraph([path.join(root,'packages/player-setup/index.js'),path.join(root,'packages/native-actors/index.js')],{root}).map(r=>relative(r.filename));
  if(headless.some(p=>/\/three\.|\/body\.|\/browser\.|\/surface\.|vendor\/.*three/.test(p)))throw Error('Headless entry reached visual code.');
  return {entries:entryNames,runtime,resources,notices:notices.map(record),headless,files:[...files].sort().map(record),counts:{runtimeFiles:runtime.length,runtimeBytes:runtime.reduce((a,r)=>a+r.bytes,0),resourceFiles:resources.length,resourceBytes:resources.reduce((a,r)=>a+r.bytes,0)}};
}
