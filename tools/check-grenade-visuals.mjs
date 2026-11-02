import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export function checkGrenadeVisuals(root,{tracked=null}={}){
 const sources=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))),pin=sources.farmyardGrenadeVisuals;
 assert.equal(pin.commit,sources.farmyardGrenades.commit);
 assert.equal(pin.root,'vendor/farmyard-grenade-visuals/'+pin.commit);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,pin.root,'provenance.json'))),derived=JSON.parse(fs.readFileSync(path.join(root,'packages/grenade-visuals/source.json')));
 assert.equal(manifest.commit,pin.commit);assert.equal(manifest.referenceOnly,true);assert.equal(derived.sourceCommit,pin.commit);assert.equal(derived.snapshot,pin.root);
 assert.equal(manifest.files.length,2);assert.equal(derived.generated.length,2);
 const read=file=>{const resolved=path.resolve(root,file);assert.ok(resolved.startsWith(path.resolve(root)+path.sep),'Source path escapes root');if(tracked)assert.ok(tracked.has(file),'Untracked grenade visual source: '+file);return fs.readFileSync(resolved);};
 const sha=(data,kind='sha256')=>createHash(kind).update(data).digest('hex');
 let bytes=0;
 for(const entry of manifest.files){assert.ok(/^tactics\/[a-z-]+\.js$/.test(entry.path));const data=read(pin.root+'/'+entry.path);assert.equal(data.length,entry.bytes);assert.equal(sha(data),entry.sha256);assert.equal(sha(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data]),'sha1'),entry.gitBlob);bytes+=data.length;}
 for(const entry of derived.generated){assert.ok(/^packages\/grenade-visuals\/[a-z-]+\.js$/.test(entry.path));const data=read(entry.path);assert.equal(data.length,entry.bytes);assert.equal(sha(data),entry.sha256);}
 for(const entry of manifest.externalDependencyClosure){assert.ok(entry.reusedPath.startsWith(sources.aft.root+'/dist/tactics/vendor/'));assert.equal(sha(read(entry.reusedPath)),entry.reusedSha256);}
 const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{const file=path.join(folder,entry.name);return entry.isDirectory()?walk(file):[path.relative(path.join(root,pin.root),file).replaceAll('\\','/')];});
 assert.deepEqual(walk(path.join(root,pin.root)).sort(),['provenance.json',...manifest.files.map(entry=>entry.path)].sort());
 return {commit:pin.commit,originalFiles:manifest.files.length,originalBytes:bytes,generatedModules:derived.generated.length,duplicateThreeModules:0};
}
