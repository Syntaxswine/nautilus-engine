import {BUILDING_CONTRACT as C} from '../../packages/building-catalog/index.js';
import {createWorld,openWorld} from '../../packages/world-core/index.js';

const round=value=>Math.round(value*1e6)/1e6;
const point=(x,y,h)=>({x:round(x),y:round(y),h:round(h)});
const floorId=index=>'floor:'+index;

// Editor-owned physical recipe. makeFifteenStoryWorld below binds it to the
// reviewed world contract; this richer recipe is never used as a save format.
export function fifteenStoryRecipe() {
  const floors=Array.from({length:16},(_,index)=>({id:floorId(index),index,height:round(index*C.floorSpacing),label:index===15?'Roof':String(index+1)}));
  const bodies=[],links=[],actors=[],doors=[];
  const box=(id,role,floor,min,max,extra={})=>{
    bodies.push({id,role,floorId:floorId(floor),min:point(...min),max:point(...max),...extra});return id;
  };
  const slab=(id,role,floor,[x,y,w,d],building)=>box(id,role,floor,[x,y,floors[floor].height-C.slab],[x+w,y+d,floors[floor].height],{building,support:true});
  const wall=(id,floor,[x,y,w,d],building,height=C.wallHeight)=>box(id,'wall',floor,[x-w/2,y-d/2,floors[floor].height],[x+w/2,y+d/2,floors[floor].height+height],{building,support:false});
  const shell=(building,floor,[x,y,w,d])=>{
    wall(`${building}:west:${floor}`,floor,[x,y+d/2,C.wallThickness,d],building);
    wall(`${building}:east:${floor}`,floor,[x+w,y+d/2,C.wallThickness,d],building);
    wall(`${building}:south:${floor}`,floor,[x+w/2,y,w,C.wallThickness],building);
    wall(`${building}:north:${floor}`,floor,[x+w/2,y+d,w,C.wallThickness],building);
  };
  // A 2 x 4 m stair opening; the adjacent full-height strip connects the
  // arrival landing back to the start of the next flight.
  for(const floor of floors) {
    const index=floor.index,role=index===15?'roof':'floor';
    if(index===0)slab('tower:slab:0',role,index,[4,4,12,10],'tower');
    else for(const [name,rect]of Object.entries({west:[4,4,1,10],east:[7,4,9,10],entry:[5,4,2,1],arrival:[5,9,2,5]}))slab(`tower:slab:${index}:${name}`,role,index,rect,'tower');
    if(index<15)shell('tower',index,[4,4,12,10]);
  }
  for(let from=0;from<15;from++) {
    const to=from+1,treads=[];
    for(let step=0;step<14;step++) {
      const top=floors[from].height+(step+1)*C.floorSpacing/14;
      treads.push(box(`tower:stair:${from}:${step}`,'stair-tread',from,[5,5+4*step/14,top-.08],[7,5+4*(step+1)/14,top],{building:'tower',support:true}));
    }
    links.push({id:`tower:stairs:${from}:${to}`,kind:'stairs',from:{floorId:floorId(from),position:point(6,4.5,floors[from].height)},to:{floorId:floorId(to),position:point(6,9.5,floors[to].height)},treads,
      lowerLanding:from===0?'tower:slab:0':`tower:slab:${from}:entry`,upperLanding:`tower:slab:${to}:arrival`,direction:'both'});
  }
  // The neighbour's roof occupies the floor-2 datum, independently of the
  // tower's floor-15 roof. It must never inherit a global canopy sentinel.
  for(let index=0;index<3;index++) {
    slab(`neighbour:slab:${index}`,index===2?'roof':'floor',index,[20,4,8,8],'neighbour');
    if(index<2)shell('neighbour',index,[20,4,8,8]);
  }
  for(const index of [9,10]) {
    const h=floors[index].height,doorId=`tower:door:${index}`,actorId=`tower:actor:${index}`;
    wall(`tower:partition:${index}:south`,index,[10,9.5,C.wallThickness,1],'tower');
    wall(`tower:partition:${index}:north`,index,[10,12,C.wallThickness,2],'tower');
    box(`tower:lintel:${index}`,'wall',index,[10-C.wallThickness/2,10,h+C.doorHeight],[10+C.wallThickness/2,11,h+C.wallHeight],{building:'tower',support:false});
    box(doorId,'door-leaf',index,[9.94,10,h],[10.06,11,h+C.doorHeight],{building:'tower',support:false});
    doors.push({id:doorId,floorId:floorId(index),bodyId:doorId,state:'closed',hinge:point(10,10,h),opening:{width:C.doorWidth,height:C.doorHeight}});
    const actor={id:actorId,floorId:floorId(index),position:point(12,10.5,h),height:1.6,radius:.25,supportId:`tower:slab:${index}:east`,presentation:'query proxy, not an adopted character rig'};
    actors.push(actor);
    box(actorId,'actor-proxy',index,[11.75,10.25,h],[12.25,10.75,h+actor.height],{building:'tower',support:false});
  }
  const h10=floors[10].height,h14=floors[14].height;
  return {purpose:'Deterministic physical recipe for the extended-world authoring acceptance fixture. Not an engine save format.',
    source:{engine:'ddfd43cf4b156eeb82b5c27772fe977ec10b0633',dimensions:'packages/building-catalog/index.js / BUILDING_CONTRACT'},
    units:{groundAxes:['x','y'],verticalAxis:'h',metresPerUnit:1,wallHeight:C.wallHeight,slabThickness:C.slab,storyInterval:C.floorSpacing},
    bounds:{min:point(0,0,-C.slab),max:point(32,24,16*C.floorSpacing)},occupiedTowerStories:15,roofDatum:floorId(15),floors,bodies,links,doors,actors,
    expectations:[
      {id:'floor-9-identity',intent:'support',point:point(12,10.5,floors[9].height+.05),ignore:['tower:actor:9'],contactId:'tower:slab:9:east',floorId:floorId(9),height:floors[9].height},
      {id:'floor-10-support',intent:'support',point:point(12,10.5,h10+.05),ignore:['tower:actor:10'],contactId:'tower:slab:10:east',floorId:floorId(10),height:h10},
      {id:'floor-10-closed-door',intent:'ray',from:point(8,10.5,h10+.8),to:point(14,10.5,h10+.8),contactId:'tower:door:10',floorId:floorId(10)},
      {id:'floor-10-open-door',intent:'ray',from:point(8,10.5,h10+.8),to:point(14,10.5,h10+.8),openDoor:'tower:door:10',contactId:'tower:actor:10',floorId:floorId(10)},
      {id:'floor-14-impact',intent:'ray',from:point(8,11.5,h14+.8),to:point(18,11.5,h14+.8),contactId:'tower:east:14',floorId:floorId(14)},
      {id:'low-neighbour-roof',intent:'support',point:point(24,8,floors[2].height+.5),contactId:'neighbour:slab:2',floorId:floorId(2),height:floors[2].height},
      {id:'tower-roof-access',intent:'support',point:point(12,12,floors[15].height+.5),contactId:'tower:slab:15:east',floorId:floorId(15),height:floors[15].height}
    ]};
}

