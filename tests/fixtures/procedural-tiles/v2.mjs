import {region,line,field,put,setup,clone,schedule} from './catalogue.mjs';
export {region,line,field,put,setup,clone,schedule};
export function native(kind='ribbon-sweep'){
  const r=region('native.'+kind),path={kind:'cubic',id:r.id+'.path',points:[[0,0,0],[.123456789,1,0],[3,2,0],[4,0,0]]};r.version=2;r.ports=[];r.anchors=[];r.exposure=[];r.features=['canonical-boundaries-v1',kind==='shape-graph'?'shape-graph-v2':kind+'-v2'];
  if(kind==='ribbon-sweep')r.shape={kind,id:r.id+'.shape',path,width:{metric:'curve-parameter',stations:[{id:'width.start',segmentId:path.id,t:0,leftM:.25,rightM:.5},{id:'width.end',segmentId:path.id,t:1,leftM:1.25,rightM:2}]},caps:{start:'butt',end:'round'},corners:{policy:'miter',miterLimit:4},thicknessM:.123456789};
  else if(kind==='shape-graph')r.shape={kind,id:r.id+'.shape',rootId:'difference',nodes:[{kind:'leaf',id:'leaf',shape:region('original').shape},{kind:'difference',id:'difference',baseId:'leaf',subtractId:'leaf'}]};
  else if(kind==='section-sweep')r.shape={kind,id:r.id+'.shape',path,section:{id:'cornice.section',contours:[{id:'cornice.outline',role:'outer',vertices:[{id:'v0',point:[0,0]},{id:'v1',point:[.4,0]},{id:'v2',point:[.6,.2]},{id:'v3',point:[0,.5]}],materials:Array.from({length:4},()=>({id:'painterly.stone',version:1}))}]},frame:{policy:'gravity-upright-v1',rollRad:0},scale:{lateral:1,vertical:1},caps:'closed'};
  else r.shape={kind:'stair-run',id:r.id+'.shape',path:line('stairs.plan',[0,0,0],[4,0,0]),widthM:2,count:14,countPolicy:'equal-treads-risers-v1',rise:{kind:'total',metres:2.12},run:{kind:'total',metres:4},baseM:0,bottomLandingM:1,topLandingM:1,interfaces:{start:'lower-riser',firstTread:'first-tread',end:'top-tread'}};
  return r;
}
export function mixedV2(T,kind='ribbon-sweep'){
  const old=field('legacy'),r=native(kind),catalogue=T.createTileCatalogue([old,r]),layout={kind:'nautilus-tile-layout',version:2,id:'authored-v2',revision:0,catalogueDigest:catalogue.digest,floors:[{id:'ground',elevationM:0},{id:'platform',elevationM:2.12}],instances:[{...put(T,'legacy',old),recipeVersion:1},{...put(T,'native',r,[10,0,0]),recipeVersion:2}],joins:[],relations:[],selection:{seed:7,policyVersion:1},annotations:{label:'Future authored tool',description:'Candidate: no native evaluator or live adoption.'}};return {old,r,catalogue,layout,bundle:T.tileBundle(layout,catalogue)};
}
export const renderOptions=()=>({densityPerM:32,maxChordErrorM:.001,maxSegmentM:.1,rootToleranceM:.00001,maxCutNodes:129,maxPortNodes:4097,maxTotalNodes:65536,maxEdges:16384,maxBindings:65536,maxWork:10000000,maxRootTests:200000,maxRootDepth:32,maxEventsPerEdge:128});
export function windowOptions(T,r,min=[0,0],max=[1,1]){return {placement:put(T,'shape',r),floors:[{id:'ground',elevationM:0}],floorId:'ground',channel:'surface',layerId:'ground',boundaryProfile:{id:'edge',version:1},cellSizeM:1,window:{min,max},borderSegments:16,curveSampling:schedule,maxCells:4096,maxWork:10000000,uv:r.ports[0]?.uv||{policy:'world-linear-exact-v1',axes:[[1,0,0],[0,1,0]],scaleM:[1,1],phase:[0,0]}};}
export function zeroPair(T,opposite=1,amplitude=.01){
  const a=field('zero.a'),b=field('zero.b');a.shape.values=[opposite,0,0,opposite];b.shape.values=[0,opposite,opposite,0];for(const r of [a,b]){r.shape.fieldAmplitude=amplitude;for(const p of r.ports)p.boundary.normal.field=clone(r.shape);}
  const floors=[{id:'ground',elevationM:0}],input={a:{recipe:a,placement:put(T,'a',a),floors,portId:'east'},b:{recipe:b,placement:put(T,'b',b,[1,0,0]),floors,portId:'west'}};return input;
}
export function wideZeroPair(T,width=1000,amplitude=.01){
  const sides=['east','west'],floors=[{id:'ground',elevationM:0}],sources=sides.map((side,i)=>{
    const r=region('wide.zero.'+i,width,1,{sides:[side]});r.reservations=[];r.anchors=[];r.shape={...field(r.id).shape,bounds:[0,0,width,1],values:i?[0,1,1,0]:[1,0,0,1],fieldAmplitude:amplitude,heightAmplitudeM:0,variantSeed:1};r.ports[0].boundary.normal={kind:'field-cell',field:clone(r.shape)};
    return {recipe:r,placement:put(T,'wide.'+i,r,[i*width,0,0]),floors,portId:side};
  });return {a:sources[0],b:sources[1]};
}
export function clipRecipe(kind,nested){
  const r=native('shape-graph'),shape=kind==='region'?region('clipped').shape:{kind:'profile-sweep',id:'clipped.profile',path:line('clipped.path',[0,0,0],[2,0,0]),widthM:1,thicknessM:.1};
  if(nested)r.shape.nodes[0].shape=shape;else{r.shape=shape;r.features=['canonical-boundaries-v1'];}return r;
}
export function v1Corpus(T){
  const r=region('golden'),s=setup(T,[r],[put(T,'a',r),put(T,'b',r,[2,0,0])],[{id:'golden-join',a:{instanceId:'a',faceId:'east',portIds:null},b:{instanceId:'b',faceId:'west',portIds:null}}]),saved=T.serializeTileBundle(s.layout,s.catalogue),samples=[];
  for(let mask=0;mask<16;mask++)for(const saddle of ['connect-positive','connect-negative']){const f=field('golden-field',mask,17).shape;f.saddle=saddle;for(const [u,v]of [[0,0],[.125,0],[.5,.5],[.25,.75],[1,1]])samples.push(T.sampleTileField(f,u,v));}
  return {saved,compiled:T.compileTileLayout(s.layout,s.catalogue),requirements:T.tileRequirements(s.layout,s.catalogue),reopened:T.openTileBundle(saved,{requireResolved:true}).compiled,samples};
}
export function fractionalCompound(T,P,junction,{transform={quarterTurns:0,mirrorX:false},origin=[.0000003,0,0],gapSide='start',reverse=false}={}){
  const local=p=>{let [x,y,h]=p;for(let n=0;n<transform.quarterTurns;n++)[x,y]=[y,-x];if(transform.mirrorX)x=-x;return [x||0,y||0,h||0];},world=p=>{let [x,y,h]=p;if(transform.mirrorX)x=-x;for(let n=0;n<transform.quarterTurns;n++)[x,y]=[-y,x];return [x+origin[0],y+origin[1],h+origin[2]].map(v=>Object.is(v,-0)?0:v);};
  const canonical=Array.from({length:P},(_,i)=>line('part.'+i,local([i+(gapSide==='start'&&i===junction ? .0000004 : 0),0,0]),local([i+1+(gapSide==='end'&&i+1===junction ? .0000004 : 0),0,0]))),segments=reverse?[...canonical].reverse().map(s=>({...clone(s),a:clone(s.b),b:clone(s.a)})):clone(canonical),r=region('fractional.'+P),p=clone(r.ports[0]);r.reservations=[];p.endpoint=local([P/2,0,0]);p.outward=[0,0,1];p.tangent=local([reverse?-1:1,0,0]);p.widthM=P;p.boundary.curve={kind:'compound',id:'compound',segments};p.boundary.sampling={segmentsPerPart:1,maxChordErrorM:.000001,maxSegmentM:2,maxWork:1024};p.boundary.materialIntervals=[{from:0,to:junction/P,material:{id:'before',version:1}},{from:junction/P,to:1,material:{id:'after',version:1}}];r.ports=[p];
  const s=setup(T,[r],[put(T,'curve',r,origin,{transform})]);return {...s,recipe:r,junction:junction/P,worldParts:canonical.map(s=>[world(s.a),world(s.b)])};
}
