import {FARMYARD_GRENADE_PROFILE as P,WEAPON_RANGES,costOf,SIGHT_PROFILES,DEFAULT_SIGHT} from './profile.js';
import {distance,cellKey,inside,near,boxDistance,trajectory,pathBlocked,affects,footprint,sightLineClear,lineClear} from './geometry.js';
const clone=value=>JSON.parse(JSON.stringify(value));
export function preview(context,command){
 const actor=context.actors.find(value=>value.id===command.actorId),point=command.point,cost=actor?costOf(actor.weapon):P.cost;
 const valid=point!==null,d=valid&&actor?distance(actor,point):null;let reason='',code=null;
 const reject=(value,id)=>{reason=value;code=id;};
 if(!actor||actor.id!==context.control.actorId||actor.hp<=0||actor.burningTurns||actor.team!=='squad'||!['explore','player','won'].includes(context.control.phase)||context.control.status!=='active')reject('Wait for your turn','CONTROL_DENIED');
 else if(!(actor.grenades>0))reject('No grenades remaining','NO_GRENADES');
 else if(!valid||!inside(context.world,point))reject('Choose a point on the field','INVALID_LANDING');
 else if(!new Set(context.world.seen).has(cellKey(point.x,point.y)))reject('Choose an explored landing point','UNEXPLORED');
 else if(d>P.range+P.epsilon)reject('Out of throwing range','OUT_OF_RANGE');
 else if(near(context.world,point,point,.04,'walk').some(box=>boxDistance(point,box)<.04))reject('Landing point is inside an obstacle','LANDING_OBSTRUCTED');
 else if(pathBlocked(context.world,trajectory(actor,point)))reject('Throw path is blocked','PATH_BLOCKED');
 else if(actor.ap+P.epsilon<cost)reject('Not enough AP','INSUFFICIENT_AP');
 return {ok:!reason,reason,code,cost,distance:d,blast:P.blast,discounted:cost<P.cost,selfDanger:!!valid&&!!actor&&affects(context.world,point,actor),trajectory:valid&&actor?trajectory(actor,point):[],footprint:valid?footprint(context.world,point):[]};
}
function canSee(world,a,b){
 const t=(Object.hasOwn(SIGHT_PROFILES,a.species)?SIGHT_PROFILES[a.species]:null)||{...DEFAULT_SIGHT,field:a.cone??DEFAULT_SIGHT.field,bino:Math.min(DEFAULT_SIGHT.bino,a.cone??DEFAULT_SIGHT.field)};
 const heading=a.x===b.x&&a.y===b.y?a.heading:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
 const e=a.x===b.x&&a.y===b.y?0:Math.abs(((heading-a.heading+540)%360+360)%360-180),binocular=t.bino/2;
 const acuity=e>t.field/2+1e-8?0:e<=binocular?1:Math.max(t.floor,1/(1+(e-binocular)/t.e2));
 const range=(a.team==='squad'?35:26)*t.range*acuity*(b.sneaking?.7:1);
 return a.hp>0&&distance(a,b)<=Math.max(1.5,range)&&sightLineClear(world,a,b);
}
function refresh(context){
 const {control,actors,world}=context,hero=actors.find(value=>value.id===control.actorId),guards=actors.filter(value=>value.team==='guard'&&value.hp>0);
 control.detected=guards.filter(guard=>canSee(world,hero,guard)).map(guard=>guard.id);
 for(const guard of guards)if(canSee(world,guard,hero)){guard.alert=true;guard.lastKnown={x:hero.x,y:hero.y};guard.alertAge=0;}
 if(world.fogAt===null||distance(hero,world.fogAt)>.25){
  const b=world.bounds,range=35,x0=Math.max(0,Math.ceil(b.x),Math.ceil(hero.x-range)),x1=Math.min(world.grid.width-1,Math.ceil(b.x+b.w)-1,Math.floor(hero.x+range));
  const y0=Math.max(0,Math.ceil(b.y),Math.ceil(hero.y-range)),y1=Math.min(world.grid.height-1,Math.ceil(b.y+b.h)-1,Math.floor(hero.y+range)),seen=new Set(world.seen);
  world.visible=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(distance(hero,{x,y})<range&&lineClear(world,hero,{x,y})){const key=cellKey(x,y);world.visible.push(key);seen.add(key);}
  world.seen=[...seen];world.fogAt={x:hero.x,y:hero.y};
 }
 if(hero.hp<=0){control.phase='lost';control.status='lost';hero.isMoving=false;return;}
 if(!guards.length){control.phase='won';hero.isMoving=false;return;}
 if(control.phase!=='enemy'){
  const contact=control.engaged||guards.some(guard=>guard.alert&&distance(guard,hero)<=WEAPON_RANGES[guard.weapon]+guard.maxAp);
  if(contact&&control.phase!=='player'){control.phase='player';control.round++;hero.ap=hero.maxAp;hero.isMoving=false;}
  else if(!contact&&control.phase==='player'){control.phase='explore';hero.isMoving=false;}
 }
}
export const receiptId=(stateId,commandId)=>JSON.stringify(['grenade-v1',stateId,commandId]);
export function execute(context,command,stateId,revision){
 const check=preview(context,command);if(!check.ok)return {preview:check};
 const next=clone(context),actor=next.actors.find(value=>value.id===command.actorId),point=command.point;
 const before={ap:actor.ap,grenades:actor.grenades,grenadePackRounds:[...actor.grenadePackRounds]},controlBefore=clone(next.control);
 const consequences=[{type:'stop-movement',actorId:next.control.actorId}];
 next.actors.find(value=>value.id===next.control.actorId).isMoving=false;
 if(next.control.phase!=='player'){next.control.engaged=true;refresh(next);consequences.push({type:'refresh-visibility',phase:'before-debit'});}
 actor.ap=Math.max(0,actor.ap-check.cost);actor.grenades--;actor.grenadePackRounds=actor.grenadePackRounds.map(()=>actor.grenades);
 if(actor.x!==point.x||actor.y!==point.y)actor.heading=Math.atan2(point.y-actor.y,point.x-actor.x)*180/Math.PI;
 const damage=[],bodies=[];
 // Preserve original array order and recheck life for every target, including
 // the thrower. A self-fatality never cancels the rest of this accepted blast.
 for(const target of next.actors)if(target.hp>0&&affects(next.world,point,target)){
  const rawDamage=Math.round(P.damage*Math.max(.2,1-distance(target,point)/(P.blast+1))),resistance=Math.ceil(target.endurance/10),amount=Math.max(0,rawDamage-resistance),hpBefore=target.hp;
  target.hp=Math.max(0,target.hp-amount);
  if(target.hp===0){target.ap=0;target.casualty='dead';target.burningTurns=0;target.isMoving=false;
   const body={actorId:target.id,x:target.x,y:target.y,z:0};bodies.push(body);consequences.push({type:'register-body',...body});}
  damage.push({actorId:target.id,rawDamage,resistance,amount,hpBefore,hpAfter:target.hp,killed:target.hp===0});
 }
 consequences.push({type:'log-throw',actorId:actor.id,cost:check.cost});
 const alerts=[];for(const guard of next.actors)if(guard.team==='guard'&&guard.hp>0&&distance(actor,guard)<=P.range*2){guard.alert=true;guard.lastKnown={x:actor.x,y:actor.y};guard.alertAge=0;alerts.push(guard.id);}
 refresh(next);consequences.push({type:'refresh-visibility',phase:'after-blast'});
 const receipt={id:receiptId(stateId,command.id),type:'throw',command:clone(command),revision:revision+1,cost:check.cost,before,
  after:{ap:actor.ap,grenades:actor.grenades,grenadePackRounds:[...actor.grenadePackRounds]},damage,bodies,alerts,controlBefore,controlAfter:clone(next.control),consequences};
 const presentation={id:receipt.id,commandId:command.id,trajectory:check.trajectory,sequence:[{shooter:actor.id,ax:actor.x,ay:actor.y,bx:point.x,by:point.y,hit:damage.length>0,weapon:'grenade',blast:P.blast,explosions:[],windowSequences:[],fireSequences:[]}]};
 return {preview:check,context:next,receipt,presentation};
}
