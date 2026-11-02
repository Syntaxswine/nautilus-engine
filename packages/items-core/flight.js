import {ROCK_ITEM,durationUnits} from './profile.js';
import {fields,finite,point,id,distance,fail,list} from './validation.js';
import {flightPoint,positionAt,interpolate} from './lob.js';
import {CONTACT_KINDS,impactId} from './state.js';
import {outcome,transact,advanceRevision} from './transactions.js';
function firstContact(raw,from,to,radius,settling){
  if(raw===null)return null;
  if(settling&&!Array.isArray(raw))fail('invalid-contact','Quiet settling requires all contacts as an array, or null when there are none.');
  let contacts;try{contacts=list(Array.isArray(raw)?raw:[raw],64,'Swept contacts');}catch(error){fail('invalid-contact',error.message);}
  const validated=contacts.map(value=>{
    try{fields(value,['fraction','point','surfaceId','kind'],undefined,'swept contact');const fraction=finite(value.fraction,0,1,'sweep fraction'),surfaceId=id(value.surfaceId,'surface ID'),position=point(value.point,'actual contact point');
      if(!CONTACT_KINDS.includes(value.kind))fail('invalid-contact','Unsupported swept contact kind.');
      const center=interpolate(from,to,fraction);if(distance(center,position)>radius+1e-6)fail('invalid-contact','Contact point lies outside the swept sphere at its declared fraction.');
      if(value.kind==='ground'&&position.h>center.h+1e-6)fail('invalid-contact','ground must identify a supporting top face, not an underside.');
      if(settling&&value.kind!=='ground'&&position.h<center.h-1e-6)fail('invalid-contact','A downward-blocking supporting top face must be tagged ground.');
      return {fraction,point:position,surfaceId,kind:value.kind,center};
    }catch(error){fail('invalid-contact',error.message);}
  });
  // Quiet falls ignore validated tangent/separating side and underside hits;
  // the full batch must still expose any later supporting top face.
  const eligible=settling?validated.filter(hit=>hit.kind==='ground'):validated;
  eligible.sort((a,b)=>a.fraction-b.fraction||(a.surfaceId<b.surfaceId?-1:a.surfaceId>b.surfaceId?1:0)||(a.kind<b.kind?-1:a.kind>b.kind?1:0)||a.point.x-b.point.x||a.point.y-b.point.y||a.point.h-b.point.h);
  return eligible[0]||null;
}
export function stepRock(input,settings){return transact(input,(rock,expected)=>{
  fields(settings,['dt','world'],['dt'],'rock step');const units=durationUnits(settings.dt);
  if(rock.phase!=='flying')return outcome(rock,expected,{timing:{inputUnits:units,simulatedUnits:0,pendingUnits:0,unspentUnits:units}});
  if(!settings.world||typeof settings.world.sweepSphere!=='function')fail('world-adapter','Flying rocks require a synchronous world.sweepSphere adapter.');
  const flight=rock.flight,profile=rock.profile,stepUnits=profile.timeUnitsPerSecond/profile.stepHz,events=[];
  let available=flight.pendingUnits+units,simulated=0;
  const sweep=(from,to,t0,t1,stage)=>{
    let raw;try{raw=settings.world.sweepSphere({from:{...from},to:{...to},radius:profile.radius,rockId:rock.id,throwId:flight.id,sourceActorId:flight.sourceActorId,step:flight.ticks,t0,t1,stage});}catch(error){fail('world-adapter',error instanceof Error?error.message:String(error));}
    return firstContact(raw,from,to,profile.radius,stage==='settling');
  };
  const settle=(hit,used)=>{
    advanceRevision(rock);rock.phase='world';rock.position=hit.center;rock.flight=null;
    return outcome(rock,expected,{events,timing:{inputUnits:units,simulatedUnits:simulated+used,pendingUnits:0,unspentUnits:available-used}});
  };
  while(available>=stepUnits){
    const t0=flight.ticks/profile.stepHz,t1=(flight.ticks+1)/profile.stepHz;
    let from={...rock.position},segmentStart=t0,startFraction=0;
    if(!flight.settling){
      const to=point(flightPoint(flight,t1,profile.gravity),'flight position'),hit=sweep(from,to,t0,t1,'lob');
      if(hit){
        const noise={version:1,type:'rock-impact-noise',id:impactId(flight.id),itemId:ROCK_ITEM.id,rockId:rock.id,throwId:flight.id,commandId:flight.commandId,sourceActorId:flight.sourceActorId,position:{...hit.point},radius:profile.noiseRadius,surfaceId:hit.surfaceId,kind:hit.kind,flightTime:(flight.ticks+hit.fraction)/profile.stepHz};
        rock.lastImpact=noise;events.push(structuredClone(noise));
        if(hit.kind==='ground')return settle(hit,hit.fraction*stepUnits);
        flight.settling={center:{...hit.center},time:noise.flightTime};from={...hit.center};segmentStart=noise.flightTime;startFraction=hit.fraction;
      }else from=to;
    }
    if(flight.settling){
      const to=point(positionAt(flight,t1,profile.gravity),'quiet settling position');
      if(segmentStart<t1){
        const hit=sweep(from,to,segmentStart,t1,'settling');
        if(hit)return settle(hit,(startFraction+(1-startFraction)*hit.fraction)*stepUnits);
      }
      from=to;
    }
    if(flight.ticks+1>=profile.maxFlightSeconds*profile.stepHz)fail('flight-limit','World adapter did not confirm support within the bounded 10-second flight. No time/state was committed.');
    advanceRevision(rock);flight.ticks++;rock.position=from;available-=stepUnits;simulated+=stepUnits;
  }
  flight.pendingUnits=available;
  return outcome(rock,expected,{events,timing:{inputUnits:units,simulatedUnits:simulated,pendingUnits:available,unspentUnits:0}});
});}
