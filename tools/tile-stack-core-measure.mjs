import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stackEvidence} from './tile-stack-core-scenarios.mjs';
const C=await import(process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js');
export const evidence=stackEvidence(C);
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const target=path.resolve(process.argv[2]??'artifacts/tile-stack-core/source.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({cases:evidence.cases.length,passed:evidence.cases.filter(c=>c.result.ok).map(c=>c.name),evidence:target}));
}
