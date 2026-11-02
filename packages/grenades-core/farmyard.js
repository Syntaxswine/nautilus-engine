// Deliberately closed projection of the reviewed Farmyard source profile.
// The caller retains the original state and its public complete geometry service.
import {data,fields,finite,integer,id,plain,canonical,fail} from './validation.js';
import {FARMYARD_GRENADE_PROFILE as P} from './profile.js';
import {createGrenadeState} from './state.js';
const sourceKeys=['map','edges','units','interactables','phase','round','selected','visible','seen','detected','log','seed','revision','queue','enemyIndex','enemyDelay','elapsed','solo','props','obstacles','worldBounds','groundPalette','windows','fogAt','engaged','effect','fires','fireAnimationSequence','fireAnimations','windowBreaks','windowSequence','windowEvents','fireTurnAt','panicDelay'];
const unitKeys=['id','team','name','species','weapon','x','y','z','heading','stance','running','sneaking','travelled','isMoving','alert','lastKnown','alertAge','slots','pack','ammo','ammoPouch','stats','statVersion','maxHp','maxStamina','maxAp','damageResistance','accuracy','medical','stealth','perception','hp','ap','stamina','casualty','burningTurns','tanksExploded','skillPoints','cone'];
const statKeys=['strength','endurance','dexterity','agility','intelligence','perception','mechanical','medical','firearms','heavyWeapons','explosives','leadership','sneak','climbing'];
const soloKeys=['version','missionId','layoutVersion','build','objectives','inspected','ledger','status','dressings','distance','apDistance','authoredMap','areaWeapon','spottedGuardIds'];
function closed(value,keys,path){if(!value||typeof value!=='object'||Array.isArray(value))fail('UNSUPPORTED_SOURCE',path,'Expected the reviewed Farmyard source record.');for(const key of Object.keys(value))if(!keys.includes(key))fail('UNSUPPORTED_SOURCE_FIELD',path+'/'+key,'Unfamiliar source field requires a deliberate projection review.');}
function reactive(value,path){
 if(!value||typeof value!=='object')return;
 for(const key of ['explosive','volatile','detonates','explosion','fuelTank'])if(value[key]!==undefined&&value[key]!==false&&value[key]!==null)fail('UNSUPPORTED_FEATURE',path+'/'+key,'Reactive targets require their complete ordered host consequence adapter.');
 if(['fuel-tank','gas-tank','explosive','volatile-target'].includes(value.kind))fail('UNSUPPORTED_FEATURE',path+'/kind','Reactive object kind is outside this grenade profile.');
}
export function projectFarmyardGrenadeContext(input,options){
 // This traversal rejects accessors/functions/toJSON and copies intrinsic sets
 // without executing host iterators. No source object is modified or normalized.
 const source=data(input,{sets:true}),settings=data(options);if(!plain(source))fail('UNSUPPORTED_SOURCE','/source','Expected a Farmyard state record.');fields(settings,['geometry','bounds'],'/options',['geometry']);
 if(source.windows!==undefined&&(!Array.isArray(source.windows)||source.windows.length))fail('UNSUPPORTED_FEATURE','/source/windows','Placed windows require the complete window-blast adapter.');
 if(source.fires!==undefined&&(!Array.isArray(source.fires)||source.fires.length))fail('UNSUPPORTED_FEATURE','/source/fires','Active fire requires the complete fire adapter.');
 closed(source,sourceKeys,'/source');closed(source.solo,soloKeys,'/source/solo');
 if(source.solo.version!==2||!Array.isArray(source.units)||!Array.isArray(source.seen))fail('UNSUPPORTED_SOURCE','/source','Expected the pinned Farmyard solo-v2 state with explored cells.');
 if(source.panicDelay!==undefined)finite(source.panicDelay,-1000000,1000000,'/source/panicDelay');
 if(source.solo.areaWeapon!==undefined&&![null,'grenade','flamethrower'].includes(source.solo.areaWeapon))fail('UNSUPPORTED_SOURCE','/source/solo/areaWeapon','Unknown retained area-weapon UI mode.');
 if(source.solo.spottedGuardIds!==undefined){if(!Array.isArray(source.solo.spottedGuardIds)||source.solo.spottedGuardIds.length>128)fail('UNSUPPORTED_SOURCE','/source/solo/spottedGuardIds','Expected bounded retained contact-history IDs.');for(const [i,key]of source.solo.spottedGuardIds.entries())id(key,'/source/solo/spottedGuardIds/'+i);}
 if(!Array.isArray(source.map)||!source.map.length||source.map.length>240||!Array.isArray(source.map[0])||!source.map[0].length||source.map[0].length>240)fail('UNSUPPORTED_SOURCE','/source/map','Expected a bounded rectangular source terrain grid.');
 for(const [index,row]of source.map.entries())if(!Array.isArray(row)||row.length!==source.map[0].length||row.some(cell=>typeof cell!=='string'||cell.length>64))fail('UNSUPPORTED_SOURCE','/source/map/'+index,'Expected rectangular plain terrain rows.');
 for(const group of ['interactables','props','obstacles']){
  if(source[group]!==undefined&&!Array.isArray(source[group]))fail('UNSUPPORTED_SOURCE','/source/'+group,'Expected a bounded source object array.');
  for(const [index,value]of (source[group]||[]).entries()){if(!plain(value))fail('UNSUPPORTED_SOURCE','/source/'+group+'/'+index,'Expected a source object record.');reactive(value,'/source/'+group+'/'+index);}
 }
 const actors=source.units.map((unit,index)=>{
  const path='/source/units/'+index;
  if(!plain(unit))fail('UNSUPPORTED_SOURCE',path,'Expected a source actor record.');
  if(!plain(unit.ammo))fail('UNSUPPORTED_SOURCE',path+'/ammo','Expected a finite source ammo record.');
  if(!Array.isArray(unit.pack)||unit.pack.length>128)fail('UNSUPPORTED_SOURCE',path+'/pack','Expected a bounded source pack array.');
  for(const key of ['grenade','flamethrower'])if(Object.hasOwn(unit.ammo,key))integer(unit.ammo[key],0,1000000,path+'/ammo/'+key);
  for(const [i,item]of unit.pack.entries()){
   if(!plain(item))fail('UNSUPPORTED_SOURCE',path+'/pack/'+i,'Expected a source inventory item record.');
   if(item.type==='weapon'&&typeof item.kind!=='string')fail('UNSUPPORTED_SOURCE',path+'/pack/'+i+'/kind','Expected a source weapon ID.');
   if(item.type==='weapon'&&item.kind==='grenade')integer(item.rounds,0,1000000,path+'/pack/'+i+'/rounds');
  }
  if(unit.tanksExploded!==undefined&&typeof unit.tanksExploded!=='boolean')fail('UNSUPPORTED_SOURCE',path+'/tanksExploded','Expected a source destroyed-tank flag.');
  if(unit.z!==undefined&&unit.z!==0)fail('UNSUPPORTED_FLOOR',path+'/z','Actor z is a floor index; only ground floor 0 is supported.');
  if(unit.burningTurns)fail('UNSUPPORTED_FEATURE',path+'/burningTurns','Burning actors require the complete fire adapter.');
  const carrying=unit.weapon==='flamethrower'||unit.pack?.some(item=>item.type==='weapon'&&item.kind==='flamethrower');
  if(carrying&&!unit.tanksExploded&&(unit.ammo?.flamethrower??0)>0)fail('UNSUPPORTED_FEATURE',path+'/ammo/flamethrower','Held or stowed fueled tanks require ordered detonation and saved RNG.');
  reactive(unit,path);closed(unit,unitKeys,path);closed(unit.stats,statKeys,path+'/stats');
  if(unit.statVersion!==2)fail('UNSUPPORTED_SOURCE',path+'/statVersion','Explicit complete stat-v2 actors are required; no migration occurs.');
  for(const key of statKeys)integer(unit.stats[key],1,100,path+'/stats/'+key);
  if(!unit.ammo||!Array.isArray(unit.pack))fail('UNSUPPORTED_SOURCE',path+'/ammo','Expected finite source stock and a source pack.');
  return {id:unit.id,name:unit.name,team:unit.team,species:unit.species,stance:unit.stance,sneaking:unit.sneaking,cone:unit.cone??null,x:unit.x,y:unit.y,z:0,hp:unit.hp,ap:unit.ap,stamina:unit.stamina,maxAp:unit.maxAp,endurance:unit.stats.endurance,weapon:unit.weapon,
   grenades:unit.ammo.grenade??0,grenadePackRounds:unit.pack.filter(item=>item.type==='weapon'&&item.kind==='grenade').map(item=>item.rounds),heading:unit.heading,isMoving:unit.isMoving,burningTurns:unit.burningTurns??0,casualty:unit.casualty??null,
   alert:unit.alert,lastKnown:unit.lastKnown??null,alertAge:unit.alertAge};
 });
 if(!Array.isArray(settings.geometry))fail('UNSUPPORTED_SOURCE','/options/geometry','Supply the complete current compiled Farmyard geometry array.');
 const boxKeys=['id','x0','x1','y0','y1','z0','height','kind','windowPart','interactionId','cover','windowId','partId','role','paneId','propId','source','material'];
 const boxes=settings.geometry.map((box,index)=>{
  const path='/options/geometry/'+index;
  if(!plain(box))fail('UNSUPPORTED_SOURCE',path,'Expected a compiled geometry record.');
  if(box.windowPart||box.kind==='glass'||box.windowId!==undefined)fail('UNSUPPORTED_FEATURE',path,'Window parts require the complete window-blast adapter.');
  closed(box,boxKeys,path);
  return {id:'compiled-'+index,x0:box.x0,x1:box.x1,y0:box.y0,y1:box.y1,z0:box.z0??0,height:box.height,kind:box.kind,windowPart:false};
 });
 const bounds=source.worldBounds??{x:1,y:1,w:source.map[0].length-2,h:source.map.length-2};
 if(settings.bounds!==undefined&&canonical(settings.bounds)!==canonical(bounds))fail('UNSUPPORTED_SOURCE','/options/bounds','A crop or changed source bounds is not a complete Farmyard projection.');
 const context={world:{bounds,grid:{width:source.map?.[0]?.length,height:source.map?.length},seen:source.seen,visible:source.visible,fogAt:source.fogAt??null,boxes},actors,control:{actorId:actors.find(actor=>actor.team==='squad')?.id,phase:source.phase,status:source.solo.status,engaged:source.engaged??false,round:source.round,detected:source.detected},support:{windows:false,fueledTargets:false,volatileTargets:false,fire:false,multilevel:false,engagement:P.engagement,consequences:P.consequences}};
 // Validate the complete projection using the same public creation boundary.
 const validated=createGrenadeState({id:'projection-validation',...context});
 return {world:validated.world,actors:validated.actors,control:validated.control,support:validated.support};
}
export function createFarmyardGrenadeState(input,options){
 const settings=data(options);fields(settings,['id','geometry','bounds'],'/options',['id','geometry']);
 const projection={geometry:settings.geometry};if(Object.hasOwn(settings,'bounds'))projection.bounds=settings.bounds;
 return createGrenadeState({id:settings.id,...projectFarmyardGrenadeContext(input,projection)});
}
