import {copyPlainData,recordSlots} from './data.js';
// No core import: the host supplies its actual registered ./tiles instance.
export const TILE_ART_DEPENDENCY='708ed1c14e69699e4baa4483cbc5a50901d5be4e';
export function artRefusal(code,message){const error=new Error(message);error.code=code;throw error;}
const copy=v=>JSON.parse(JSON.stringify(v));
const parts=c=>c.kind==='compound'?c.segments:[c];
const IDENTITY={quarterTurns:0,mirrorX:false},DEFAULT_UV={policy:'world-linear-exact-v1',axes:[[1,0,0],[0,1,0]],scaleM:[1,1],phase:[0,0]};
export const TILE_ART_SAMPLING=Object.freeze({segmentsPerPart:64,maxChordErrorM:.01,maxSegmentM:4,maxWork:65536});
function authoredLevel(curve,code,expected){
 let level=expected;for(const part of parts(curve)){const heights=part.kind==='arc'?[part.h0,part.h1]:part.kind==='line'?[part.a[2],part.b[2]]:part.points.map(p=>p[2]);if(level===undefined)level=heights[0];if(heights.some(h=>h!==level))artRefusal(code,'Authored primitive heights are not level; an approximation budget cannot supply a graded provider.');}return level;
}
const close=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-9);
const uvAt=(uv,p)=>uv.axes.map((a,i)=>a.reduce((s,v,j)=>s+v*p[j],0)/uv.scaleM[i]+uv.phase[i]);

// Derived geometry helpers call the borrowed core for all curve sampling and
// position quantization. The original authored path remains in the projection.
function pathOutline(core,path,width,sampling){
 const p=path.positionsM,r=width/2,h=p[0][2];
 if(close(p[0],p.at(-1)))artRefusal('CLOSED_PATH_PROFILE','Closed paths need the reviewed annular/region profile; keep the authored path intact.');
 const directions=p.slice(1).map((b,i)=>{const a=p[i],n=Math.hypot(b[0]-a[0],b[1]-a[1]);if(n<1e-6)artRefusal('COLLAPSED_PATH','A sampled path segment collapsed.');return [(b[0]-a[0])/n,(b[1]-a[1])/n];});
 let error=path.errorBoundM,serial=0,nodeQuantizationBoundM=0;
 const arc=(center,start,sweep)=>{if(Math.abs(sweep)<1e-9)return [];const count=Math.max(1,Math.ceil(Math.abs(sweep)/(2*Math.PI)*sampling.segmentsPerPart)),sampled=core.sampleTileCurve({kind:'arc',id:'art-offset-'+serial++,center:center.slice(0,2),radius:r,startRad:Object.is(start,-0)?0:start,sweepRad:sweep,h0:h,h1:h},{sampling:{...sampling,segmentsPerPart:count},transform:IDENTITY,origin:[0,0,0]});error=Math.max(error,path.errorBoundM+sampled.errorBoundM);return sampled.positionsM;};
 const side=sign=>{const out=[],offset=(point,d)=>[point[0]-d[1]*r*sign,point[1]+d[0]*r*sign,h];out.push(offset(p[0],directions[0]));for(let i=1;i<p.length-1;i++){const a=directions[i-1],b=directions[i],cross=a[0]*b[1]-a[1]*b[0],dot=a[0]*b[0]+a[1]*b[1];if(dot<-.999999)artRefusal('PATH_REVERSAL','A reversing path needs a separate reviewed junction profile.');if(Math.abs(cross)<1e-10){out.push(offset(p[i],b));continue;}const x=offset(p[i],a),y=offset(p[i],b);if(cross*sign<0){const angle=Math.atan2(sign*a[0],-sign*a[1]),turn=Math.atan2(cross,dot);out.push(...arc(p[i],angle,turn));}else{const dx=y[0]-x[0],dy=y[1]-x[1],t=(dx*b[1]-dy*b[0])/cross;out.push([x[0]+a[0]*t,x[1]+a[1]*t,h]);}}out.push(offset(p.at(-1),directions.at(-1)));return out;};
 const left=side(1),right=side(-1),end=directions.at(-1),start=directions[0],loop=[...left,...arc(p.at(-1),Math.atan2(end[0],-end[1]),-Math.PI).slice(1),...right.reverse().slice(1),...arc(p[0],Math.atan2(-start[0],start[1]),-Math.PI).slice(1)];
 // Quantize calculated offset/miter stations through the actual core, too.
 const quantized=loop.map((a,i)=>{const value=core.sampleTileCurve({kind:'line',id:'art-node-'+i,a,b:[a[0]+1,a[1],a[2]]},{sampling:{segmentsPerPart:1,maxChordErrorM:.000001,maxSegmentM:2,maxWork:4},transform:IDENTITY,origin:[0,0,0]});nodeQuantizationBoundM=Math.max(nodeQuantizationBoundM,value.positionQuantizationBoundM);return value.positionsM[0];});
 return {loops:[quantized],errorBoundM:error+nodeQuantizationBoundM,nodeQuantizationBoundM,centrelineBoundM:path.errorBoundM,method:'Simple polyline capsule envelope; original analytic path retained. Non-simple envelopes refuse in the tessellator.'};
}

