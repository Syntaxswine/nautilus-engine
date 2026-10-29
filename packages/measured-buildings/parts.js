// Art modules use the exact same plain-data generators as the building meshes.
// This is not a rectangle-tool or gameplay assembly implementation.
import{measuredRecipe,MEASURED_CONTRACT}from'./index.js';
import{Surfaces,unionPrism}from'./geometry.js';
import{wallSurface,leafMesh,stairGeometry,guards,veranda,industrialBay,doricColumn,marketStall,longSpanTruss,meshStats}from'./mesh.js';
export const MEASURED_PARTS=[
 {id:'standard-u-stair-v1',name:'Standard U stair and upper landing',size:[3,5],levels:2,source:'Shared native adaptation',attachments:{lower:[2.35,0,4],upper:[.65,2.12,4]},notes:'14 risers, 1.3 m flights, 2.8 m run, 1.2 m return landing; real 3 x 4 m upper slab hole. Intermediate return is part of the stair, not another floor datum.'},
 {id:'paired-timber-entry-v1',name:'Paired timber entry bay',size:[3,.18],levels:1,source:'Hospital door vocabulary / original native joinery',attachments:{roughOpening:[.5,0,0],leftPivot:[.565,.009,0],rightPivot:[2.435,.009,0]},notes:'2 x 1.85 m rough opening including .065 m jamb/head; .008 m meeting gap; .045 m leaves with two outer pivots and opposite outward swings.'},
 {id:'hospital-sash-v1',name:'Hospital window and wall bay',size:[3,.24],levels:1,source:'HABS NY-6086-G 16/22',attachments:{datum:[0,0,0],sill:[1.5,.55,0]},notes:'3 m bay; 1 x 1.15 m aperture, 2 x 2 panes and stone keystone vocabulary. Historic arches rectified.'},
 {id:'mill-tall-window-bay-v1',name:'Two-level mill window bay',size:[3,.24],levels:2,source:'HAER MA-16 31',attachments:{datum:[0,0,0],upperDatum:[0,2.12,0],sill:[1.5,.5,0]},notes:'1.5 x 3.4 m 16/16-inspired aperture crosses two native panels and the datum band; no intermediate slab.'},
 {id:'rectified-market-window-bay-v1',name:'Rectified market sash bay',size:[3,.24],levels:2,source:'HABS MA-1166 1 / authored adaptation',attachments:{datum:[0,0,0],upperDatum:[0,2.12,0]},notes:'3 m granite bay; 1.5 x 3.4 m rectangular aperture with 4 x 4 panes. Historic fanlight shape is not reproduced.'},
 {id:'datum-veranda-bay-v1',name:'Two-level veranda bay',size:[3,3],levels:2,source:'HABS NY-6086-G 6/16 / original joinery',attachments:{ground:[0,0,0],upper:[0,2.12,0],beamTop:[0,4.24,0]},notes:'3 m repeat, native slabs, 2 m posts and explicit .12 m caps. Visual rail spacing reduces in game LOD.'},
 {id:'industrial-post-beam-bay-v1',name:'Industrial post / transverse beam bay',size:[6,15],levels:2,source:'HAER MA-16 27/33',repeatPitch:[6,0,0],attachments:{base:[3,0,7.5],slabUnderside:[3,4.12,7.5]},notes:'.17 m cast-iron post, .3 m timber beam section, one central post row. Six-metre repetition pitch is a placement convention, not rendered column width.'},
 {id:'market-stall-bay-v1',name:'Market counter / display insert',size:[3,.75],levels:1,source:'City market typology; insert authored',repeatPitch:[3,0,0],attachments:{stallFront:[0,0,0],clearAccess:[2.4,0,0]},notes:'Counter insert within a 3 m open-front stall; conservative 1.05 m side gap. Room partitions/front framing come from the building blueprint.'},
 {id:'doric-column-three-level-v1',name:'Three-level Doric portico column',size:[.936,.936],levels:3,source:'HABS MA-1166 1 / city report; simplified profile',attachments:{base:[0,0,0],capitalTop:[0,6.24,0],entablatureDatum:[0,6.36,0]},notes:'Three native levels; 32 source sides reduce to 12 game sides. No structural rating.'},
 {id:'long-span-timber-truss-v1',name:'Fourteen-metre timber roof truss',size:[.2,14],levels:1,source:'Authored framing; measured interior framing unavailable',attachments:{leftEaves:[0,.08,0],rightEaves:[0,.08,14],ridge:[0,1.7,7]},notes:'Attach relative datum 0 at a standard roof level. The custom 1.7 m rise describes pitch, not a floor interval.'}
];
export function buildMeasuredPart(id,{lod='game',uvMode='metres'}={}) {
 if(!['game','source'].includes(lod)||!['metres','atlas'].includes(uvMode))throw Error('Use supported part LOD and UV mode.');
 const definition=MEASURED_PARTS.find(p=>p.id===id);if(!definition)throw Error('Unknown measured part: '+id);
 const source=id.includes('mill')||id.includes('industrial')?'boott-mill-four':id.includes('market')||id.includes('doric')||id.includes('truss')?'quincy-market-hall':'ellis-hospital-two',r=measuredRecipe(source),
   b={schema:MEASURED_CONTRACT.schema,version:1,id,name:definition.name,collection:'nautilus-measured-parts-v1',sourceId:r.sourceId,
     width:definition.size[0],depth:definition.size[1],levels:definition.levels,contract:{...structuredClone(MEASURED_CONTRACT),origin:definition.origin},floors:[],stairs:[],roofs:[],
     sourcePolicy:definition.notes,recipe:{wall:r.wall,tint:r.tint,window:r.window,roofMaterial:r.roofMaterial,entries:[],cores:[]}},
   s=new Surfaces(lod,uvMode),leaves=[];
 if(id==='standard-u-stair-v1') {
   s.channel('floor',0);unionPrism(s,[{x:0,y:0,width:3,depth:5}],[],0,.12,'wood');
   const hole={x:0,y:0,width:3,depth:4};s.channel('floor',1);unionPrism(s,[{x:0,y:0,width:3,depth:5}],[hole],2.12,.12,'wood');
   stairGeometry(s,{fromLevel:0,base:0,rect:{x:0,y:0,width:3,depth:4}});guards(s,{floors:[{level:1,height:2.12,holes:[hole]}]});
 } else if(id==='datum-veranda-bay-v1')veranda(s,{recipe:{balconies:[{x:0,y:0,width:3,depth:3,levels:[0,1],step:3}]}});
 else if(id==='industrial-post-beam-bay-v1')industrialBay(s,{});
 else if(id==='market-stall-bay-v1')marketStall(s,{y:.7});
 else if(id==='doric-column-three-level-v1')doricColumn(s,{radius:.36});
 else if(id==='long-span-timber-truss-v1')longSpanTruss(s,{level:0});
 else {
   const paired=id==='paired-timber-entry-v1',span=id==='mill-tall-window-bay-v1'||id==='rectified-market-window-bay-v1'?2:1,
     width=paired?2:r.window.width,low=paired?0:r.window.bottom,height=paired?1.85:span===2?r.window.tallHeight:r.window.height;
   for(let level=0;level<span;level++){
     const bottom=Math.max(0,low-level*2.12),top=Math.min(2.12,low+height-level*2.12),w={id:id+'-wall-'+level,a:[0,0],b:[3,0],length:3,level,normal:[0,-1],interior:false,rooms:['part','outside'],
       openings:[{id:id+'-opening',type:paired?'paired':'window',u0:1.5-width/2,u1:1.5+width/2,bottom,top,fullHeight:height,continuation:!!level,public:paired,
         columns:span===2?r.window.tallColumns||4:r.window.columns,rows:span===2?r.window.tallRows||8:r.window.rows}]};
     wallSurface(s,w,b,[w],leaves);
   }
 }
 const data={schema:'nautilus-measured-art-mesh',version:1,lod,uvMode,building:b,component:structuredClone(definition),batches:[...s.batches.values()],doorLeaves:leaves.map(l=>leafMesh(l,lod,uvMode)),fixedLeaves:[],roofProofs:[]},stats=meshStats(data);
 data.bounds=stats.bounds;data.metrics={triangles:stats.triangles,draws:stats.draws,rooms:0,windows:id.includes('sash')||id.includes('window')?1:0};return data;
}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
for(const part of MEASURED_PARTS)part.origin=part.id.includes('column')?'Column axis at ground datum [0,0,0]':
  part.id.includes('truss')?'Truss centre plane at first eaves datum [0,0,0]; chord begins 0.08 m above datum':
  part.id.includes('window')||part.id.includes('sash')||part.id.includes('entry')?'Left wall-bay endpoint on wall centreline at floor datum [0,0,0]':
  'Front-left of the nominal repeat module at floor datum [0,0,0]';
freeze(MEASURED_PARTS);
