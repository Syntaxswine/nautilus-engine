// Authored adaptations. Source dimensions and inferred changes are recorded in art/.
const room = (id, name, x, y, width, depth, type='room') => ({id,name,x,y,width,depth,type});
const clone = value => structuredClone(value);

function hospitalRooms(level) {
  const rooms = [room('hall','Cross corridor',level===2?9:0,5,level===2?30:48,2,'circulation'),
    room('stair-w','West stair core',9,0,3,5,'stair'),room('stair-e','East stair core',36,0,3,5,'stair')];
  if (level<2) {
    for (const [side,x] of [['west',0],['east',39]]) {
      rooms.push(room(side+'-wash','Washroom',x,0,3,5,'service'),room(side+'-bath','Bath room',x+3,0,3,5,'service'),
        room(side+'-dress','Dressing room',x+6,0,3,5,'service'));
    }
    rooms.push(room('ward-w','West open ward',0,12,9,18,'ward'),room('ward-e','East open ward',39,12,9,18,'ward'),
      room('ante-w','West ward anteroom / linen',0,7,9,5,'circulation'),room('ante-e','East ward anteroom / linen',39,7,9,5,'circulation'));
    rooms.push(room('office','Ward office',12,0,9,5),room('entry',level?'Clinical workroom':'Entry vestibule',21,0,6,5,'circulation'),
      room('clinic',level?'Diagnostic room':'Dental clinic',27,0,9,5));
    if (!level) {
      for (const [i,name] of ['Private ward','Operating room','Pantry','Dining room','Private ward'].entries())
        rooms.push(room('rear-'+i,name,9+i*6,7,6,5,i===2?'service':'room'));
    } else rooms.push(room('rear-0','West private ward',9,7,6,5),room('rear-1','Dining room',15,7,18,5),room('rear-4','East private ward',33,7,6,5));
  } else {
    for (let i=0;i<4;i++) rooms.push(room('staff-front-'+i,'Staff room '+(i+1),12+i*6,0,6,5));
    for (let i=0;i<5;i++) rooms.push(room('staff-rear-'+i,'Staff room '+(i+5),9+i*6,7,6,5));
  }
  return rooms;
}
function millRooms(level) {
  return [{...room('work',level===4?'Upper finishing floor':level%2?'Open factory volume below':'Open spinning / weaving floor',0,0,54,15,level%2?'void':'industrial'),
      ...(level%2?{omitSlab:true,openToLevel:level-1}:{windowSpan:level<4?2:1})},
    room('stair','End stair core',54,0,3,5,'stair'),room('office',level?'Service / store':'Mill office',57,0,3,5,'service'),
    room('hall','Core landing',54,5,6,2,'circulation')];
}
function marketRooms(level) {
  const rooms=[];
  if(level<3)for(const[side,x]of[['west',0],['east',87]]) {
    if(level===2)rooms.push(room(side+'-gallery',side+' upper retail gallery',x,1.5,66,15,'circulation'));
    else {
      rooms.push({...room(side+'-aisle',side+' market aisle',x,7,66,4,'circulation'),volume:side+'-hall',windowSpan:2,
        ...(level?{omitSlab:true,openToLevel:0}:{})});
      for(const[face,y]of[['north',1.5],['south',11]])for(let i=0;i<22;i++)rooms.push({
        ...room(side+'-'+face+'-'+i,side[0].toUpperCase()+' '+face[0].toUpperCase()+' stall '+(i+1),x+i*3,y,3,5.5,'stall'),
        volume:side+'-hall',windowSpan:2,...(level?{omitSlab:true,openToLevel:0}:{})});
    }
  }
  const coreVoid=level===3?{omitSlab:true,openToLevel:2}:{};
  rooms.push({...room('stair-w','Northwest rotunda stair',66,0,3,5,'stair'),...coreVoid},
    {...room('stair-e','Northeast rotunda stair',84,0,3,5,'stair'),...coreVoid},
    {...room('vestibule',level<2?'North rotunda vestibule':'North balcony foyer',69,0,15,5,'circulation'),volume:'rotunda',
      ...(level===1?{omitSlab:true,openToLevel:0}:level===3?coreVoid:{windowSpan:2})},
    {...room('rotunda',level===2?'Rotunda balcony / open centre':'Public rotunda',66,7,21,11,'circulation'),volume:'rotunda',
      ...(level===1?{omitSlab:true,openToLevel:0}:level===3?coreVoid:{windowSpan:2})});
  if(level===1)rooms.push(room('hall-w','West core landing',66,5,3,2,'circulation'),
    {...room('hall','Open rotunda volume',69,5,15,2,'void'),volume:'rotunda',omitSlab:true,openToLevel:0},room('hall-e','East core landing',84,5,3,2,'circulation'));
  else rooms.push({...room('hall','Rotunda cross gallery',66,5,21,2,'circulation'),volume:'rotunda',...coreVoid});
  return rooms;
}

