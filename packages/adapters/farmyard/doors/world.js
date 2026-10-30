import {FARMYARD_DOOR_PROFILE as P,SIGHT_PROFILES,DEFAULT_SIGHT,WEAPON_RANGES} from './profile.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),cellKey=(x,y)=>Math.round(x)+','+Math.round(y);
export const boxDistance=(point,box)=>Math.hypot(Math.max(box.x0-point.x,0,point.x-box.x1),Math.max(box.y0-point.y,0,point.y-box.y1));
// One authoritative footprint feeds all consumers, including the open solid leaf.
export function collider(door,open=door.open){
  const half=P.widthM/2,t=P.thicknessM/2,base={id:door.id,interactionId:door.id,kind:'wall',z0:0,height:P.heightM};
  if(door.edge.startsWith('s:'))return {...base,...(open?{x0:door.x-half-t,x1:door.x-half+t,y0:Math.min(door.y,door.y+door.swing*P.widthM),y1:Math.max(door.y,door.y+door.swing*P.widthM)}:{x0:door.x-half,x1:door.x+half,y0:door.y-t,y1:door.y+t})};
  return {...base,...(open?{x0:Math.min(door.x,door.x+door.swing*P.widthM),x1:Math.max(door.x,door.x+door.swing*P.widthM),y0:door.y-half-t,y1:door.y-half+t}:{x0:door.x-t,x1:door.x+t,y0:door.y-half,y1:door.y+half})};
}
export const geometry=context=>[...context.world.staticBoxes,...context.doors.map(door=>collider(door))];
export function interval(a,b,box){let lo=0,hi=1;for(const [key,min,max]of [['x',box.x0,box.x1],['y',box.y0,box.y1]]){const d=b[key]-a[key];if(Math.abs(d)<P.epsilon){if(a[key]<min||a[key]>max)return null;continue;}const t0=(min-a[key])/d,t1=(max-a[key])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return null;}return [lo,hi];}
function airSpan(a,b,za,zb,box){const span=interval(a,b,box);if(!span)return null;let [lo,hi]=span;const dz=zb-za;if(Math.abs(dz)<P.epsilon){if(za<box.z0||za>box.height)return null;}else{const t0=(box.z0-za)/dz,t1=(box.height-za)/dz;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return null;}return [lo,hi];}
const intersects=(a,b,box)=>{const span=interval(a,b,box);return span&&span[1]>P.epsilon&&span[0]<1-P.epsilon;};
function lineClear(boxes,a,b){return !boxes.some(box=>box.kind==='wall'&&intersects(a,b,box));}
function sightClear(boxes,a,b){if(a.stance!=='prone'||b.stance!=='prone')return lineClear(boxes,a,b);return !boxes.some(box=>box.kind!=='prop'&&intersects(a,b,box)&&(box.kind==='wall'||!!airSpan(a,b,.3,.3,box)));}
function canSee(boxes,a,b){
  const t=(Object.hasOwn(SIGHT_PROFILES,a.species)?SIGHT_PROFILES[a.species]:null)||{...DEFAULT_SIGHT,field:a.cone??DEFAULT_SIGHT.field,bino:Math.min(DEFAULT_SIGHT.bino,a.cone??DEFAULT_SIGHT.field)},heading=a.x===b.x&&a.y===b.y?a.heading:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,e=a.x===b.x&&a.y===b.y?0:Math.abs(((heading-a.heading+540)%360+360)%360-180),binocular=t.bino/2,acuity=e>t.field/2+1e-8?0:e<=binocular?1:Math.max(t.floor,1/(1+(e-binocular)/t.e2)),range=(a.team==='squad'?35:26)*t.range*acuity*(b.sneaking?.7:1);
  return a.hp>0&&distance(a,b)<=Math.max(1.5,range)&&sightClear(boxes,a,b);
}
export function clearReach(context,actor,door){
  if(distance(actor,door)>door.range+P.epsilon)return false;const boxes=geometry(context).filter(box=>box.interactionId!==door.id&&box.kind!=='part'),steps=Math.max(1,Math.ceil(distance(actor,door)/P.reachStepM));
  for(let i=0;i<=steps;i++){const point={x:actor.x+(door.x-actor.x)*i/steps,y:actor.y+(door.y-actor.y)*i/steps};if(boxes.some(box=>boxDistance(point,box)<P.actorRadiusM-P.epsilon))return false;}return true;
}
export function refreshAfterDoor(context,consequences){
  const {control,actors,world}=context,hero=actors.find(actor=>actor.id===control.actorId),guards=actors.filter(actor=>actor.team==='guard'&&actor.hp>0),boxes=geometry(context);
  control.detected=guards.filter(guard=>canSee(boxes,hero,guard)).map(guard=>guard.id);for(const guard of guards)if(canSee(boxes,guard,hero)){guard.alert=true;guard.lastKnown={x:hero.x,y:hero.y};guard.alertAge=0;}
  // Door operations always request forceFog:true, even without hero movement.
  const b=world.bounds,range=35,x0=Math.max(0,Math.ceil(b.x),Math.ceil(hero.x-range)),x1=Math.min(world.grid.width-1,Math.ceil(b.x+b.w)-1,Math.floor(hero.x+range)),y0=Math.max(0,Math.ceil(b.y),Math.ceil(hero.y-range)),y1=Math.min(world.grid.height-1,Math.ceil(b.y+b.h)-1,Math.floor(hero.y+range)),seen=new Set(world.seen);world.visible=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(distance(hero,{x,y})<range&&lineClear(boxes,hero,{x,y})){const key=cellKey(x,y);world.visible.push(key);seen.add(key);}world.seen=[...seen];world.fogAt={x:hero.x,y:hero.y};
  if(hero.hp<=0){control.phase='lost';control.status='lost';context.queue=[];hero.isMoving=false;return;}
  if(!guards.length){control.phase='won';context.queue=[];return;}
  if(control.phase!=='enemy'){const contact=control.engaged||guards.some(guard=>guard.alert&&distance(guard,hero)<=WEAPON_RANGES[guard.weapon]+guard.maxAp);if(contact&&control.phase!=='player'){control.phase='player';control.round++;hero.ap=hero.maxAp;context.queue=[];hero.isMoving=false;consequences.push({type:'log-contact',actorId:hero.id});}else if(!contact&&control.phase==='player'){control.phase='explore';context.queue=[];hero.isMoving=false;consequences.push({type:'log-contact-broken',actorId:hero.id});}}
}
