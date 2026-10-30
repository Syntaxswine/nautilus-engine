// Offline public-package proof setup; no server/browser or consumer checkout.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packProfile,root} from './distribution.mjs';

const fixtureFiles=['grenade-reference.html','grenade-reference.css','grenade-reference.js','grenade-reference-host.js','grenade-reference-view.js'];
const proofKind='nautilus-grenade-installed-reference-v1';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function prepareInstalledGrenadeReference(){
 const stage=path.resolve(root,'artifacts/grenade-installed-reference');
 if(path.relative(root,stage)!==path.join('artifacts','grenade-installed-reference'))throw Error('Invalid installed-reference directory.');
 const marker=path.join(stage,'.proof-ownership.json');
 if(fs.existsSync(stage)){
  if(fs.lstatSync(stage).isSymbolicLink()||fs.realpathSync(stage)!==stage)throw Error('Refusing linked installed-reference directory.');
  const prior=JSON.parse(fs.readFileSync(marker,'utf8'));
  if(prior.kind!==proofKind||prior.projectRoot!==root)throw Error('Refusing to replace an unowned installed reference.');
  if(fs.readdirSync(stage).some(name=>!['.proof-ownership.json','package.json','node_modules','player','installation.json'].includes(name)))throw Error('Unexpected files in installed-reference directory; preserve them before retrying.');
  fs.rmSync(stage,{recursive:true,force:true});
 }
 fs.mkdirSync(stage,{recursive:true});
 fs.writeFileSync(marker,JSON.stringify({kind:proofKind,projectRoot:root,purpose:'Disposable offline installed grenade reference; rebuild deliberately through this tool.'},null,2)+'\n');
 const packed=packProfile('compatibility');
 fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'nautilus-installed-grenade-proof',private:true,type:'module'}));
 const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));
 if(!npmCli)throw Error('Run this proof through npm or a Node installation containing npm.');
 execFileSync(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',packed.file],{cwd:stage,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
 const installed=path.join(stage,'node_modules/@nautilus-engine/map-core');
 const manifest=JSON.parse(fs.readFileSync(path.join(installed,'package.json'),'utf8'));
 if(manifest.name!=='@nautilus-engine/map-core'||manifest.version!==packed.version)throw Error('Installed reference package identity differs.');
 const player=path.join(stage,'player');fs.mkdirSync(player);
 const sourceHTML=fs.readFileSync(path.join(root,'examples/grenade-reference.html'),'utf8');
 const match=sourceHTML.match(/<script type="importmap">([\s\S]*?)<\/script>/);
 if(!match)throw Error('Reference import map is missing.');
 const original=JSON.parse(match[1]),imports={};
 const publicPrefix='@nautilus-engine/map-core';
 for(const name of Object.keys(original.imports)){
  if(!name.startsWith(publicPrefix+'/'))throw Error('Reference uses an unexpected import-map namespace.');
  const entry=manifest.exports['.'+name.slice(publicPrefix.length)];
  if(typeof entry!=='string')throw Error('Installed package does not expose '+name);
  const file=path.resolve(installed,entry);
  if(!file.startsWith(installed+path.sep)||!fs.statSync(file).isFile())throw Error('Invalid installed public entry: '+name);
  imports[name]='../node_modules/'+publicPrefix+'/'+entry.replace(/^\.\//,'');
 }
 const sourceStyle='../packages/grenade-ui/style.css',sourceGuide='../docs/ui/grenade-controls.md';
 if(!sourceHTML.includes(sourceStyle)||!sourceHTML.includes(sourceGuide))throw Error('Reference stylesheet/guide links changed.');
 const html=sourceHTML.replace(match[0],'<script type="importmap">'+JSON.stringify({imports})+'</script>')
  .replace(sourceStyle,'../node_modules/'+publicPrefix+'/packages/grenade-ui/style.css')
  .replace(sourceGuide,'../node_modules/'+publicPrefix+'/docs/ui/grenade-controls.md');
 const files=fixtureFiles.map(name=>{
  const source=fs.readFileSync(path.join(root,'examples',name)),output=name.endsWith('.html')?Buffer.from(html):source;
  fs.writeFileSync(path.join(player,name),output);
  return {path:name,sourceSha256:hash(source),installedFixtureSha256:hash(output),adaptation:name.endsWith('.html')?'Public installed import map, stylesheet and guide URLs':'Unchanged consumer fixture bytes'};
 });
 const report={schemaVersion:1,preparedAt:new Date().toISOString(),package:packed,tarballSha256:hash(fs.readFileSync(packed.file)),publicImports:Object.keys(imports),files,sourceFallback:false,rawReferenceSnapshotsInstalled:false};
 for(const folder of ['farmyard-grenades','farmyard-grenade-visuals'])if(fs.existsSync(path.join(installed,'vendor',folder)))throw Error('Raw reference snapshot leaked into installed runtime.');
 fs.writeFileSync(path.join(stage,'installation.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(prepareInstalledGrenadeReference(),null,2));
