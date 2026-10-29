// Original map composition. Plain data only: no renderer, I/O, clocks or game state.
import {blankMap,validateMap} from '../map-core/index.js';
import {SILO_PLAN,siloHeightReference} from '../silo/index.js';
import {Surfaces,circle,rectangle,tileFloor} from '../silo/geometry.js';
const copy=structuredClone;
export const COLDWELL_SITE=Object.freeze({id:'coldwell-site-v1',seed:841902,width:240,depth:240,metresPerTile:1,
 engineCommit:'8c4670450cb2b38c1e1abd811d633c22de9e2b7c',siloCommit:'3b9d4004a7e51e5d345cded068fc46eab2f320a2',
 // Legacy integer-centred tiles span [-.5,239.5]. A common +.5 horizontal
 // translation puts their edges in the strict nonnegative 240 m world bounds.
 translation:Object.freeze({x:38.5,y:85.5,h:46.64}),nativeSurfaceY:0,deepestNativeY:-46.64,
 fence:Object.freeze({x:40,y:82,width:141,depth:63,gate:[100,107]}),
 buildings:Object.freeze([{id:'gatehouse',name:'Gatehouse',x:91,y:138,width:6,depth:4,doorX:94,material:'wall-brick'},
  {id:'maintenance',name:'Maintenance workshop',x:104,y:112,width:12,depth:8,doorX:109,material:'wall-corrugated'},
  {id:'utilities',name:'Utilities shed',x:114,y:89,width:8,depth:6,doorX:118,material:'wall-concrete'}].map(Object.freeze)),
 groundReservations:Object.freeze([{id:'shaft',x:141,y:95,width:17,depth:17},{id:'access-portal',x:71,y:112,width:5,depth:6}].map(Object.freeze))});
const distanceToSegment=(p,a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);};
export const SITE_ROADS=Object.freeze([
 {id:'approach',width:6,points:[[104,239],[104,178],[104,150],[104,132]]},
 {id:'portal-spur',width:4,points:[[104,132],[86,126],[73,126],[73,120]]},
 {id:'silo-spur',width:5,points:[[104,132],[129,129],[151,119],[161,115]]},
 {id:'utility-spur',width:3,points:[[129,129],[128,114],[128,99],[118,98]]},
 {id:'gatehouse-path',width:2,points:[[102,140],[94,143]]}
]);
const onRoad=(x,y,padding=0)=>SITE_ROADS.some(r=>r.points.slice(1).some((p,i)=>distanceToSegment([x,y],r.points[i],p)<=r.width/2+padding));
const inRect=(p,r,pad=0)=>p.x>=r.x-.5-pad&&p.x<=r.x+r.width-.5+pad&&p.y>=r.y-.5-pad&&p.y<=r.y+r.depth-.5+pad;
function paintRect(m,r,kind){for(let y=r.y;y<r.y+r.depth;y++)for(let x=r.x;x<r.x+r.width;x++)m.terrain[y][x]=kind;}
function room(m,r){paintRect(m,r,'floor');for(let x=r.x;x<r.x+r.width;x++)for(const y of [r.y-1,r.y+r.depth-1])m.edges[`s:${x}:${y}`]=r.material;
 for(let y=r.y;y<r.y+r.depth;y++)for(const x of [r.x-1,r.x+r.width-1])m.edges[`e:${x}:${y}`]=r.material;
 m.edges[`s:${r.doorX}:${r.y+r.depth-1}`]='door-steel-closed';m.edges[`s:${r.x+1}:${r.y-1}`]=r.material==='wall-brick'?'window-brick':r.material==='wall-concrete'?'window-concrete':'window-corrugated';
 for(let y=r.y;y<r.y+r.depth;y++)for(let x=r.x;x<r.x+r.width;x++)m.upper[0][`${x},${y}`]='ground-concrete';
}
export function createColdwellSurface(){
 const m=blankMap('Coldwell Silo surface - companion required');for(const row of m.terrain)row.fill('ground-grass');
 for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(onRoad(x,y))m.terrain[y][x]='ground-dirt';
 paintRect(m,{x:137,y:92,width:33,depth:25},'ground-concrete');paintRect(m,{x:70,y:118,width:7,depth:4},'ground-concrete');
 for(const b of COLDWELL_SITE.buildings)room(m,b);
 const f=COLDWELL_SITE.fence;for(let x=f.x;x<f.x+f.width;x++){m.edges[`s:${x}:${f.y-1}`]='fence-chainlink';if(x<f.gate[0]||x>f.gate[1])m.edges[`s:${x}:${f.y+f.depth-1}`]='fence-chainlink';}
 for(let y=f.y;y<f.y+f.depth;y++)for(const x of [f.x-1,f.x+f.width-1])m.edges[`e:${x}:${y}`]='fence-chainlink';
 for(const r of COLDWELL_SITE.groundReservations)paintRect(m,r,'void');
 m.starts=[{x:104,y:190,z:0},{x:105,y:190,z:0},{x:104,y:191,z:0},{x:105,y:191,z:0}];m.exits=[{x:104,y:224,z:0}];m.guards=[];
 let state=COLDWELL_SITE.seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),occupied=[];
 for(let i=0;occupied.length<78&&i<12000;i++){const p={x:18+Math.floor(random()*205),y:44+Math.floor(random()*177),z:0,kind:random()<.62?'tree-pine':'tree-broadleaf'};
  if(inRect(p,f,8)||onRoad(p.x,p.y,7)||occupied.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<6)||m.starts.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<7)||Math.hypot(p.x-104,p.y-224)<7)continue;if(occupied.length%4)p.kind+='-large';occupied.push(p);}
 if(occupied.length!==78)throw Error('Deterministic tree scatter could not fill the site.');m.props.push(...occupied);
 m.props.push({x:105,y:113,z:0,kind:'crate-wood'},{x:106,y:113,z:0,kind:'crate-wood'},{x:113,y:113,z:0,kind:'barrel-single'},{x:115,y:90,z:0,kind:'barrel-single'},{x:116,y:90,z:0,kind:'barrel-single'});
 const errors=validateMap(m);if(errors.length)throw Error(errors.join(' '));return m;
}
export function coldwellCompanion(){return {kind:'nautilus-coldwell-silo-companion',version:1,id:'coldwell-underground-v1',required:true,
 source:{commit:COLDWELL_SITE.siloCommit,collection:'nautilus-silo-v1',assetId:'coldwell-complex',archive:'coldwell-silo-v1.zip'},
 coordinates:{units:'metres',groundAxes:['x','y'],up:'h',nativeScale:[1,1,1],placement:copy(COLDWELL_SITE.translation),
  nativeSurfaceY:0,deepestNativeY:-46.64,verticalOffsetM:46.64,threePreviewTranslation:[38,0,85],legacySurfaceToWorld:{x:.5,y:.5,h:46.64},
  formula:'Legacy preview (X,Y,Z)=(native X+38,native Y,native Z+85). Nonnegative world (x,y,h)=(preview X+.5,preview Z+.5,preview Y+46.64). Apply the common half-metre horizontal and 46.64 m vertical offsets exactly once to surface, silo and anchors.'},
 surfaceReservations:copy(COLDWELL_SITE.groundReservations),surfaceInfill:'surface-infill.mesh.json',
 access:{surfaceDoor:{x:73.5,y:118,h:46.64},entryLanding:{x:72,y:115,h:46.64},shaftCenter:{x:149.5,y:103.5,h:46.64}},
 height:{intervalM:2.12,positions:23,rangeM:[0,46.64],reference:'height-reference.world.json'},
 geometry:'Original annular walls, clipped floor polygons, actual openings and independent art rigs. Envelope AABBs are not exact collision.',
 capabilitiesRequired:['nautilus-extended-height-v1','artist-coldwell-annular-support-v1','artist-coldwell-stair-clearance-v1','artist-coldwell-dynamic-parts-v1'],
 registration:'The artist-prefixed capabilities are intake requirements, not registered engine/game features.',
 acceptance:'Reject the complete bundle before play if any required companion/provider is unsupported. Never present surface-only loading as the whole silo.'};}
