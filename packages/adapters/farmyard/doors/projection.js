import {FARMYARD_DOOR_PROFILE as P} from './profile.js';
import {data,fields,plain,canonical,finite,integer,list,fail} from './data.js';
import {checkContext,ACTOR_FIELDS} from './model.js';
import {collider} from './world.js';
const sourceKeys=['map','edges','units','interactables','phase','round','selected','visible','seen','detected','log','seed','revision','queue','enemyIndex','enemyDelay','elapsed','solo','props','obstacles','worldBounds','groundPalette','windows','fogAt','engaged','effect','fires','fireAnimationSequence','fireAnimations','windowBreaks','windowSequence','windowEvents','fireTurnAt','panicDelay','edgeLocks'];
const unitKeys=['id','team','name','species','weapon','x','y','z','heading','stance','running','sneaking','travelled','isMoving','alert','lastKnown','alertAge','slots','pack','ammo','ammoPouch','stats','statVersion','maxHp','maxStamina','maxAp','damageResistance','accuracy','medical','stealth','perception','hp','ap','stamina','casualty','burningTurns','tanksExploded','skillPoints','cone'];
const soloKeys=['version','missionId','layoutVersion','build','objectives','inspected','ledger','status','dressings','distance','apDistance','authoredMap','areaWeapon','spottedGuardIds'];
const doorKeys=['id','kind','name','x','y','edge','swing','range','open','inventory'];
function closed(value,keys,path){if(!plain(value))fail('UNSUPPORTED_SOURCE',path,'Expected the reviewed Farmyard record.');for(const key of Object.keys(value))if(!keys.includes(key))fail('UNSUPPORTED_SOURCE_FIELD',path+'/'+key,'Unfamiliar source data needs a deliberate projection review.');}
function rejectFacts(value,path,door=false){
  if(!plain(value))fail('UNSUPPORTED_SOURCE',path,'Expected a source object.');
  for(const key of ['reactive','explosive','volatile','detonates','detonation','explosion','fuelTank','fuel','ignited'])if(value[key]!==undefined&&value[key]!==false&&value[key]!==null)fail('UNSUPPORTED_FEATURE',path+'/'+key,'Reactive facts require a separately reviewed complete profile.');
  if(['fuel-tank','gas-tank','explosive','volatile-target','barrel-explosive','double-door','door-pair'].includes(value.kind))fail('UNSUPPORTED_FEATURE',path+'/kind','Reactive or paired objects are not supported by this profile.');
  if(value.z!==undefined&&value.z!==0)fail('UNSUPPORTED_FLOOR',path+'/z','Only explicit ground-layer source objects are supported.');
  if(door)for(const key of ['pairId','paired','leaves','locked','lock','keyId','difficulty','lockDifficulty','hp','health','maxHp','damage','damaged','destroyed','broken','condition'])if(Object.hasOwn(value,key))fail('UNSUPPORTED_FEATURE',path+'/'+key,'Pairs, locks/difficulty and door damage have no behavior in this source profile.');
}
const equalBox=(a,b)=>['x0','x1','y0','y1','z0','height'].every(key=>Math.abs((a[key]??0)-b[key])<=P.epsilon);
export function projectSource(input,options){
  const source=data(input,{sets:true}),settings=data(options);fields(settings,['geometry','bounds'],'/options',['geometry']);closed(source,sourceKeys,'/source');closed(source.solo,soloKeys,'/source/solo');
  if(source.solo.version!==2)fail('UNSUPPORTED_SOURCE','/source/solo/version','Use the reviewed complete Farmyard solo-v2 source.');
  for(const key of ['windows','fires'])if(source[key]!==undefined&&(!Array.isArray(source[key])||source[key].length))fail('UNSUPPORTED_FEATURE','/source/'+key,'Windows/active fire require their complete host profile.');
  if(source.edgeLocks!==undefined&&(!plain(source.edgeLocks)||Object.keys(source.edgeLocks).length))fail('UNSUPPORTED_FEATURE','/source/edgeLocks','Legacy lock difficulty is not a native locked boolean and cannot be imported by this profile.');
  const authored=source.solo.authoredMap;if(authored!==undefined&&authored!==null){if(!plain(authored)||['upper','stairs','climbs'].some(key=>authored[key]!==undefined&&!Array.isArray(authored[key])))fail('UNSUPPORTED_SOURCE','/source/solo/authoredMap','Expected the reviewed plain authored-map arrays.');if((authored.upper??[]).some(layer=>!plain(layer)||Object.keys(layer).length)||(authored.stairs??[]).length||(authored.climbs??[]).length)fail('UNSUPPORTED_FEATURE','/source/solo/authoredMap','Vertical authored maps require their complete profile.');}
  if(!Array.isArray(source.map)||!source.map.length||source.map.length>240||!Array.isArray(source.map[0])||!source.map[0].length||source.map[0].length>240)fail('UNSUPPORTED_SOURCE','/source/map','Supply the complete bounded rectangular terrain grid.');
  for(const [i,row]of source.map.entries())if(!Array.isArray(row)||row.length!==source.map[0].length||row.some(cell=>typeof cell!=='string'||cell.length>64))fail('UNSUPPORTED_SOURCE','/source/map/'+i,'Terrain rows must be rectangular plain source cells.');
  if(!plain(source.edges))fail('UNSUPPORTED_SOURCE','/source/edges','Supply current source edges.');for(const [edge,kind]of Object.entries(source.edges))if(!/^[es]:\d+:\d+(?![\s\S])/.test(edge)||!['wall','door','closed-door'].includes(kind))fail('UNSUPPORTED_FEATURE','/source/edges/'+edge,'Unknown/locked/damaged source edge profile.');
  for(const group of ['props','obstacles','interactables'])for(const [i,object]of list(source[group]??[],8192,'/source/'+group).entries())rejectFacts(object,'/source/'+group+'/'+i,object?.kind==='door');
  const doors=[];for(const [i,object]of list(source.interactables,8192,'/source/interactables').entries()){
    if(!['door','chest','body','clue'].includes(object.kind))fail('UNSUPPORTED_FEATURE','/source/interactables/'+i+'/kind','Unknown source interaction kind.');if(object.kind!=='door')continue;closed(object,doorKeys,'/source/interactables/'+i);if(!Array.isArray(object.inventory))fail('UNSUPPORTED_SOURCE','/source/interactables/'+i+'/inventory','Expected the retained source inventory array.');
    if(source.edges[object.edge]!== (object.open?'door':'closed-door'))fail('SOURCE_DOOR_EDGE_MISMATCH','/source/interactables/'+i+'/edge','Door and edge state disagree; loading never repairs or guesses it.');doors.push({id:object.id,name:object.name,x:object.x,y:object.y,edge:object.edge,swing:object.swing??1,range:object.range,open:object.open});
  }
  const actors=list(source.units,128,'/source/units').map((unit,i)=>{
    const at='/source/units/'+i;rejectFacts(unit,at);closed(unit,unitKeys,at);if(unit.burningTurns)fail('UNSUPPORTED_FEATURE',at+'/burningTurns','Active fire/control is outside this profile.');if(!plain(unit.ammo)||!Array.isArray(unit.pack))fail('UNSUPPORTED_SOURCE',at,'Retain finite source ammunition and pack records.');
    const carrying=unit.weapon==='flamethrower'||unit.pack.some(item=>item?.type==='weapon'&&item.kind==='flamethrower');if(carrying&&!unit.tanksExploded&&(unit.ammo.flamethrower??0)>0)fail('UNSUPPORTED_FEATURE',at+'/ammo/flamethrower','Fueled actors require their complete reactive profile.');
    const normalized={...unit,z:unit.z??0,cone:unit.cone??null,burningTurns:unit.burningTurns??0,isMoving:unit.isMoving===undefined?false:unit.isMoving,alert:unit.alert===undefined?false:unit.alert,lastKnown:unit.lastKnown??null,alertAge:unit.alertAge??0};return Object.fromEntries(ACTOR_FIELDS.map(key=>[key,normalized[key]]));
  });
  const raw=list(settings.geometry,8192,'/options/geometry'),doorById=new Map(doors.map(door=>[door.id,door])),found=new Set(),boxKeys=['id','x0','x1','y0','y1','z0','height','kind','windowPart','interactionId','cover','windowId','partId','role','paneId','propId','source','material'],staticBoxes=[],usedIds=new Set(doorById.keys());let serial=0;
  for(const [i,box]of raw.entries()){
    const at='/options/geometry/'+i;rejectFacts(box,at);if(box.windowPart||box.kind==='glass'||box.windowId!==undefined||box.paneId!==undefined)fail('UNSUPPORTED_FEATURE',at,'Window/glass geometry is outside this profile.');closed(box,boxKeys,at);
    const door=doorById.get(box.interactionId);if(door){if(found.has(door.id)||box.kind!=='wall'||!equalBox({...box,z0:box.z0??0},collider(door)))fail('DOOR_COLLIDER_MISMATCH',at,'Supply one current source-sized collider for this door.');found.add(door.id);continue;}
    staticBoxes.push({interactionId:box.interactionId??null,kind:box.kind,x0:box.x0,x1:box.x1,y0:box.y0,y1:box.y1,z0:box.z0??0,height:box.height});
  }
  if(found.size!==doors.length)fail('MISSING_DOOR_COLLIDER','/options/geometry','Complete current geometry must contain each source door exactly once.');
  // Synthetic static identities must survive source edge enumeration and raw
  // query ordering changes. Equal ordinary boxes are interchangeable here;
  // distinct semantic geometry sorts before assigning collision-free IDs.
  const ordered=staticBoxes.map(box=>({box,key:canonical(box)})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);staticBoxes.length=0;
  for(const {box}of ordered){let key;do{key='static-'+(serial++).toString(36);}while(usedIds.has(key));usedIds.add(key);staticBoxes.push({id:key,...box});}
  const bounds=source.worldBounds??{x:1,y:1,w:source.map[0].length-2,h:source.map.length-2};if(settings.bounds!==undefined&&canonical(settings.bounds)!==canonical(bounds))fail('UNSUPPORTED_SOURCE','/options/bounds','A crop is not the complete retained source projection.');
  if(!Array.isArray(source.queue))fail('UNSUPPORTED_SOURCE','/source/queue','Supply the current retained route queue.');for(const [i,point]of source.queue.entries())if(point?.z!==undefined&&point.z!==0)fail('UNSUPPORTED_FLOOR','/source/queue/'+i+'/z','Ground profile cannot adopt a vertical route.');
  integer(source.revision,0,1e9,'/source/revision');if(!Array.isArray(source.log)||source.log.some(line=>typeof line!=='string'))fail('UNSUPPORTED_SOURCE','/source/log','Supply retained source log strings.');
  const context={world:{bounds,grid:{width:source.map[0].length,height:source.map.length},staticBoxes,seen:source.seen,visible:source.visible,fogAt:source.fogAt??null},doors,actors,control:{actorId:actors.find(actor=>actor.team==='squad')?.id,phase:source.phase,status:source.solo.status,engaged:source.engaged??false,round:source.round,detected:source.detected},queue:source.queue,support:{pairs:false,locks:false,difficulty:false,damage:false,vertical:false,windows:false,reactive:false,refresh:P.refresh}};
  return {source,context:checkContext(context)};
}
export const projectFarmyardDoorContext=(source,options)=>projectSource(source,options).context;
