import {fields,id,point,flag,distance,fail} from './validation.js';
import {noiseEvent} from './state.js';
export function evaluateRockNoise(input,listeners){
  try{
    const noise=noiseEvent(input);if(!Array.isArray(listeners)||listeners.length>256)fail('invalid-listener','Supply at most 256 listener records.');
    const ids=new Set(),requests=[],decisions=[];
    for(const listener of listeners){
      fields(listener,['id','position','hearingEnabled','audible','permitted','behavior','confirmedThreat','incapacitated'],undefined,'noise listener');
      const listenerId=id(listener.id,'listener ID'),position=point(listener.position,'listener position');if(ids.has(listenerId))fail('invalid-listener','Listener IDs must be unique.');ids.add(listenerId);
      for(const key of ['hearingEnabled','audible','permitted','confirmedThreat','incapacitated'])flag(listener[key],key);
      if(!['idle','patrol','investigating','combat'].includes(listener.behavior))fail('invalid-listener','Unsupported listener behavior.');
      const range=distance(noise.position,position),heard=listener.hearingEnabled&&listener.audible&&listener.permitted&&range<=noise.radius+1e-9;
      const protectedBehavior=listener.behavior==='combat'||listener.confirmedThreat||listener.incapacitated;
      const reason=protectedBehavior?'higher-priority-behavior':!listener.hearingEnabled?'hearing-disabled':!listener.permitted?'host-denied':!listener.audible?'inaudible':range>noise.radius+1e-9?'out-of-radius':'investigate';
      decisions.push({listenerId,heard,distance:range,reason});
      if(heard&&!protectedBehavior)requests.push({version:1,type:'investigate-rock-noise',id:'investigate:'+noise.id+':'+listenerId,eventId:noise.id,listenerId,rockId:noise.rockId,throwId:noise.throwId,position:{...noise.position},priority:'distraction'});
    }
    return {ok:true,rock:null,events:[],inventoryDelta:[],requests,decisions,reason:'',code:null};
  }catch(error){return {ok:false,rock:null,events:[],inventoryDelta:[],requests:[],decisions:[],reason:error.message,code:error.code||'invalid-input'};}
}
