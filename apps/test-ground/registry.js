import raw from './content-data.json' with {type:'json'};
import {clone,freeze,insist,fields,canonical} from './data.js';
import {DRIVING_CAPABILITIES,drivingContent,drivingSpawn} from './driving.js';

// Compatibility/content lineage. Current registry bytes are identified by the
// exact consumer hashes and clean engine commit in each executionSource record.
export const CONTENT_SOURCE = '81ddf363e524e967159703246e49ef334d0d1e65';
export const REGISTRY = freeze(clone(raw));
export const identity = freeze({id:REGISTRY.id,version:REGISTRY.version,sourcePin:CONTENT_SOURCE});
export const slotById = id => REGISTRY.slots.find(p=>p.id===id);
export const plotById = id => REGISTRY.plots.find(p=>p.id===id);
export const objectiveById = id => REGISTRY.objectives.find(p=>p.id===id);
export const isDoorObjective = objective => ['door-passage','door-threshold-passage'].includes(objective.id);
export const fixtureById = id => REGISTRY.golden.find(p=>p.id===id);
export const observerCapabilities = profile => profile==='full' ? [...new Set([...REGISTRY.plots.flatMap(p=>p.capabilities),...DRIVING_CAPABILITIES])] : profile==='without-passage' ? ['door-state-v1','interaction-event-v1','rock-state-v1','inventory-state-v1','item-event-v1','walking-state-v1',...DRIVING_CAPABILITIES] : profile==='without-traversal' ? [...new Set(REGISTRY.plots.flatMap(p=>p.capabilities))].filter(c=>c!=='walking-state-v1') : [];
export function defaultRecipe() {
  return {kind:'nautilus-test-ground-recipe',version:1,content:clone(identity),engineSource:REGISTRY.engineSource,seed:REGISTRY.seed,
    plots:[{slot:'west',fixture:'gatehouse',version:1},{slot:'east',fixture:'supply-store',version:1}],
    objective:{id:'door-passage',version:1,slot:'west'},conditions:{id:'transition',version:1},observers:{profile:'full',version:1},probe:'ordinary',driving:{id:'handling',version:1},traversalProfile:REGISTRY.traversalProfile};
}
export function validateRecipe(input) {
  try {
    const recipe=clone(typeof input==='string'?JSON.parse(input):input);
    fields(recipe,['kind','version','content','engineSource','seed','plots','objective','conditions','observers','probe','driving','traversalProfile']);
    insist(recipe.traversalProfile==='shared-slide-v1','TRAVERSAL_PROFILE_UNSUPPORTED','Keep the explicit shared slide policy; older installations retain their original profiles.');
    fields(recipe.driving,['id','version']);insist(REGISTRY.drivingCourses.some(c=>c.id===recipe.driving.id&&c.version===recipe.driving.version),'DRIVING_COURSE_UNAVAILABLE','Select a committed driving course and version.');
    insist(recipe.kind==='nautilus-test-ground-recipe'&&recipe.version===1,'RECIPE_VERSION','Use test ground recipe v1.');
    insist(canonical(recipe.content)===canonical(identity)&&recipe.engineSource===REGISTRY.engineSource,'SOURCE_MISMATCH','Use this exact content and installed engine baseline.');
    insist(Number.isInteger(recipe.seed)&&recipe.seed>=0&&recipe.seed<=0xffffffff,'INVALID_SEED','Use an unsigned seed.');
    insist(Array.isArray(recipe.plots)&&recipe.plots.length===2,'PLOT_COUNT','Keep the two registered 16 m plots.');
    const seen=new Set();
    for(const p of recipe.plots) {
      fields(p,['slot','fixture','version']);const slot=slotById(p.slot),plot=plotById(p.fixture);
      insist(slot&&!seen.has(p.slot),'PLOT_CONFLICT','Use each registered non-overlapping plot once.');seen.add(p.slot);
      insist(plot&&p.version===plot.version,'PLOT_UNAVAILABLE','Select a registered fixture and exact version.');
      insist(plot.footprintM.every(n=>n===slot.sizeM)&&plot.elevationM===slot.elevationM&&plot.floorId===slot.floorId,'UNSUPPORTED_PLACEMENT','Plot footprint, native elevation and floor identity must match.');
    }
    fields(recipe.objective,['id','version','slot']);const objective=objectiveById(recipe.objective.id),chosen=recipe.plots.find(p=>p.slot===recipe.objective.slot);
    insist(objective&&objective.version===recipe.objective.version&&(chosen||recipe.objective.slot==='driving'),'OBJECTIVE_UNAVAILABLE','Select a versioned objective and target plot.');
    const plot=chosen?plotById(chosen.fixture):{capabilities:DRIVING_CAPABILITIES},missing=objective.requires.filter(c=>!plot.capabilities.includes(c));
    insist(!missing.length,'OBJECTIVE_INCOMPATIBLE','Target plot lacks '+missing.join(', ')+'.');
    fields(recipe.conditions,['id','version']);insist(REGISTRY.conditionProfiles.some(c=>c.id===recipe.conditions.id&&c.version===recipe.conditions.version),'CONDITIONS_UNAVAILABLE','Choose a reviewed expectation profile and version.');
    fields(recipe.observers,['profile','version']);insist(['full','without-passage','without-traversal'].includes(recipe.observers.profile)&&recipe.observers.version===1,'OBSERVER_UNAVAILABLE','Use a registered observer profile/version.');
    insist(['ordinary','acknowledge-without-door-effect','acknowledge-without-motion'].includes(recipe.probe),'PROBE_UNAVAILABLE','Use an explicit reviewed verifier probe.');
    return {ok:true,recipe};
  } catch(error) {return {ok:false,code:error.code||'INVALID_RECIPE',reason:error.message};}
}
const box = (id,x1,y1,h1,x2,y2,h2,supports=false) => ({id,floorId:'floor-0',role:supports?'floor':'solid',bounds:{min:{x:x1,y:y1,h:h1},max:{x:x2,y:y2,h:h2}},supports,supportFloorId:supports?'floor-0':null});
export function plotContent(selection) {
  const slot=slotById(selection.slot),plot=plotById(selection.fixture),{x,y}=slot.origin,id=slot.id,h=REGISTRY.storyHeightM;
  const surfaces=[box(id+'-left',x+2,y+11.95,0,x+7.3,y+12.05,h),box(id+'-right',x+8.7,y+11.95,0,x+14,y+12.05,h)];
  if(plot.id==='supply-store')surfaces.push(box(id+'-back',x+2,y+4,0,x+14,y+4.15,h),box(id+'-side',x+2,y+4,0,x+2.15,y+11.9,h));
  return {surfaces,door:{id:id+'/door',label:slot.name+' door',floorId:'floor-0',position:{x:x+8,y:y+12,h:0},reachM:1.8,open:false,locked:false,
    closedBounds:{min:{x:x+7.4,y:y+11.94,h:0},max:{x:x+8.6,y:y+12.06,h:2.0}},
    openBounds:{min:{x:x+7.4,y:y+10.8,h:0},max:{x:x+7.5,y:y+12,h:2.0}},
    motionBounds:{min:{x:x+7.4,y:y+10.7,h:0},max:{x:x+8.6,y:y+12.1,h:2.0}}},
    rock:plot.id==='supply-store'?{id:id+':rock',position:{x:x+12,y:y+14,h:.055}}:null};
}
export function contentFor(recipe,spawn=REGISTRY.spawn) {
  return {kind:'nautilus-player-content',version:1,identity:clone(identity),world:{id:'night-ledger-ground',name:REGISTRY.name,widthM:64,depthM:64,floorCount:1,storyHeightM:REGISTRY.storyHeightM,groundHeightM:0,heightM:6},
    surfaces:[box('ground',0,0,0,64,64,0,true),...recipe.plots.flatMap(p=>plotContent(p).surfaces),...drivingContent(REGISTRY,recipe,box).surfaces],
    interactions:{doors:recipe.plots.map(p=>plotContent(p).door),stairs:[]},actors:[{id:'player',floorId:'floor-0',position:clone(spawn),radiusM:.28,heightM:1.8,speedMps:3}],
    resources:{player:clone(REGISTRY.resources)},vehicles:drivingContent(REGISTRY,recipe,box).vehicles,appearance:{ground:0x667c61,sky:0x92aca5}};
}
export function goldenRecipe(fixture,recipe) {
  if(fixture.slot==='driving'){const next=clone(recipe);next.driving={id:fixture.course,version:1};next.objective={id:fixture.objective,version:1,slot:'driving'};return next;}
  const next=clone(recipe);next.plots=next.plots.map(p=>p.slot===fixture.slot?{slot:p.slot,fixture:fixture.plot,version:1}:p);
  next.objective={id:fixture.objective,version:1,slot:fixture.slot};return next;
}
export function fixtureSpawn(fixture) {if(fixture.slot==='driving')return drivingSpawn(REGISTRY,{driving:{id:fixture.course}});const s=slotById(fixture.slot);return {x:s.origin.x+fixture.spawnLocal.x,y:s.origin.y+fixture.spawnLocal.y,h:fixture.spawnLocal.h};}
