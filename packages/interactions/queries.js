import {compileWorld} from '../world-core/index.js';
import {openInteractionState,openInteractionActor,axes,copy,point,fail} from './state.js';
import {contactShape,boundsContactShape,contactOverlap,firstContact,moveWithContacts} from '../traversal-core/index.js';
const epsilon=1e-7;
const good=()=>({ok:true});
const bad=(code,reason)=>({ok:false,code,reason});
const overlap=(a,b)=>axes.every(axis=>a.min[axis]<b.max[axis]-epsilon&&a.max[axis]>b.min[axis]+epsilon);
export const actorBounds=actor=>({min:{x:actor.position.x-actor.radiusM,y:actor.position.y-actor.radiusM,h:actor.position.h},max:{x:actor.position.x+actor.radiusM,y:actor.position.y+actor.radiusM,h:actor.position.h+actor.heightM}});
function intersects(from,to,bounds,actor){
  // Swept upright rectangular body against an axis-aligned box; no endpoint tunnelling.
  const expanded={min:{x:bounds.min.x-actor.radiusM+epsilon,y:bounds.min.y-actor.radiusM+epsilon,h:bounds.min.h-actor.heightM+epsilon},
    max:{x:bounds.max.x+actor.radiusM-epsilon,y:bounds.max.y+actor.radiusM-epsilon,h:bounds.max.h-epsilon}};
  let near=0,far=1;
  for(const axis of axes){
    const delta=to[axis]-from[axis];
    if(delta===0){if(from[axis]<expanded.min[axis]||from[axis]>expanded.max[axis])return false;continue;}
    let low=(expanded.min[axis]-from[axis])/delta,high=(expanded.max[axis]-from[axis])/delta;
    if(low>high)[low,high]=[high,low];near=Math.max(near,low);far=Math.min(far,high);if(near>far)return false;
  }
  return true;
}
function covered(rect,panels){
  // Exact union coverage of the conservative swept footprint rectangle.
  const cuts=[rect.min.x,rect.max.x,...panels.flatMap(p=>[Math.max(rect.min.x,p.min.x),Math.min(rect.max.x,p.max.x)])].filter(x=>x>=rect.min.x&&x<=rect.max.x).sort((a,b)=>a-b);
  for(let index=1;index<cuts.length;index++){
    if(cuts[index]-cuts[index-1]<epsilon)continue;
    const x=(cuts[index]+cuts[index-1])/2,spans=panels.filter(p=>p.min.x<=x&&p.max.x>=x).map(p=>[p.min.y,p.max.y]).sort((a,b)=>a[0]-b[0]);
    let edge=rect.min.y;
    for(const [min,max] of spans){if(min>edge+epsilon)break;edge=Math.max(edge,max);}
    if(edge<rect.max.y-epsilon)return false;
  }
  return true;
}
/** Reference provider for authored AABB worlds. Replace it for curved/mesh worlds. */
export function createInteractionQueries(input,{actors=()=>[],obstacles=()=>[],movementProfile='legacy-box-stop-v1'}={}){
  if(!['legacy-box-stop-v1','disc-slide-v1'].includes(movementProfile))fail('MOVEMENT_PROFILE_UNSUPPORTED','Bind a supported explicit walking profile.');
  if(typeof obstacles!=='function')fail('MISSING_BINDING','Obstacles must return current contact shapes.');
  const world=compileWorld(input),snapshot=world.snapshot(),inside=p=>p.x>=0&&p.y>=0&&p.h>=snapshot.bounds.minHeightM&&p.x<=snapshot.bounds.widthM&&p.y<=snapshot.bounds.depthM&&p.h<=snapshot.bounds.heightM;
  if(typeof actors!=='function')throw Error('actors must return the current authoritative interaction actors.');
  function occupants(actor){return [actor,...actors().map(openInteractionActor).filter(other=>other.id!==actor.id)];}
  function support({from,to=from,actor,floorId,surfaceId}){
    const floor=world.getFloor(floorId);
    if(Math.abs(from.h-floor.elevationM)>epsilon||Math.abs(to.h-floor.elevationM)>epsilon)return bad('NO_SUPPORT','Move to a confirmed landing at this floor height.');
    const rect={min:{x:Math.min(from.x,to.x)-actor.radiusM,y:Math.min(from.y,to.y)-actor.radiusM,h:from.h},max:{x:Math.max(from.x,to.x)+actor.radiusM,y:Math.max(from.y,to.y)+actor.radiusM,h:from.h}};
    const panels=world.queryBounds(rect).surfaces.filter(s=>s.supports&&s.supportFloorId===floorId&&Math.abs(s.bounds.max.h-from.h)<epsilon);
    if(surfaceId&&!panels.some(s=>s.id===surfaceId&&from.x>=s.bounds.min.x&&from.x<=s.bounds.max.x&&from.y>=s.bounds.min.y&&from.y<=s.bounds.max.y))return bad('INVALID_LANDING','The named landing surface does not support this endpoint.');
    return covered(rect,panels.map(s=>s.bounds))?good():bad('NO_SUPPORT','The route needs a supporting floor beneath the full body footprint.');
  }
  function sweep({state,actor,from,to}){
    const min={x:Math.min(from.x,to.x)-actor.radiusM,y:Math.min(from.y,to.y)-actor.radiusM,h:Math.min(from.h,to.h)},
      max={x:Math.max(from.x,to.x)+actor.radiusM,y:Math.max(from.y,to.y)+actor.radiusM,h:Math.max(from.h,to.h)+actor.heightM};
    if(!inside(min)||!inside(max))return bad('OUTSIDE_WORLD','Stay within the authored world bounds.');
    const boxes=world.queryBounds({min,max}).surfaces.map(s=>({id:s.id,bounds:s.bounds}));
    for(const door of state.doors){const bounds=door.open?door.openBounds:door.closedBounds;if(bounds)boxes.push({id:door.id,bounds});}
    for(const other of occupants(actor))if(other.id!==actor.id)boxes.push({id:other.id,bounds:actorBounds(other)});
    const hit=boxes.find(box=>intersects(from,to,box.bounds,actor));
    return hit?bad('BLOCKED','The way is blocked by '+hit.id+'.'):good();
  }
  function discMove({state,actor,from,to},slide){
    if(Math.abs(from.h-to.h)>epsilon)return bad('UNSUPPORTED_WALK_HEIGHT','Disc sliding requires flat supported ground; use a stair binding.');
    const delta={x:to.x-from.x,y:to.y-from.y},shape=contactShape({id:actor.id,points:[from],radiusM:actor.radiusM,minH:from.h,maxH:from.h+actor.heightM});
    // Any accepted slide has total length <= the requested displacement. Query
    // that bounded reachable envelope, not only the original straight strip:
    // a rounded corner can deflect a secondary segment outside that strip.
    const reach=slide?Math.hypot(delta.x,delta.y):0;
    const bounds=slide?{min:{x:from.x-actor.radiusM-reach,y:from.y-actor.radiusM-reach,h:from.h},max:{x:from.x+actor.radiusM+reach,y:from.y+actor.radiusM+reach,h:from.h+actor.heightM}}:{min:{x:Math.min(from.x,to.x)-actor.radiusM,y:Math.min(from.y,to.y)-actor.radiusM,h:from.h},max:{x:Math.max(from.x,to.x)+actor.radiusM,y:Math.max(from.y,to.y)+actor.radiusM,h:from.h+actor.heightM}};
    const boxes=world.queryBounds(bounds).surfaces.map(s=>boundsContactShape(s.id,s.bounds));
    for(const door of state.doors){const bounds=door.open?door.openBounds:door.closedBounds;if(bounds)boxes.push(boundsContactShape(door.id,bounds));}
    for(const other of occupants(actor))if(other.id!==actor.id)boxes.push(contactShape({id:other.id,points:[other.position],radiusM:other.radiusM,minH:other.position.h,maxH:other.position.h+other.heightM}));
    boxes.push(...obstacles());
    const initialHit=boxes.find(box=>contactOverlap(shape,box));if(initialHit)return bad('BLOCKED','The body overlaps '+initialHit.id+'.');
    if(!slide){const hit=firstContact(shape,delta,boxes);return hit?bad('BLOCKED','The way is blocked by '+hit.id+'.'):good();}
    const moved=moveWithContacts(shape,delta,boxes),position={x:from.x+moved.delta.x,y:from.y+moved.delta.y,h:from.h};
    for(const segment of moved.segments){const a={x:from.x+segment.from.x,y:from.y+segment.from.y,h:from.h},b={x:from.x+segment.to.x,y:from.y+segment.to.y,h:from.h};
      if(!inside({x:b.x-actor.radiusM,y:b.y-actor.radiusM,h:b.h})||!inside({x:b.x+actor.radiusM,y:b.y+actor.radiusM,h:b.h+actor.heightM}))return bad('OUTSIDE_WORLD','Stay within the authored world.');
      const supported=support({from:a,to:b,actor,floorId:actor.floorId});if(!supported.ok)return supported;
    }
    return {ok:true,position,distanceM:moved.distanceM,contacts:moved.contacts};
  }
  function doorClearance(state,door){
    const solid=world.queryBounds(door.motionBounds).surfaces.find(surface=>overlap(door.motionBounds,surface.bounds));
    if(solid)return bad('DOOR_BLOCKED','Door '+door.id+' needs a clear motion envelope; static surface '+solid.id+' occupies it. Correct the authored clearance or bind an exact geometry provider.');
    // Reserve complete authored envelopes. This conservative AABB profile does
    // not arbitrate intersecting hinge arcs or concurrent paired leaves.
    const other=state.doors.find(value=>value.id!==door.id&&overlap(door.motionBounds,value.motionBounds));
    return other?bad('DOOR_BLOCKED','Door '+door.id+' overlaps the reserved motion clearance of '+other.id+'. Separate the clearances or use an explicitly compatible provider.'):good();
  }
  return Object.freeze({
    movementProfile,
    ...(movementProfile==='disc-slide-v1'?{move:value=>discMove(value,true)}:{}),
    worldId:snapshot.id,
    validateBindings(value){
      const state=openInteractionState(value);
      if(state.worldId!==snapshot.id)fail('WRONG_WORLD','Bind the interaction sidecar to its matching authored world.');
      for(const door of state.doors){
        const floor=world.getFloor(door.floorId);point(door.position);if(Math.abs(door.position.h-floor.elevationM)>epsilon)fail('INVALID_LANDING','Door interaction position must match its declared floor height.',door.id);
        if(!inside(door.position)||![door.closedBounds,door.openBounds,door.motionBounds].filter(Boolean).every(bounds=>inside(bounds.min)&&inside(bounds.max)))fail('OUTSIDE_WORLD','Door bounds are outside the authored world.',door.id);
        const clearance=doorClearance(state,door);if(!clearance.ok)fail(clearance.code,clearance.reason,door.id);
      }
      for(const stair of state.stairs)for(const landing of [stair.from,stair.to]){
        const actor={radiusM:stair.widthM/2,heightM:stair.clearanceM};
        const result=support({from:landing.position,actor,floorId:landing.floorId,surfaceId:landing.surfaceId});
        if(!result.ok)fail(result.code,stair.id+': '+result.reason,stair.id);
      }
      return copy(state);
    },
    landing({actor,landing}){return support({from:landing.position,actor,floorId:landing.floorId,surfaceId:landing.surfaceId});},
    sweep,
    walk(value){return support({...value,floorId:value.actor.floorId}).ok?(movementProfile==='disc-slide-v1'?discMove(value,false):sweep(value)):bad('NO_SUPPORT','Walk on a supported floor; use a declared stair route to change height.');},
    canSetDoor({state,actor,door}){
      const clearance=doorClearance(state,door);if(!clearance.ok)return clearance;
      if(obstacles().some(shape=>contactOverlap(boundsContactShape(door.id,door.motionBounds),shape)))return bad('DOOR_OCCUPIED','A traversal body occupies the door motion envelope.');
      return occupants(actor).some(other=>overlap(door.motionBounds,actorBounds(other)))?bad('DOOR_OCCUPIED','Someone is in the doorway. Move clear before operating it.'):good();
    }
  });
}
