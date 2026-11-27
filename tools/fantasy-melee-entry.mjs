import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {writeTestGroundEntry} from './test-ground-entry.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
export const FANTASY_MELEE_RUNTIME=['host.js','main.js','melee.css'];
export const FANTASY_ART_PIN='700bc3e93de495400bb74a6b3b7618b1426fb1f3';
export function writeFantasyMeleeEntry(outputRoot,{source=false,packageBase,packageProof}={}){
 if(source)writeTestGroundEntry(outputRoot,{source:true});
 const folder=path.join(outputRoot,source?'artifacts/fantasy-melee-source':'apps/test-ground/melee');fs.mkdirSync(folder,{recursive:true});
 const runtime=FANTASY_MELEE_RUNTIME.map(file=>{const bytes=fs.readFileSync(path.join(root,'apps/test-ground/melee',file));fs.writeFileSync(path.join(folder,file),bytes);return {path:file,bytes:bytes.length,sha256:sha(bytes)};});
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),prefix=packageBase??(source?'../../':'../../../'),imports=Object.fromEntries(Object.entries(pkg.exports).map(([key,value])=>[pkg.name+(key==='.'?'':key.slice(1)),prefix+value.slice(2)]));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim(),engineSource={commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),dirty:!!git(['status','--porcelain'])};
 const installation={version:1,status:'prepared',engineSource,approvedArtCommit:FANTASY_ART_PIN,package:packageProof??{kind:source?'source-runtime':'built-static-runtime',sha256:sha(JSON.stringify({runtime,exports:pkg.exports,engineSource})),scope:'Fixture/public export map identity; not an archive digest.'},runtime};
 let template=fs.readFileSync(path.join(root,'apps/test-ground/melee/index.template.html'),'utf8');if(source)template=template.replace('href="../">Night Ledger fixtures','href="../traversal-source/">Night Ledger fixtures');if(packageBase)template=template.replace('href="../">Night Ledger fixtures','href="#events">Combat results');
 fs.writeFileSync(path.join(folder,'index.html'),template.replace('<!-- IMPORTMAP -->','<script type="importmap">'+JSON.stringify({imports})+'</script>'));fs.writeFileSync(path.join(folder,'installation.json'),JSON.stringify(installation,null,2)+'\n');return {folder,route:source?'/artifacts/fantasy-melee-source/':'/apps/test-ground/melee/',installation};
}
if(process.argv.includes('--source'))console.log(JSON.stringify(writeFantasyMeleeEntry(root,{source:true})));
