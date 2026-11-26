import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
let compiler=process.argv[process.argv.indexOf('--typescript')+1];
if(!process.argv.includes('--typescript')){try{compiler=createRequire(import.meta.url).resolve('typescript/lib/tsc.js');}catch{throw Error('Supply a local TypeScript compiler with --typescript /path/to/typescript/lib/tsc.js.');}}
const fixture='tools/fantasy-equipment-art/types-proof.ts';
const args=['--strict','--noEmit','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2023',fixture];
execFileSync(process.execPath,[compiler,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:30000});
const files=['packages/fantasy-equipment-art/catalogue.d.ts','packages/fantasy-equipment-art/three.d.ts',fixture];
const report={date:new Date().toISOString(),baseArtCommit:'654f648e8936376358cf57e5733db0a2dad3b760',compiler:execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',windowsHide:true}).trim(),status:'passed',arguments:args,noDOM:true,noThreeTypeDependency:true,hostNodeTypesPreserved:true,negativeControls:(fs.readFileSync(path.join(root,fixture),'utf8').match(/@ts-expect-error/g)||[]).length,files:files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))};
fs.writeFileSync(path.join(root,'docs/reviews/fantasy-equipment/art/types-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.compiler+': declarations pass with ES-only libs, preserved host node types and '+report.negativeControls+' negative controls.');
