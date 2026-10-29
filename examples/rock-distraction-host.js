import * as Rock from '../packages/items-core/index.js';

// This yard is a reference consumer. It owns its inventory, geometry, clocks,
// hearing permissions and routes; none of those policies enter the item module.
export const YARD=Object.freeze({
 width:22,depth:14,step:1/60,playerSpeed:3,guardSpeed:1.8,searchSeconds:3,
 walls:[{id:'yard-wall',min:{x:9,y:3,h:0},max:{x:9.25,y:10,h:2}}],
 boulders:[],
 targets:{open:{x:6,y:6,h:0},wall:{x:10.5,y:6,h:0}}
});
const copy=value=>JSON.parse(JSON.stringify(value));
const finitePoint=p=>p&&['x','y','h'].every(key=>Number.isFinite(p[key]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.h||0)-(b.h||0));
const along=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h:a.h+(b.h-a.h)*t});

function segmentBox(from,to,box,radius){
 let entry=-Infinity,exit=Infinity,normal={x:0,y:0,h:0};
 for(const key of ['x','y','h']){
  const delta=to[key]-from[key],lo=box.min[key]-radius,hi=box.max[key]+radius;
  // A sphere moving along or away from an already touched face has no new hit.
  if(Math.abs(from[key]-lo)<1e-9&&delta<=1e-12||Math.abs(from[key]-hi)<1e-9&&delta>=-1e-12)return null;
  if(Math.abs(delta)<1e-12){if(from[key]<lo||from[key]>hi)return null;continue;}
  let near=(lo-from[key])/delta,far=(hi-from[key])/delta,sign=-1;
  if(near>far){[near,far]=[far,near];sign=1;}
  if(near>entry){entry=near;normal={x:0,y:0,h:0};normal[key]=sign;}
  exit=Math.min(exit,far);if(entry>exit)return null;
 }
 if(exit<0||entry>1)return null;
 const fraction=Math.max(0,entry);
 return {fraction,position:along(from,to,fraction),normal,surface:'stone',obstacleId:box.id};
}
// First swept sphere contact, never a cursor target or end-of-frame guess.
export function sweepYard(from,to,radius=.055,allContacts=false){
 if(!finitePoint(from)||!finitePoint(to)||!Number.isFinite(radius)||radius<=0)throw new TypeError('Invalid yard sweep.');
 const contacts=[];
 for(const wall of YARD.walls){const contact=segmentBox(from,to,wall,radius);if(contact)contacts.push(contact);}
 if(to.h<=radius&&to.h<from.h){const fraction=Math.max(0,(radius-from.h)/(to.h-from.h));if(fraction<=1)contacts.push({fraction,position:along(from,to,fraction),normal:{x:0,y:0,h:1},surface:'earth',obstacleId:'ground'});}
 contacts.sort((a,b)=>a.fraction-b.fraction);
 const result=contacts.map(hit=>({fraction:hit.fraction,point:{x:hit.position.x-hit.normal.x*radius,y:hit.position.y-hit.normal.y*radius,h:hit.position.h-hit.normal.h*radius},surfaceId:hit.obstacleId,kind:hit.normal.h>0?'ground':hit.normal.h<0?'ceiling':'wall'}));
 return allContacts?(result.length?result:null):result[0]||null;
}
function free(point,radius=.28){
 if(!finitePoint(point)||point.x<.4||point.x>YARD.width-.4||point.y<.4||point.y>YARD.depth-.4)return false;
 if(YARD.walls.some(w=>point.x>w.min.x-radius&&point.x<w.max.x+radius&&point.y>w.min.y-radius&&point.y<w.max.y+radius))return false;
 return !YARD.boulders.some(b=>Math.hypot(point.x-b.x,point.y-b.y)<b.radius+radius);
}
export function yardRoute(from,to){
 if(!finitePoint(from)||!finitePoint(to))throw new TypeError('Invalid yard route.');
 const cells=[];
 for(let y=1;y<YARD.depth;y++)for(let x=1;x<YARD.width;x++)if(free({x,y,h:0}))cells.push({x,y,h:0});
 const nearest=point=>cells.reduce((best,p)=>distance(p,point)<distance(best,point)?p:best,cells[0]);
 const start=nearest(from),goal=nearest(to),key=p=>p.x+','+p.y,queue=[start],prior=new Map([[key(start),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===key(goal))break;
  for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){
   const next={x:p.x+dx,y:p.y+dy,h:0},id=key(next);
   if(prior.has(id)||!free(next))continue;
   prior.set(id,p);queue.push(next);
  }
 }
 if(!prior.has(key(goal)))return [];
 const route=[];for(let p=goal;key(p)!==key(start);p=prior.get(key(p)))route.unshift({...p});
 if(distance(from,start)>.01)route.unshift({...start});
 return route;
}

