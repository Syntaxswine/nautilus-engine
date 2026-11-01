import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {moduleClosure} from './distribution.mjs';
import {tileSchemas} from './tile-schemas.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function checkProceduralTiles(){
  const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/procedural-tiles/source-audit.json'))),upstream=JSON.parse(fs.readFileSync(path.join(root,'upstream.json')));if(upstream.aft.commit!==audit.reviewedAFT.commit)throw Error('AFT reference pin changed without deliberate review.');
  for(const f of audit.reviewedAFT.files){const bytes=fs.readFileSync(path.join(root,upstream.aft.root,'dist/tactics',f.path));if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256||createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==f.gitBlob)throw Error('Original AFT bytes changed: '+f.path);}
  for(const {file,schema}of tileSchemas())if(fs.readFileSync(path.join(root,file),'utf8')!==JSON.stringify(schema,null,2)+'\n')throw Error('Candidate tile schema drift: '+file);
  const files=moduleClosure(['packages/tiles-core/index.js']);if(files.some(f=>!f.startsWith('packages/tiles-core/')&&f!=='packages/parts-core/hash.js'))throw Error('Tile runtime reaches an unexpected dependency.');const runtime=files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
  // Exercise real imports/preparation with poisoned globals. A lexical search
  // would incorrectly classify ordinary data such as options.window.min and
  // diagnostic prose as browser accesses; the module graph already forbids IO
  // dependencies, and this probe verifies the used runtime boundary directly.
  const probe=spawnSync(process.execPath,['--input-type=module','-e',`for(const key of ['window','document','navigator','THREE','fetch','localStorage','performance','setTimeout','setInterval'])Object.defineProperty(globalThis,key,{get(){throw Error(key)}});Math.random=()=>{throw Error('game RNG')};Date.now=()=>{throw Error('clock')};const T=await import('./packages/tiles-core/index.js');const F=await import('./tests/fixtures/procedural-tiles/consumer.mjs');F.runRetainedTileProof(T);`],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});if(probe.status!==0)throw Error('Tile headless execution refused: '+probe.stderr);
  return {status:'pass',engineBase:audit.engineBase,sourceCommit:audit.reviewedAFT.commit,sourceFiles:audit.reviewedAFT.files.length,runtime,runtimeBytes:runtime.reduce((n,f)=>n+f.bytes,0),schemas:tileSchemas().map(s=>s.file),scope:'Measured raw bytes and exact source hashes, not a CPU/GPU/physics benchmark; root registration and family/game adoption remain separate.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const result=checkProceduralTiles();if(process.argv.includes('--write')){const folder=path.join(root,'artifacts/procedural-tiles');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'source-closure-report.json'),JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify(result,null,2));}
