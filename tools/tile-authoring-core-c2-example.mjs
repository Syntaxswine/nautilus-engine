// Pure DTO consumer only; fixture capture/leases are not live authority/readiness.
import assert from 'node:assert/strict';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {T,stageFixture,paintOperations,preparedCapture} from './tile-authoring-core-c2-fixtures.mjs';
const f=stageFixture(),x=stageFixture(paintOperations(f.f)),plan=C.planTileAuthoring(T,x.input);
assert.equal(plan.ok,true,JSON.stringify(plan));
const capture=preparedCapture(plan),target=C.bindTileAuthoringTarget(T,{before:x.input.document,plan,prepared:null,appearanceCapture:capture});
assert.equal(target.ok,true,JSON.stringify(target));
console.log(JSON.stringify({status:'pure-DTO-consumer-pass',nativeOwnershipProved:false,decoderRun:false,durableWrites:0,publicRegistration:false,resources:plan.resourceRequirements.targetResourceRefs.length,encodedPages:plan.resourceRequirements.encodedNeeds.length,marks:target.costBounds.sourceMarks,planningUnits:target.costBounds.planning.unitsCharged,finalReservation:capture.planningCarry.finalBindUpperBound}));
