import {GRENADE_CONTRACT,FARMYARD_GRENADE_PROFILE as P,WEAPON_RANGES} from './profile.js';
import {fields,finite,integer,text,id,bool,list,xy,fail} from './validation.js';
export function support(value,path='/support'){
 fields(value,['windows','fueledTargets','volatileTargets','fire','multilevel','engagement','consequences'],path);
 for(const key of ['windows','fueledTargets','volatileTargets','fire','multilevel'])if(value[key]!==false)fail('UNSUPPORTED_FEATURE',path+'/'+key,'This profile requires an explicit absence assertion for '+key+'.');
 if(value.engagement!==P.engagement||value.consequences!==P.consequences)fail('UNSUPPORTED_POLICY',path,'Unsupported engagement or consequence policy.');return value;
}
export function world(value,path='/world'){
 fields(value,['bounds','grid','seen','visible','fogAt','boxes'],path);fields(value.grid,['width','height'],path+'/grid');integer(value.grid.width,1,240,path+'/grid/width');integer(value.grid.height,1,240,path+'/grid/height');if(value.fogAt!==null)xy(value.fogAt,path+'/fogAt');fields(value.bounds,['x','y','w','h'],path+'/bounds');
 finite(value.bounds.x,-1000,1000,path+'/bounds/x');finite(value.bounds.y,-1000,1000,path+'/bounds/y');
 finite(value.bounds.w,1,240,path+'/bounds/w');finite(value.bounds.h,1,240,path+'/bounds/h');
 for(const group of ['seen','visible']){const seen=new Set();for(const [i,cell]of list(value[group],65536,path+'/'+group).entries()){
  if(typeof cell!=='string'||!/^(-?\d+),(-?\d+)$/.test(cell)||seen.has(cell))fail('INVALID_FOG',path+'/seen/'+i,'Explored cells must be unique integer coordinate keys.');
  const [x,y]=cell.split(',').map(Number);finite(x,-1000,1240,path+'/seen/'+i);finite(y,-1000,1240,path+'/seen/'+i);seen.add(cell);
 }}
 const ids=new Set();for(const [i,box]of list(value.boxes,8192,path+'/boxes').entries()){
  const at=path+'/boxes/'+i;fields(box,['id','x0','x1','y0','y1','z0','height','kind','windowPart'],at);id(box.id,at+'/id');
  if(ids.has(box.id))fail('DUPLICATE_ID',at+'/id','Box IDs must be unique.');ids.add(box.id);
  for(const key of ['x0','x1','y0','y1'])finite(box[key],-10000,10000,at+'/'+key);
  finite(box.z0,0,100,at+'/z0');finite(box.height,box.z0,100,at+'/height');
  if(box.x1<box.x0||box.y1<box.y0)fail('INVALID_BOX',at,'Box extents must be ordered.');text(box.kind,64,at+'/kind');
  if(['fuel-tank','gas-tank','explosive','volatile-target'].includes(box.kind))fail('UNSUPPORTED_FEATURE',at+'/kind','Reactive target geometry requires its complete ordered adapter.');
  if(box.windowPart!==false||box.kind==='glass')fail('UNSUPPORTED_FEATURE',at,'Window or glass geometry needs a complete window-blast adapter.');
 }return value;
}
// The pinned source looks species up on an ordinary object. Inherited names
// have broken source sight semantics, so refuse them instead of choosing a cast.
const reservedSpecies=new Set(["constructor","__defineGetter__","__defineSetter__","hasOwnProperty","__lookupGetter__","__lookupSetter__","isPrototypeOf","propertyIsEnumerable","toString","valueOf","__proto__","toLocaleString"]);
const actorKeys=['id','name','team','species','stance','sneaking','cone','x','y','z','hp','ap','stamina','maxAp','endurance','weapon','grenades','grenadePackRounds','heading','isMoving','burningTurns','casualty','alert','lastKnown','alertAge'];
export function actors(value,path='/actors'){
 const ids=new Set();for(const [i,actor]of list(value,128,path).entries()){
  const at=path+'/'+i;fields(actor,actorKeys,at);id(actor.id,at+'/id');if(ids.has(actor.id))fail('DUPLICATE_ID',at+'/id','Actor IDs must be unique.');ids.add(actor.id);
  text(actor.name,96,at+'/name');if(reservedSpecies.has(actor.species))fail('UNSUPPORTED_SPECIES',at+'/species','Reserved prototype-property species names have unsupported source sight semantics.','Choose a normal host species identity; unlisted species retain the original default sight profile.');if(typeof actor.species!=='string'||!actor.species.trim()||actor.species.length>96)fail('UNSUPPORTED_SPECIES',at+'/species','Supply a bounded species identity; unlisted species retain the source default sight profile.');if(!['standing','kneeling','prone'].includes(actor.stance))fail('UNSUPPORTED_STANCE',at+'/stance','Select a reviewed stance.');bool(actor.sneaking,at+'/sneaking');if(actor.cone!==null)finite(actor.cone,-1000000,1000000,at+'/cone');if(!['squad','guard'].includes(actor.team))fail('UNSUPPORTED_TEAM',at+'/team','Only explicit squad/guard roles are supported.');
  finite(actor.x,-10000,10000,at+'/x');finite(actor.y,-10000,10000,at+'/y');if(actor.z!==0)fail('UNSUPPORTED_FLOOR',at+'/z','Grenade targets must be on the explicit ground floor.');
  finite(actor.hp,0,1000000,at+'/hp');finite(actor.ap,-P.epsilon,1000000,at+'/ap');finite(actor.stamina,0,1000000,at+'/stamina');finite(actor.maxAp,0,1000000,at+'/maxAp');
  integer(actor.endurance,1,100,at+'/endurance');if(!Object.hasOwn(WEAPON_RANGES,actor.weapon))fail('UNSUPPORTED_WEAPON',at+'/weapon','Unknown equipped weapon.');
  integer(actor.grenades,0,1000000,at+'/grenades');for(const [j,n]of list(actor.grenadePackRounds,64,at+'/grenadePackRounds').entries())integer(n,0,1000000,at+'/grenadePackRounds/'+j);
  finite(actor.heading,-1000000,1000000,at+'/heading');bool(actor.isMoving,at+'/isMoving');integer(actor.burningTurns,0,1000,at+'/burningTurns');
  if(![null,'dead'].includes(actor.casualty))fail('UNSUPPORTED_CASUALTY',at+'/casualty','Only ordinary living/dead casualty state is supported.');
  if(actor.hp===0&&(actor.casualty!=='dead'||actor.burningTurns!==0||actor.isMoving))fail('INVALID_CASUALTY',at,'Dead actors must retain their ordinary casualty, burning and movement state.');
  if(actor.hp>0&&actor.casualty!==null)fail('INVALID_CASUALTY',at+'/casualty','Living actors cannot be marked dead.');
  bool(actor.alert,at+'/alert');if(actor.lastKnown!==null)xy(actor.lastKnown,at+'/lastKnown');finite(actor.alertAge,0,1000000,at+'/alertAge');
 }if(!value.some(actor=>actor.team==='squad'))fail('MISSING_ACTOR',path,'At least one squad actor is required.');return value;
}
export function control(value,units,path='/control'){
 fields(value,['actorId','phase','status','engaged','round','detected'],path);id(value.actorId,path+'/actorId');
 if(units.find(actor=>actor.team==='squad')?.id!==value.actorId)fail('UNSUPPORTED_ACTOR',path+'/actorId','The controlled actor must be the first squad actor.');
 if(!['explore','player','enemy','won','lost'].includes(value.phase)||!['active','extracted','lost'].includes(value.status))fail('UNSUPPORTED_CONTROL',path,'Unknown host control phase/status.');
 const detected=new Set();for(const [i,key]of list(value.detected,128,path+'/detected').entries()){id(key,path+'/detected/'+i);if(detected.has(key)||!units.some(actor=>actor.id===key&&actor.team==='guard'))fail('INVALID_DETECTION',path+'/detected/'+i,'Detected IDs must name distinct existing guards.');detected.add(key);}
 bool(value.engaged,path+'/engaged');integer(value.round,0,1000000000,path+'/round');return value;
}
export function context(value,path=''){
 fields(value,['world','actors','control','support'],path);support(value.support,path+'/support');world(value.world,path+'/world');actors(value.actors,path+'/actors');control(value.control,value.actors,path+'/control');return value;
}
export function command(value,{preview=false}={}){
 fields(value,['version','id','expectedRevision','actorId','point'],'/command',preview?['actorId','point']:undefined);
 if(!preview||Object.hasOwn(value,'version'))if(value.version!==1)fail('UNSUPPORTED_COMMAND','/command/version','Expected grenade command version 1.');
 if(!preview||Object.hasOwn(value,'id'))id(value.id,'/command/id');
 if(!preview||Object.hasOwn(value,'expectedRevision'))integer(value.expectedRevision,0,GRENADE_CONTRACT.maximumReceipts,'/command/expectedRevision');
 id(value.actorId,'/command/actorId');if(value.point!==null)xy(value.point,'/command/point');return value;
}
