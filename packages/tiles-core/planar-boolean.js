// Candidate-only C1. Exact root geometry never grants layout/live adoption.
import {data,fields,array,integer,choice,number,token,freeze,TileError} from './data.js';
import {checkTransform} from './curves.js';
import {validateTileRecipe} from './v2-records.js';
import {PLANAR_C1_LIMITS,PlanarBudget,PlanarRefusal,arithmetic} from './planar-exact.js';
import {arrangePlanar} from './planar-arrangement.js';
import {planarTopology} from './planar-topology.js';
export {PLANAR_C1_LIMITS};
const profile='regularized-planar-lines-c1',statuses={availability:'candidate-unregistered-v2',geometry:'root-only-planar-evidence',layout:'unresolved',repair:'unresolved',floor:'unbound',material:'unbound',presentation:'unbound',query:'native-point-classification-only',support:'unbound',navigation:'unbound',fire:'unbound',liveAdoption:false};

function options(input){
  const o=data(input);fields(o,['profile','limits','queries','transform','origin'],'/options');choice(o.profile,[profile],'/options/profile');fields(o.limits,Object.keys(PLANAR_C1_LIMITS),'/options/limits');for(const [key,max]of Object.entries(PLANAR_C1_LIMITS))integer(o.limits[key],'/options/limits/'+key,1,max);checkTransform(o.transform);array(o.origin,'/options/origin',3,3).forEach((v,i)=>number(v,'/options/origin/'+i));array(o.queries,'/options/queries',65536);for(const [i,p]of o.queries.entries())array(p,'/options/queries/'+i,2,2).forEach((v,k)=>number(v,'/options/queries/'+i+'/'+k));return o;
}
// Count the complete JSON before constructing its serialized string. Work is
// modeled from actual traversal; UTF-8 and JSON escaping have explicit bounds.
function jsonBound(value,budget,cap){
  let size=0;const add=n=>{if(size+n>cap)throw new PlanarRefusal('C1_SERIALIZED_BYTES_LIMIT','Complete evidence exceeds the captured serialized-byte budget.','/options/limits/maxSerializedBytes');size+=n;};
  function string(s){add(2);for(let i=0;i<s.length;i++){budget.take('serialization');const c=s.charCodeAt(i);if(c===34||c===92||[8,9,10,12,13].includes(c))add(2);else if(c<32)add(6);else if(c<128)add(1);else if(c<2048)add(2);else if(c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){add(4);i++;}else if(c>=0xd800&&c<=0xdfff)add(6);else add(3);}}
  function visit(v){budget.take('serialization');if(v===null){add(4);return;}if(typeof v==='string'){string(v);return;}if(typeof v!=='object'){add(JSON.stringify(v).length);return;}const list=Array.isArray(v)?v:Object.entries(v);add(2);for(let i=0;i<list.length;i++){if(i)add(1);if(Array.isArray(v))visit(list[i]);else{string(list[i][0]);add(1);visit(list[i][1]);}}}
  visit(value);return size;
}
function sourceUnits(value,budget){if(value&&typeof value==='object'){budget.take('source',3);for(const [key,v]of Object.entries(value)){budget.take('source',3*key.length);sourceUnits(v,budget);}}else budget.take('source',3*(typeof value==='string'?value.length:1));}
export function inspectTilePlanarBoolean(input,capturedOptions){
  let source=null,sourceDigest=null,o=null,budget=null,phase='source';
  try{
    // Both inherited copying/validation passes are descriptor-first and bounded.
    // Keep their original Number-valued result/digest; rational data is separate.
    const snapshot=data(input);sourceDigest=token(snapshot);source=validateTileRecipe(snapshot);phase='options';o=options(capturedOptions);budget=new PlanarBudget(o.limits);phase='evaluation';sourceUnits(source,budget);sourceUnits(o,budget);budget.count('maxQueries',o.queries.length);
    if(source.frame==='world'&&(o.origin.some(v=>v!==0)||o.transform.quarterTurns||o.transform.mirrorX))throw new PlanarRefusal('C1_WORLD_FRAME_PLACEMENT','World-frame source cannot receive a second transform/translation.','/options');
    if(!source.allowedTransforms.some(t=>t.quarterTurns===o.transform.quarterTurns&&t.mirrorX===o.transform.mirrorX))throw new PlanarRefusal('C1_TRANSFORM_UNSUPPORTED','The captured D4 transform is not permitted by this source.','/options/transform');
    const E=arithmetic(budget),hash=value=>{const text=JSON.stringify(value);budget.take('provenance',text.length*2+1);return token(value);},arrangement=arrangePlanar(source,E,budget),topology=planarTopology(arrangement,E,budget,hash),plane={baseM:E.encode(E.number(arrangement.plane.baseM)),thicknessM:E.encode(E.number(arrangement.plane.thicknessM))};
    const geometryDigest=hash({profile,plane,cycles:topology.geometricCycles}),sourceBindingDigest=hash({sourceDigest,options:o}),origin=o.origin.map(E.number),transform=p=>{let [x,y]=p;if(o.transform.mirrorX)x=E.neg(x);for(let i=0;i<o.transform.quarterTurns;i++)[x,y]=[E.neg(y),x];return [E.add(x,origin[0]),E.add(y,origin[1])];};
    const worldProjection={kind:'exact-affine-evidence; not a render projection',vertices:[...topology.usedVertices.values()].map(v=>({id:v.key,point:E.encodePoint(transform(v.p))})).sort((a,b)=>{budget.take('sort',1+a.id.length+b.id.length);return a.id<b.id?-1:a.id>b.id?1:0;}),baseM:E.encode(E.add(E.number(arrangement.plane.baseM),origin[2])),orientationReversed:o.transform.mirrorX};
    const worldDigest=hash({geometryDigest,worldProjection}),queries=o.queries.map(p=>{const point=p.map(E.number);let classification='exterior';for(const h of topology.selected){budget.take('membership');if(E.onSegment(point,h.from.p,h.to.p)){classification='boundary';break;}}if(classification==='exterior'&&E.parity(topology.selected.map(h=>({a:h.from.p,b:h.to.p})),point))classification='interior';return {point:E.encodePoint(point),classification};});
    const result={kind:'nautilus-compiled-tiles',version:2,mode:'planar-boolean',source,sourceDigest,sourceBindingDigest,options:o,resolution:{state:topology.selected.length?'resolved-nonempty':'resolved-empty',diagnostics:[]},geometry:{plane,...topology.encoded,sourceLeafIds:arrangement.leaves.map(l=>l.nodeId),nodeStates:arrangement.nodeStates},geometryDigest,worldProjection,worldDigest,queries,statuses};
    // Work counters change while preflighting. Reserve the maximal counter
    // record, then publish the smaller actual snapshot after all charging.
    const upperWork={total:o.limits.maxWork,units:Object.fromEntries(Object.keys(budget.units).map(k=>[k,o.limits.maxWork])),counts:{...o.limits}},bytes=jsonBound({...result,work:upperWork},budget,o.limits.maxSerializedBytes);budget.peak('maxSerializedBytes',bytes);result.work=budget.snapshot();return freeze(result);
  }catch(error){
    if(!(error instanceof TileError)&&!(error instanceof PlanarRefusal))throw error;
    const bounded=s=>s.length<=2048?s:s.slice(0,2034)+'...[truncated]',diagnostics=(error instanceof TileError?error.diagnostics:[{code:error.code,path:error.path,message:error.message,action:'Retain complete authored source and accepted state/history; no fallback or partial resolved artifact is provided.'}]).map(({code,path,message,action})=>({code:bounded(code),path:bounded(path),message:bounded(message),action:bounded(action)}));
    // A failed evidence budget bounds the artifact, not this small failure
    // receipt. Original caller data remains intact; only its digest is returned.
    return freeze({kind:'nautilus-compiled-tiles',version:2,mode:'planar-boolean',source:null,sourceDigest,sourceBindingDigest:null,options:null,resolution:{state:phase==='source'?'invalid-source':phase==='options'?'invalid-options':'unresolved',diagnostics},geometry:null,geometryDigest:null,worldProjection:null,worldDigest:null,queries:null,work:budget?.snapshot()??{total:0,units:Object.fromEntries(['source','exact','pairs','split','sort','membership','graph','topology','provenance','serialization'].map(k=>[k,0])),counts:{}},statuses});
  }
}
