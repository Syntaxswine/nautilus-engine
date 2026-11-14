// Opt-in content compiler. Originals stay byte-for-byte in vendor; adaptations
// and every emitted hash are recorded in the separate runtime inventory.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {SNAPSHOT,SOURCE_COMMIT,verifyMountDoraSnapshot} from './import.mjs';
import {npmFilePatterns} from '../npm-files.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
export function buildMountDoraContent(destination,{engineURL=null}={}){
 verifyMountDoraSnapshot();const out=path.resolve(destination),manifest=JSON.parse(fs.readFileSync(path.join(root,SNAPSHOT,'source.json'))),files=[];
 const threeImport=from=>engineURL?path.posix.relative(path.posix.dirname(from),engineURL+'render-effects/three.js').replace(/^(?!\.)/,'./'):'@nautilus-engine/map-core/render-effects/three';
 const write=(name,bytes,source,changes=[])=>{const dest=path.join(out,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);files.push({path:name,bytes:Buffer.byteLength(bytes),sha256:hash(bytes),source:source?{path:source.originalPath,sha256:source.sha256,gitBlob:source.gitBlob}:null,changes});};
 for(const row of manifest.files){
  // All runtime imports use the consumer's one shared Three namespace. Preserve
  // the unused upstream implementation in vendor, outside the resource payload.
  if(/\/vendor\/three\.(?:module|core|tsl)\.js$/.test(row.originalPath))continue;
  if(!row.runtimeModule&&!row.originalPath.startsWith('maps/mount-dora/')&&!row.originalPath.startsWith('sites/tactical-animal/dist/aft/assets/environment/')&&!row.purposes.includes('source notice')&&!row.purposes.includes('static resource')&&!row.originalPath.endsWith('painted-materials-bbe33709.png'))continue;
  // Maps include original parts, geometry and notices. Reference scans and old
  // prototype pages remain in the snapshot, outside the runnable content pack.
  if(row.originalPath.startsWith('maps/mount-dora/')&&!/\.(?:json|md|txt)$/i.test(row.originalPath))continue;
  let bytes=fs.readFileSync(path.join(root,SNAPSHOT,row.path)),changes=[];
  if(row.runtimeModule&&/\.(?:js|mjs)$/.test(row.originalPath)){
   let text=bytes.toString();
   if(row.originalPath==='sites/tactical-animal/dist/mission-art/mount-dora/placements.js'){text+='\nconst freezeImported=value=>{if(value&&typeof value==="object"){for(const child of Object.values(value))freezeImported(child);Object.freeze(value);}};freezeImported(PLACEMENTS);\n';changes.push('Read-only placement records, with all original data values retained');}
   if(row.originalPath.endsWith('/mount-dora-world.js')){text=text.replace('const item=moveShape(solid);this.closedBuildings.add','const item=moveShape({...solid,placementId:placement.id});this.closedBuildings.add');changes.push('Retain placement identity on closed-building collision records for explicit derived profiles');}
   text=text.replace(/(['"])([^'"]*\/(?:vendor\/)?three\.module\.js)\1/g,(_m,q)=>{changes.push('Shared engine Three namespace');return q+threeImport(row.originalPath)+q;});
   bytes=Buffer.from(text);
  }
  write(row.originalPath,bytes,row,changes);
 }
 const originals=new Map(manifest.files.map(row=>[row.originalPath,row])),projectRow=originals.get('maps/mount-dora/project.json'),project=JSON.parse(fs.readFileSync(path.join(root,SNAPSHOT,projectRow.path))),palette=['ground-grass','water','woodland','ground-dirt','ground-gravel','ground-asphalt','ground-concrete','ground-wood-planks','bridge','floor'],rows=Array.from({length:105},()=>Array(90).fill(0)),inputs=[];
 for(const sector of project.sectors){const row=originals.get('maps/mount-dora/'+sector.file),raw=JSON.parse(fs.readFileSync(path.join(root,SNAPSHOT,row.path)));inputs.push({path:row.originalPath,sha256:row.sha256});for(let y=0;y<15;y++)for(let x=0;x<15;x++){const counts=new Uint16Array(palette.length);for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++){const kind=palette.indexOf(raw.terrain[y*16+dy][x*16+dx]);if(kind<0)throw Error('MOUNT_DORA_OVERVIEW_TERRAIN');counts[kind]++;}let chosen=0;for(let i=1;i<counts.length;i++)if(counts[i]>counts[chosen])chosen=i;rows[sector.row*15+y][sector.column*15+x]=chosen;}}
 write('terrain-overview.json',JSON.stringify({kind:'nautilus-mount-dora-terrain-overview',version:1,sourceCommit:SOURCE_COMMIT,cellM:16,width:90,height:105,origin:[-.5,-.5],palette,rows,policy:'Distant visual majority at16m only; exact native geometry/support remains authoritative'})+'\n',null,['Derived from all42 verified native rasters; distant visual only']);files.at(-1).inputs=inputs;
 const source=manifest.files.find(r=>r.originalPath==='sites/tactical-animal/dist/mount-dora-view.js');let view=fs.readFileSync(path.join(root,SNAPSHOT,source.path),'utf8');
 view=view.replace("import * as T from './aft/tactics/vendor/three.module.js';",`import * as T from '${threeImport(source.originalPath)}';`)
  .replace("import {getTourWorld} from './mount-dora-activity.js';",'// The engine supplies its authoritative content world; no donor game activity.\nconst getTourWorld=state=>state.mountDoraWorld;')
  .replace('this.renderer.domElement.clientHeight*camera.zoom/(camera.top-camera.bottom)','camera.isOrthographicCamera?this.renderer.domElement.clientHeight*camera.zoom/(camera.top-camera.bottom):this.renderer.domElement.clientHeight/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(new T.Vector3(unit.x,unit.h||0,unit.y)))');
 write(source.originalPath,Buffer.from(view),source,['Shared engine Three','Inject authoritative engine world; omit full game activity dependency','Equivalent pixels/metre foliage threshold for standard perspective camera']);
 const prefix='./sites/tactical-animal/dist/';
 write('index.js',`export {TownWorld,decodeTownSector,solidDistance,shapeBounds} from '${prefix}mount-dora-world.js';\nexport * as art from '${prefix}mission-art/mount-dora/manifest.js';\nexport {createMountDoraArt,loadMountDoraAtlas} from '${prefix}mission-art/mount-dora/kit.js';\nexport {TownEnvironment} from '${prefix}mount-dora-view.js';\nexport const projectURL=new URL('./maps/mount-dora/project.json',import.meta.url);\nexport const baseURL=new URL('./maps/mount-dora/',import.meta.url);\n`);
 // Headless entry never loads Three or the environment.
 write('headless.js',`export {TownWorld,decodeTownSector,solidDistance,shapeBounds} from '${prefix}mount-dora-world.js';\nexport * as art from '${prefix}mission-art/mount-dora/manifest.js';\nexport const projectURL=new URL('./maps/mount-dora/project.json',import.meta.url);\nexport const baseURL=new URL('./maps/mount-dora/',import.meta.url);\n`);
 write('package.json',JSON.stringify({name:'@nautilus-engine/mount-dora-content',version:'0.1.0',private:true,type:'module',exports:{'.':'./index.js','./headless':'./headless.js','./inventory':'./runtime-inventory.json'},peerDependencies:{'@nautilus-engine/map-core':'0.10.x'},files:npmFilePatterns([...files.map(f=>f.path),'runtime-inventory.json','package-provenance.json']),nautilus:{sourceCommit:SOURCE_COMMIT,optIn:true}},null,2)+'\n');
 fs.writeFileSync(path.join(out,'runtime-inventory.json'),JSON.stringify({version:1,sourceCommit:SOURCE_COMMIT,sourceManifestSHA256:hash(fs.readFileSync(path.join(root,SNAPSHOT,'source.json'))),compilerSHA256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),engineURL,files},null,2)+'\n');return {path:out,files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),sourceCommit:SOURCE_COMMIT};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const i=process.argv.indexOf('--out');if(i<0)throw Error('Choose an explicit opt-in --out directory.');console.log(JSON.stringify(buildMountDoraContent(process.argv[i+1])));}
