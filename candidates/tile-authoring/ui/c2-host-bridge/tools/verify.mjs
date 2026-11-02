import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {moduleReferencesBatch} from '../../../../../tools/module-references.mjs';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const indexed=process.argv.includes('--index');
function checkIndex(file,bytes){if(indexed){const relative=path.relative(root,path.join(here,file)).replaceAll('\\','/'),stored=execFileSync('git',['show',':'+relative],{cwd:root,maxBuffer:16e6,windowsHide:true});assert.ok(stored.equals(bytes),'Git index bytes: '+file);}}
let originalFiles=0,originalBytes=0;
for(const manifest of ['vendor/source.json','references/source.json'])for(const row of JSON.parse(fs.readFileSync(path.join(here,manifest))).inputs){
 const bytes=fs.readFileSync(path.join(here,row.vendored)),original=execFileSync('git',['show',row.commit+':'+row.path],{cwd:root,maxBuffer:16e6,windowsHide:true});assert.ok(bytes.equals(original),row.vendored);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);checkIndex(row.vendored,bytes);originalFiles++;originalBytes+=bytes.length;
}
const source=JSON.parse(fs.readFileSync(path.join(here,'source.json')));
// The extra portable control entry is byte-identical to accepted 53d, including
// its complete static closure. This is not the unreviewed actual session path.
const core=JSON.parse(fs.readFileSync(path.join(here,'vendor/source.json'))),coreRows=new Map(core.inputs.filter(row=>row.commit==='0597fc3b7ed9213842df90e8a1bbd4d0887ba49f').map(row=>[row.path,row])),portableSeen=new Set(),queue=['candidates/tile-authoring/core/c2/portable.js'];
while(queue.length){const file=queue.shift();if(portableSeen.has(file))continue;portableSeen.add(file);const row=coreRows.get(file);assert.ok(row,file);const bytes=fs.readFileSync(path.join(here,row.vendored)),accepted=execFileSync('git',['show','53d7d1f4bc4b5a8205e16cbbf6a29672e6f9db32:'+file],{cwd:root,maxBuffer:16e6,windowsHide:true});assert.ok(bytes.equals(accepted),'Accepted portable ancestry: '+file);if(/\.(mjs|js)$/.test(file))for(const spec of moduleReferencesBatch([{filename:file,source:bytes.toString('utf8')}])[0].specifiers){assert.ok(spec.startsWith('.'));queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec)));}}
for(const row of source.rootInputs){assert.equal(sha(fs.readFileSync(path.join(root,row.path))),row.sha256,row.path);}
for(const row of source.files){const bytes=fs.readFileSync(path.join(here,row.path));assert.equal(sha(bytes),row.sha256,row.path);checkIndex(row.path,bytes);}
checkIndex('source.json',fs.readFileSync(path.join(here,'source.json')));
const modules=[];function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else if(/\.(mjs|js)$/.test(file))modules.push({filename:file,source:fs.readFileSync(file,'utf8')});}}visit(here);
let relativeEdges=0;for(const refs of moduleReferencesBatch(modules))for(const spec of refs.specifiers){if(spec.startsWith('.')){assert.ok(fs.existsSync(path.resolve(path.dirname(refs.filename),spec)),refs.filename+' -> '+spec);relativeEdges++;}else assert.ok(spec.startsWith('node:'),'No network/package fallback: '+spec);}
const ctor=fs.readFileSync(path.join(here,'construct.mjs'),'utf8');assert.doesNotMatch(ctor,/\.begin\s*\(|\.forAuthoringAttempt\s*\(|\.prepare\s*\(|\.apply\s*\(|retainCommand\s*\(|constructionOwner/);
assert.equal((ctor.match(/ports\.idOwner\.allocate\(/g)??[]).length,1);assert.doesNotMatch(ctor,/tileLayoutToken|createHash|randomUUID/);
const packageData=JSON.parse(fs.readFileSync(path.join(root,'package.json')));for(const file of packageData.files)assert.ok(!file.startsWith('candidates/'));assert.ok(!JSON.stringify(packageData.exports).includes('c2-host-bridge'));
assert.equal(source.bindings.actualSessionCorePreparation,'UNBOUND');assert.equal(source.bindings.native,'UNBOUND');assert.equal(source.bindings.browserWideEditingMeter,'UNBOUND');
console.log(JSON.stringify({originalFiles,originalBytes,ownedFiles:source.files.length,rootInputs:source.rootInputs.length,modules:modules.length,relativeEdges,accepted53dPortableClosureFiles:portableSeen.size,indexBytesVerified:indexed,normalDistributionExcluded:true,actualHostApplyProof:false,nativeProof:false,editingMeterProof:false,walProof:false}));
