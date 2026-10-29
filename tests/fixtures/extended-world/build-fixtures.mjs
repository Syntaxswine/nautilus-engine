// Original synthetic semantic fixtures, not bindings for an artist mesh or a game.
// Deliberate golden regeneration: node tests/fixtures/extended-world/build-fixtures.mjs --write
import {createWorld,openWorld} from '../../../packages/world-core/index.js';
import fs from 'node:fs';
export const floorPanel=(world,index,x=2,y=2,size=12)=>({id:'panel-'+index,floorId:world.floors[index].id,role:'floor',bounds:{min:{x,y,h:world.floors[index].elevationM},max:{x:x+size,y:y+size,h:world.floors[index].elevationM}},supports:true,supportFloorId:world.floors[index].id});
export function towerFixture(){
  const world=createWorld({id:'fifteen-story-tower',name:'Fifteen stories and declared roof access',widthM:240,depthM:240,floorCount:16,storyHeightM:3,groundHeightM:0,heightM:60});
  world.floors[15].label='R';for(let index=0;index<15;index++)world.surfaces.push(floorPanel(world,index));
  world.surfaces.push(
    {id:'tower-roof',floorId:'floor-14',role:'roof',bounds:{min:{x:2,y:2,h:45},max:{x:14,y:14,h:45}},supports:true,supportFloorId:'floor-15'},
    {id:'annex-roof',floorId:'floor-1',role:'roof',bounds:{min:{x:20,y:2,h:5.5},max:{x:28,y:10,h:5.5}},supports:true,supportFloorId:null},
    {id:'tower-upper-wall',floorId:'floor-14',role:'solid',bounds:{min:{x:13,y:2,h:42},max:{x:13.2,y:14,h:45}},supports:false,supportFloorId:null},
    {id:'ornament',floorId:'floor-14',role:'solid',bounds:{min:{x:12,y:12,h:45},max:{x:13,y:13,h:48}},supports:false,supportFloorId:null}
  );
  const landing=index=>({floorId:'floor-'+index,surfaceId:index===15?'tower-roof':'panel-'+index,position:{x:3,y:3,h:world.floors[index].elevationM}});
  for(let index=0;index<15;index++)world.links.push({id:'stairs-'+index+'-'+(index+1),kind:index===14?'ladder':'stairs',from:landing(index),to:landing(index+1),bidirectional:true});
  world.entities.push({id:'upper-actor-anchor',kind:'actor',content:{id:'host-provided-actor',version:'fixture-v1'},floorId:'floor-10',position:{x:4,y:4,h:30},yawRadians:0,supportSurfaceId:'panel-10'},
    {id:'native-plinth-model',kind:'content',content:{id:'host-provided-native-model',version:'fixture-v1'},floorId:'floor-14',position:{x:10,y:10,h:42.125},yawRadians:Math.PI/2,supportSurfaceId:null});
  return openWorld(world);
}
export function sparseFixture(count=32){
  const world=createWorld({id:'sparse-'+count,name:'Sparse allocation evidence',widthM:240,depthM:240,floorCount:count,storyHeightM:3,groundHeightM:0,heightM:120});
  const occupied=[...new Set([0,Math.min(9,count-1),Math.min(10,count-1),count-1])];
  for(const index of occupied)world.surfaces.push(floorPanel(world,index));return openWorld(world);
}
if(process.argv.includes('--write'))for(const [name,world] of [['fifteen-story-v1.json',towerFixture()],['sparse-32-v1.json',sparseFixture()]])fs.writeFileSync(new URL(name,import.meta.url),JSON.stringify(world,null,2)+'\n');
