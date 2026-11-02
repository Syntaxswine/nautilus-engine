// Actual private producer, genuine complete saved-source fixtures. No live Host,
// native ownership, decoder, resource acquisition, storage or Apply is exercised.
import assert from 'node:assert/strict';
import {C,T,input,unpainted,painted} from './tile-authoring-core-c2-surface-target-fixtures.mjs';
const results=[];
for(const [name,document] of [['unpainted',unpainted],['existing',painted]]){
 const args=input(document),before=JSON.stringify(args),result=C.deriveTileSurfaceTarget(T,args);
 assert.equal(JSON.stringify(args),before);assert.equal(result.work.outputBytes,Buffer.byteLength(JSON.stringify(result)));
 results.push({case:name,state:result.state,seedFields:Object.keys(result.bindingSeed).length,existingLayers:result.existingBinding?.layers.length??0,target:result.target,grid:result.grid,work:result.work});
}
console.log(JSON.stringify({status:'private-data-only-surface-target-pass',results,sourceMutation:false,hostOwnership:false,nativeOwnership:false,decoderRun:false,storageWrites:0,combinedPlacement:false}));
