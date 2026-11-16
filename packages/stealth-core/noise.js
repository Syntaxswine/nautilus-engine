import {fields,number,integer,id,point,copy,fail} from './data.js';

// Same borrowed audibility/permission boundary as rock distraction, with a
// distinct movement event. This never forges a rock impact or assigns guard AI.
export function evaluateStealthNoise(event,listeners){
  fields(event,['kind','version','id','actorId','position','radiusM','worldId','worldRevision']);
  if(event.kind!=='nautilus-stealth-footstep'||event.version!==1||![3,10].includes(event.radiusM))fail('STEALTH_NOISE','Unsupported AFT movement-noise event.');id(event.actorId);id(event.worldId);integer(event.worldRevision);point(event.position);if(typeof event.id!=='string'||!event.id.length||event.id.length>320)fail('STEALTH_NOISE','A durable event identity is required.');
  if(!Array.isArray(listeners)||listeners.length>256||new Set(listeners.map(l=>l.id)).size!==listeners.length)fail('STEALTH_NOISE','Supply bounded unique listeners.');
  const heard=[];
  for(const listener of listeners){fields(listener,['id','position','hearingScale','hearingEnabled','audible','permitted','sourceSeen','incapacitated']);id(listener.id);point(listener.position);number(listener.hearingScale,0,10);for(const k of ['hearingEnabled','audible','permitted','sourceSeen','incapacitated'])if(typeof listener[k]!=='boolean')fail('STEALTH_NOISE','Supply explicit host hearing eligibility.');
    const distanceM=Math.hypot(listener.position.x-event.position.x,listener.position.y-event.position.y,listener.position.h-event.position.h);
    if(listener.hearingEnabled&&listener.audible&&listener.permitted&&!listener.sourceSeen&&!listener.incapacitated&&distanceM<=event.radiusM*listener.hearingScale+1e-9)heard.push({eventId:event.id,listenerId:listener.id,position:copy(event.position),distanceM});
  }
  return heard;
}