export function makeFifteenStoryWorld() {
  const recipe=fifteenStoryRecipe();
  const world=createWorld({id:'native-fifteen-story',name:'Fifteen stories · native kit',
    widthM:recipe.bounds.max.x,depthM:recipe.bounds.max.y,minHeightM:recipe.bounds.min.h,
    heightM:recipe.bounds.max.h,floorCount:16,storyHeightM:C.floorSpacing,groundHeightM:0});
  world.floors=recipe.floors.map(({id,index,label,height})=>({id,index,label,elevationM:height}));
  world.surfaces=recipe.bodies.map(body=>({
    id:body.role==='actor-proxy'?body.id+':body':body.id,floorId:body.floorId,
    role:body.role==='roof'?'roof':'solid',bounds:{min:body.min,max:body.max},supports:body.support,
    supportFloorId:body.support?(world.floors.find(floor=>floor.elevationM===body.max.h)?.id??null):null
  }));
  world.entities=recipe.actors.map(actor=>({id:actor.id,kind:'actor',
    content:{id:'editor-actor-proxy',version:'1'},floorId:actor.floorId,position:actor.position,
    yawRadians:0,supportSurfaceId:actor.supportId}));
  world.links=recipe.links.map(link=>({id:link.id,kind:link.kind,
    from:{...link.from,surfaceId:link.lowerLanding},to:{...link.to,surfaceId:link.upperLanding},bidirectional:true}));
  return openWorld(world);
}
