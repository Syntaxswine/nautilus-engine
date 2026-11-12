// Agent/terminal consumer of the same serializable checklist service as the menu.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {parseArgs} from 'node:util';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),installed=JSON.parse(fs.readFileSync(path.join(root,'artifacts/night-ledger-installed/latest.json'))),{values}=parseArgs({options:{recipe:{type:'string'},selection:{type:'string'},output:{type:'string'}}});
const {createChecklist}=await import(pathToFileURL(path.join(installed.folder,'runner.js'))),{defaultRecipe}=await import(pathToFileURL(path.join(installed.folder,'registry.js')));
const recipe=values.recipe?JSON.parse(fs.readFileSync(values.recipe,'utf8')):defaultRecipe(),checklist=createChecklist(recipe,undefined,undefined,{engineArchiveSHA:installed.package.sha256,consumer:installed.runtime.map(({path,sha256})=>({path,sha256}))});
if(values.selection){const r=checklist.select(JSON.parse(fs.readFileSync(values.selection,'utf8')));if(!r.ok)throw Error(r.reason);}
const report={kind:'nautilus-test-ground-agent-run',version:1,installation:{package:installed.package,engineCommit:installed.engineCommit},checklist:checklist.run()};
if(values.output)fs.writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({results:Object.fromEntries(Object.entries(report.checklist.results).map(([id,r])=>[id,{status:r.status,reason:r.reason}]))}));
process.exitCode=Object.values(report.checklist.results).some(r=>r.status==='failed')?1:Object.values(report.checklist.results).some(r=>r.status==='unavailable')?2:0;
