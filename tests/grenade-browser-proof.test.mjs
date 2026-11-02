import test from 'node:test';
import assert from 'node:assert/strict';
import {assertGrenadeReviewReport} from '../tools/grenade-reference-inputs.mjs';
const fingerprint='1'.repeat(64);
const accepted=()=>({mode:'installed',inputSha256:fingerprint,projectionSha256:'2'.repeat(64),
 results:Array.from({length:10},(_,i)=>({name:'accepted workflow '+i,status:'pass'})),
 errors:[],failedRequests:[],resourceCount:1,captures:Array.from({length:12},(_,i)=>({name:'phase '+i}))});
test('truncated matching browser reports cannot count as installed parity',()=>{
 assert.throws(()=>assertGrenadeReviewReport({inputSha256:fingerprint},'installed',fingerprint));
 assert.throws(()=>assertGrenadeReviewReport({...accepted(),results:undefined,projectionSha256:undefined},'installed',fingerprint));
});
test('accepted browser evidence requires completed groups, matching mode/inputs and a final projection',()=>{
 assert.doesNotThrow(()=>assertGrenadeReviewReport(accepted(),'installed',fingerprint));
 for(const change of [{results:[]},{projectionSha256:''},{mode:'source'},{inputSha256:'3'.repeat(64)},{errors:['page failed']}]){
  assert.throws(()=>assertGrenadeReviewReport({...accepted(),...change},'installed',fingerprint));
 }
});
