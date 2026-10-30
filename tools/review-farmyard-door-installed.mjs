import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root} from './distribution.mjs';
import {prepareInstalledFarmyardDoorReference} from './prepare-farmyard-door-installed.mjs';
import {farmyardDoorReviewInputFingerprint,assertFarmyardDoorReviewReport,assertFarmyardDoorReviewParity} from './farmyard-door-reference-inputs.mjs';
import {FARMYARD_DOOR_REVIEW_OPTIONS} from './farmyard-door-browser-cases.mjs';
const inputSha256=farmyardDoorReviewInputFingerprint(),installation=prepareInstalledFarmyardDoorReference();
assert.equal(installation.inputSha256,inputSha256);
console.log('Prepared offline door reference: '+installation.package.version+'; '+installation.files.length+' unchanged/private fixture inputs.');
const before=process.env.NAUTILUS_DOOR_INSTALLED;process.env.NAUTILUS_DOOR_INSTALLED='1';
try{await import('./review-farmyard-door-reference.mjs');}finally{if(before===undefined)delete process.env.NAUTILUS_DOOR_INSTALLED;else process.env.NAUTILUS_DOOR_INSTALLED=before;}
const directory=path.join(root,'artifacts/farmyard-door-reference-installed'),installed=JSON.parse(fs.readFileSync(path.join(directory,'acceptance.json'),'utf8'));
assertFarmyardDoorReviewReport(installed,'installed',inputSha256,FARMYARD_DOOR_REVIEW_OPTIONS);
const baselines=['source','built'].map(mode=>path.join(root,'artifacts/farmyard-door-reference-'+mode+'/acceptance.json')).filter(file=>fs.existsSync(file)).map(file=>JSON.parse(fs.readFileSync(file,'utf8'))).filter(report=>report.inputSha256===inputSha256);
assert.ok(baselines.length,'Run source/built review on these exact inputs before installed comparison.');
const parity=baselines.map(report=>assertFarmyardDoorReviewParity(report,installed,inputSha256,FARMYARD_DOOR_REVIEW_OPTIONS));
fs.writeFileSync(path.join(directory,'parity.json'),JSON.stringify({inputSha256,comparisons:parity},null,2)+'\n');
console.log('Door exact-input source/build/installed behavior and final authority parity pass.');
