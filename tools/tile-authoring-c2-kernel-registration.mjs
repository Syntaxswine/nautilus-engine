// Authenticate the exact internal helper addition before exposing old profiles.
// Actual module graphs are passed through; no runtime or capability is hidden.
import assert from 'node:assert/strict';
import {kernelPromotionSources,HELPER} from './tile-authoring-c2-kernel-source.mjs';

export function checkTileAuthoringC2KernelRegistration(ports){
 const {object,read,indexed=()=>{},moduleClosure,distribution}=ports;
 const actualPackage=read('package.json'),pkg=JSON.parse(actualPackage);
 if(!pkg.files?.includes(HELPER))return {historicalPorts:ports,report:{enabled:false}};
 const plan=kernelPromotionSources({object});
 assert.ok(actualPackage.equals(plan.packageWhitelist.expectedBuffer),'Only the exact one-file Kernel whitelist change is authorized');indexed('package.json',actualPackage);
 for(const row of plan.rows){const bytes=read(row.path);assert.ok(bytes.equals(row.expectedBuffer),'Changed actual Kernel source: '+row.path);indexed(row.path,bytes);}
 const closure=moduleClosure(['packages/windows-authoring/index.js']);
 assert.equal(closure.filter(file=>file===HELPER).length,1,'The actual headless window entry must include its helper exactly once');
 for(const file of closure){
  const row=plan.rows.find(row=>row.path===file);
  if(row)assert.ok(read(file).equals(row.expectedBuffer));
  else assert.ok(read(file).equals(object(plan.main,file)),'Unrelated public window dependency changed: '+file);
 }
 const actualPlans={},historicalPlans={};
 for(const profile of ['core','renderer','assets','compatibility']){
  const actual=distribution(profile),expected=profile==='core'||profile==='compatibility';
  assert.equal(actual.files.filter(file=>file===HELPER).length,expected?1:0,'Unexpected helper distribution: '+profile);
  assert.deepEqual(actual.files,[...new Set(actual.files)].sort());
  actualPlans[profile]=actual;historicalPlans[profile]={...actual,files:actual.files.filter(file=>file!==HELPER)};
 }
 const historicalRead=file=>file==='package.json'?plan.packageWhitelist.beforeBuffer:read(file);
 const historicalIndexed=(file,bytes)=>{
  if(file==='package.json'){assert.ok(bytes.equals(plan.packageWhitelist.beforeBuffer),'Only the exact authenticated package preimage may be requested');indexed(file,actualPackage);}
  else indexed(file,bytes);
 };
 return {historicalPorts:{...ports,read:historicalRead,indexed:historicalIndexed,moduleClosure,distribution:(profile='compatibility')=>{assert.ok(Object.hasOwn(historicalPlans,profile));return historicalPlans[profile];}},report:{enabled:true,status:'authenticated-internal-observation-helper',sourceCommit:plan.kernel,sharedBodies:7,newHelper:HELPER,packageWhitelistAdds:1,newExports:0,actualPublicWindowClosureFiles:closure.length,profileDeltas:Object.fromEntries(Object.entries(actualPlans).map(([profile,value])=>[profile,{actual:value.files.length,historical:historicalPlans[profile].files.length,added:value.files.includes(HELPER)?[HELPER]:[]}])),actualModuleClosureUnchangedAsPort:true,actualBytesPassedToIndexedPort:true,liveC2Execution:false,requiredGitCommits:plan.requiredGitCommits}};
}
