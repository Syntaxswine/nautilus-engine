// Isolated source investigation from immutable Git objects. This does not adopt
// candidate runtime files, change pins/registration, or read worker checkouts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {moduleReferencesBatch} from './module-references.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const option=name=>{const value=process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);if(!/^[a-f0-9]{40}$/.test(value??''))throw Error('Supply a fixed full --'+name+' commit.');return value;};
const core=option('core'),coreDocs=process.argv.some(a=>a.startsWith('--core-docs='))?option('core-docs'):core,ui=option('ui'),editor=option('editor'),base='d869410625b246cfff2b51089e7878c31951775c',helper=process.argv.some(a=>a.startsWith('--helper='))?option('helper'):base;
const coreEvidencePath='docs/reviews/tile-authoring/core/c1-validation.json',coreImportPath='docs/reviews/tile-authoring/editor/c1/core-import.json';
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
for(const commit of [core,coreDocs,ui,editor,helper]){if(git(['rev-parse','--verify',commit+'^{commit}']).toString().trim()!==commit)throw Error('Commit mismatch.');git(['merge-base','--is-ancestor',base,commit]);}
if(coreDocs!==core){git(['merge-base','--is-ancestor',core,coreDocs]);const changes=git(['diff','--name-only',core,coreDocs]).toString().trim().split(/\r?\n/);if(changes.length!==1||changes[0]!==coreEvidencePath)throw Error('--core-docs must change only the explicitly reviewed Core validation evidence.');}
const stage=path.join(root,'artifacts','editor-tile-authoring-c1-staging-'+randomUUID());fs.mkdirSync(stage,{recursive:true});
const overrides=new Map(),rows=new Map(),queue=[],parsed=new Set(),entries=['tests/editor-tile-authoring-c1.test.mjs','tests/editor-tile-authoring-cache.test.mjs','tests/editor-tile-authoring-jsonl.test.mjs','tests/editor-tile-authoring-resources.test.mjs','tests/ui-tile-authoring-c1.test.mjs'];
const uiPaths=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tests/ui-tile-authoring-c1.test.mjs','tools/ui-review-tile-authoring-c1.mjs',...['README.md','usage-card.json','source.json','validation.json'].map(name=>'docs/reviews/tile-authoring/ui/c1/'+name)];
const corePaths=new Set(git(['diff','--name-only',base,core]).toString().trim().split(/\r?\n/).filter(Boolean));if(corePaths.size!==26)throw Error('Expected the explicit 26-path Core component checkpoint.');
let coreImport=null;
if(git(['ls-tree','--name-only',editor,'--',coreImportPath]).toString().trim()){
  const bytes=git(['show',editor+':'+coreImportPath]),audit=JSON.parse(bytes);
  if(audit.kind!=='nautilus-editor-c1-reviewed-dependency-import'||audit.version!==1||audit.runtimeOrigin!==core||![core,coreDocs].includes(audit.sourceCommit)||audit.files.length!==corePaths.size||new Set(audit.files.map(row=>row.file)).size!==corePaths.size)throw Error('Core import audit does not match the explicit runtime/docs pins.');
  for(const row of audit.files){
    if(!corePaths.has(row.file)||![core,coreDocs].includes(row.sourceCommit))throw Error('Unexpected per-path Core import provenance: '+row.file);
    const selected=row.file===coreEvidencePath?coreDocs:core,claimed=git(['show',row.sourceCommit+':'+row.file]),expected=git(['show',selected+':'+row.file]);
    if(!claimed.equals(expected)||row.bytes!==claimed.length||row.sha256!==createHash('sha256').update(claimed).digest('hex'))throw Error('Core import provenance/hash differs from the explicit path pin: '+row.file);
  }
  coreImport={file:coreImportPath,sha256:createHash('sha256').update(bytes).digest('hex'),...audit};
}
const helperPaths=['tools/art-review-browser.mjs','tests/art-review-lifetime.test.mjs','docs/reviews/tile-stack/architect/helper-deadline.md'];
const ownPaths=git(['diff','--name-only',base,editor]).toString().trim().split(/\r?\n/).filter(Boolean);
for(const file of ownPaths){const dependency=uiPaths.includes(file)?ui:corePaths.has(file)?(file===coreEvidencePath?coreDocs:core):helperPaths.includes(file)?helper:null;if(dependency){if(!git(['show',editor+':'+file]).equals(git(['show',dependency+':'+file])))throw Error('Dependency bytes differ from explicit immutable pin: '+file);if(dependency===helper||file===coreEvidencePath)overrides.set(file,dependency);continue;}if(!/^(apps\/editor\/tile-authoring\/|apps\/editor\/smart-tile\/session\.js$|examples\/tile-authoring-editor\.(html|js)$|tests\/editor-tile-authoring-|tests\/fixtures\/tile-authoring-editor\/|docs\/reviews\/tile-authoring\/editor\/|tools\/build\.mjs$|tools\/editor-(stage|review|verify|direct)-tile-authoring-c1\.mjs$)/.test(file))throw Error('Unexpected Editor checkpoint path: '+file);overrides.set(file,editor);}
for(const file of uiPaths)overrides.set(file,ui);
function copy(file){
  if(file.startsWith('/')||file.split('/').some(p=>p==='..'||p==='')||file.includes('\\'))throw Error('Unsafe repository path: '+file);
  if(rows.has(file))return rows.get(file);
  const commit=overrides.get(file)??core,bytes=git(['show',commit+':'+file]),target=path.join(stage,...file.split('/'));
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  const row={file,commit,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};rows.set(file,row);return row;
}
// The final UI control imports this proof tool only to check its early
// unapproved-pin refusal. Its separate actual-constructor entry loads a fixed
// Git-object closure through a computed file URL, outside this source probe.
// Authenticate the one reviewed tool before enumerating its two literal local
// imports; the ordinary strict parser still owns every runtime/test module.
const explicitProofTools=[];
function explicitProofReferences(file){
  if(file==='tools/ui-review-tile-authoring-c1.mjs'&&ui==='f94b57b2cebce55fc27cc94dea7a9fe39ec20193'){
    const source=fs.readFileSync(path.join(stage,file),'utf8');
    if(createHash('sha256').update(source).digest('hex')!=='1fa1ac840c8929fe596d388e3bf391314c66d98b0ecb9bc61b82ace2959b2d79')throw Error('Reviewed UI proof-tool bytes changed.');
    const specifiers=['../apps/editor/tile-authoring/ui/commands.js','./module-references.mjs'];explicitProofTools.push({file,commit:ui,sha256:rows.get(file).sha256,specifiers,scope:'Literal local tooling imports only; computed fixed-Git constructor loader is not executed by these source-probe tests.'});return {filename:file,specifiers};
  }
  return null;
}
for(const file of overrides.keys())copy(file);copy('package.json');queue.push(...entries);
while(queue.length){
  const batch=[...new Set(queue.splice(0))].filter(file=>!parsed.has(file));
  for(const file of batch){copy(file);parsed.add(file);}
  const modules=batch.filter(file=>/\.(m?js)$/.test(file)),explicit=modules.map(explicitProofReferences).filter(Boolean),specialFiles=new Set(explicit.map(record=>record.filename));
  const references=[...moduleReferencesBatch(modules.filter(file=>!specialFiles.has(file)).map(file=>({filename:file,source:fs.readFileSync(path.join(stage,file),'utf8')}))),...explicit];
  for(const record of references)for(const specifier of record.specifiers){
    if(specifier.startsWith('node:'))continue;
    if(!specifier.startsWith('./')&&!specifier.startsWith('../'))throw Error('Source probe needs an explicit relative dependency: '+record.filename+' -> '+specifier);
    const file=path.posix.normalize(path.posix.join(path.posix.dirname(record.filename),specifier));copy(file);if(!parsed.has(file))queue.push(file);
  }
}
const report={kind:'nautilus-editor-c1-git-object-source-probe',version:1,scope:'Candidate investigation only; no runtime adoption, installed package or browser claim',base,core,coreDocs,coreImport,explicitProofTools,ui,editor,helper,stage,entries,inputs:[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file)),verificationInputs:['tools/editor-stage-tile-authoring-c1.mjs','tools/module-references.mjs'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),node:process.version};
fs.writeFileSync(path.join(stage,'staged-inputs.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stage,files:report.inputs.length,entries}));
