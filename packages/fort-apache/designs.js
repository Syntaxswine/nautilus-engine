// Original native-scale adaptations. These are not measured reconstructions.
const room=(id,name,x,y,width,depth,type='room')=>({id,name,x,y,width,depth,type});
const clone=value=>structuredClone(value);
const volume=(rooms,level)=>rooms.map(r=>({...r,...(level?{omitSlab:true,openToLevel:0}:{windowSpan:2})}));
const barracks=[
  room('squad','Main squad room',0,0,15,6,'ward'),
  room('entry','Company vestibule',15,0,10,6,'circulation'),
  room('mess','Company mess',25,0,15,6),
  room('hall','Rear cross passage',0,6,40,2,'circulation'),
  room('sleep','Return squad room',0,8,8,12,'ward'),
  room('store','Company store',0,20,8,6,'service'),
  room('bath','Bath / wash room',0,26,8,6,'service'),
  room('reading','Reading / billiards room',32,8,8,12),
  room('kitchen','Kitchen',32,20,8,6,'service'),
  room('sergeant',"First sergeant's room",32,26,8,6)
];
const quarters=[
  room('parlor','Parlor',0,0,8,4),room('dining','Dining room',0,4,8,4),
  room('hall','Central hall',8,0,2,8,'circulation'),
  room('bed-w','Front bedroom',10,0,8,4),room('bed-e','Rear bedroom',10,4,8,4),
  room('kitchen','Kitchen',0,8,4,5,'service'),room('servant',"Servant's room",0,13,4,5),
  room('study','Study / spare room',14,8,4,5),room('bath','Bath room',14,13,4,5,'service')
];
const stable=[room('aisle','Central handling aisle',0,4,24,4,'circulation')];
for(const [face,y]of[['north',0],['south',8]])for(let i=0;i<12;i++)
  stable.push(room(face+'-'+i,face+' stall '+(i+1),i*2,y,2,4,'stall'));
const common={collection:'nautilus-fort-apache-v1',period:'Military-phase interpretation, 1906–1910',
  physicalStoreys:1,roofMaterial:'metal',tint:{wall:[1,1,1],wood:[.72,.64,.48],trim:[.24,.36,.29],roof:[.93,.94,.91]},
  window:{width:1,height:1.15,bottom:.55,columns:3,rows:4,profile:'six-over-six'},
  roofs:[],cores:[],balconies:[],connections:[],entries:[],parts:[]};
