// Read-only Git-object reference intake. Never opens or changes donor worktrees.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),pin='7cd3d56e62a8087133a9fdf2f521cf92d310d6fd',repo=process.argv[process.argv.indexOf('--repo')+1],prefix='vendor/farmyard-traversal/'+pin,sha=b=>createHash('sha256').update(b).digest('hex');
if(!process.argv.includes('--repo')||!repo)throw Error('Use --repo <read-only donor> [--write].');
const git=args=>execFileSync('git',['-C',repo,...args],{windowsHide:true,maxBuffer:64*1024*1024});
if(git(['rev-parse',pin+'^{commit}']).toString().trim()!==pin)throw Error('Full reviewed commit required.');
const inventory=new Set(git(['ls-tree','-r','--name-only',pin]).toString().trim().split('\n')),records=new Map(),edges=[];
function include(name){
 if(records.has(name))return;if(!inventory.has(name))throw Error('Unresolved original module: '+name);
 if(records.size>=512)throw Error('Reference closure limit.');const bytes=git(['show',pin+':'+name]);records.set(name,bytes);
 if(!/\.(?:m?js|json)$/.test(name))return;
 if(name.endsWith('.json'))return;
 const text=bytes.toString();for(const m of text.matchAll(/(?:\b(?:from|import)\s*|\bimport\s*\()\s*['"](\.[^'"\n]+)['"]/g)){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1]));edges.push({from:name,to:target});include(target);
 }
}
include('sites/tactical-animal/dist/solo-game.js');include('docs/turn-based-upstream.md');include('package.json');
for(const name of inventory)if(/(?:^|\/)(?:[^/]*license[^/]*|notice(?:\.[^/]+)?)$/i.test(name)&&!name.startsWith('maps/'))include(name);
const files=[...records].sort(([a],[b])=>a.localeCompare(b)).map(([source,b])=>({source,path:prefix+'/original/'+source+'.original',bytes:b.length,sha256:sha(b),gitBlob:git(['rev-parse',pin+':'+source]).toString().trim()})),total=files.reduce((n,r)=>n+r.bytes,0);if(total>64*1024*1024)throw Error('Reference size limit.');
const manifest={version:1,repository:'https://github.com/Syntaxswine/farmyard-fighters.git',commit:pin,kind:'reference-only static module closure',reviewedFunctions:['solo-game.js:travel','solo-game.js:freePoint','solo-game.js:treeSlide'],sourceMethod:'Git objects only; no donor working files or moving branches',scope:'Original complete mixed module, transitive static script/JSON imports and original notices. Runtime assets are not imported or executed. Engine adaptation is separate.',runtimeImports:[],edges,files};
if(process.argv.includes('--write')){for(const row of files){const dest=path.join(root,row.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,records.get(row.source));}fs.writeFileSync(path.join(root,prefix,'source.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify({commit:pin,files:files.length,bytes:total,edges:edges.length,written:process.argv.includes('--write')}));
