import {prepareInstalledGrenadeReference} from './prepare-grenade-installed.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root} from './distribution.mjs';
import {grenadeReviewInputFingerprint,assertGrenadeReviewReport} from './grenade-reference-inputs.mjs';
const inputSha256=grenadeReviewInputFingerprint();
const report=prepareInstalledGrenadeReference();
console.log('Prepared offline '+report.package.name+' '+report.package.version+'; '+report.package.compressedBytes+' compressed bytes.');
const previous=process.env.NAUTILUS_GRENADE_INSTALLED;
process.env.NAUTILUS_GRENADE_INSTALLED='1';
try {await import('./review-grenade-reference.mjs');}
finally {if(previous===undefined)delete process.env.NAUTILUS_GRENADE_INSTALLED;else process.env.NAUTILUS_GRENADE_INSTALLED=previous;}
const output=path.join(root,'artifacts/grenade-reference-installed');
const installed=JSON.parse(fs.readFileSync(path.join(output,'review.json'),'utf8'));
assertGrenadeReviewReport(installed,'installed',inputSha256);
const baselines=['source','built'].map(mode=>({mode,file:path.join(root,'artifacts/grenade-reference-'+mode+'/review.json')}))
 .filter(value=>fs.existsSync(value.file)).map(value=>({...value,report:JSON.parse(fs.readFileSync(value.file,'utf8'))})).filter(value=>value.report.inputSha256===inputSha256);
assert.ok(baselines.length,'Run the source or built review on these exact inputs before the installed comparison.');
for(const {mode,report:baseline} of baselines){assertGrenadeReviewReport(baseline,mode,inputSha256);assert.deepEqual(installed.results,baseline.results);assert.equal(installed.projectionSha256,baseline.projectionSha256);}
fs.writeFileSync(path.join(output,'parity.json'),JSON.stringify({inputSha256,modes:[...baselines.map(value=>value.mode),'installed'],sameBehaviorGroups:true,sameFinalProjection:true,projectionSha256:installed.projectionSha256},null,2)+'\n');
console.log('Source/build/installed behavior parity passed for '+baselines.map(value=>value.mode).join(', ')+' and installed.');
