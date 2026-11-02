import {tileFinishCatalogue} from './catalogue.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Explicit fixture identities/elevations. Labels never calculate geometry.
export const COMPATIBILITY_FLOORS=freeze([
 {id:'F00',label:'1',elevationM:0},{id:'F01',label:'2',elevationM:2.12},{id:'F02',label:'3',elevationM:4.24},{id:'F03',label:'4',elevationM:6.36},{id:'F04',label:'5',elevationM:8.48},
 {id:'F05',label:'6',elevationM:10.6},{id:'F06',label:'7',elevationM:12.72},{id:'F07',label:'8',elevationM:14.84},{id:'F08',label:'9',elevationM:16.96},{id:'F09',label:'10',elevationM:19.08},
 {id:'F10',label:'11',elevationM:21.2},{id:'F11',label:'12',elevationM:23.32},{id:'F12',label:'13',elevationM:25.44},{id:'F13',label:'14',elevationM:27.56},{id:'F14',label:'15',elevationM:29.68}
]);
export const NONUNIFORM_FLOORS=freeze([
 {id:'F00',label:'1',elevationM:0},{id:'F01',label:'2',elevationM:2.3},{id:'F02',label:'3',elevationM:4.8},{id:'F03',label:'4',elevationM:7},{id:'F04',label:'5',elevationM:9.7},
 {id:'F05',label:'6',elevationM:12.1},{id:'F06',label:'7',elevationM:14.9},{id:'F07',label:'8',elevationM:17.1},{id:'F08',label:'9',elevationM:19.7},{id:'F09',label:'10',elevationM:22},
 {id:'F10',label:'11',elevationM:24.6},{id:'F11',label:'12',elevationM:27.4},{id:'F12',label:'13',elevationM:29.6},{id:'F13',label:'14',elevationM:32.5},{id:'F14',label:'15',elevationM:35.1}
]);
const contextToken='6971e6dc9cd0cd8f1b7636322d6135909d99f24bb9ab4f7cb3995f6f59f672e5';
export function stackStudy(core,examples,{nonuniform=false}={}){
 const floors=nonuniform?NONUNIFORM_FLOORS:COMPATIBILITY_FLOORS,families=tileFinishCatalogue().families;
 const recipes=families.map(f=>{const r=examples.surfaceRecipe('art-deck-'+f.id.slice(5),8,4);r.interior.skinId=f.id;return r;}),catalogue=core.createTileCatalogue(recipes),blank=examples.tileArtBundle(core,recipes,[]);
 blank.layout.floors=floors.map(({id,elevationM})=>({id,elevationM}));const source=core.tileBundle(blank.layout,catalogue);
 const slots=floors.map((f,i)=>{const r=recipes[i%4];return {id:'deck-'+String(i).padStart(2,'0'),origin:[0,0,f.elevationM],floorBindings:{base:f.id},alternatives:[{recipeId:r.id,transform:{quarterTurns:0,mirrorX:false}}],locked:i<14,anchorIds:r.anchors.map(a=>a.id)};});
 const relations=[];for(let i=0;i<15;i++)for(let j=i+1;j<15;j++)relations.push({id:'stack-cross-'+String(i).padStart(2,'0')+'-'+String(j).padStart(2,'0'),kind:'cross',a:slots[i].id,b:slots[j].id,clearanceM:2});
 const request={version:1,id:nonuniform?'art-stack-nonuniform':'art-stack-compatibility',expected:{revision:0,layoutDigest:core.tileLayoutToken(source.layout),catalogueDigest:catalogue.digest,contextToken},selection:{seed:17,policyVersion:1},replaceIds:[],removeIds:[],slots,joins:[],relations,recipeUpdates:[],maxSteps:16,maxClosure:15,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:0};
 const prepared=core.prepareTileRepair(source,request,{contextToken});if(!prepared.ok)throw Error('Public stack fixture refused: '+JSON.stringify(prepared.diagnostics));
 return {profile:{id:nonuniform?'art.explicit-nonuniform':'art.aft-height-compatibility',version:1,floors},bundle:prepared.next.bundle,source,request,contextToken,work:prepared.work};
}
export function pathStudyRecipe(examples,id,kind){
 const r=examples.pathRecipe(id,kind);const p=r.shape.path,pad=r.shape.widthM*4;
 const min=p.kind==='arc'?[p.center[0]-p.radius,p.center[1]-p.radius]:[0,1].map(k=>Math.min(...(p.kind==='line'?[p.a,p.b]:p.points).map(q=>q[k]))),max=p.kind==='arc'?[p.center[0]+p.radius,p.center[1]+p.radius]:[0,1].map(k=>Math.max(...(p.kind==='line'?[p.a,p.b]:p.points).map(q=>q[k])));
 r.reservations=[{id:'body',floorSlot:'base',channel:'surface',layerId:'ground',min:[min[0]-pad,min[1]-pad,0],max:[max[0]+pad,max[1]+pad,.12]}];return r;
}
export function finishGallery(core,examples){
 const recipes=[],placements=[];for(const [i,f]of tileFinishCatalogue().families.entries())for(const [j,kind]of ['rectangle','line','arc','cubic'].entries()){
  const id='art-'+f.id.slice(5)+'-'+kind,r=kind==='rectangle'?examples.surfaceRecipe(id,8,4):pathStudyRecipe(examples,id,kind);r.interior.skinId=f.id;recipes.push(r);placements.push({id,recipeId:id,origin:[j%2*14+i%2*32,Math.floor(j/2)*10+Math.floor(i/2)*24,0]});
 }return examples.tileArtBundle(core,recipes,placements);
}
export function choicesForProjection(projection){return Object.fromEntries(projection.entries.map(e=>[e.instanceId,{skinId:e.source.interior.skinId,version:1,variantSeed:e.source.interior.variantSeed}]));}