const PLAYER='yard-player', labels={idle:'On watch',investigate:'Investigating',search:'Searching',return:'Returning',combat:'In a fight'};
const hand=player=>({x:player.x,y:player.y,h:.9});
const initial=()=>({
 version:1,ticks:0,pendingSeconds:0,nextCommand:1,nextEvent:1,nextNote:2,
 player:{x:3,y:6,h:0,heading:0},aim:copy(YARD.targets.open),
 rocks:[Rock.createRock({id:'yard-rock-1',position:{x:3.6,y:6,h:Rock.ROCK_PROFILE.radius}})],
 inventory:[],receipts:[],noiseIds:[],throwTimes:{},events:[],
 notes:[{sequence:1,time:0,text:'A loose rock is beside you. Pick it up, then choose a target.'}],
 guards:[
  {id:'near',name:'Ivo',position:{x:12,y:4,h:0},home:{x:12,y:4,h:0},mode:'idle',target:null,route:[],heading:0,waitUntil:0,heardAt:0},
  {id:'far',name:'Sana',position:{x:21,y:12,h:0},home:{x:21,y:12,h:0},mode:'idle',target:null,route:[],heading:0,waitUntil:0,heardAt:0},
  {id:'engaged',name:'Bram',position:{x:7,y:10,h:0},home:{x:7,y:10,h:0},mode:'combat',target:{x:16,y:10,h:0},route:[],heading:Math.PI/2,waitUntil:0,heardAt:0}
 ]
});

