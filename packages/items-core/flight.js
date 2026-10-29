import {ROCK_ITEM,durationUnits} from './profile.js';
import {fields,finite,point,id,distance,fail} from './validation.js';
import {flightPoint,interpolate} from './lob.js';
import {CONTACT_KINDS,impactId} from './state.js';
import {outcome,transact,advanceRevision} from './transactions.js';
function firstContact(raw,from,to,radius){
  if(raw===null)return null;
  const contacts=Array.isArray(raw)?raw:[raw];if(contacts.length>64)fail('invalid-contact','At most 64 swept contacts are supported per step.');
  const validated=contacts.map(value=>{
    try{fields(value,['fraction','point','surfaceId','kind'],undefined,'swept contact');const fraction=finite(value.fraction,0,1,'sweep fraction'),surfaceId=id(value.surfaceId,'surface ID'),position=point(value.point,'actual contact point');
      if(!CONTACT_KINDS.includes(value.kind))fail('invalid-contact','Unsupported swept contact kind.');
      const center=interpolate(from,to,fraction);if(distance(center,position)>radius+1e-6)fail('invalid-contact','Contact point lies outside the swept sphere at its declared fraction.');
      return {fraction,point:position,surfaceId,kind:value.kind,center};
    }catch(error){fail('invalid-contact',error.message);}
  });
  // Stable tie break for simultaneous surfaces, independent of adapter ordering.
  validated.sort((a,b)=>a.fraction-b.fraction||(a.surfaceId<b.surfaceId?-1:a.surfaceId>b.surfaceId?1:0)||(a.kind<b.kind?-1:a.kind>b.kind?1:0)||a.point.x-b.point.x||a.point.y-b.point.y||a.point.h-b.point.h);
  return validated[0]||null;
}
export function stepRock(input,settings){return transact(input,(rock,expected)=>{
  fields(settings,['dt','world'],['dt'],'rock step');const units=durationUnits(settings.dt);
  if(rock.phase!=='flying')return outcome(rock,expected,{timing:{inputUnits:units,simulatedUnits:0,pendingUnits:0,unspentUnits:units}});
  if(!settings.world||typeof settings.world.sweepSphere!=='function')fail('world-adapter','Flying rocks require a synchronous world.sweepSphere adapter.');
  const flight=rock.flight,profile=rock.profile,stepUnits=profile.timeUnitsPerSecond/profile.stepHz;
  let available=flight.pendingUnits+units,simulated=0;
  while(available>=stepUnits){
    const t0=flight.ticks/profile.stepHz,t1=(flight.ticks+1)/profile.stepHz,from={...rock.position},to=point(flightPoint(flight,t1,profile.gravity),'flight position');
    let raw;try{raw=settings.world.sweepSphere({from:{...from},to:{...to},radius:profile.radius,rockId:rock.id,throwId:flight.id,sourceActorId:flight.sourceActorId,step:flight.ticks,t0,t1});}catch(error){fail('world-adapter',error instanceof Error?error.message:String(error));}
    const hit=firstContact(raw,from,to,profile.radius);
    if(hit){
      advanceRevision(rock);const noise={version:1,type:'rock-impact-noise',id:impactId(flight.id),itemId:ROCK_ITEM.id,rockId:rock.id,throwId:flight.id,commandId:flight.commandId,sourceActorId:flight.sourceActorId,position:{...hit.point},radius:profile.noiseRadius,surfaceId:hit.surfaceId,kind:hit.kind,flightTime:(flight.ticks+hit.fraction)/profile.stepHz};
      rock.phase='world';rock.position=hit.center;rock.flight=null;rock.lastImpact=noise;
      return outcome(rock,expected,{events:[structuredClone(noise)],timing:{inputUnits:units,simulatedUnits:simulated+hit.fraction*stepUnits,pendingUnits:0,unspentUnits:available-hit.fraction*stepUnits}});
    }
    if(flight.ticks+1>=profile.maxFlightSeconds*profile.stepHz)fail('flight-limit','World adapter did not confirm an impact within the bounded 10-second flight. No time/state was committed.');
    advanceRevision(rock);flight.ticks++;rock.position=to;available-=stepUnits;simulated+=stepUnits;
  }
  flight.pendingUnits=available;
  return outcome(rock,expected,{timing:{inputUnits:units,simulatedUnits:simulated,pendingUnits:available,unspentUnits:0}});
});}
