// Explicit optional-resource delivery. This does not alter the default build,
// publish a site, update a consumer pin or access a donor worktree.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {buildMountDoraContent} from './content.mjs';
import {distribution,moduleClosure,packProfile,packageProvenance} from '../distribution.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/mount-dora-pack'),hash=b=>createHash('sha256').update(b).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function npm(args,cwd){const cli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(f=>f&&path.basename(f)==='npm-cli.js'&&fs.existsSync(f));if(!cli)throw Error('NPM_CLI_UNAVAILABLE');return execFileSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});}
function copy(from,to,file){const dest=path.join(to,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(from,file),dest);}
export function packMountDora(){
 const stage=path.join(output,'content'),compiled=buildMountDoraContent(stage),inventory=JSON.parse(fs.readFileSync(path.join(stage,'runtime-inventory.json'))),records=[...inventory.files.map(({path,bytes,sha256})=>({path,bytes,sha256})),{path:'runtime-inventory.json',bytes:fs.statSync(path.join(stage,'runtime-inventory.json')).size,sha256:hash(fs.readFileSync(path.join(stage,'runtime-inventory.json')))}];
 write(path.join(stage,'package-provenance.json'),packageProvenance('mount-dora-content',records,{version:'0.1.0'}));
 const packed=JSON.parse(npm(['pack','--ignore-scripts','--json','--pack-destination',output],stage))[0],result={...compiled,path:undefined,file:path.join(output,packed.filename),compressedBytes:packed.size,unpackedBytes:packed.unpackedSize,fileCount:packed.entryCount,integrity:packed.integrity};write(path.join(output,'content-report.json'),result);return result;
}
function copyApps(destination,from=root){for(const file of ['index.html','main.js','style.css','storage.js','rail-study.html','rail-study.js'])copy(path.join(root,'apps/mount-dora'),path.join(destination,'apps/mount-dora'),file);for(const file of moduleClosure(['apps/mount-dora/rail-study.js']))copy(file.startsWith('apps/')?root:from,destination,file);fs.writeFileSync(path.join(destination,'index.html'),'<!doctype html><meta charset="utf-8"><title>Mount Dora · Nautilus Engine</title><a href="./apps/mount-dora/">Walk and author Mount Dora</a><br><a href="./apps/mount-dora/rail-study.html">Two railway operating studies</a>\n');}
function copyContent(from,destination){const inventory=JSON.parse(fs.readFileSync(path.join(from,'runtime-inventory.json')));for(const f of [...inventory.files.map(r=>r.path),'runtime-inventory.json','package-provenance.json'])if(fs.existsSync(path.join(from,f)))copy(from,path.join(destination,'mount-dora-content'),f);}
export function buildMountDoraSite(destination=path.join(root,'artifacts/mount-dora-site')){
 const out=path.resolve(destination);if(!out.startsWith(path.join(root,'artifacts')+path.sep))throw Error('MOUNT_DORA_SITE_OUTSIDE_ARTIFACTS');const plan=distribution('compatibility');for(const f of plan.files)copy(root,out,f);copyApps(out);
 const compiled=buildMountDoraContent(path.join(out,'mount-dora-content'),{engineURL:'../packages/'});write(path.join(out,'site-provenance.json'),{...packageProvenance('mount-dora-static-reference',plan.files.map(f=>({path:f,bytes:fs.statSync(path.join(root,f)).size,sha256:hash(fs.readFileSync(path.join(root,f)))}))),content:compiled,scope:'Opt-in static reference; no publication or audience change'});return {path:out,content:compiled};
}
export function testInstalledMountDora(){
 const content=packMountDora(),sdk=packProfile('compatibility'),consumer=path.join(output,'consumer');fs.mkdirSync(consumer,{recursive:true});write(path.join(consumer,'package.json'),{name:'mount-dora-installed-proof',private:true,type:'module'});
 npm(['install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',sdk.file,content.file],consumer);
 fs.copyFileSync(path.join(root,'tests/fixtures/mount-dora/package-proof.mjs'),path.join(consumer,'proof.mjs'));const proof=execFileSync(process.execPath,['proof.mjs'],{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024}).trim();
 const sdkRoot=path.join(consumer,'node_modules/@nautilus-engine/map-core'),contentRoot=path.join(consumer,'node_modules/@nautilus-engine/mount-dora-content'),site=path.join(output,'installed-site'),plan=distribution('compatibility');
 for(const f of [...plan.files,'package-provenance.json'])copy(sdkRoot,site,f);copyApps(site,sdkRoot);copyContent(contentRoot,site);
 // Browser import map binds the same installed Three bytes used by the SDK.
 const html=path.join(site,'apps/mount-dora/index.html'),text=fs.readFileSync(html,'utf8');fs.writeFileSync(html,text.replace('<script type="module"',`<script type="importmap">${JSON.stringify({imports:{'@nautilus-engine/map-core/render-effects/three':'../../packages/render-effects/three.js'}})}</script><script type="module"`));
 const result={sdk,content,proof,site,source:JSON.parse(fs.readFileSync(path.join(sdkRoot,'package-provenance.json'))).source,contentSource:JSON.parse(fs.readFileSync(path.join(contentRoot,'package-provenance.json'))).source};write(path.join(output,'installed-report.json'),result);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){console.log(JSON.stringify(process.argv.includes('--site')?buildMountDoraSite():process.argv.includes('--installed')?testInstalledMountDora():packMountDora(),null,2));}
