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
const core=option('core'),ui=option('ui'),editor=option('editor'),base='d869410625b246cfff2b51089e7878c31951775c';
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
for(const commit of [core,ui,editor]){if(git(['rev-parse','--verify',commit+'^{commit}']).toString().trim()!==commit)throw Error('Commit mismatch.');git(['merge-base','--is-ancestor',base,commit]);}
const stage=path.join(root,'artifacts','editor-tile-authoring-c1-staging-'+randomUUID());fs.mkdirSync(stage,{recursive:true});
const overrides=new Map(),rows=new Map(),queue=[],parsed=new Set(),entries=['tests/editor-tile-authoring-c1.test.mjs','tests/editor-tile-authoring-jsonl.test.mjs','tests/editor-tile-authoring-resources.test.mjs','tests/ui-tile-authoring-c1.test.mjs'];
const uiPaths=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tests/ui-tile-authoring-c1.test.mjs','tools/ui-review-tile-authoring-c1.mjs',...['README.md','usage-card.json','source.json','validation.json'].map(name=>'docs/reviews/tile-authoring/ui/c1/'+name)];
const ownPaths=git(['diff','--name-only',base,editor]).toString().trim().split(/\r?\n/).filter(Boolean);
for(const file of ownPaths){if(uiPaths.includes(file)){if(!git(['show',editor+':'+file]).equals(git(['show',ui+':'+file])))throw Error('UI checkpoint bytes differ from explicit UI pin: '+file);continue;}if(!/^(apps\/editor\/tile-authoring\/|apps\/editor\/smart-tile\/session\.js$|examples\/tile-authoring-editor\.(html|js)$|tests\/editor-tile-authoring-|tests\/fixtures\/tile-authoring-editor\/|docs\/reviews\/tile-authoring\/editor\/|tools\/build\.mjs$|tools\/editor-(stage|review|verify)-tile-authoring-c1\.mjs$)/.test(file))throw Error('Unexpected Editor checkpoint path: '+file);overrides.set(file,editor);}
for(const file of uiPaths)overrides.set(file,ui);
function copy(file){
  if(file.startsWith('/')||file.split('/').some(p=>p==='..'||p==='')||file.includes('\\'))throw Error('Unsafe repository path: '+file);
  if(rows.has(file))return rows.get(file);
  const commit=overrides.get(file)??core,bytes=git(['show',commit+':'+file]),target=path.join(stage,...file.split('/'));
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  const row={file,commit,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};rows.set(file,row);return row;
}
for(const file of overrides.keys())copy(file);copy('package.json');queue.push(...entries);
while(queue.length){
  const batch=[...new Set(queue.splice(0))].filter(file=>!parsed.has(file));
  for(const file of batch){copy(file);parsed.add(file);}
  const modules=batch.filter(file=>/\.(m?js)$/.test(file)),references=moduleReferencesBatch(modules.map(file=>({filename:file,source:fs.readFileSync(path.join(stage,file),'utf8')})));
  for(const record of references)for(const specifier of record.specifiers){
    if(specifier.startsWith('node:'))continue;
    if(!specifier.startsWith('./')&&!specifier.startsWith('../'))throw Error('Source probe needs an explicit relative dependency: '+record.filename+' -> '+specifier);
    const file=path.posix.normalize(path.posix.join(path.posix.dirname(record.filename),specifier));copy(file);if(!parsed.has(file))queue.push(file);
  }
}
const report={kind:'nautilus-editor-c1-git-object-source-probe',version:1,scope:'Candidate investigation only; no runtime adoption, installed package or browser claim',base,core,ui,editor,stage,entries,inputs:[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file)),verificationInputs:['tools/editor-stage-tile-authoring-c1.mjs','tools/module-references.mjs'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),node:process.version};
fs.writeFileSync(path.join(stage,'staged-inputs.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stage,files:report.inputs.length,entries}));