export function createRockYard({snapshot}={}){
 let state=initial();
 const time=()=>state.ticks*YARD.step;
 const note=text=>{state.notes.push({sequence:state.nextNote++,time:time(),text});if(state.notes.length>20)state.notes.shift();};
 function rejected(result,action){
  const messages={'out-of-reach':'Move closer to the loose rock.','out-of-range':'That spot is too far away.','capacity':'Your hand is already full.','forbidden':'You cannot do that here.'};
  note(messages[result.code]||(action==='pickup'?'There is no loose rock within reach.':'Pick up a rock before throwing.'));
  return result;
 }
 function command(rock){return {commandId:'yard-command-'+state.nextCommand,rockId:rock.id,expectedRevision:rock.revision,actorId:PLAYER};}
 function throwCommand(rock){return {...command(rock),throwId:'yard-throw-'+state.nextCommand,origin:{x:state.player.x,y:state.player.y,h:1.1},target:{...state.aim,h:rock.profile.radius},permitted:free(state.player)&&state.inventory.includes(rock.id)};}
 function notify(noise){
  if(state.noiseIds.includes(noise.id))return;
  const hearing=Rock.evaluateRockNoise(noise,state.guards.map(guard=>({
   id:guard.id,position:{...guard.position,h:1.1},hearingEnabled:true,audible:true,permitted:true,
   behavior:guard.mode==='combat'?'combat':guard.mode==='idle'?'idle':'investigating',
   confirmedThreat:guard.mode==='combat',incapacitated:false
  })));
  if(!hearing.ok)throw new Error('Yard hearing adapter: '+hearing.reason);
  state.noiseIds.push(noise.id);
  const at=state.throwTimes[noise.throwId]+noise.flightTime;
  state.events.push({sequence:state.nextEvent++,kind:'impact',time:at,position:copy(noise.position),receipt:copy(noise)});
  if(state.events.length>80)state.events.shift();
  note(noise.kind==='wall'?'The rock strikes the wall. A sharp thud carries across the yard.':'The rock lands with a thud.');
  for(const request of hearing.requests){
   const guard=state.guards.find(guard=>guard.id===request.listenerId);
   guard.mode='investigate';guard.target=copy(request.position);guard.route=yardRoute(guard.position,request.position);guard.heardAt=at;
   guard.heading=Math.atan2(request.position.x-guard.position.x,request.position.y-guard.position.y);
   note(guard.name+' heard the landing and is going to look.');
  }
 }
 // Compare the complete canonical source, recheck inventory, and publish only
 // after the copied item and inventory delta have committed together.
 function commit(result,payload=null){
  if(!result.ok)return result;
  if(payload&&state.receipts.some(receipt=>receipt.id===payload.commandId))return {...result,ok:false,code:'replayed-host',reason:'This command has already committed.',events:[],inventoryDelta:[]};
  const index=state.rocks.findIndex(rock=>rock.id===result.rock.id),current=state.rocks[index];
  if(!current||Rock.serializeRock(current)!==result.expected)return {...result,ok:false,code:'stale-host',reason:'The item changed before this action committed.',events:[],inventoryDelta:[]};
  const inventory=[...state.inventory];
  for(const delta of result.inventoryDelta){
   if(delta.actorId!==PLAYER||delta.instanceId!==current.id||delta.itemId!==Rock.ROCK_ITEM.id||![1,-1].includes(delta.quantity))throw new Error('Unexpected yard inventory delta.');
   const member=inventory.indexOf(delta.instanceId);
   if(delta.quantity===1){if(member!==-1||inventory.length>=1||!free(state.player)||distance(hand(state.player),current.position)>current.profile.pickupReach)return {...result,ok:false,code:'stale-host',events:[],inventoryDelta:[]};inventory.push(delta.instanceId);}
   else{if(member<0||!free(state.player))return {...result,ok:false,code:'stale-host',events:[],inventoryDelta:[]};inventory.splice(member,1);}
  }
  const nextRock=Rock.openRock(result.rock);
  if((nextRock.phase==='carried')!==inventory.includes(nextRock.id)||nextRock.phase==='carried'&&nextRock.ownerId!==PLAYER)throw new Error('Staged item and inventory disagree.');
  state.rocks[index]=nextRock;state.inventory=inventory;
  if(payload){state.receipts.push({id:payload.commandId,payload:copy(payload)});if(result.rock.phase==='flying')state.throwTimes[result.rock.flight.id]=time();}
  for(const event of result.events)if(event.type==='rock-impact-noise')notify(event);
  return result;
 }
 function pickup(){
  const world=state.rocks.filter(rock=>rock.phase==='world').sort((a,b)=>distance(hand(state.player),a.position)-distance(hand(state.player),b.position));
  const rock=world[0]||state.rocks[0],payload={...command(rock),actorPosition:hand(state.player),permitted:free(state.player),capacity:state.inventory.length<1};
  state.nextCommand++;
  const result=commit(Rock.pickupRock(rock,payload),payload);
  if(result.ok)note('Rock picked up. Choose where to throw.');else rejected(result,'pickup');
  return copy(result);
 }
 function toss(){
  const rock=state.rocks.find(rock=>state.inventory.includes(rock.id))||state.rocks[0],payload=throwCommand(rock);
  state.nextCommand++;
  const result=commit(Rock.throwRock(rock,payload),payload);
  if(result.ok)note('Rock released. Watch where it lands.');else rejected(result,'throw');
  return copy(result);
 }
 function tick(){
  for(const rock of [...state.rocks])if(rock.phase==='flying'){
   const result=commit(Rock.stepRock(rock,{dt:YARD.step,world:{sweepSphere:query=>sweepYard(query.from,query.to,query.radius,query.stage==='settling')}}));
   if(!result.ok)throw new Error('Yard flight adapter: '+result.reason);
  }
  state.ticks++;
  for(const guard of state.guards){
   if(guard.mode==='idle'||guard.mode==='combat')continue;
   if(guard.mode==='search'){
    if(time()>=guard.waitUntil){guard.mode='return';guard.route=yardRoute(guard.position,guard.home);note(guard.name+' found nothing and is returning.');}
    else continue;
   }
   let budget=YARD.guardSpeed*Math.min(YARD.step,Math.max(0,time()-guard.heardAt));
   while(guard.route.length&&budget>1e-10){
    const target=guard.route[0],length=Math.hypot(target.x-guard.position.x,target.y-guard.position.y);
    guard.heading=Math.atan2(target.x-guard.position.x,target.y-guard.position.y);
    if(length<=budget){guard.position=copy(target);guard.route.shift();budget-=length;}
    else{guard.position.x+=(target.x-guard.position.x)*budget/length;guard.position.y+=(target.y-guard.position.y)*budget/length;budget=0;}
    if(!free(guard.position))throw new Error('Yard route crossed a solid.');
   }
   if(!guard.route.length){
    if(guard.mode==='investigate'){guard.mode='search';guard.waitUntil=time()+YARD.searchSeconds;guard.heading=Math.atan2(guard.target.x-guard.position.x,guard.target.y-guard.position.y);note(guard.name+' is searching near the sound.');}
    else{guard.mode='idle';guard.target=null;note(guard.name+' is back on watch.');}
   }
  }
 }
 function advance(seconds){
  if(!Number.isFinite(seconds)||seconds<0||seconds>60)throw new RangeError('Advance the yard by 0–60 seconds.');
  state.pendingSeconds+=seconds;
  while(state.pendingSeconds+1e-10>=YARD.step){tick();state.pendingSeconds-=YARD.step;}
  state.pendingSeconds=Math.abs(state.pendingSeconds)<1e-9?0:Math.round(state.pendingSeconds*1e12)/1e12;
  return presentation();
 }
 function walk(dx,dy,seconds=.25){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(seconds)||seconds<0||seconds>1)throw new RangeError('Invalid yard movement.');
  const length=Math.hypot(dx,dy);if(!length)return;
  const distance=YARD.playerSpeed*seconds,steps=Math.max(1,Math.ceil(distance/.1));
  for(let step=0;step<steps;step++){
   const next={...state.player,x:state.player.x+dx/length*distance/steps,y:state.player.y+dy/length*distance/steps};
   if(!free(next))break;state.player=next;
  }
  state.player.heading=Math.atan2(dx,dy);
 }
 function aim(point){
  if(!finitePoint(point)||point.x<.5||point.x>YARD.width-.5||point.y<.5||point.y>YARD.depth-.5||point.h!==0)return {ok:false};
  state.aim=copy(point);
  const rock=state.rocks.find(rock=>state.inventory.includes(rock.id));
  if(rock&&!Rock.previewRockThrow(rock,throwCommand(rock)).ok)note('That spot is too far away.');
  return {ok:true};
 }
 function presentation(){
  const carried=state.rocks.find(rock=>state.inventory.includes(rock.id));
  const preview=carried?Rock.previewRockThrow(carried,throwCommand(carried)):null,points=[];
  if(preview?.ok){
   const flight=preview.trajectory;
   for(let step=0;step<=40;step++){const t=flight.aimTime*step/40;points.push({x:flight.origin.x+flight.velocity.x*t,y:flight.origin.y+flight.velocity.y*t,h:flight.origin.h+flight.velocity.h*t-.5*carried.profile.gravity*t*t});}
  }
  const nearby=state.rocks.find(rock=>rock.phase==='world'&&distance(hand(state.player),rock.position)<=rock.profile.pickupReach);
  return copy({time:time(),player:state.player,aim:state.aim,count:state.inventory.length,nearby:nearby?.id||null,canThrow:!!preview?.ok,preview:points,
   rocks:state.rocks.map(rock=>({id:rock.id,phase:rock.phase==='flying'?'flight':rock.phase,position:rock.position,radius:rock.profile.radius,ownerId:rock.ownerId})),
   guards:state.guards.map(guard=>({...guard,label:labels[guard.mode]})),events:state.events,notes:state.notes});
 }
 function save(){return copy({...state,rocks:state.rocks.map(rock=>Rock.openRock(Rock.serializeRock(rock)))});}
 function restore(value){
  const next=copy(value);
  if(next?.version!==1||!Number.isSafeInteger(next.ticks)||next.ticks<0||!Number.isFinite(next.pendingSeconds)||next.pendingSeconds<0||next.pendingSeconds>=YARD.step||!finitePoint(next.player)||!free(next.player)||!finitePoint(next.aim)||!Array.isArray(next.rocks)||next.rocks.length!==1||!Array.isArray(next.inventory)||next.inventory.length>1||!Array.isArray(next.guards)||next.guards.length!==3)throw new TypeError('Unsupported yard snapshot.');
  if(!Number.isSafeInteger(next.nextCommand)||next.nextCommand<1||!Number.isSafeInteger(next.nextEvent)||next.nextEvent<1||!Number.isSafeInteger(next.nextNote)||next.nextNote<1||!Array.isArray(next.receipts)||!Array.isArray(next.noiseIds)||!Array.isArray(next.events)||!Array.isArray(next.notes))throw new TypeError('Invalid yard ledgers.');
  const receiptIds=new Set();for(const receipt of next.receipts){if(typeof receipt.id!=='string'||receiptIds.has(receipt.id)||receipt.payload?.commandId!==receipt.id||!/^yard-command-\d+$/.test(receipt.id)||Number(receipt.id.slice(13))>=next.nextCommand)throw new TypeError('Invalid yard command receipt.');receiptIds.add(receipt.id);}
  if(new Set(next.noiseIds).size!==next.noiseIds.length||new Set(next.guards.map(guard=>guard.id)).size!==3)throw new TypeError('Duplicate yard receipt or guard.');
  if(!next.throwTimes||typeof next.throwTimes!=='object'||Array.isArray(next.throwTimes)||Object.values(next.throwTimes).some(at=>!Number.isFinite(at)||at<0||at>next.ticks*YARD.step+1e-9))throw new TypeError('Invalid saved throw clock.');
  next.rocks=next.rocks.map(Rock.openRock);
  if(next.rocks.some(rock=>rock.phase==='flying'&&!Number.isFinite(next.throwTimes[rock.flight.id])))throw new TypeError('A flying rock requires its saved release clock.');
  const validTime=at=>Number.isFinite(at)&&at>=0&&at<=next.ticks*YARD.step+YARD.step;
  if(next.guards.some(guard=>!finitePoint(guard.home)||!free(guard.home)||!Number.isFinite(guard.heading)||!validTime(guard.heardAt)||!Number.isFinite(guard.waitUntil)||guard.waitUntil<0||(guard.target!==null&&!finitePoint(guard.target))||(guard.mode!=='idle'&&guard.target===null)))throw new TypeError('Invalid saved guard clock or target.');
  if(next.events.some(event=>event.kind!=='impact'||!Number.isSafeInteger(event.sequence)||event.sequence<1||event.sequence>=next.nextEvent||!validTime(event.time)||!finitePoint(event.position)||!Rock.evaluateRockNoise(event.receipt,[]).ok||!next.noiseIds.includes(event.receipt.id)||JSON.stringify(event.position)!==JSON.stringify(event.receipt.position)||!Number.isFinite(next.throwTimes[event.receipt.throwId])||Math.abs(event.time-next.throwTimes[event.receipt.throwId]-event.receipt.flightTime)>1e-8))throw new TypeError('Invalid saved impact time.');
  if(next.notes.some(note=>!validTime(note.time)||!Number.isSafeInteger(note.sequence)||note.sequence<1||note.sequence>=next.nextNote||typeof note.text!=='string'))throw new TypeError('Invalid saved yard note.');
  const ids=new Set(next.rocks.map(rock=>rock.id));
  if(ids.size!==next.rocks.length||new Set(next.inventory).size!==next.inventory.length||next.inventory.some(id=>!ids.has(id)))throw new TypeError('Invalid yard inventory.');
  for(const rock of next.rocks)if((rock.phase==='carried')!==(next.inventory.includes(rock.id))||rock.phase==='carried'&&rock.ownerId!==PLAYER)throw new TypeError('Yard item ownership disagrees with inventory.');
  if(next.guards.some(guard=>!['near','far','engaged'].includes(guard.id)||!labels[guard.mode]||!finitePoint(guard.position)||!free(guard.position)||!Array.isArray(guard.route)||guard.route.some(p=>!finitePoint(p)||!free(p))))throw new TypeError('Invalid yard guard state.');
  state=next;
 }
 if(snapshot)restore(snapshot);
 return {pickup,throw:toss,aim,walk,advance,presentation,snapshot:save,restore,reset:()=>{state=initial();},get moving(){return state.rocks.some(rock=>rock.phase==='flying')||state.guards.some(guard=>!['idle','combat'].includes(guard.mode));}};
}
