// Deliberate source registration for this bounded successor. Original ledgers
// are read from the accepted commit and are never regenerated or edited.
import fs from 'node:fs';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {root,distribution,moduleClosure} from './distribution.mjs';import {npmFilePatterns} from './npm-files.mjs';
const base='7e9052dcf6a2aa00c6d38130f5f2345b86ceb593',sha=b=>createHash('sha256').update(b).digest('hex'),git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:24*1024*1024});
const names=['core','renderer','assets','compatibility'],old=JSON.parse(git(['show',base+':docs/reviews/donnelly-interior/registration.json'])),packageFile=path.join(root,'package.json'),pkg=JSON.parse(fs.readFileSync(packageFile,'utf8'));
pkg.files=npmFilePatterns(distribution().files);fs.writeFileSync(packageFile,JSON.stringify(pkg,null,2)+'\n');
const excluded=new Set(['tools/shared-stealth-registration.mjs','docs/reviews/shared-stealth/registration.json']);
const files=[...new Set([...git(['diff','--name-only',base,'-z']).toString().split('\0'),...git(['ls-files','--others','--exclude-standard','-z']).toString().split('\0')])].filter(f=>f&&!excluded.has(f)).sort().map(file=>{
  const bytes=fs.readFileSync(path.join(root,file)),old=spawnSync('git',['show',base+':'+file],{cwd:root,windowsHide:true,maxBuffer:24*1024*1024});return {path:file,bytes:bytes.length,sha256:sha(bytes),...(old.status===0?{beforeSha256:sha(old.stdout)}:{})};
});
const manifest={kind:'nautilus-shared-stealth-registration',version:1,base,scope:'One headless AFT stealth/foliage contract, native goat hands/rifle flat-plane binding and public-import contract fixture. No game/Sites adoption.',files,profiles:Object.fromEntries(names.map(p=>{const d=distribution(p);return [p,{name:d.name,exports:d.exports,files:d.files}];})),baselineProfiles:old.profiles,headlessClosures:Object.fromEntries(['packages/stealth-core/index.js','packages/stealth-core/foliage.js','packages/native-actors/crawl.js'].map(p=>[p,moduleClosure([p])]))};
const target=path.join(root,'docs/reviews/shared-stealth/registration.json'),bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(target,bytes);
const guard=path.join(root,'tools/shared-stealth-registration.mjs');let source=fs.readFileSync(guard,'utf8');source=source.replace(/const manifestSHA='[^']*'/,"const manifestSHA='"+sha(bytes)+"'");fs.writeFileSync(guard,source);
console.log(JSON.stringify({base,files:files.length,metadataSHA256:sha(bytes),profiles:Object.fromEntries(names.map(p=>[p,manifest.profiles[p].files.length]))}));