export function prepareTileArt(core,bundle,options={}){
 const values=recordSlots(copyPlainData(options,{code:'ART_OPTIONS'}),'ART_OPTIONS',['detail','detailsByInstance','curveSampling','maxInstances']),detail=Object.hasOwn(values,'detail')?values.detail:1,detailsByInstance=Object.hasOwn(values,'detailsByInstance')?values.detailsByInstance:Object.create(null),curveSampling=Object.hasOwn(values,'curveSampling')?values.curveSampling:TILE_ART_SAMPLING,maxInstances=Object.hasOwn(values,'maxInstances')?values.maxInstances:128;
 if(!core?.openTileBundle||!core.sampleTileCurve||!core.deriveTileCells||!core.sampleTileField)artRefusal('BORROW_CORE','Supply the actual registered tile core instance.');
 if(![0,1,2].includes(detail)||!Number.isInteger(maxInstances)||maxInstances<1||maxInstances>128)artRefusal('ART_BUDGET','Use detail 0/1/2 and at most 128 semantic instances.');
 const opened=core.openTileBundle(copyPlainData(bundle,{code:'ART_INPUT'}),{requireResolved:true}),compiled=opened.compiled,raw=opened.bundle;
 if(compiled.instances.length>maxInstances)artRefusal('ART_BUDGET','The requested art chunk exceeds its explicit instance budget.');
 if(!detailsByInstance||typeof detailsByInstance!=='object'||Array.isArray(detailsByInstance)||Object.values(detailsByInstance).some(v=>![0,1,2].includes(v))||Object.keys(detailsByInstance).some(id=>!compiled.instances.some(v=>v.id===id)))artRefusal('ART_DETAIL','Use presentation detail 0/1/2 for existing instance IDs.');
 const entries=[];
 for(const inspected of compiled.instances){
  const interiorDetail=Object.hasOwn(detailsByInstance,inspected.id)?detailsByInstance[inspected.id]:detail;
  const recipe=raw.recipes.find(r=>r.id===inspected.recipeId),placement=raw.layout.instances.find(v=>v.id===inspected.id),s=recipe.shape,transform=recipe.frame==='world'?IDENTITY:placement.transform,origin=recipe.frame==='world'?[0,0,0]:placement.origin;
  if(recipe.features.some(f=>f!=='canonical-boundaries-v1'))artRefusal('ART_FEATURE','This surface provider cannot interpret additional family features.');
  const ports=inspected.ports;
  for(const p of ports){if(p.geometry.normals.some(n=>n[0]!==0||n[1]!==0||n[2]!==1e12))artRefusal('SURFACE_NORMAL','The bounded surface provider requires upward canonical surface normals.');if(p.geometry.materialIntervals.length!==1)artRefusal('MATERIAL_INTERVAL_PROFILE','Multiple material intervals need a reviewed transition tessellator.');}
  const uv=ports[0]?.uvMapping||DEFAULT_UV,sample=c=>core.sampleTileCurve(c,{sampling:curveSampling,transform,origin});
  const entry={instanceId:inspected.id,recipeId:recipe.id,source:copy(recipe),placement:copy(placement),inspected:copy(inspected),uv:copy(uv),detail:interiorDetail,loops:[],interior:[],field:false,approximation:{geometry:'surface only at canonical base/height; thickness retained as metadata'},clip:null};
  if(s.kind==='field-cell'){
   if(s.values.some(v=>Math.abs(v)!==1))artRefusal('BINARY_FIELD_ONLY','Keep nonbinary and full-edge-zero fields staged until their provider ownership profile exists.');
   if(s.heightAmplitudeM!==0||s.heights.some(v=>v!==s.heights[0]))artRefusal('GRADED_FIELD_PROFILE','Graded fields need a reviewed native height evaluator.');
   if(s.bounds[2]-s.bounds[0]!==1||s.bounds[3]-s.bounds[1]!==1)artRefusal('FIELD_GRID_PROFILE','This first binary-field provider supports native one-metre fields.');
   const corners=[[s.bounds[0],s.bounds[1]],[s.bounds[2],s.bounds[1]],[s.bounds[2],s.bounds[3]],[s.bounds[0],s.bounds[3]]],projected=corners.map((a,i)=>sample({kind:'line',id:'field-side-'+i,a:[...a,s.heights[0]],b:[...corners[(i+1)%4],s.heights[0]]}).positionsM[0]);
   const min=[0,1].map(k=>Math.min(...projected.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...projected.map(p=>p[k])));if([...min,...max].some(v=>!Number.isInteger(v)))artRefusal('FIELD_GRID_PROFILE','Native binary fields require an aligned one-metre world window.');
   const port=ports[0],reservation=recipe.reservations[0],slot=port?.floorId||placement.floorBindings[reservation?.floorSlot];if(!slot||!port&&!reservation)artRefusal('FIELD_BINDING','A binary field needs an explicit floor/channel/layer binding.');
   const options={placement,floors:raw.layout.floors,floorId:slot,channel:port?.channel||reservation.channel,layerId:port?.layerId||reservation.layerId,boundaryProfile:port?.profiles.border||{id:'art.field',version:1},cellSizeM:1,window:{min,max},borderSegments:16,curveSampling,maxCells:4096,maxWork:10000000,uv};
   const border=core.deriveTileCells(recipe,options),n=8*2**interiorDetail,grid=core.deriveTileCells(recipe,{...options,cellSizeM:1/n,borderSegments:1}),points=new Map();
   for(const edge of grid.edges)for(const v of edge.samples)points.set(v.position.join(','),v);for(const c of grid.cells)points.set(c.centre.position.join(','),c.centre);
   const edges=new Map(border.edges.map(e=>[e.worldEdgeId,e])),cell=border.cells[0],get=face=>edges.get(cell.edgeIds[face]).samples.map(v=>v.position.map(x=>x/1e6));
   entry.loops=[[...get('north').slice(0,-1),...get('east').slice(0,-1),...get('south').reverse().slice(0,-1),...get('west').reverse().slice(0,-1)]];entry.field=true;
   entry.interior=[...points.values()].filter(v=>v.position[0]/1e6>min[0]&&v.position[0]/1e6<max[0]&&v.position[1]/1e6>min[1]&&v.position[1]/1e6<max[1]).map(v=>({position:v.position.map(x=>x/1e6),field:v.field,paint:v.paint}));
   const a=projected[0],u=projected[1].map((v,i)=>v-a[i]),v=projected[3].map((p,i)=>p-a[i]);
   entry.fieldSamples=[];for(const p of ports)for(const q of p.geometry.positions){const w=q.map(x=>x/1e6),delta=w.map((x,i)=>x-a[i]),unit=axis=>Math.max(0,Math.min(1,delta.reduce((sum,x,i)=>sum+x*axis[i],0)));const f=core.sampleTileField(s,unit(u),unit(v));entry.fieldSamples.push({position:w,field:f.value,paint:f.paint});}
   for(const e of border.edges)for(const p of e.samples)entry.fieldSamples.push({position:p.position.map(x=>x/1e6),field:p.field,paint:p.paint});
   entry.renderingPolicy='canonical-surface-v1-cuts16-interior8-16-32';entry.topology=core.tileFieldTopology(s,{transform,complement:false});entry.approximation={policy:'core sampled scalar field with planar native height',internalBorderSegments:16,interiorCellsPerM:n,external:'verbatim canonical port schedules; no 32/m dependency'};
  }else if(s.kind==='region'){
   if(s.outlines.some(c=>parts(c).some(p=>!['line','arc'].includes(p.kind))))artRefusal('REGION_PROFILE','This tranche supports line/arc region outlines; preserve other controls for a later evaluator.');
   for(const c of s.outlines){authoredLevel(c,'GRADED_REGION_PROFILE',s.baseM);const sampled=sample(c);if(sampled.positionsM.some(p=>Math.abs(p[2]-(s.baseM+origin[2]))>1e-6))artRefusal('GRADED_REGION_PROFILE','A region surface must be level at its authored base.');entry.loops.push(sampled.positionsM);(entry.sourceDescriptors??=[]).push(sampled.descriptor);entry.approximation.curveBoundM=Math.max(entry.approximation.curveBoundM||0,sampled.errorBoundM);}
  }else if(s.kind==='profile-sweep'){
   authoredLevel(s.path,'GRADED_PATH_PROFILE');const sampled=sample(s.path);if(sampled.positionsM.some(p=>Math.abs(p[2]-sampled.positionsM[0][2])>1e-6))artRefusal('GRADED_PATH_PROFILE','Graded ramps/stairs remain staged; no flattening of controls is allowed.');
   const envelope=pathOutline(core,sampled,s.widthM,curveSampling);entry.loops=envelope.loops;entry.approximation={...entry.approximation,...envelope};delete entry.approximation.loops;
  }else artRefusal('SHAPE_PROFILE','No surface provider is bound for this shape.');
  if(s.clip){const sampled=sample({kind:'line',id:'clip-diagonal',a:s.clip.min,b:s.clip.max}),ends=[sampled.positionsM[0],sampled.positionsM.at(-1)];entry.clip={min:[0,1,2].map(k=>Math.min(...ends.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...ends.map(p=>p[k])))};}
  entry.approximation.externalDeclaredChordLimitM=Math.max(0,...ports.map(p=>p.geometry.sampling.maxChordErrorM));
  entry.defaultUV=entry.loops.flat().map(p=>({position:p,uv:uvAt(uv,p)}));entries.push(entry);
 }
 return copy({kind:'nautilus-tile-art-projection',version:1,dependency:TILE_ART_DEPENDENCY,bundle:raw,compiled,entries,renderingPolicy:'canonical-surface-v1-cuts16-interior8-16-32',statuses:{...compiled.statuses,presentation:{state:'prepared-native-surfaces',provider:'nautilus.native-tile-surfaces'},gameplay:compiled.statuses.gameplay},qualification:'Detached actual-core inspection; no handles, matcher, save schema, game readiness or body/support inference.'});
}
