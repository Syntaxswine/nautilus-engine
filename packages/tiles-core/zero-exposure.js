import * as V1 from './index.js';
import {data,fields,number,integer,id,clone,token,freeze,fail,canonical} from './data.js';
import {parts,transformVector,direction} from './curves.js';
import {effectiveTransform} from './recipes.js';
import {matchPorts} from './interfaces.js';

function sourceWork(r){let work=r.reservations.length*8;for(const p of r.ports){const n=parts(p.boundary.curve).length;work+=5*(n*p.boundary.sampling.segmentsPerPart+1)+2*(n-1);}return work;}
function inspect(source,collarM,charge){
  fields(source,['recipe','placement','floors','portId'],'/source');id(source.portId,'/portId');if(source.recipe.version!==1)fail('TILE_V2_UNRESOLVED','/recipe','Zero evidence cannot substitute a native candidate evaluator.');const r=V1.validateTileRecipe(source.recipe);charge(sourceWork(r));const projection=V1.transformTileRecipe(r,source.placement,source.floors),port=projection.geometry.ports.find(p=>p.id===source.portId),raw=r.ports.find(p=>p.id===source.portId);if(!port)fail('UNKNOWN_JOIN_PORT','/portId','Name an actual saved port.');
  const common={floorId:port.floorId,channel:port.channel,layerId:port.layerId,profiles:port.profiles,widthM:port.widthM,thicknessM:port.thicknessM,geometry:port.geometry,uvMapping:port.uvMapping},result={edgeKey:'tile-zero-edge-v1:'+token(common),port,zero:{proved:false,interval:null,reason:'No supported whole-interval proof.'},side:{state:'unknown',reason:'No supported independent side proof.'},floor:source.floors.find(f=>f.id===port.floorId)};
  if(r.shape.kind!=='field-cell'||raw.boundary.normal.kind!=='field-cell')return result;
  const s=r.shape,ps=parts(raw.boundary.curve);if(ps.length!==1||!['line','cubic'].includes(ps[0].kind))return result;charge(16);const controls=ps[0].kind==='line'?[ps[0].a,ps[0].b]:ps[0].points,b=s.bounds,edge=[[0,b[0],[0,3],[1,2]],[0,b[2],[1,2],[0,3]],[1,b[1],[0,1],[3,2]],[1,b[3],[3,2],[0,1]]].find(([axis,value])=>controls.every(p=>p[axis]===value));if(!edge)return result;
  charge(controls.length*4);if(controls.some(p=>p[0]<b[0]||p[0]>b[2]||p[1]<b[1]||p[1]>b[3])){result.zero.reason='The complete original control hull is not proved inside the native field domain; coarse samples cannot authorize extrapolation.';return result;}
  const [axis,coordinate,on,opposite]=edge;if(!on.every(i=>s.values[i]===0)){result.zero.reason='The exact native border corner values are not both zero; endpoint coincidence is insufficient.';return result;}
  result.zero={proved:true,interval:[0,1],proof:'native-field-border-zero-corners-and-exact-zero-fade-v1',scope:'The complete original analytic port restriction, not merely its samples.'};
  const nativeOutward=[0,0,0];nativeOutward[axis]=coordinate===b[axis]?-1:1;if(canonical(direction(transformVector(nativeOutward,effectiveTransform(r,source.placement))))!==canonical(port.outward)){result.side.reason='The declared port outward does not match the actual native field side; no opposing occupied collars are proved.';return result;}
  const width=b[axis+2]-b[axis];if(collarM>width){result.side.reason='Requested collar extends beyond the authored cell.';return result;}
  const a=s.values[opposite[0]],z=s.values[opposite[1]],amplitude=Math.abs(s.fieldAmplitude),scale=Math.max(Math.abs(a),Math.abs(z),amplitude);
  if(scale===0){result.side={state:'inside',proof:'identically-zero-native-scalar; zero-positive-v1',collarM};return result;}
  if(scale<1e-100){result.side.reason='Scalar conditioning is too small for this conservative floating-bound proof.';return result;}
  // With border values 0, F(s,t)=s²[(3-2s)O(t)+A*256(1-s)²t²(1-t)²].
  // O is a convex smooth blend of the two opposite corners; |A|<=|amplitude|
  // for every saved seed. This is an analytic enclosure only: the frozen
  // evaluator can round smooth(u) to 1 while a negative fade term survives.
  const c=collarM/width,lo=Math.min(a,z)/scale,hi=Math.max(a,z)/scale,product=[lo*3,lo*(3-2*c),hi*3,hi*(3-2*c)],variation=16*amplitude/scale,roundoff=256*Number.EPSILON*(1+variation),lower=Math.min(...product)-variation-roundoff,upper=Math.max(...product)+variation+roundoff;charge(32);
  const analyticState=lower>0?'inside':upper<0?'outside':'unknown';
  // In native binary64 arithmetic smooth(u) stays in [0,1] on [0,1]. For
  // u<1/2, RN(u²)<=1/4 and RN(3-2u)<=3, hence the result is <=3/4.
  // For u>=1/2, 2u and 3-2u are exact, with the latter in [1,2]. Positive
  // rounding error of u² is <=2^-54 (u=1 is exact). The unrounded final
  // product is <= exact smooth(u)+2^-53 <=1+2^-53; ties-to-even rounds
  // that midpoint down to 1. All factors and bilinear weights are thus
  // nonnegative. With nonnegative corners the topology bias is zero, and
  // zero amplitude removes the entire perturbation for every seed. Rounded
  // or underflowed zeros remain inside under the frozen zero-positive rule.
  // A negative analytic sign alone cannot certify native outside near zero.
  const nativeProof=s.fieldAmplitude===0&&s.values.every(v=>v>=0)?'nonnegative-native-corners-zero-amplitude-v1':null,state=nativeProof?'inside':'unknown';
  result.side={state,proof:'analytic-collar-and-frozen-native-evaluator-v1',analyticState,collarM,normalizedCoefficientBounds:[lower,upper],normalFactor:'positive inward squared distance',seedScope:'all allowed interior seeds',nativeProof,reason:nativeProof?'Nonnegative native bilinear weights, nonnegative corners and zero perturbation prove v1 positive classification throughout the collar, including rounded zero.':'The analytic interval does not prove the frozen native evaluator classification throughout this collar; retain geometry.'};return result;
}
export function inspectTileZeroExposure(input,options){
  const source=data(input),o=data(options);fields(source,['a','b'],'/source');fields(o,['collarM','residentA','residentB','maxWork'],'/options');number(o.collarM,'/collarM',.000001,1000000);integer(o.maxWork,'/maxWork',1,10000000);for(const k of ['residentA','residentB'])if(typeof o[k]!=='boolean')fail('INVALID_RESIDENCY','/'+k,'Use a captured explicit residency state.');let workUnits=0;const charge=n=>{if(workUnits+n>o.maxWork)fail('ZERO_EVIDENCE_WORK_LIMIT','/maxWork','Exact source recompilation and independent zero/side proofs exceed the declared work bound.');workUnits+=n;};
  const a=inspect(source.a,o.collarM,charge),b=source.b===null?null:inspect(source.b,o.collarM,charge);let matched=false,diagnostics=[],decision='retain-exterior';
  if(b){charge(1);const match=matchPorts(a.port,b.port,'zero-exposure-inspection');matched=match.ok;diagnostics=match.diagnostics;if(matched&&canonical(a.floor)!==canonical(b.floor)){matched=false;diagnostics=[{code:'FLOOR_DEFINITION_CONFLICT',message:'A shared floor ID must retain the same saved elevation.'}];}}
  if(matched&&o.residentA&&o.residentB&&a.zero.proved&&b.zero.proved&&a.side.state==='inside'&&b.side.state==='inside')decision='internal-skirt-suppression-eligible';
  return freeze({kind:'nautilus-compiled-tiles',version:2,mode:'zero-exposure',source,options:o,a,b,matched,decision,diagnostics,workUnits,conditions:['Inspection is not a live adoption token.','Host rechecks matching resident geometry and complete context before presentation changes.','Every side keeps its own canonical boundary; support remains host-owned.'],statuses:{availability:'candidate-unregistered-v2',geometry:'zero-edge-evidence',presentation:'provider-required',query:'unbound',support:'unbound',navigation:'unbound',fire:'unbound',liveAdoption:false}});
}
