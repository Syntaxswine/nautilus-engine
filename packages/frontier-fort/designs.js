// Fictional frontier-fort art. Every dimension below is an original metre-grid choice.
const room=(id,name,x,y,width,depth,type='room',extra={})=>({id,name,x,y,width,depth,type,...extra});
const entry=(room,point,width=1.2,level=0,height=1.85,type='single',extra={})=>({room,point,width,level,height,type,...extra});
const opening=(point,width=1,height=.7,bottom=.7,level=0,extra={})=>({point,width,height,bottom,level,...extra});
const roof=(id,x,y,width,depth,level,type='gable',rise=1.2)=>({id,level,components:[{id,type,axis:'x',x,y,width,depth,rise,overhang:.25}]});
const core=(id,x,y,levels,room)=>({id,x,y,width:3,depth:4,levels,room});
export const freeze=v=>{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
const common={collection:'nautilus-frontier-fort-v1',period:'Fictional frontier fort; original game-scale rendition',
  sourceId:'paragon-user-reference',wall:'stone',roofMaterial:'shingle',bay:3,window:{width:1,height:.7,bottom:.7,columns:2,rows:2},
  tint:{wall:[.92,.83,.65],wood:[.66,.66,.56],trim:[.51,.55,.48],roof:[.92,.91,.85]},
  entries:[],openings:[],connections:[],cores:[],roofs:[],balconies:[],decks:[],parapets:[],porches:[],interfaces:[],
  adaptation:'Original fictional frontier-fort adaptation inspired by the user-supplied Paragon reference. Not a measured reconstruction of Fort Apache, Arizona.'};
export const WALK=freeze({profile:'nautilus-art-wall-walk-v1',datum:2.12,width:1.5,minimumClearWidth:1.4,minimumClearHeight:1.8,inset:.16,center:.91,wallAxisHeight:0,grid:3});
const socket=(id,x,y,dx,dy,wx,wy)=>({id,profile:WALK.profile,position:[x,0,y],out:[dx,dy],walk:[wx,2.12,wy],walkWidth:1.5,minimumClearWidth:1.4,minimumClearHeight:1.8});
const linePorts=length=>[socket('west',0,0,-1,0,0,.91),socket('east',length,0,1,0,length,.91)];
export const FRONTIER_BUILDINGS=[
  {...structuredClone(common),id:'frontier-gatehouse',name:'Gatehouse and watch room',width:18,depth:6,levels:3,
    physicalStoreys:'Two principal masses; tall gateway spans native levels 0–1, circulation uses the intermediate datum.',
    floors:[0,1].map(level=>({level,rooms:[
      room('west','West guard lodge',0,0,7,6,level?'circulation':'room'),
      room('passage','Gateway passage',7,0,4,6,'passage',level?{omitSlab:true,openToLevel:0}:{}),
      room('east','East stair lodge',11,0,7,6,'circulation')]})).concat([{level:2,rooms:[
        room('west-deck','West guarded platform',0,0,3,6,'terrace'),
        room('watch','Timber watch room',3,0,12,6,'circulation'),
        room('east-deck','East guarded platform',15,0,3,6,'terrace')]}]),
    cores:[core('gate-stair',12,0,[0,1,2],'east')],
    entries:[entry('passage',[9,0],4,0,4.12,'paired',{style:'gate',id:'main-gate'}),
      entry('passage',[9,6],4,0,4.12,'doorway',{style:'open-passage',id:'gate-inner-mouth'}),
      entry('west',[3,6]),entry('east',[16.5,6]),
      entry('west',[0,3.91],1.66,1,1.92,'doorway',{style:'walk-door'}),
      entry('east',[18,3.91],1.66,1,1.92,'doorway',{style:'walk-door'}),
      entry('watch',[3,4.8],1.3,2),entry('watch',[15,4.8],1.3,2)],
    openings:[opening([3,0],.8,.65,.8),opening([15,0],.8,.65,.8),
      ...[4.5,7.5,10.5,13.5].map(x=>opening([x,0],1.7,.6,.75,2,{glazed:false,style:'firing-port'})),
      opening([3,2],1.5,.6,.75,2,{glazed:false,style:'firing-port'}),
      opening([15,2],1.5,.6,.75,2,{glazed:false,style:'firing-port'}),
      opening([9,6],2,.6,.75,2,{glazed:false,style:'firing-port'})],
    roofs:[roof('watch-gable',3,0,12,6,3,'gable',1.35)],
    deckGuards:[{level:2,x:0,y:0,width:3,depth:6,gaps:[{edge:'east',from:4.1,to:5.5}]},
      {level:2,x:15,y:0,width:3,depth:6,gaps:[{edge:'west',from:4.1,to:5.5}]}],
    interfaces:[socket('west',0,3,-1,0,0,3.91),socket('east',18,3,1,0,18,3.91)],
    upperWall:'timber',upperWallFrom:2,mainGate:true},
  {...structuredClone(common),id:'frontier-blockhouse',name:'Corner blockhouse',width:6,depth:6,levels:2,
    floors:[{level:0,rooms:[room('guard','Lower guard room',.5,.5,5,5,'circulation')]},
      {level:1,rooms:[room('watch','Projecting fighting room',0,0,6,6,'circulation')]}],
    cores:[core('block-stair',.5,.5,[0,1],'guard')],
    entries:[entry('guard',[4.5,5.5],1),entry('watch',[6,3.91],1.66,1,1.92,'doorway',{style:'walk-door'}),
      entry('watch',[3.91,6],1.66,1,1.92,'doorway',{style:'walk-door'})],
    openings:[opening([3,.5],.7,.55,.85),
      ...[[3,0],[0,3],[6,1.5],[1.5,6]].map(p=>opening(p,1.8,.65,.72,1,{glazed:false,style:'firing-port'}))],
    roofs:[roof('block-hip',0,0,6,6,2,'hip',1.1)],upperWall:'timber',cornerButtresses:true,
    interfaces:[socket('east',6,3,1,0,6,3.91),socket('south',3,6,0,1,3.91,6)]},
  {...structuredClone(common),id:'frontier-headquarters',name:'Headquarters with stair and lookout',width:15,depth:9,levels:2,
    floors:[{level:0,rooms:[room('office','Command office',3,3,4.5,6),room('hall','Entry hall',7.5,3,3,6,'circulation'),
      room('records','Records / stores',10.5,3,4.5,6)]},
      {level:1,rooms:[room('lookout','Upper lookout',6,3,6,6,'circulation'),
        room('front-deck','Front terrace',3,0,12,3,'terrace'),room('west-deck','Stair terrace',3,3,3,6,'terrace'),
        room('east-deck','East terrace',12,3,3,6,'terrace'),room('landing','Upper stair landing',0,4,3,1.5,'terrace')]}],
    cores:[core('hq-exterior-stair',0,0,[0,1],'external')],
    entries:[entry('hall',[9,3],1.5),entry('hall',[9,9]),entry('lookout',[9,3],1.2,1),entry('lookout',[6,6],1.2,1)],
    openings:[opening([4.5,3]),opening([12,3]),opening([3,6]),opening([15,6]),
      opening([4.5,9]),opening([13,9]),opening([8,9],1,.8,.6,1),opening([10,9],1,.8,.6,1)],
    roofs:[roof('hq-lookout',6,3,6,6,2)],porches:[{x:3,y:0,width:12,depth:3,pitch:3,levels:[0],roof:false}],
    deckGuards:[{level:1,x:3,y:0,width:12,depth:9,gaps:[{edge:'west',from:4,to:5.5}]},
      {level:1,x:0,y:4,width:3,depth:1.5,gaps:[{edge:'front',from:0,to:3},{edge:'east',from:0,to:1.5}]}],externalStair:true,upperWall:'timber'},
  {...structuredClone(common),id:'frontier-commanders-quarters',name:"Commander's quarters",width:12,depth:9,levels:2,
    floors:[0,1].map(level=>({level,rooms:[
      room('west',level?'West bedroom':'Parlor',0,3,6,6),room('hall',level?'Upper hall':'Main hall',6,3,3,6,'circulation'),
      room('east',level?'East bedroom':'Dining / kitchen',9,3,3,6),
      room('porch',level?'Front balcony':'Front porch',0,0,12,3,'terrace')]})),
    cores:[core('quarters-stair',0,3,[0,1],'west')],
    entries:[entry('hall',[7.5,3],1.2),entry('hall',[7.5,9]),entry('hall',[7.5,3],1.2,1)],
    openings:[...[0,1].flatMap(l=>[opening([4.5,3],1,.9,.65,l),opening([10.5,3],1,.9,.65,l),opening([0,6],1,.9,.65,l),opening([12,6],1,.9,.65,l)])],
    roofs:[roof('quarters-main-hip',0,0,12,9,2,'hip',1.4)],
    porches:[{x:0,y:0,width:12,depth:3,pitch:3,levels:[0,1],roof:false}],
    deckGuards:[{level:1,x:0,y:0,width:12,depth:3,gaps:[{edge:'back',from:6.8,to:8.2}]}],upperWall:'clapboard'},
  {...structuredClone(common),id:'frontier-adobe-barracks-porch',name:'Adobe barracks · porch',width:18,depth:9,levels:1,wall:'adobe',
    floors:[{level:0,rooms:[room('west','Squad room',0,3,7.5,6),room('hall','Company hall',7.5,3,3,6,'circulation'),
      room('east','Mess / day room',10.5,3,7.5,6)]}],
    entries:[entry('hall',[9,3],1.3),entry('hall',[9,9])],
    openings:[...[3,6,12,15].map(x=>opening([x,3],1,.85,.7)),opening([0,6]),opening([18,6])],
    flatRoofs:[{x:0,y:3,width:18,depth:6,level:1,parapet:.65}],porches:[{x:0,y:0,width:18,depth:3,pitch:3,levels:[0],roof:true}],
    roofAccess:'No authored roof route on porch variant.'},
  {...structuredClone(common),id:'frontier-adobe-barracks-stairs',name:'Adobe barracks · roof stairs',width:21,depth:6,levels:1,wall:'adobe',
    floors:[{level:0,rooms:[room('west','Squad room',0,0,7.5,6),room('hall','Company hall',7.5,0,3,6,'circulation'),
      room('east','Stores / day room',10.5,0,7.5,6)]}],
    entries:[entry('hall',[9,0],1.3),entry('hall',[9,6])],
    openings:[...[3,6,12,15].map(x=>opening([x,0],1,.85,.7))],
    flatRoofs:[{x:0,y:0,width:18,depth:6,level:1,parapet:.65,gaps:[{edge:'east',from:4,to:5.5}]}],
    separateStair:{x:18,y:0,material:'adobe',openLandingSide:'west',landingDepth:1.5},roofAccess:'Roof terrace at 2.12 m; native U stair and extended side landing.'},
  {...structuredClone(common),id:'frontier-stone-storehouse',name:'Stone storehouse',width:9,depth:6,levels:1,
    floors:[{level:0,rooms:[room('store','Stores',0,0,9,6,'service')]}],
    entries:[entry('store',[4.5,0],2,0,1.85,'paired')],openings:[opening([1.5,0],.8,.65,.8),opening([7.5,0],.8,.65,.8)],
    roofs:[roof('stone-store-gable',0,0,9,6,1)]},
  {...structuredClone(common),id:'frontier-adobe-storehouse',name:'Adobe storehouse',width:6,depth:6,levels:1,wall:'adobe',
    floors:[{level:0,rooms:[room('store','Stores',0,0,6,6,'service')]}],
    entries:[entry('store',[3,0],1.5,0,1.85,'paired')],openings:[opening([0,3],.7,.6,.9)],
    flatRoofs:[{x:0,y:0,width:6,depth:6,level:1,parapet:.65,gaps:[{edge:'east',from:.16,to:1.66,socket:'roof-east'},{edge:'west',from:.16,to:1.66,socket:'roof-west'}]}],
    roofAccess:'Two declared roof-walk sockets. Cap unused parapet gaps in a standalone placement.',
    interfaces:linePorts(6).map(p=>({...p,id:'roof-'+p.id,optional:true}))}
];
export const FRONTIER_PARTS=[
  {id:'frontier-stockade-6',name:'Stockade · 6 m',kind:'stockade',length:6,width:6,depth:1.66,interfaces:linePorts(6)},
  {id:'frontier-stockade-3',name:'Stockade · 3 m closure',kind:'stockade',length:3,width:3,depth:1.66,interfaces:linePorts(3)},
  {id:'frontier-stockade-corner',name:'Stockade · corner',kind:'corner',width:6,depth:6,
    interfaces:[socket('east',6,0,1,0,6,.91),socket('south',0,6,0,1,.91,6)]},
  {id:'frontier-stockade-u',name:'Stockade · U section',kind:'u',width:6,depth:6,
    interfaces:[socket('west-return',0,6,0,1,.91,6),socket('east-return',6,6,0,1,5.09,6)]},
  {id:'frontier-sally-port',name:'Rear sally port',kind:'sally',width:6,depth:1.66,interfaces:linePorts(6)},
  {id:'frontier-rampart-platform',name:'Rampart platform and stairs',kind:'platform',width:6,depth:8,interfaces:linePorts(6)},
  {id:'frontier-datum-stair',name:'U stair · one standard level',kind:'stair',width:3,depth:5,interfaces:[],
    attachments:{lower:[2.35,0,5],upper:[.65,2.12,5],rise:2.12,risers:14,flightWidth:1.3,run:2.8,returnDepth:1.2}},
  {id:'frontier-porch-bay',name:'Porch frame · 3 m bay',kind:'porch',width:3,depth:3,interfaces:[],
    attachments:{floor:[0,0,0],cap:[0,2.12,0],repeatPitch:3,ownership:'Owns left post. Add the separate terminal post at the end of a run.'}},
  {id:'frontier-porch-terminal',name:'Porch · terminal post',kind:'post',width:.28,depth:.25,interfaces:[],
    attachments:{origin:'Post axis at ground datum',floor:[0,0,0],cap:[0,2.12,0]}},
  {id:'frontier-paired-gate',name:'Paired timber gate · 4 m aperture',kind:'gate',width:4,depth:.3,interfaces:[],
    attachments:{roughWidth:4,roughHeight:4.12,hingeInset:.24,thickness:.12,gap:.012,origin:'Aperture left jamb, ground datum; leaves rotate about separate vertical edge axes.'}}
];
// The commander's porch/stair wing uses the same native U stair as the rest of the kit.
const quarters=FRONTIER_BUILDINGS.find(r=>r.id==='frontier-commanders-quarters');
quarters.width=15;
for(const f of quarters.floors)for(const r of f.rooms)r.x+=3;
for(const c of quarters.cores)c.x+=3;
for(const e of quarters.entries)e.point[0]+=3;
for(const o of quarters.openings)o.point[0]+=3;
for(const a of quarters.roofs)for(const r of a.components)r.x+=3;
for(const p of quarters.porches)p.x+=3;
for(const r of quarters.deckGuards)r.x+=3;
quarters.entries.push(entry('west',[3,4.75],1.4,1,1.95,'doorway',{style:'stair-access'}));
quarters.separateStair={x:0,y:0,material:'wood',openLandingSide:'east',landingDepth:1.5};
for(const r of FRONTIER_BUILDINGS)r.adaptation=common.adaptation;
freeze(FRONTIER_BUILDINGS);freeze(FRONTIER_PARTS);
export function frontierRecipe(id){const r=FRONTIER_BUILDINGS.find(r=>r.id===id);if(!r)throw Error('Unknown frontier building: '+id);return structuredClone(r);}
export const frontierPart=id=>{const p=FRONTIER_PARTS.find(p=>p.id===id);if(!p)throw Error('Unknown frontier kit part: '+id);return structuredClone(p);};
