// Private proof dependency ONLY: exact reviewed authoring Git objects plus the
// unchanged main dependency closure. No branch merge or root registration.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,baseCommit,authoringCommit} from './snapshot-native-window-presenter.mjs';
import {moduleClosure} from './distribution.mjs';
import {historicalRailwayCoreClosure} from './railway-route-registration.mjs';
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:12*1024*1024});
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stageAuthoring(directory){
  // The public source check authenticates the current registration before this
  // isolated peer is staged. Read the remaining closure only from the old pin.
  const closure=historicalRailwayCoreClosure(moduleClosure(['packages/map-core/index.js','packages/windows-core/index.js','packages/adapters/farmyard/windows.js']));
  const staged=git('ls-tree','-r','--name-only',authoringCommit,'packages/windows-authoring').toString().trim().split('\n');
  const files=[];
  for(const [commit,names]of [[baseCommit,closure],[authoringCommit,staged]])for(const file of names){const bytes=git('show',commit+':'+file),destination=path.join(directory,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);files.push({path:file,commit,bytes:bytes.length,sha256:sha(bytes)});}
  const manifest={kind:'explicit-private-staged-authoring-proof',registered:false,authoringCommit,dependencyCommit:baseCommit,files};
  fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'@nautilus-private/staged-window-authoring',version:'0.0.0',private:true,type:'module',exports:{'.':'./packages/windows-authoring/index.js'},files:[...files.map(f=>f.path),'staged-provenance.json']}));
  fs.writeFileSync(path.join(directory,'staged-provenance.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