export const FORT_RECIPES=[
  {...clone(common),id:'fort-apache-barracks-17',name:'Fort Apache · Barracks No. 17, adapted',
    sourceId:'fort-barracks-17',width:40,depth:32,levels:2,bay:5,wall:'adobe',
    window:{...common.window,width:1.2,tallHeight:2.25,bottom:.75,tallColumns:3,tallRows:4},
    floors:[0,1].map(level=>({level,rooms:volume(barracks,level)})),
    connections:[['sleep','store'],['store','bath'],['reading','kitchen'],['kitchen','sergeant']],
    entries:[{level:0,point:[20,0],width:2,type:'paired',height:2.6,room:'entry'},
      {level:0,point:[20,8],width:2,type:'paired',height:2.6,room:'hall'},
      {level:0,point:[8,23],width:1,type:'single',height:1.9,room:'store'},
      {level:0,point:[8,29],width:1,type:'single',height:1.9,room:'bath'},
      {level:0,point:[32,23],width:1,type:'single',height:1.9,room:'kitchen'},
      {level:0,point:[32,29],width:1,type:'single',height:1.9,room:'sergeant'}],
    balconies:[{id:'front-porch',x:0,y:-3,width:40,depth:3,levels:[0]}],
    porches:[{id:'front-porch',x:0,y:-3,width:40,depth:3,pitch:5,spanLevels:2}],
    roofAssemblies:[{id:'barracks-joined-gables',level:2,components:[
      {id:'main',type:'gable',axis:'x',x:0,y:0,width:40,depth:8,rise:3,overhang:.3},
      {id:'west-return',type:'gable',axis:'y',x:0,y:4,width:8,depth:28,rise:3,overhang:.3,frontOverhang:0},
      {id:'east-return',type:'gable',axis:'y',x:32,y:4,width:8,depth:28,rise:3,overhang:.3,frontOverhang:0}]},
      {id:'barracks-porch-hip',level:2,components:[{id:'porch',type:'hip',axis:'x',x:0,y:-3,width:40,depth:3,rise:.65,overhang:.2,backOverhang:0}]}],
    flues:[{x:11,y:4,base:4.24,top:8.1},{x:29,y:4,base:4.24,top:8.1}],
    parts:['adobe-sash-bay-5m','paired-post-door-2m','post-veranda-bay-5m','corbeled-flue'],
    adaptation:'No. 17 / Tribal 115 / BIA 227(A), 1889 adobe barracks, interpreted for 1906–1910. Eight 5 m front bays; the documented 25 × 125 ft main range and two 25 × 75 ft Ls become a 40 × 8 m bar plus two 8 × 24 m returns. Return length interpretation, room partitions, porch, openings, flues and finishes are authored. One occupied floor spans two standard levels; the 2.12 m slab is omitted. No later hipped dormers or school conversion.'},
  {...clone(common),id:'fort-apache-quarters-6',name:'Fort Apache · Frame Quarters No. 6, adapted',
    sourceId:'fort-quarters-6',width:18,depth:18,levels:1,bay:3,wall:'clapboard',roofMaterial:'shingle',
    floors:[{level:0,rooms:quarters}],
    connections:[['dining','kitchen'],['kitchen','servant'],['bed-e','study'],['study','bath']],
    entries:[{level:0,point:[9,0],width:1.8,type:'single',height:1.95,style:'transom-sidelights',room:'hall'},
      {level:0,point:[9,8],width:1,type:'single',height:1.85,room:'hall'},
      {level:0,point:[4,10.5],width:1,type:'single',height:1.85,room:'kitchen'},
      {level:0,point:[14,15.5],width:1,type:'single',height:1.85,room:'bath'}],
    balconies:[{id:'front-veranda',x:0,y:-3,width:18,depth:3,levels:[0]}],
    porches:[{id:'front-veranda',x:0,y:-3,width:18,depth:3,pitch:3,spanLevels:1}],
    roofAssemblies:[{id:'quarters-joined-gables',level:1,components:[
      {id:'main',type:'gable',axis:'x',x:0,y:0,width:18,depth:8,rise:2.2,overhang:.25},
      {id:'west-return',type:'gable',axis:'y',x:0,y:4,width:4,depth:14,rise:1.1,overhang:.25,frontOverhang:0},
      {id:'east-return',type:'gable',axis:'y',x:14,y:4,width:4,depth:14,rise:1.1,overhang:.25,frontOverhang:0}]},
      {id:'quarters-veranda-hip',level:1,components:[{id:'veranda',type:'hip',axis:'x',x:0,y:-3,width:18,depth:3,rise:.45,overhang:.2,backOverhang:0}]}],
    flues:[{x:2,y:4,base:2.12,top:5.4},{x:16,y:4,base:2.12,top:5.4}],
    shutters:true,parts:['frame-sash-shutter-bay-3m','quarters-transom-entry','post-veranda-bay-3m','corbeled-flue'],
    adaptation:'Specific identity: inventory No. 6 / Tribal 106 / BIA 207, frame quarters dated 1888 by the 2012 nomination (ca.1885 in the earlier inventory). A military-period interpretation, not a survey replica. The early inventory calls the frame type L-shaped in prose but No.6 U-shaped in its list. This authored U footprint, 18 × 8 m bar plus 4 × 10 m returns, and all internal dimensions resolve that ambiguity explicitly. Single native storey; roof volume has no habitable half-level. Later kitchens, bathrooms and rebuilding are not represented as original evidence.'},
  {...clone(common),id:'fort-apache-stable-bay-range',name:'Fort Apache · Four-bay cavalry stable study',
    sourceId:'fort-stable-1904-06',width:24,depth:12,levels:2,bay:6,wall:'timber',noWindows:true,
    floors:[0,1].map(level=>({level,rooms:volume(stable,level)})),
    entries:[{level:0,point:[0,6],width:3,type:'paired',height:3.4,room:'aisle',style:'stable-board'},
      {level:0,point:[24,6],width:3,type:'paired',height:3.4,room:'aisle',style:'stable-board'}],
    roofAssemblies:[{id:'stable-monitor',level:2,type:'monitor',x:0,y:0,width:24,depth:12,pitch:6,
      lowerRise:1.06,ventHeight:.5,upperRise:.75,monitorWidth:4,overhang:.3}],
    stallRows:[{y:0,face:'north'},{y:8,face:'south'}],
    parts:['monitor-stable-bay-6m','stable-gable-end','stable-paired-door-3m','open-stall-bay-2m'],
    adaptation:'A repeatable four-bay assembly inspired by the timber cavalry stables, not a full measured stable. The 1976 inventory dates them ca.1906; the 2012 account records rebuilding after the early-1904 fire with east–west roof axes. Length 24 m, width 12 m, 6 m structure pitch, stall layout and joinery are authored. One tall occupied storey spans two native levels with no 2.12 m floor. Continuous ridge ventilation retained; later dairy silos, milking shed and window insertions omitted.'}
];
export function fortRecipe(id){const r=FORT_RECIPES.find(r=>r.id===id);if(!r)throw Error('Unknown Fort Apache asset: '+id);return clone(r);}
export const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(FORT_RECIPES);
