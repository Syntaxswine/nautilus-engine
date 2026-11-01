import {data,fields,number,integer,id,array,unique,choice,fail,canonical,token} from './data.js';
export const Q=1000000,DQ=1000000000000,TAU=2*Math.PI;
export const clean=v=>Object.is(v,-0)?0:v;
export const q=v=>clean(Math.round(number(v,'/derived')*Q));
export const qp=p=>p.map(q);
export const metres=p=>p.map(v=>v/Q);
export const add=(a,b)=>a.map((v,i)=>clean(v+b[i]));
export const sub=(a,b)=>a.map((v,i)=>clean(v-b[i]));
export const scale=(a,n)=>a.map(v=>clean(v*n));
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const length=a=>Math.hypot(...a);
export const same=(a,b)=>canonical(a)===canonical(b);
export function vec(v,p){array(v,p,3,3);v.forEach((n,i)=>number(n,p+'/'+i));return v;}
export function unit(v,p){vec(v,p);if(Math.abs(length(v)-1)>1e-9)fail('INVALID_DIRECTION',p,'Authored directions must be unit vectors within dimensionless 1e-9.');return v;}
export function direction(v){const n=length(v);if(n<1e-12)fail('DEGENERATE_TANGENT','/curve','A curve tangent collapsed.');return v.map(x=>clean(Math.round(x/n*DQ)));}
export const dmetres=v=>v.map(x=>x/DQ);
export function transformPoint(p,t,origin=[0,0,0]){let [x,y,h]=p;if(t.mirrorX)x=-x;for(let n=0;n<t.quarterTurns;n++)[x,y]=[-y,x];return [clean(x+origin[0]),clean(y+origin[1]),clean(h+origin[2])];}
export function transformVector(v,t){return transformPoint(v,t);}
export function inversePoint(p,t,origin=[0,0,0]){let [x,y,h]=sub(p,origin);for(let n=0;n<t.quarterTurns;n++)[x,y]=[y,-x];if(t.mirrorX)x=-x;return [clean(x),clean(y),clean(h)];}
export function checkTransform(v,p='/transform'){fields(v,['quarterTurns','mirrorX'],p);integer(v.quarterTurns,p+'/quarterTurns',0,3);if(typeof v.mirrorX!=='boolean')fail('INVALID_TRANSFORM',p,'Declare the mirror permission explicitly.');return v;}
export function checkCurve(c,p='/curve',compound=true){
  if(!c||typeof c!=='object')fail('INVALID_CURVE',p,'Use a serializable analytic curve.');choice(c.kind,compound?['line','arc','cubic','compound']:['line','arc','cubic'],p+'/kind');id(c.id,p+'/id');
  if(c.kind==='compound'){fields(c,['kind','id','segments'],p);array(c.segments,p+'/segments',32,1);unique(c.segments,p+'/segments',s=>s.id);c.segments.forEach((s,i)=>checkCurve(s,p+'/segments/'+i,false));for(let i=1;i<c.segments.length;i++)if(!same(qp(evaluate(c.segments[i-1],1)),qp(evaluate(c.segments[i],0))))fail('DISCONNECTED_CURVE',p+'/segments/'+i,'Compound endpoints do not meet on the canonical position grid.');}
  else if(c.kind==='line'){fields(c,['kind','id','a','b'],p);vec(c.a,p+'/a');vec(c.b,p+'/b');if(same(qp(c.a),qp(c.b)))fail('COLLAPSED_CURVE',p,'A line collapsed after canonicalization.');}
  else if(c.kind==='cubic'){fields(c,['kind','id','points'],p);array(c.points,p+'/points',4,4).forEach((v,i)=>vec(v,p+'/points/'+i));if(c.points.every(v=>same(qp(v),qp(c.points[0]))))fail('COLLAPSED_CURVE',p,'Cubic controls collapsed after canonicalization.');}
  else{fields(c,['kind','id','center','radius','startRad','sweepRad','h0','h1'],p);array(c.center,p+'/center',2,2).forEach((v,i)=>number(v,p+'/center/'+i));number(c.radius,p+'/radius',0.000001,100000);number(c.startRad,p+'/startRad',-TAU,TAU);number(c.sweepRad,p+'/sweepRad',-TAU,TAU);number(c.h0,p+'/h0');number(c.h1,p+'/h1');if(c.sweepRad===0||q(c.radius)===0||[.5,1].every(t=>same(qp(evaluate(c,0)),qp(evaluate(c,t)))))fail('COLLAPSED_CURVE',p,'Arc radius/sweep collapsed under the named position policy.');}
  return c;
}
export const parts=c=>c.kind==='compound'?c.segments:[c];
export function reverseCurve(c){if(c.kind==='compound')return {...c,segments:[...c.segments].reverse().map(reverseCurve)};if(c.kind==='line')return {...c,a:c.b,b:c.a};if(c.kind==='cubic')return {...c,points:[...c.points].reverse()};return {...c,startRad:c.startRad+c.sweepRad,sweepRad:-c.sweepRad,h0:c.h1,h1:c.h0};}
export function evaluate(c,t){
  if(c.kind==='compound'){const n=c.segments.length,i=Math.min(n-1,Math.floor(t*n));return evaluate(c.segments[i],t===1?1:t*n-i);}
  if(c.kind==='line')return add(c.a,scale(sub(c.b,c.a),t));
  if(c.kind==='cubic'){const u=1-t;return [0,1,2].map(i=>clean(u*u*u*c.points[0][i]+3*u*u*t*c.points[1][i]+3*u*t*t*c.points[2][i]+t*t*t*c.points[3][i]));}
  const a=c.startRad+c.sweepRad*t;return [c.center[0]+c.radius*Math.cos(a),c.center[1]+c.radius*Math.sin(a),clean(c.h0+(c.h1-c.h0)*t)];
}
export function derivative(c,t){
  if(c.kind==='compound'){const n=c.segments.length,i=Math.min(n-1,Math.floor(t*n));return scale(derivative(c.segments[i],t===1?1:t*n-i),n);}
  if(c.kind==='line')return sub(c.b,c.a);
  if(c.kind==='cubic'){const u=1-t;return [0,1,2].map(i=>3*(u*u*(c.points[1][i]-c.points[0][i])+2*u*t*(c.points[2][i]-c.points[1][i])+t*t*(c.points[3][i]-c.points[2][i])));}
  const a=c.startRad+c.sweepRad*t;return [-c.radius*Math.sin(a)*c.sweepRad,c.radius*Math.cos(a)*c.sweepRad,c.h1-c.h0];
}
export function sampling(v,p='/sampling'){fields(v,['segmentsPerPart','maxChordErrorM','maxSegmentM','maxWork'],p);integer(v.segmentsPerPart,p+'/segmentsPerPart',1,128);number(v.maxChordErrorM,p+'/maxChordErrorM',1e-12,100000);number(v.maxSegmentM,p+'/maxSegmentM',0.000001,1000000);integer(v.maxWork,p+'/maxWork',2,65536);return v;}
function errorBound(c,n){if(c.kind==='line')return 0;if(c.kind==='arc')return Math.abs(c.sweepRad)/n>Math.PI?2*c.radius:c.radius*(1-Math.cos(Math.abs(c.sweepRad)/n/2));return .75*Math.max(...[0,1].map(i=>length(add(sub(c.points[i],scale(c.points[i+1],2)),c.points[i+2]))))/(n*n);}
export function sample(c,s,t={quarterTurns:0,mirrorX:false},origin=[0,0,0]){
  const ps=parts(c),work=2*(ps.length*s.segmentsPerPart+1);if(work>s.maxWork)fail('CURVE_WORK_LIMIT','/sampling/maxWork','Canonical sampling exceeds its declared evaluator work bound.');
  const points=[],tangents=[],parameters=[];let bound=0,quantizationBound=0;
  for(const [i,part]of ps.entries()){
    const error=errorBound(part,s.segmentsPerPart);bound=Math.max(bound,error);if(error>s.maxChordErrorM)fail('CHORD_ERROR_LIMIT','/sampling/maxChordErrorM','Declared fixed border schedule cannot meet its analytic interpolation-error bound.',{curveId:part.id,errorBoundM:error});
    for(let j=0;j<=s.segmentsPerPart;j++){if(i&&j===0)continue;const u=j/s.segmentsPerPart,raw=transformPoint(evaluate(part,u),t,origin),p=qp(raw);quantizationBound=Math.max(quantizationBound,length(sub(raw,metres(p))));if(points.length){const d=length(sub(p,points.at(-1)))/Q;if(d===0)fail('COLLAPSED_SPAN','/curve','Adjacent canonical border samples collapsed.');if(d>s.maxSegmentM)fail('SEGMENT_LENGTH_LIMIT','/sampling/maxSegmentM','Canonical chord exceeds its declared length bound.');}points.push(p);tangents.push(direction(transformVector(derivative(part,u),t)));parameters.push((i+u)/ps.length);}
  }
  if(same(points[0],points.at(-1))){const a=points[0],b=points.find(p=>!same(a,p)),u=b?.map((v,i)=>BigInt(v-a[i]));if(!b||!points.some(p=>{const v=p.map((n,i)=>BigInt(n-a[i]));return u[0]*v[1]-u[1]*v[0]!==0n||u[1]*v[2]-u[2]*v[1]!==0n||u[2]*v[0]-u[0]*v[2]!==0n;}))fail('DEGENERATE_CLOSED_SAMPLING','/sampling','A closed canonical border needs non-collinear samples; select a sufficient fixed schedule.');}
  if(bound+quantizationBound>s.maxChordErrorM)fail('CHORD_ERROR_LIMIT','/sampling/maxChordErrorM','Analytic interpolation plus measured node quantization exceeds the declared chord-error bound.');return {positions:points,tangents,parameters,errorBoundM:bound+quantizationBound,analyticErrorBoundM:bound,positionQuantizationBoundM:quantizationBound,workUnits:work};
}
function primitiveDescriptor(c,t,origin,reverse=false){
  if(c.kind==='line'){const p=[c.a,c.b].map(v=>transformPoint(v,t,origin));return {kind:'line',points:reverse?p.reverse():p};}
  if(c.kind==='cubic'){const p=c.points.map(v=>transformPoint(v,t,origin));return {kind:'cubic',points:reverse?p.reverse():p};}
  const center=transformPoint([...c.center,0],t,origin).slice(0,2),start=transformVector([Math.cos(c.startRad+(reverse?c.sweepRad:0)),Math.sin(c.startRad+(reverse?c.sweepRad:0)),0],t);return {kind:'arc',center,radius:c.radius,start:direction(start),sweepRad:clean(c.sweepRad*(t.mirrorX?-1:1)*(reverse?-1:1)),heights:(reverse?[c.h1,c.h0]:[c.h0,c.h1]).map(h=>clean(h+origin[2]))};
}
export function curveDescriptor(c,t,origin,reverse=false){const ps=parts(c);return (reverse?[...ps].reverse():ps).map(p=>primitiveDescriptor(p,t,origin,reverse));}
export function sampleTileCurve(input,options){const c=checkCurve(data(input)),o=data(options);fields(o,['sampling','transform','origin'],'/options');sampling(o.sampling);checkTransform(o.transform);vec(o.origin,'/origin');const sampled=sample(c,o.sampling,o.transform,o.origin);return {...sampled,positionsM:sampled.positions.map(metres),descriptor:curveDescriptor(c,o.transform,o.origin),descriptorDigest:token(curveDescriptor(c,o.transform,o.origin)),positionPolicy:'metres-q1e6-v1'};}
