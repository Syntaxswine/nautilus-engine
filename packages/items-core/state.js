import {ROCK_ITEM,profile} from './profile.js';
import {fields,id,integer,finite,point,distance,samePoint,fail} from './validation.js';
import {lob,flightPoint,positionAt,interpolate} from './lob.js';
export const impactId=throwId=>'noise:'+throwId+':impact';
export const CONTACT_KINDS=Object.freeze(['ground','wall','ceiling','object']);
export function noiseEvent(value){
  fields(value,['version','type','id','itemId','rockId','throwId','commandId','sourceActorId','position','radius','surfaceId','kind','flightTime'],undefined,'rock noise');
  if(value.version!==1||value.type!=='rock-impact-noise'||value.itemId!==ROCK_ITEM.id)fail('invalid-event','Unsupported rock noise version/type/item.');
  id(value.rockId,'rock ID');id(value.throwId,'throw ID');id(value.commandId,'command ID');id(value.sourceActorId,'source actor ID');id(value.surfaceId,'surface ID');id(value.id,'event ID',128);
  if(value.id!==impactId(value.throwId)||!CONTACT_KINDS.includes(value.kind))fail('invalid-event','Invalid impact identity/contact kind.');
  return {version:1,type:'rock-impact-noise',id:value.id,itemId:ROCK_ITEM.id,rockId:value.rockId,throwId:value.throwId,commandId:value.commandId,sourceActorId:value.sourceActorId,position:point(value.position,'noise position'),radius:finite(value.radius,0,50,'noise radius'),surfaceId:value.surfaceId,kind:value.kind,flightTime:finite(value.flightTime,0,10,'impact flight time')};
}
export function createRock(specification){
  fields(specification,['id','position','profile'],['id','position'],'rock creation');
  return {kind:'nautilus-rock',version:1,id:id(specification.id,'rock instance ID'),itemId:ROCK_ITEM.id,revision:0,profile:profile(specification.profile),phase:'world',position:point(specification.position),ownerId:null,flight:null,lastImpact:null};
}
export function openRock(input){
  let value=input;if(typeof value==='string'){if(value.length>16000)fail('invalid-state','Rock sidecar is too large.');try{value=JSON.parse(value);}catch{fail('invalid-state','Invalid rock JSON.');}}
  fields(value,['kind','version','id','itemId','revision','profile','phase','position','ownerId','flight','lastImpact'],undefined,'rock state');
  if(value.kind!=='nautilus-rock'||value.version!==1||value.itemId!==ROCK_ITEM.id)fail('invalid-state','Unsupported rock sidecar version/kind/item.');
  if(!['world','carried','flying'].includes(value.phase))fail('invalid-state','Invalid rock phase.');
  const rock={kind:'nautilus-rock',version:1,id:id(value.id,'rock instance ID'),itemId:ROCK_ITEM.id,revision:integer(value.revision,0,1e9,'rock revision'),profile:profile(value.profile,true),phase:value.phase,position:value.position===null?null:point(value.position),ownerId:value.ownerId===null?null:id(value.ownerId,'owner ID'),flight:null,lastImpact:value.lastImpact===null?null:noiseEvent(value.lastImpact)};
  if(rock.lastImpact&&(rock.lastImpact.rockId!==rock.id||rock.lastImpact.radius!==rock.profile.noiseRadius))fail('invalid-state','Impact receipt does not belong to this rock/profile.');
  if(rock.lastImpact&&rock.revision<3)fail('invalid-state','Impact receipt requires a completed pickup/throw/impact history.');
  if(rock.phase==='carried'){
    if(!rock.ownerId||rock.position!==null||value.flight!==null||rock.revision<1)fail('invalid-state','Carried rocks require an owner, no world position, and no flight.');
    if(rock.lastImpact&&rock.revision<4)fail('invalid-state','Re-pickup requires a newer revision than impact.');
  }else{
    if(rock.ownerId!==null||rock.position===null)fail('invalid-state','World/flying rocks require a native position and no inventory owner.');
    if(rock.phase==='world'){
      if(value.flight!==null)fail('invalid-state','World rocks cannot retain an active flight.');
      if(rock.lastImpact===null&&rock.revision!==0)fail('invalid-state','A revised world rock requires its impact receipt.');
      if(rock.lastImpact){
        const impact=rock.lastImpact.position,limit=rock.profile.radius+1e-6;
        if(rock.lastImpact.kind==='ground'?distance(rock.position,impact)>limit:Math.hypot(rock.position.x-impact.x,rock.position.y-impact.y)>limit||rock.position.h>impact.h+limit)fail('invalid-state','Landed rock differs from its first contact/vertical settling column.');
      }
    }else{
      const flight=value.flight;fields(flight,['id','commandId','sourceActorId','origin','target','velocity','aimTime','ticks','pendingUnits','settling'],undefined,'rock flight');
      const origin=point(flight.origin,'release origin'),target=point(flight.target,'aim target'),expected=lob(origin,target,rock.profile.gravity);
      if(distance(origin,target)>rock.profile.maxThrowRange+1e-9)fail('invalid-state','Saved throw exceeds its permitted range.');
      const velocity=point(flight.velocity,'launch velocity');if(!samePoint(velocity,expected.velocity)||flight.aimTime!==expected.aimTime)fail('invalid-state','Saved lob does not match the declared profile and aim.');
      rock.flight={id:id(flight.id,'throw ID'),commandId:id(flight.commandId,'command ID'),sourceActorId:id(flight.sourceActorId,'source actor ID'),origin,target,velocity,aimTime:expected.aimTime,ticks:integer(flight.ticks,0,899,'completed flight ticks'),pendingUnits:integer(flight.pendingUnits,0,999,'pending flight units'),settling:null};
      const clock=rock.flight.ticks/rock.profile.stepHz;
      if(flight.settling!==null){
        fields(flight.settling,['center','time'],undefined,'quiet settling');
        const center=point(flight.settling.center,'first impact centre'),time=finite(flight.settling.time,0,clock,'settling start time'),impact=rock.lastImpact;
        if(!impact||impact.throwId!==rock.flight.id||impact.commandId!==rock.flight.commandId||impact.sourceActorId!==rock.flight.sourceActorId||impact.flightTime!==time||impact.kind==='ground'||distance(center,impact.position)>rock.profile.radius+1e-6)fail('invalid-state','Quiet settling requires the matching first non-support impact receipt.');
        const at=time*rock.profile.stepHz,tick=Math.floor(at),a=flightPoint(rock.flight,tick/rock.profile.stepHz,rock.profile.gravity),b=flightPoint(rock.flight,(tick+1)/rock.profile.stepHz,rock.profile.gravity);
        if(distance(center,interpolate(a,b,at-tick))>1e-8)fail('invalid-state','Settling centre does not lie on the original swept lob.');
        rock.flight.settling={center,time};
      }else if(rock.lastImpact?.throwId===rock.flight.id)fail('invalid-state','An emitted impact needs an explicit quiet-settling stage.');
      if(rock.revision<rock.flight.ticks+2||!samePoint(rock.position,positionAt(rock.flight,clock,rock.profile.gravity)))fail('invalid-state','Flight position/revision is inconsistent with its saved fixed-step clock.');
    }
  }
  return rock;
}
export const serializeRock=rock=>JSON.stringify(openRock(rock));
