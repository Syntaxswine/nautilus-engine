// Fixed Git-object inspection only. No source checkout/ref changes or imports.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {moduleReferencesBatch} from './module-references.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pin='251bf8094b5f9ebe44208443084c1a6d6658512a',review='3c29604bdfb4210864910369ec09c59095249e8a',editor='9f525026f3185e0dce8115ce3a69f3a175ec7cf4',prefix='sites/tactical-animal/dist/',reuse='vendor/farmyard-grenades/'+pin+'/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function auditFarmyardWindows(repository){
  const donor=path.resolve(repository),git=(...args)=>execFileSync('git',['-c','safe.directory='+donor.replaceAll('\\','/'),'-C',donor,...args],{windowsHide:true,maxBuffer:16*1024*1024}),cache=new Map();git('merge-base','--is-ancestor',review,pin);
  const read=file=>{if(!cache.has(file))cache.set(file,git('show',pin+':'+file));return cache.get(file);};
  const groups={headless:['window-catalogue.js'],authoring:['window-authoring.js'],renderer:['art/windows/geometry.js'],presentation:['window-view.js']},closures={};
  for(const [name,entries]of Object.entries(groups)){
    const seen=new Set(),pending=entries.map(file=>prefix+file);
    while(pending.length){const batch=[...new Set(pending.splice(0))].filter(file=>!seen.has(file));if(!batch.length)break;batch.forEach(file=>seen.add(file));
      for(const record of moduleReferencesBatch(batch.map(file=>({filename:file,source:read(file).toString('utf8')}))))for(const specifier of record.specifiers){
        if(!specifier.startsWith('./')&&!specifier.startsWith('../')||/[\\?#%\u0000-\u001f]/.test(specifier))throw Error('Non-file or ambiguous runtime request: '+record.filename+' -> '+specifier);
        const child=path.posix.normalize(path.posix.join(path.posix.dirname(record.filename),specifier));if(!child.startsWith(prefix)||!child.endsWith('.js'))throw Error('Unreviewed closure request: '+child);if(!seen.has(child))pending.push(child);
      }
    }
    closures[name]={entries:entries.map(file=>prefix+file),modules:[...seen].sort(),bytes:[...seen].reduce((sum,file)=>sum+read(file).length,0)};
  }
  const resources=new Set();for(const [file,bytes]of cache){const source=bytes.toString('utf8');for(const match of source.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)){const resource=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));if(!resource.startsWith('sites/tactical-animal/'))throw Error('Escaping resource: '+resource);resources.add(resource);}}
  resources.add(prefix+'assets/audio/GLASS-SMASH-RUBBERDUCK-LICENSE.md');
  const context=[prefix+'solo-game.js',prefix+'art/windows/catalog.json','sites/tactical-animal/window-shatter-provenance.json','sites/tactical-animal/tests/window-integration.test.mjs','sites/tactical-animal/tests/window-borderless.test.mjs','sites/tactical-animal/tests/guard-window-integration.test.mjs','sites/tactical-animal/tests/window-provenance.test.mjs','docs/reviews/window-pane-integration/README.md','sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt'];
  for(const file of [...resources,...context])read(file);
  const atReview=new Set(git('ls-tree','-r','--name-only',review).toString('utf8').trim().split('\n'));
  const files=[...cache].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([file,bytes])=>{
    const local=path.join(root,reuse,file),reused=fs.existsSync(local)&&sha(fs.readFileSync(local))===sha(bytes);let sameAtReviewedCommit=false;
    if(atReview.has(file))sameAtReviewedCommit=sha(git('show',review+':'+file))===sha(bytes);
    return {path:file,bytes:bytes.length,gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha256:sha(bytes),groups:Object.entries(closures).filter(([,group])=>group.modules.includes(file)).map(([name])=>name),resource:resources.has(file),contextOnly:context.includes(file),sameAtReviewedCommit,...(reused?{existingEngineFile:reuse+file}:{})};
  });
  const editorPaths=['docs/intake/2026-10-29-pane-editor-preparation.md','tests/fixtures/editor-panes/catalogue-facts.json','tests/fixtures/editor-panes/legacy-authoring-fragment.json','tests/fixtures/editor-panes/observations.json'];
  const editorFiles=editorPaths.map(file=>{const bytes=execFileSync('git',['-C',root,'show',editor+':'+file],{windowsHide:true,maxBuffer:4*1024*1024});return {path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};});
  return {schemaVersion:1,status:'read-only audit and contract/fixture proposal; no provider/runtime/asset import',engineBase:'e7cf702b794174d7a010ef3380efc36af5441104',sourceRepository:'https://github.com/Syntaxswine/farmyard-commando',sourceCommit:pin,reviewedWindowsCommit:review,reviewedCommitIsAncestor:true,method:'Immutable Git blobs; decoded static/literal-dynamic ESM requests. Literal new URL resources are inventoried separately. This is not a runtime import, fetch/eval/Worker discovery, license grant or browser acceptance.',closures,resources:[...resources].sort(),files,editor:{commit:editor,files:editorFiles,adopted:false},rights:{headless:'Existing original bytes/comments are reused by reference. The catalogue inherited-study/art license statement is unresolved; preserve it and obtain the required review before distribution.',presentation:'Retain the shatter study provenance (ebf51393909040b61a7c40649d9d5f0ac3678735), audio CC0 notice and Three MIT notice. Raw renderer binds its own Three and is not an approved engine provider.',sourceNoticePaths:context.filter(file=>/provenance|LICENSE/.test(file)).concat([...resources].filter(file=>/LICENSE/.test(file)))}};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const index=process.argv.indexOf('--source-repository');if(index<0||!process.argv[index+1])throw Error('Pass --source-repository READ_ONLY_GIT_REPOSITORY.');const report=auditFarmyardWindows(process.argv[index+1]),file=path.join(root,'docs/reviews/farmyard-windows/source-audit.json'),json=JSON.stringify(report,null,2)+'\n';
  if(process.argv.includes('--write'))fs.writeFileSync(file,json);else if(fs.readFileSync(file,'utf8')!==json)throw Error('Fixed window audit differs from committed evidence.');
  console.log(JSON.stringify({status:'pass',written:process.argv.includes('--write'),closures:Object.fromEntries(Object.entries(report.closures).map(([name,group])=>[name,{modules:group.modules.length,bytes:group.bytes}])),resources:report.resources.length,inspectedFiles:report.files.length,editorFiles:report.editor.files.length,runtimeImports:0},null,2));
}
