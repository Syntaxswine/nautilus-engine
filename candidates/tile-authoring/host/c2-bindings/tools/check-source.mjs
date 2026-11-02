import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),projectRoot=path.resolve(here,'../../../..'),prefix='candidates/tile-authoring/host/c2-bindings/';
const hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const need=(v,m)=>{if(!v)throw Error(m);};
export async function checkHostBindingComponents(root=projectRoot){
 const dir=path.join(root,prefix),source=JSON.parse(fs.readFileSync(path.join(dir,'source.json'),'utf8'));
 const git=(...args)=>execFileSync('git',['-c','core.longpaths=true','-C',root,...args],{windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});
 const trees=new Map();function tree(commit){if(!trees.has(commit)){const data=new Map();for(const entry of git('ls-tree','-r','-z',commit).toString().split('\0').filter(Boolean)){const [header,p]=entry.split('\t');data.set(p,header.split(' ')[2]);}trees.set(commit,data);}return trees.get(commit);}
 need(source.status==='UNBOUND'&&source.publicReady===false&&source.liveNativeProof===false,'No production readiness may be inferred.');
 for(const row of source.localFiles){const bytes=fs.readFileSync(path.join(dir,row.path));need(bytes.length===row.bytes&&hash(bytes)===row.sha256,'Candidate bytes changed: '+row.path);}
 for(const pin of source.immutableInputs)for(const row of pin.files){const bytes=git('show',pin.commit+':'+row.path);need(bytes.length===row.bytes&&hash(bytes)===row.sha256&&blob(bytes)===row.blob&&tree(pin.commit).get(row.path)===row.blob,'Fixed input mismatch: '+row.path);}
 const snapshot=path.join(root,'artifacts/c2-host-bindings/exact'),inputs=JSON.parse(fs.readFileSync(path.join(snapshot,'inputs.json'),'utf8'));need(inputs.commit===source.kernelCommit,'Snapshot pin changed.');
 for(const row of inputs.records){const bytes=fs.readFileSync(path.join(snapshot,row.path));need(bytes.length===row.bytes&&hash(bytes)===row.sha256&&blob(bytes)===tree(inputs.commit).get(row.path),'Actual exact-object fixture changed: '+row.path);}
 const changed=git('diff','--name-only',source.base,'--').toString().trim().split(/\r?\n/).filter(Boolean);need(changed.every(p=>p.startsWith(prefix)),'Protected Root/baseline files changed.');
 const {distribution}=await import(pathToFileURL(path.join(root,'tools/distribution.mjs')).href),profiles={};for(const name of ['core','renderer','assets','compatibility']){const d=distribution(name);need(!d.files.some(p=>p.startsWith(prefix))&&!Object.values(d.exports).some(p=>p.includes(prefix)),'Private candidate leaked to '+name);profiles[name]={files:d.files.length,candidateExcluded:true};}
 return Object.freeze({status:'pass',scope:'private component source isolation; actual Host/Native pairing UNBOUND',base:source.base,kernel:source.kernelCommit,localFiles:source.localFiles.length,immutablePins:source.immutableInputs.length,exactSnapshotFiles:inputs.records.length,profiles,readOnly:true});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await checkHostBindingComponents(),null,2));
