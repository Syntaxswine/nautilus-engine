// Deliberate visual-only intake. Reads immutable Git objects, never donor files.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const commit='251bf8094b5f9ebe44208443084c1a6d6658512a';
const prefix='sites/tactical-animal/dist/';
const names=['art/windows/geometry.js','art/windows/catalog.js','aft/tactics/hybrid-materials.js','aft/tactics/diagonal-roads.js','window-shatter.js','world-dimensions.js','assets/audio/glass-smash-rubberduck-cc0.ogg','assets/audio/GLASS-SMASH-RUBBERDUCK-LICENSE.md'].map(n=>prefix+n).concat('sites/tactical-animal/window-shatter-provenance.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rawRoot='vendor/farmyard-window-visuals/'+commit;
const banner='// Nautilus visual adaptation; original bytes and hashes: source.json.\n';
export function adapt(name,source){
  let s=source.toString('utf8').replaceAll('\r\n','\n');
  if(name.endsWith('/art/windows/geometry.js'))s=s.replace("import * as T from '../../aft/tactics/vendor/three.module.js';\n",'').replace("../../aft/tactics/hybrid-materials.js","./surfaces.js").replace('createWindowLibrary()','createWindowLibrary(T)');
  else if(name.endsWith('/window-shatter.js'))s=s.replace("import * as T from './aft/tactics/vendor/three.module.js';\n",'').replace('export function createWindowShatter({','export function createWindowShatter(T,{');
  return banner+s;
}
export function intake(repo){
  const git=args=>execFileSync('git',['-c','safe.directory='+repo.replaceAll('\\','/'),'-C',repo,...args],{windowsHide:true,maxBuffer:8e6});
  const rows=[];
  for(const name of names){
    const b=git(['show',commit+':'+name]),target=path.join(root,rawRoot,name);fs.mkdirSync(path.dirname(target),{recursive:true});
    if(fs.existsSync(target)&&!fs.readFileSync(target).equals(b))throw Error('Immutable snapshot differs: '+name);
    fs.writeFileSync(target,b);
    rows.push({path:name,bytes:b.length,sha256:sha(b),gitBlob:git(['rev-parse',commit+':'+name]).toString().trim()});
    const local={'art/windows/geometry.js':'geometry.js','art/windows/catalog.js':'catalog.js','aft/tactics/hybrid-materials.js':'surfaces.js','aft/tactics/diagonal-roads.js':'diagonal-roads.js','window-shatter.js':'shatter.js','world-dimensions.js':'world-dimensions.js'}[name.slice(prefix.length)];
    if(local)fs.writeFileSync(path.join(root,'packages/window-visuals/native',local),adapt(name,b));
  }
  const manifest={schemaVersion:1,sourceRepository:'https://github.com/Syntaxswine/farmyard-commando',commit,rawRoot,files:rows,
    externalDependencies:[{source:prefix+'aft/tactics/vendor/three.module.js',resolution:'Host-injected shared Three r180; no second Three copy',notice:'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/THREE-LICENSE.txt'}],
    sourceStudy:{repository:'Syntaxswine/animal-factory-tactics-3d',revision:'ebf51393909040b61a7c40649d9d5f0ac3678735',record:rawRoot+'/sites/tactical-animal/window-shatter-provenance.json'},
    rights:'User-supplied project source under explicit reuse instructions; inherited study/art uncertainty and absence of project-wide licence remain. Three is MIT; unchanged audio is CC0. No new rights grant.',
    adaptations:'Inject host Three into native geometry/shatter factories, redirect local helper imports, normalize adapted modules to LF, add provenance headers. Original bytes stay unchanged. Native catalogue is visual specification only, never a gameplay kernel.',
    audio:'Original OGG and CC0 notice preserved as intake evidence only. No runtime audio, unlock handling or audio ownership is implemented.'};
  fs.writeFileSync(path.join(root,'packages/window-visuals/source.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({commit,originalFiles:rows.length,originalBytes:rows.reduce((n,r)=>n+r.bytes,0)}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const i=process.argv.indexOf('--repo');if(i<0)throw Error('Use --repo <read-only Farmyard checkout>');intake(process.argv[i+1]);}
