import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function checkSearchHalo(root, sources, tracked) {
  const pin=sources.searchHalo;
  if (!pin || !/^[a-f0-9]{40}$/.test(pin.commit) || pin.root!=='vendor/farmyard/'+pin.commit) throw Error('Invalid search-halo source pin.');
  const manifestPath=pin.root+'/provenance.json';
  const manifest=JSON.parse(fs.readFileSync(path.join(root,manifestPath),'utf8'));
  if (manifest.commit!==pin.commit || manifest.repository!==pin.repository || manifest.donor!=='farmyard' || manifest.runtimeEntry!=='packages/render-effects/search-halo.js') throw Error('Search-halo provenance does not match its pin.');
  const hash=data=>createHash('sha256').update(data).digest('hex');
  const verifyTracked=name=>{if(tracked && !tracked.has(name))throw Error('Search-halo dependency is not tracked by Git: '+name);};
  verifyTracked(manifestPath);
  const expected=['sites/tactical-animal/dist/search-halo.js','sites/tactical-animal/search-halo-porting.md','sites/tactical-animal/tests/search-halo.test.mjs'];
  if (JSON.stringify(manifest.files.map(file=>file.path).sort())!==JSON.stringify(expected)) throw Error('Search-halo reference inventory changed; review required.');
  for (const entry of manifest.files) {
    if (entry.role!=='reference') throw Error('Farmyard halo evidence must not be imported as runtime modules.');
    const name=pin.root+'/'+entry.path;
    verifyTracked(name);
    const bytes=fs.readFileSync(path.join(root,name));
    if (bytes.length!==entry.bytes || hash(bytes)!==entry.sha256) throw Error('Search-halo source bytes changed: '+entry.path);
  }
  const reused=manifest.dependencyResolutions.filter(entry=>entry.resolution==='reuse-existing-engine-file');
  const excluded=manifest.dependencyResolutions.filter(entry=>entry.resolution==='excluded-by-renderer-extraction');
  if (reused.length!==3 || excluded.length!==2 || JSON.stringify(excluded.map(entry=>entry.sourceImport).sort())!==JSON.stringify(['./solo-game.js','./world-grid.js'])) throw Error('Search-halo dependency resolution changed.');
  for (const name of ['three.module.js','three.core.js','THREE-LICENSE.txt']) {
    const dependency=reused.find(entry=>entry.sourcePath==='sites/tactical-animal/dist/aft/tactics/vendor/'+name);
    if (!dependency || dependency.engineDonor!=='aft' || dependency.engineCommit!==sources.aft.commit || dependency.enginePath!==sources.aft.root+'/dist/tactics/vendor/'+name) throw Error('Search-halo Three instance drift.');
    verifyTracked(dependency.enginePath);
    const bytes=fs.readFileSync(path.join(root,dependency.enginePath));
    if (bytes.length!==dependency.engineBytes || hash(bytes)!==dependency.engineSha256 || hash(Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')))!==dependency.normalizedLfSha256) throw Error('Search-halo shared Three bytes changed.');
  }
  const allowed=new Set(['packages/render-effects/index.js',manifest.runtimeEntry,'packages/render-effects/three.js',...reused.filter(entry=>entry.role==='runtime').map(entry=>entry.enginePath)]);
  const visited=new Set();
  function closure(name) {
    if(visited.has(name))return;visited.add(name);
    if(!allowed.has(name))throw Error('Search-halo runtime depends on an unreviewed module: '+name);
    verifyTracked(name);
    const text=fs.readFileSync(path.join(root,name),'utf8');
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      if(!match[1].startsWith('.'))throw Error('Search-halo cannot depend on an external runtime: '+match[1]);
      closure(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
    }
  }
  closure('packages/render-effects/index.js');
  if(visited.size!==allowed.size)throw Error('Search-halo runtime must resolve to the single shared Three instance.');
  const original=fs.readFileSync(path.join(root,pin.root,expected[0]),'utf8').replaceAll('\r\n','\n');
  const shaders=original.slice(original.indexOf('const vertexShader='),original.indexOf('function actuallyVisible'));
  if(!shaders || !fs.readFileSync(path.join(root,manifest.runtimeEntry),'utf8').includes(shaders))throw Error('Search-halo shader adaptation requires a new visual/source review.');
  for(const name of ['tools/snapshot-search-halo.mjs','tools/check-search-halo.mjs','examples/search-halo.html','examples/search-halo.js','examples/halo-wall-fixture.js'])verifyTracked(name);
  return {referenceFiles:manifest.files.length,runtimeModules:visited.size};
}
