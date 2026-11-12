export function vehicleYardContent({sourcePin}={}){
 if(typeof sourcePin!=='string'||!/^[a-f0-9]{40}$/.test(sourcePin))throw Error('VEHICLE_CONTENT_PIN: supply the fixed commit containing this content definition.');
 return {identity:{id:'nautilus-road-yard',version:1,sourcePin},world:{id:'road-yard',name:'Road vehicle yard',widthM:32,depthM:32,floorCount:1,storyHeightM:2.12,groundHeightM:0,heightM:6},
 surfaces:[{id:'course',floorId:'floor-0',role:'floor',bounds:{min:{x:0,y:0,h:0},max:{x:32,y:32,h:0}},supports:true,supportFloorId:'floor-0'},
 {id:'wall',floorId:'floor-0',role:'solid',bounds:{min:{x:3,y:23,h:0},max:{x:14,y:23.35,h:2}},supports:false,supportFloorId:null},
 {id:'barrier',floorId:'floor-0',role:'solid',bounds:{min:{x:18,y:14,h:0},max:{x:22,y:14.35,h:1}},supports:false,supportFloorId:null}],
 interactions:{doors:[],stairs:[]},actors:[{id:'player',floorId:'floor-0',position:{x:4.15,y:7.35,h:0},radiusM:.28,heightM:1.8,speedMps:3},
 {id:'observer',floorId:'floor-0',position:{x:12,y:20,h:0},radiusM:.28,heightM:1.8,speedMps:3}],
 resources:{player:{health:37,ap:3,stamina:11,inventory:[{id:'yard-key',count:1}]},observer:{health:29,ap:2,inventory:[]}},
 vehicles:[{id:'compact',body:'hatchback',finish:'sage',position:{x:6,y:7,h:0}},{id:'truck',body:'pickup',finish:'oxide',position:{x:15,y:8,h:0}}],appearance:{ground:0x75815a,sky:0x91ada5}};
}
