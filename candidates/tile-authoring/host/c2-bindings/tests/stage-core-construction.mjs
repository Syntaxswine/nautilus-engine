import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
export const constructionCommit='2810b3c333187eadb428a88c83d98a8256f0fa56';
const corePrefix='candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/',hostPrefix='candidates/tile-authoring/host/c2-bindings/';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function stageCoreConstruction(root=process.cwd()){
 const out=path.join(root,'artifacts/c2-host-bindings/core-2810b3c');
 const git=(args,input)=>execFileSync('git',['-c','core.longpaths=true','-C',root,...args],{input,windowsHide:true,timeout:30000,maxBuffer:64*1024*1024});
 const tree=new Map(git(['ls-tree','-r','-z',constructionCommit]).toString().split('\0').filter(Boolean).map(row=>{const [header,name]=row.split('\t');return [name,header.split(' ')[2]];}));
 const paths=new Set([...tree.keys()].filter(p=>p.startsWith(corePrefix)).concat(['package.json','NOTICE.md','upstream.json','tests/tile-authoring-core-c2-browser-constructors.test.mjs'])),records=new Map();
 while([...paths].some(p=>!records.has(p))){
  const pending=[...paths].filter(p=>!records.has(p)),batch=git(['cat-file','--batch'],pending.map(p=>constructionCommit+':'+p+'\n').join(''));let offset=0;
  for(const p of pending){const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString(),match=/^([0-9a-f]{40}) blob (\d+)$/.exec(header);if(!match||match[1]!==tree.get(p))throw Error('Missing fixed blob '+p);const n=Number(match[2]),bytes=batch.subarray(end+1,end+1+n);offset=end+2+n;if(bytes.length!==n||batch[offset-1]!==10)throw Error('Truncated fixed blob '+p);const target=path.join(out,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);records.set(p,{path:p,blob:match[1],bytes:n,sha256:hash(bytes)});
   if(/\.[cm]?js$/.test(p))for(const m of bytes.toString().matchAll(/(?:from\s*|import\s*\(|import\s*|new URL\(\s*)['"](\.[^'"\r\n]+)['"]/g)){const next=path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1]));if(tree.has(next))paths.add(next);}
  }
  if(offset!==batch.length)throw Error('Unexpected fixed batch suffix.');
 }
 for(const [name,expected]of [['host-construction.js','a1444a14ad504df5926c6aa8ba4f710e9bf820036c9d6afb43ba0e8ce84e83b8'],['host-construction.d.ts','799bd789218d7f2c0c3d460ee6af001e47938852d94b72739359509870963b09']])if(records.get(corePrefix+name)?.sha256!==expected)throw Error('Immutable constructor packet changed.');
 const hostOverlay=[];for(const name of ['host-composition.js','data.js']){const p=hostPrefix+name,bytes=fs.readFileSync(path.join(root,p)),target=path.join(out,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);hostOverlay.push({path:p,bytes:bytes.length,sha256:hash(bytes),origin:'task-owned Host implementation; no Core adaptation'});}
 const report={commit:constructionCommit,scope:'fixed review-only Core constructor bytes plus explicit task-owned Host overlay',records:[...records.values()],hostOverlay,sourceAdaptations:[]};fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'inputs.json'),JSON.stringify(report,null,2)+'\n');return {status:'staged',commit:constructionCommit,files:records.size,hostOverlay:hostOverlay.length,out};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(stageCoreConstruction()));
