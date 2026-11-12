// Generate an ordinary source/static entry for the actual modular consumer.
// Installed proofs continue to use the separately packed offline archive.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
export const GROUND_RUNTIME=['data.js','registry.js','driving.js','content-data.json','host.js','runner.js','surface.js','application.js','main.js','ground.css'];
const root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
export function writeTestGroundEntry(outputRoot,{source=false}={}){
 const sourceDir=path.join(root,'apps/test-ground'),folder=source?path.join(outputRoot,'artifacts/traversal-source'):path.join(outputRoot,'apps/test-ground');fs.mkdirSync(folder,{recursive:true});
 const runtime=GROUND_RUNTIME.map(p=>{const b=fs.readFileSync(path.join(sourceDir,p));fs.writeFileSync(path.join(folder,p),b);return {path:p,bytes:b.length,sha256:sha(b)};});
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),imports=Object.fromEntries(Object.entries(pkg.exports).map(([key,value])=>['@nautilus-engine/map-core'+(key==='.'?'':key.slice(1)),'../../'+value.slice(2)]));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim(),engineSource={kind:'git-worktree',commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),dirty:!!git(['status','--porcelain'])};
 const hash=sha(JSON.stringify({runtime,exports:pkg.exports,engineSource})),installation={version:1,status:'prepared',engineCommit:engineSource.dirty?null:engineSource.commit,engineSource,package:{kind:source?'source-runtime':'built-static-runtime',sha256:hash,publicExports:Object.keys(pkg.exports).length,scope:'Consumer source and public export-map identity; not an npm archive digest. Loaded static resources are audited by browser proof.'},runtime};
 fs.writeFileSync(path.join(folder,'installation.json'),JSON.stringify(installation,null,2)+'\n');fs.writeFileSync(path.join(folder,'index.html'),fs.readFileSync(path.join(sourceDir,'index.template.html'),'utf8').replace('<!-- IMPORTMAP -->','<script type="importmap">'+JSON.stringify({imports})+'</script>'));
 return {folder,route:source?'/artifacts/traversal-source/':'/apps/test-ground/',installation};
}
if(process.argv.includes('--source'))console.log(JSON.stringify(writeTestGroundEntry(root,{source:true})));
