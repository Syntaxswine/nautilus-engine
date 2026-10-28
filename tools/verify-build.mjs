import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export async function verifyBuild(output,patches) {
  const own=new Set(patches.map(p=>p.path));let modules=0;
  function visit(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    const file=path.join(folder,entry.name);if(entry.isDirectory()){visit(file);continue;}
    if(!/\.m?js$/.test(file))continue;
    const relative=path.relative(output,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');modules++;
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
      const dependency=path.resolve(path.dirname(file),match[1]);
      if(!dependency.startsWith(output+path.sep)||!fs.existsSync(dependency))throw Error('Built module dependency is absent or outside the bundle: '+relative+' -> '+match[1]);
    }
    if(relative.startsWith('app/')||relative.startsWith('packages/')||own.has(relative))execFileSync(process.execPath,['--check',file],{windowsHide:true,stdio:'pipe'});
  }}visit(output);
  // Link browser-safe component modules without instantiating a renderer or DOM.
  for(const file of ['app/buildings.js','app/assets.js','app/prefab-scene.js','packages/map-core/index.js'])await import(pathToFileURL(path.join(output,file)));
  return modules;
}
