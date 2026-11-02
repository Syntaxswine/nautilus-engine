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
const successor=process.argv.some(a=>a.startsWith('--successor-codec='))?option('successor-codec'):null,successorImportPath='docs/reviews/tile-authoring/editor/c1/successor-import.json',successorPaths=['apps/editor/smart-tile/checkpoint.js','apps/editor/tile-authoring/checkpoint.js'];
const successorEvidencePaths=['tests/owned-successors.test.mjs','docs/reviews/tile-authoring/editor/c1/owned-successors-validation.json'],approvedSuccessor='1e8d0d702938e7418dc0203383516ab0c26a6e6a',successorTestHash='8c64e5ebc0f6e5cd32d370a7aac846571fcebdc185e3add6289d772ca4a971d8';
const successorTestImports=['../apps/editor/smart-tile/checkpoint.js','../apps/editor/tile-authoring/jsonl.js','./fixtures/smart-tile-editor/source.mjs','./fixtures/tile-authoring-editor/c1.mjs'];
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
for(const commit of [core,coreDocs,ui,editor,helper,...(successor?[successor]:[])]){if(git(['rev-parse','--verify',commit+'^{commit}']).toString().trim()!==commit)throw Error('Commit mismatch.');git(['merge-base','--is-ancestor',base,commit]);}
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
let successorImport=null;const hasSuccessorImport=git(['ls-tree','--name-only',editor,'--',successorImportPath]).toString().trim();
if(hasSuccessorImport||successor){
  if(!hasSuccessorImport||!successor)throw Error('Supply both the exact successor import audit and full --successor-codec pin.');
  const bytes=git(['show',editor+':'+successorImportPath]),audit=JSON.parse(bytes);
  if(successor!==approvedSuccessor)throw Error('Use only the exact reviewed owned-successor checkpoint.');
  if(audit.kind!=='nautilus-editor-c1-reviewed-successor-codec-import'||audit.version!==1||audit.sourceCommit!==successor||audit.baseRuntime!=='191f6fe63de6125d3a0f0e96b998541bade01d19'||audit.files.length!==2||new Set(audit.files.map(r=>r.file)).size!==2)throw Error('Successor import must authenticate exactly the authorized two-file refinement.');
  git(['merge-base','--is-ancestor',audit.baseRuntime,successor]);
  for(const row of audit.files){if(!successorPaths.includes(row.file)||row.sourceCommit!==successor)throw Error('Unexpected successor import path/origin.');const actual=git(['show',successor+':'+row.file]);if(row.bytes!==actual.length||row.sha256!==createHash('sha256').update(actual).digest('hex'))throw Error('Changed successor import bytes: '+row.file);}
  if(audit.evidenceFiles?.length!==2||new Set(audit.evidenceFiles.map(r=>r.file)).size!==2)throw Error('Authenticate both named successor evidence files separately.');
  for(const row of audit.evidenceFiles){if(!successorEvidencePaths.includes(row.file)||row.sourceCommit!==successor)throw Error('Unexpected successor evidence path/origin.');const actual=git(['show',successor+':'+row.file]);if(row.bytes!==actual.length||row.sha256!==createHash('sha256').update(actual).digest('hex'))throw Error('Changed successor evidence bytes: '+row.file);}
  const tooling=audit.testTooling,reference=tooling?.reference;
  if(tooling?.file!==successorEvidencePaths[0]||tooling.sourceCommit!==successor||tooling.sha256!==successorTestHash||JSON.stringify(tooling.literalLocalImports)!==JSON.stringify(successorTestImports)||reference?.file!=='apps/editor/smart-tile/checkpoint.js'||reference.sourceCommit!==audit.baseRuntime)throw Error('The named Node-only oracle must retain its exact reviewed closure and fixed 191 reference.');
  const original=git(['show',reference.sourceCommit+':'+reference.file]);if(reference.bytes!==original.length||reference.sha256!==createHash('sha256').update(original).digest('hex'))throw Error('Changed fixed-191 oracle source.');
  const relocations=[['../../../packages/parts-core/hash.js','packages/parts-core/hash.js'],['./contract.js','apps/editor/smart-tile/contract.js']];
  if(reference.dependencies?.length!==2)throw Error('Only the two literal reference relocations are approved.');for(const [i,[specifier,file]]of relocations.entries()){const row=reference.dependencies[i],actual=git(['show',audit.baseRuntime+':'+file]);if(row.specifier!==specifier||row.file!==file||row.sourceCommit!==audit.baseRuntime||row.bytes!==actual.length||row.sha256!==createHash('sha256').update(actual).digest('hex')||!actual.equals(git(['show',successor+':'+file])))throw Error('Changed fixed-191 oracle relocation: '+file);}
  successorImport={file:successorImportPath,sha256:createHash('sha256').update(bytes).digest('hex'),...audit};
  entries.push(successorEvidencePaths[0]);
}
const ownPaths=git(['diff','--name-only',base,editor]).toString().trim().split(/\r?\n/).filter(Boolean);
for(const file of ownPaths){const dependency=uiPaths.includes(file)?ui:corePaths.has(file)?(file===coreEvidencePath?coreDocs:core):successor&&[...successorPaths,...successorEvidencePaths].includes(file)?successor:helperPaths.includes(file)?helper:null;if(dependency){if(!git(['show',editor+':'+file]).equals(git(['show',dependency+':'+file])))throw Error('Dependency bytes differ from explicit immutable pin: '+file);if(dependency===helper||dependency===successor||file===coreEvidencePath)overrides.set(file,dependency);continue;}if(!/^(apps\/editor\/tile-authoring\/|apps\/editor\/smart-tile\/session\.js$|examples\/tile-authoring-editor\.(html|js)$|tests\/editor-tile-authoring-|tests\/fixtures\/tile-authoring-editor\/|docs\/reviews\/tile-authoring\/editor\/|tools\/build\.mjs$|tools\/editor-(stage|review|verify|direct)-tile-authoring-c1\.mjs$)/.test(file))throw Error('Unexpected Editor checkpoint path: '+file);overrides.set(file,editor);}
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
// Authenticate the reviewed tool before enumerating its literal local
// imports; the ordinary strict parser still owns every runtime/test module.
const explicitProofTools=[];
const proofToolPins=new Map([
  ['f94b57b2cebce55fc27cc94dea7a9fe39ec20193',{sha256:'1fa1ac840c8929fe596d388e3bf391314c66d98b0ecb9bc61b82ace2959b2d79',specifiers:['../apps/editor/tile-authoring/ui/commands.js','./module-references.mjs']}],
  ['95511cb6f04dcba65656b2d9156c6173a84d6198',{sha256:'42da384eb7ea9986e5dddb98126a9cd0e993ab809fb83f12f491f0d640b84f0c',specifiers:['../apps/editor/tile-authoring/ui/commands.js','./module-references.mjs','./art-review-browser.mjs']}],
  ['8053b30e4db325ad16e07a456fcf8ef5030324a7',{sha256:'7968bc851f6b2bc51acc6e33339fe13b3e8c98ce3237d2e8cd5ac81e11e901c4',specifiers:['../apps/editor/tile-authoring/ui/commands.js','./module-references.mjs','./art-review-browser.mjs']}]
]);
function explicitProofReferences(file){
  if(file===successorEvidencePaths[0]&&successor===approvedSuccessor&&successorImport){
    if(rows.get(file).commit!==successor||rows.get(file).sha256!==successorTestHash)throw Error('Changed named successor oracle bytes.');
    explicitProofTools.push({file,commit:successor,sha256:successorTestHash,specifiers:successorTestImports,reference:successorImport.testTooling.reference,scope:'Only this exact Node-only test uses its fixed-191 data-URL reference and two literal unchanged production relocations. No runtime/package/parser allowance.'});return {filename:file,specifiers:successorTestImports};
  }
  if(file==='tools/ui-review-tile-authoring-c1.mjs'&&proofToolPins.has(ui)){
    const source=fs.readFileSync(path.join(stage,file),'utf8');
    const pin=proofToolPins.get(ui);if(createHash('sha256').update(source).digest('hex')!==pin.sha256)throw Error('Reviewed UI proof-tool bytes changed.');
    const {specifiers}=pin;explicitProofTools.push({file,commit:ui,sha256:rows.get(file).sha256,specifiers,scope:'Literal local tooling imports only; fixed-Git constructor and browser-only loaders are not executed by these source-probe tests. Browser-only UI files are separately staged byte-exact from this same UI pin.'});return {filename:file,specifiers};
  }
  return null;
}
for(const file of overrides.keys())copy(file);copy('package.json');queue.push(...entries);
if(successorImport)for(const dependency of successorImport.testTooling.reference.dependencies){const row=copy(dependency.file);if(row.bytes!==dependency.bytes||row.sha256!==dependency.sha256)throw Error('Staged oracle dependency differs from its fixed-191 source: '+dependency.file);}
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
const report={kind:'nautilus-editor-c1-git-object-source-probe',version:1,scope:'Candidate investigation only; no runtime adoption, installed package or browser claim',base,core,coreDocs,coreImport,successor,successorImport,explicitProofTools,ui,editor,helper,stage,entries,inputs:[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file)),verificationInputs:['tools/editor-stage-tile-authoring-c1.mjs','tools/module-references.mjs'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),node:process.version};
fs.writeFileSync(path.join(stage,'staged-inputs.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stage,files:report.inputs.length,entries}));
