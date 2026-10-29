import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {moduleReferencesBatch,resolveModuleFile} from './module-references.mjs';
export async function verifyBuild(output,patches) {
  const own=new Set(patches.map(p=>p.path)),sources=[];let modules=0;
  function visit(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    const file=path.join(folder,entry.name);if(entry.isDirectory()){visit(file);continue;}
    if(!/\.m?js$/.test(file))continue;
    const relative=path.relative(output,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');modules++;
    sources.push({filename:file,source:text});
    if(relative.startsWith('app/')||relative.startsWith('buildings/')||relative.startsWith('packages/')||relative.startsWith('examples/')||own.has(relative))execFileSync(process.execPath,['--check',file],{windowsHide:true,stdio:'pipe'});
  }}visit(output);
  for(const record of moduleReferencesBatch(sources))for(const specifier of record.specifiers){
    const dependency=resolveModuleFile(specifier,record.filename,{root:output});
    if(dependency===null)continue;
    const relative=path.relative(output,record.filename).replaceAll('\\','/');
    if(!dependency.startsWith(output+path.sep)||!fs.existsSync(dependency))throw Error('Built module dependency is absent or outside the bundle: '+relative+' -> '+specifier);
  }
  // Link browser-safe component modules without instantiating a renderer or DOM.
  for(const file of ['app/buildings.js','app/assets.js','app/prefab-scene.js','packages/map-core/index.js'])await import(pathToFileURL(path.join(output,file)));
  return modules;
}
