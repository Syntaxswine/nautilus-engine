import {LIMITS} from '../../../../packages/tile-authoring-core/contract.js';
import {jsonBytes} from '../../../../packages/tile-authoring-core/budget.js';
import {fail,plainData,same,clone,freeze,integer,digest} from './common.mjs';
/** Continues actual charged work;never constructs an operation,ticket or write. */
export class PreparationWork {
 constructor(plan,capacity){const limits=plainData(plan?.limits,{maxNodes:128,maxBytes:4096});if(Object.keys(limits).length!==Object.keys(LIMITS).length||Object.keys(LIMITS).some(k=>!Object.hasOwn(limits,k)))fail('NORMALIZED_PLAN_LIMITS_REQUIRED');for(const [k,v]of Object.entries(limits))if(!Object.hasOwn(LIMITS,k)||!Number.isSafeInteger(v)||v<0||v>LIMITS[k])fail('TIGHTENING_ONLY',k);if(capacity?.kind!=='nautilus-tile-authoring-capacity-bound'||capacity.version!==1||capacity.committable!==false||capacity.work?.chargedBefore!==plan.costBounds?.planning?.unitsCharged||capacity.work.chargedBefore+capacity.work.chargeThisPhase!==capacity.work.chargedAfter)fail('CAPACITY_WORK_BINDING');this.limits=freeze(clone(limits));this.planLimitsDigest=digest(limits);this.sourceCharged=plan.costBounds.planning.unitsCharged;this.afterCapacity=capacity.work.chargedAfter;integer(this.sourceCharged,'source charged',0,limits.plannerUnits);integer(this.afterCapacity,'after capacity',this.sourceCharged,limits.plannerUnits);this.units=this.afterCapacity;this.byteWorkCharged=0;this.byteUnits=0;this.closed=false;}
 take(n=1){if(this.closed)fail('PREPARATION_WORK_CLOSED');integer(n,'actual preparation units');if(this.units+n>this.limits.plannerUnits)fail('AUTHORING_WORK_LIMIT');this.units+=n;}
 bytes(n){integer(n,'actual byte work');const total=this.byteWorkCharged+n;integer(total,'cumulative byte work');const units=Math.ceil(total/64);this.take(units-this.byteUnits);this.byteWorkCharged=total;this.byteUnits=units;}
 data(v){this.take(Math.ceil(jsonBytes(v,this.limits.inputBytes)/64));}
 assertLimits(plan){if(!same(plan.limits,this.limits))fail('CAPTURED_PLAN_LIMITS_CHANGED');}
 snapshot(){return {sourceCharged:this.sourceCharged,afterCapacity:this.afterCapacity,afterPreparation:this.units,finalBindUpperBound:this.limits.plannerUnits};}
 finish(){if(this.closed)fail('PREPARATION_WORK_CLOSED');this.closed=true;return freeze(this.snapshot());}
}
export const FIXED_AUTHORING_LIMITS=Object.freeze({...LIMITS});