export function coldwellHeightReference(){const w=siloHeightReference();w.id='coldwell-site-height-reference';w.name='Coldwell site height reference - geometry companion required';w.bounds.widthM=w.bounds.depthM=240;return w;}
export function buildColdwellInfill(){
 const s=new Surfaces(),r=COLDWELL_SITE.groundReservations[0],outline=rectangle({x:r.x-.5,z:r.y-.5,width:r.width,depth:r.depth}),hole=circle([149,103],8.5),cells=tileFloor(outline,[hole]);s.zone='surface-infill';s.channel('floor',22);
 for(const c of cells)if(c.full)s.box([c.x,-.06,c.z],[1,.12,1],'concrete');else for(const p of c.polygons)s.prism(p,0,.12,'concrete');
 const batches=[...s.batches.values()];return {schema:'nautilus-silo-artist-mesh',version:1,asset:{id:'coldwell-surface-infill',name:'Square tile corners around the round silo',kind:'site-infill'},lod:'game',uvMode:'metres',metresPerUnit:1,
  nativeToWorld:{translation:[.5,46.64,.5],inverseTranslation:[-.5,-46.64,-.5]},bounds:{min:[r.x-.5,-.12,r.y-.5],max:[r.x+r.width-.5,0,r.y+r.depth-.5]},
  metrics:{triangles:batches.reduce((n,b)=>n+b.positions.length/9,0),batches:batches.length,rigs:0,fullTiles:cells.filter(c=>c.full).length,boundaryTiles:cells.filter(c=>!c.full).length},
  semantics:{floors:[{id:'surface-square-corners',index:22,nativeTop:0,thickness:.12,outline,holes:[hole],cells}]},batches,rigs:[],integration:'Required artist infill. Hole and surrounding annulus share the same 96-sided boundary; no terrain is drawn across the shaft or stair well.'};
}
export function assertColdwellImport(bundle,consumer){
 const required=['artist-coldwell-surface-v1',...coldwellCompanion().capabilitiesRequired];
 if(bundle?.kind!=='nautilus-coldwell-map-bundle'||bundle.version!==1||bundle.companion?.required!==true||bundle.companion?.id!=='coldwell-underground-v1'||bundle.companion.file!=='silo-companion.json'||bundle.source?.siloCommit!==COLDWELL_SITE.siloCommit||bundle.source?.engineCommit!==COLDWELL_SITE.engineCommit||JSON.stringify(bundle.requiredCapabilities)!==JSON.stringify(required))throw Error('Expected the complete versioned Coldwell map bundle with unchanged required companion and source pins.');
 if(!Array.isArray(consumer?.capabilities)||consumer.capabilities.some(id=>typeof id!=='string')||new Set(consumer.capabilities).size!==consumer.capabilities.length)throw Error('Supply unique explicit capability IDs for the proposed receiver.');
 const supported=new Set(consumer.capabilities),missing=required.filter(id=>!supported.has(id));
 if(missing.length){const e=new Error('Coldwell requires '+missing.join(', ')+'. Preserve the surface and silo companion; install matching providers before play.');e.code='UNSUPPORTED_COLDWELL_MAP';e.diagnostics=missing.map(id=>({code:e.code,capability:id,action:'Farmyard owner must bind this provider; do not drop the companion or flatten its geometry.'}));throw e;}return copy(bundle);
}
