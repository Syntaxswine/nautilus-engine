// Shared evidence driver. This is tooling, never a public/candidate runtime import.
import assert from 'node:assert/strict';
import {prepareTileStack} from '../candidates/tile-stack/core/index.js';
import * as F from '../candidates/tile-stack/core/fixtures.mjs';
const clone=structuredClone;
function capture(name,input,result,oracleExpected=null,submission={}){const p=result.preparation;return {name,input,oracleExpected,publicRequest:submission.request??result.plan.request,injectedFault:submission.fault??null,result:{ok:result.ok,plan:result.plan,preparation:p?{ok:p.ok,nextBundle:p.next?.bundle??null,expected:p.expected??null,requestId:p.requestId??null,contextToken:p.contextToken??null,layoutDigest:p.layoutDigest??null,catalogueDigest:p.catalogueDigest??null,work:p.work,diagnostics:p.diagnostics}:null}};}
export function stackEvidence(C){
 const out=[];
 for(const nonuniform of [false,true]){
  const state=F.initial(C,{nonuniform}),input=F.input(C,state,F.stackIntent({nonuniform})),r=prepareTileStack(C,input);assert.equal(r.ok,true);assert.deepEqual(prepareTileStack(C,input),r);out.push(capture(nonuniform?'nonuniform-fifteen':'uniform-fifteen',input,r,true));
  if(!nonuniform){
   const saved=F.nextState(C,r,state),finish=F.input(C,saved,F.finishIntent(C,saved,'deck.14')),f=prepareTileStack(C,finish);assert.equal(f.ok,true);out.push(capture('finish-unlocked',finish,f,true));
   const omitted=clone(r.plan.request),missing=omitted.relations.pop();const failed=C.prepareTileRepair(state.bundle,omitted,{contextToken:state.context.contextToken,cancelled:false});assert.equal(failed.ok,false);out.push(capture('missing-one-crossing',input,{ok:false,plan:r.plan,preparation:failed},false,{request:omitted,fault:{kind:'omit-one-crossing',relationId:missing.id}}));
   for(const [key,n]of Object.entries({maxSteps:16,maxClosure:15,maxSpatialTests:435,maxGeometryWork:1950,maxPlannerWork:r.plan.work.plannerUnits,maxPlannerBytes:r.plan.work.serializedBytes})){const i=clone(input);i.limits[key]=n-1;const failed=prepareTileStack(C,i);assert.equal(failed.ok,false,key);out.push(capture('limit-minus-one-'+key,i,failed));}
   for(const [name,intent]of [['move-top',F.edit('move.top',{upserts:[{...clone(finish.intent.upserts[0]),recipeId:'deck.shared',origin:[40,0,29.68]}]})],['remove-top',F.edit('remove.top',{removeIds:['deck.14']})]]){const i=F.input(C,saved,intent),a=prepareTileStack(C,i);assert.equal(a.ok,true);out.push(capture(name,i,a,true));}
  }
 }
 const recipe=F.rectangle();recipe.reservations.push({...clone(recipe.reservations[0]),id:'tall-extra',max:[8,4,3]});const tallState=F.initial(C,{recipes:[recipe]}),tall=F.input(C,tallState,F.stackIntent({recipe})),t=prepareTileStack(C,tall);assert.equal(t.ok,false);out.push(capture('tall-extra-reservation',tall,t,false));
 const state=F.initial(C),input=F.input(C,state,F.stackIntent());input.bundle.layout.floors[1].elevationM=2.119999;input.context.floorProfile.floors[1].elevationM=2.119999;input.expected.layoutDigest=C.tileLayoutToken(input.bundle.layout);input.expected.floorProfileDigest=C.tileLayoutToken(input.context.floorProfile);const short=prepareTileStack(C,input);assert.equal(short.ok,false);out.push(capture('insufficient-clearance',input,short,false));
 for(const [name,x,radius]of [['projected-edge',8,0],['projected-near',8.1,.2]]){const r=F.rectangle(),old=F.placement(C,r,'old',[0,0,0]),s=F.initial(C,{recipes:[r],instances:[old],ownerRefs:[{instanceId:'old',primaryReservationId:'body'}]}),intent=F.stackIntent({count:1});intent.originXY=[x,0];intent.members[0].id='upper';intent.members[0].floorId='F01';const i=F.input(C,s,intent,{neighbourRadiusM:radius}),failed=prepareTileStack(C,i);assert.equal(failed.ok,false);out.push(capture(name,i,failed,false));}
 // A proof-only explicit profile: top elevation is source, never an ordinal formula.
 const stronger=F.initial(C);stronger.bundle.layout.floors[14].elevationM=31.8;stronger.context.floorProfile.floors[14].elevationM=31.8;stronger.constraints.floorProfileId='stronger-top-proof';stronger.context.floorProfile.id='stronger-top-proof';stronger.context.sourceConstraintsDigest=C.tileLayoutToken(stronger.constraints);
 const first=F.input(C,stronger,F.stackIntent({requestId:'stronger.initial'})),tower=prepareTileStack(C,first);assert.equal(tower.ok,true);out.push(capture('stronger-top-initial',first,tower,true));
 const accepted=F.nextState(C,tower,stronger),draft=F.finishIntent(C,accepted,'deck.14');draft.minimumClearanceM=3;const proposed=F.input(C,accepted,draft),finished=prepareTileStack(C,proposed);assert.equal(finished.ok,true);assert.equal(finished.plan.request.relations.filter(r=>r.clearanceM===2).length,91);assert.equal(finished.plan.request.relations.filter(r=>r.clearanceM===3).length,14);out.push(capture('stronger-top-only',proposed,finished,true));
 return {schemaVersion:2,identity:'private candidate host helper borrowing actual public v1 ./tiles',cases:out};
}