export const MEASURED_RECIPES = [
  {
    id:'ellis-hospital-two', name:'Ellis Island Hospital No. 2 — adapted',
    collection:'nautilus-measured-buildings-v1', sourceId:'ny1600', period:'1908–1909; surveyed later uses',
    width:48, depth:30, levels:3, bay:3, wall:'brick', roofMaterial:'terracotta',
    tint:{brick:[.91,.69,.53],stone:[.9,.87,.76],sash:[.96,.94,.81],roof:[.83,.63,.49]},
    window:{width:1,height:1.15,bottom:.55,columns:2,rows:2,profile:'hospital-keystone'},
    floors:[0,1,2].map(level=>({level,rooms:hospitalRooms(level)})),
    connections:[['ward-w','ante-w'],['ward-e','ante-e']],
    entries:[{level:0,point:[24,0],width:2,type:'paired',room:'entry'},{level:0,point:[0,6],width:1,type:'single',room:'hall'},
      {level:0,point:[48,6],width:1,type:'single',room:'hall'}],
    cores:[{id:'west-core',x:9,y:0,width:3,depth:4,levels:[0,1,2],room:'stair-w'},
      {id:'east-core',x:36,y:0,width:3,depth:4,levels:[0,1,2],room:'stair-e'}],
    roofs:[{id:'central-hip',x:9,y:0,width:30,depth:12,level:3,type:'hip',rise:3,overhang:[0,.3,0,.3]},
      {id:'west-hip',x:0,y:0,width:9,depth:30,level:2,type:'hip',rise:2.25,overhang:[.3,.3,0,.3]},
      {id:'east-hip',x:39,y:0,width:9,depth:30,level:2,type:'hip',rise:2.25,overhang:[0,.3,.3,.3]}],
    balconies:[{id:'veranda',x:12,y:12,width:24,depth:3,levels:[0,1,2],step:3}],
    parts:['standard-u-stair-v1','paired-timber-entry-v1','hospital-sash-v1','datum-veranda-bay-v1'],
    adaptation:'Main Hospital Building No. 2, with its two ward arms, cross corridor, two stair cores and central veranda. Basement and wing attics omitted; central staff floor retained. Source later room uses are evidence, not an asserted 1909 restoration.',
  },
  {
    id:'boott-mill-four',name:'Boott Mill No. 4 — adapted bay range',collection:'nautilus-measured-buildings-v1',sourceId:'ma1289',
    period:'1835–1838 main range, c.1880 exterior vocabulary; adapted three work floors',width:60,depth:15,levels:5,bay:3,wall:'brick',roofMaterial:'felt',
    tint:{brick:[.84,.65,.51],stone:[.84,.83,.75],sash:[.88,.9,.79],roof:[.8,.85,.83]},
    window:{width:1.5,height:1.15,tallHeight:3.4,bottom:.5,columns:3,rows:4,profile:'mill-multipane'},
    floors:[0,1,2,3,4].map(level=>({level,rooms:millRooms(level)})),connections:[],
    entries:[{level:0,point:[27,0],width:3,type:'paired',room:'work'},{level:0,point:[27,15],width:2,type:'paired',room:'work'},
      {level:0,point:[60,6],width:1,type:'single',room:'hall'}],
    cores:[{id:'mill-end-core',x:54,y:0,width:3,depth:4,levels:[0,1,2,3,4],room:'stair'}],
    roofs:[{id:'main-flat',x:0,y:0,width:54,depth:15,level:5,type:'flat',rise:0},{id:'core-flat',x:54,y:0,width:6,depth:7,level:5,type:'flat',rise:0}],
    balconies:[],parts:['standard-u-stair-v1','paired-timber-entry-v1','mill-tall-window-bay-v1','industrial-post-beam-bay-v1'],
    adaptation:'A standalone adaptation of the Mill No. 4 main bay range, excluding Mill 4 North, the courtyard infill and attached mills. The documented approximately 54.71 x 13.87 m range becomes 54 x 15 m, with an explicit 6 x 7 m end-core closure. Six historic floors become two double-level factory floors and one standard upper work floor within five native levels. The end-core internal arrangement is inferred, not a measured stair-tower replica.'
  },
  {
    id:'quincy-market-hall',name:'Quincy Market — adapted hall',collection:'nautilus-measured-buildings-v1',sourceId:'ma0469',
    period:'1826 exterior vocabulary with an explicitly adapted later open rotunda',width:153,depth:18,levels:4,bay:3,wall:'granite',roofMaterial:'slate',
    tint:{brick:[.88,.72,.59],stone:[.86,.87,.8],sash:[.93,.92,.83],roof:[.68,.75,.76]},
    window:{width:1.5,height:1.15,tallHeight:3.4,bottom:.5,columns:4,rows:4,tallColumns:4,tallRows:4,profile:'rectified-market-sash'},
    floors:[0,1,2,3].map(level=>({level,rooms:marketRooms(level),...(level===2?{holes:[{id:'rotunda-balcony-opening',kind:'atrium',x:70,y:8,width:13,depth:8}]}:{})})),connections:[],
    entries:[{level:0,point:[0,9],width:3,type:'paired',room:'west-aisle'},
      {level:0,point:[153,9],width:3,type:'paired',room:'east-aisle'},
      {level:0,point:[76.5,0],width:2,type:'paired',room:'vestibule'},
      {level:0,point:[76.5,18],width:2,type:'paired',room:'rotunda'}],
    cores:[{id:'market-west-core',x:66,y:0,width:3,depth:4,levels:[0,1,2],room:'stair-w'},
      {id:'market-east-core',x:84,y:0,width:3,depth:4,levels:[0,1,2],room:'stair-e'}],
    porticoes:[{id:'west-portico',x:-3,y:1.5,width:3,depth:15,level:0,columnX:-2.65},
      {id:'east-portico',x:153,y:1.5,width:3,depth:15,level:0,columnX:155.65}],
    roofs:[{id:'west-gable-portico',x:-3,y:1.5,width:69,depth:15,level:3,type:'gable',axis:'x',rise:2,overhang:[.2,.25,0,.25]},
      {id:'east-gable-portico',x:87,y:1.5,width:69,depth:15,level:3,type:'gable',axis:'x',rise:2,overhang:[0,.25,.2,.25]},
      {id:'pavilion-dome',x:66,y:0,width:21,depth:18,level:4,type:'dome',rise:2.4,overhang:[0,0,0,0]}],
    balconies:[],parts:['standard-u-stair-v1','paired-timber-entry-v1','rectified-market-window-bay-v1','market-stall-bay-v1',
      'doric-column-three-level-v1','long-span-timber-truss-v1'],
    adaptation:'Central Quincy Market only. HABS MA-1166 sheet 1 supplies partial exterior evidence; sheets 2/3 depict separate North/South Market buildings and are not hall plans. The city report grounds the long aisle, stall rows, Doric porticos, dome and later rotunda opening. The 153 m body plus two 3 m porticos, 3 m bays, stall arrangement, native stair cores and rectangular balcony opening are authored adaptations; the source later oval opening and nineteenth-century interiors are not conflated.'
  }
];
export function measuredRecipe(id) {
  const recipe=MEASURED_RECIPES.find(r=>r.id===id);
  if (!recipe) throw Error('Unknown measured building: '+id);
  return clone(recipe);
}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(MEASURED_RECIPES);
