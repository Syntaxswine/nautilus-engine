import {fields,id,array,number,choice,unique,fail,token,canonical,clone} from './data.js';
import {Q,DQ,vec,qp,metres,unit,direction,dmetres,transformPoint,transformVector,sample,curveDescriptor,derivative,evaluate,parts,same,sub,dot,length,scale,reverseCurve} from './curves.js';
import {normalAt,fieldAt} from './fields.js';
import {effectiveTransform,effectiveOrigin} from './recipes.js';
const lexical=(a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0;
const pointOrder=(a,b)=>{for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]<b[i]?-1:1;return 0;};
function plane(curve,endpoint,outward){
  const check=p=>{if(Math.abs(dot(sub(p,endpoint),outward))>0.00000051)fail('NONPLANAR_INTERFACE','/boundary/curve','The v1 interface must lie in its declared plane.');};
  for(const c of parts(curve)){if(c.kind==='arc'){if(Math.abs(outward[0])+Math.abs(outward[1])>1e-12||Math.abs(c.h0-c.h1)>0.00000051)fail('NONPLANAR_INTERFACE','/boundary/curve','A circular interface arc must lie in a horizontal plane in this bounded profile.');check(evaluate(c,0));}else for(const p of c.kind==='line'?[c.a,c.b]:c.points)check(p);}
}
function fieldEdge(p,t,origin){
  const s=p.boundary.normal.field,b=s.bounds,cs=parts(p.boundary.curve);if(cs.length!==1||!['line','cubic'].includes(cs[0].kind))fail('UNSUPPORTED_FIELD_BORDER','/boundary/normal','A shared field border is a single line/cubic on a cell edge.');const c=cs[0],controls=c.kind==='line'?[c.a,c.b]:c.points;
  const edge=[[0,b[0],[0,3]],[0,b[2],[1,2]],[1,b[1],[0,1]],[1,b[3],[3,2]]].find(([axis,value])=>controls.every(v=>qp(v)[axis]===Math.round(value*Q)));
  if(!edge)fail('UNSUPPORTED_FIELD_BORDER','/boundary/normal','Field border controls must lie on one complete cell edge plane.');
  const [axis,value,index]=edge,along=1-axis,a=axis===0?[value,b[1],0]:[b[0],value,0],z=axis===0?[value,b[3],0]:[b[2],value,0],start=evaluate(c,0),end=evaluate(c,1),h=s.heights;
  const heightAt=v=>{const u=(v[0]-b[0])/(b[2]-b[0]),w=(v[1]-b[1])/(b[3]-b[1]);return fieldAt(s,u,w).heightM;};
  const expected=controls.map((v,i)=>{if(c.kind==='line')return [v[0],v[1],heightAt(v)];const f=i/3,u=(start[along]-a[along])/(z[along]-a[along]),w=(end[along]-a[along])/(z[along]-a[along]),delta=w-u,dh=k=>6*k*(1-k)*(h[index[1]]-h[index[0]]),first=heightAt(start),last=heightAt(end);return [start[0]+(end[0]-start[0])*f,start[1]+(end[1]-start[1])*f,[first,first+dh(u)*delta/3,last-dh(w)*delta/3,last][i]];});
  if(c.kind==='line'&&h[index[0]]!==h[index[1]]||!same(controls.map(qp),expected.map(qp)))fail('FIELD_GEOMETRY_MISMATCH','/boundary/normal','Analytic border controls must encode the shared field edge, not merely sparse coincident samples.');
  const ends=[a,z].map(v=>qp(transformPoint(v,t,origin))),reverse=pointOrder(ends[0],ends[1])>0,ordered=reverse?[...index].reverse():index;
  return {kind:'shared-field-edge-c1-v1',ends:reverse?ends.reverse():ends,heights:ordered.map(i=>s.heights[i]+origin[2]),values:ordered.map(i=>s.values[i]),paint:ordered.map(i=>s.paint[i])};
}
export function compileInstance(recipe,instance,floors){
  const r=recipe.source,t=effectiveTransform(r,instance),origin=effectiveOrigin(r,instance),binding=slot=>{const floor=floors.get(instance.floorBindings[slot]);if(!floor)fail('MISSING_FLOOR_BINDING','/instances/'+instance.id+'/floorBindings/'+slot,'Bind every used floor slot to a saved world floor ID.');return floor;};
  const ports=r.ports.map(p=>{
    const floor=binding(p.floor.slot),endpoint=qp(transformPoint(p.endpoint,t,origin));if(endpoint[2]!==Math.round((floor.elevationM+p.floor.offsetM)*Q))fail('FLOOR_HEIGHT_MISMATCH','/instances/'+instance.id+'/ports/'+p.id,'World endpoint = origin.h + local.h (or world.h); floor elevation is checked once, never added again.');plane(p.boundary.curve,p.endpoint,p.outward);
    if(!same(direction(p.tangent),direction(derivative(p.boundary.curve,0))))fail('TANGENT_MEANING','/ports/'+p.id+'/tangent','The authored tangent is the forward boundary-parameter derivative at its start.');
    const forward=curveDescriptor(p.boundary.curve,t,origin),backward=curveDescriptor(p.boundary.curve,t,origin,true),endpoints=[0,1].map(u=>qp(transformPoint(evaluate(p.boundary.curve,u),t,origin))),order=pointOrder(endpoints[0],endpoints[1]),reverse=order>0||order===0&&lexical(forward,backward)>0,canonicalCurve=reverse?reverseCurve(p.boundary.curve):p.boundary.curve,sampled=sample(canonicalCurve,p.boundary.sampling,t,origin),positions=sampled.positions,normals=sampled.parameters.map(u=>direction(transformVector(normalAt(p.boundary.normal,evaluate(canonicalCurve,u)),t))),tangents=sampled.tangents,outward=direction(transformVector(p.outward,t));
    const uv=positions.map(point=>{const m=metres(point);return p.uv.axes.map((axis,i)=>dot(axis,m)/p.uv.scaleM[i]+p.uv.phase[i]);}),descriptor=reverse?backward:forward,intervals=reverse?[...p.boundary.materialIntervals].reverse().map(v=>({from:1-v.to,to:1-v.from,material:clone(v.material)})):clone(p.boundary.materialIntervals),normalEvaluator=p.boundary.normal.kind==='constant'?{kind:'constant',vector:direction(transformVector(p.boundary.normal.vector,t))}:fieldEdge(p,t,origin);
    const geometry={descriptor,evaluator:'analytic-line-arc-cubic-v1',normalEvaluator,sampling:clone(p.boundary.sampling),positions,normals,tangents,uv,materialIntervals:intervals},identity={positionPolicy:'metres-q1e6-v1',floorId:floor.id,channel:p.channel,layerId:p.layerId,profiles:p.profiles,widthM:p.widthM,thicknessM:p.thicknessM,geometry};
    return {id:p.id,faceId:p.faceId,instanceId:instance.id,floorId:floor.id,endpoint,outward,tangent:tangents[0],flow:{policy:p.flow.policy,vector:p.flow.vector?direction(transformVector(p.flow.vector,t)):null},widthM:p.widthM,thicknessM:p.thicknessM,channel:p.channel,layerId:p.layerId,policy:p.policy,profiles:clone(p.profiles),uvMapping:clone(p.uv),geometry,worldEdgeId:'tile-edge-v1:'+token(identity),geometryDigest:token(geometry)};
  });
  const reservations=projectReservations(r,instance,floors);
  return {id:instance.id,recipeId:r.id,contentDigest:recipe.contentDigest,frame:r.frame,shape:clone(r.shape),origin:clone(instance.origin),transform:clone(instance.transform),anchors:clone(r.anchors),ports,reservations};
}
export function projectReservations(r,instance,floors){const t=effectiveTransform(r,instance),origin=effectiveOrigin(r,instance);return r.reservations.map(v=>{const floor=floors.get(instance.floorBindings[v.floorSlot]);if(!floor)fail('MISSING_FLOOR_BINDING','/reservations/'+v.id,'Bind each reservation floor slot.');const corners=[];for(const x of [v.min[0],v.max[0]])for(const y of [v.min[1],v.max[1]])for(const h of [v.min[2],v.max[2]])corners.push(qp(transformPoint([x,y,h],t,origin)));const min=[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...corners.map(p=>p[i])));if(min.some((n,i)=>n>=max[i]))fail('COLLAPSED_BOUNDS','/reservations/'+v.id,'Reservation collapsed after transformation.');return {id:v.id,instanceId:instance.id,floorId:floor.id,channel:v.channel,layerId:v.layerId,min,max};});}
export function sharedFieldCorners(r,instance,floors){if(r.shape.kind!=='field-cell')return [];const s=r.shape,port=r.ports[0],reservation=r.reservations[0],slot=reservation?.floorSlot||port?.floor.slot,floor=floors.get(instance.floorBindings[slot]);if(!floor||!slot)fail('MISSING_FLOOR_BINDING','/instances/'+instance.id+'/shape','A placed field needs an explicit floor/channel through a reservation or port.');const t=effectiveTransform(r,instance),origin=effectiveOrigin(r,instance),corners=[[s.bounds[0],s.bounds[1]],[s.bounds[2],s.bounds[1]],[s.bounds[2],s.bounds[3]],[s.bounds[0],s.bounds[3]]];return corners.map((p,i)=>{const world=transformPoint([...p,s.heights[i]],t,origin),profile=port?{surface:port.profiles.surface,edge:port.profiles.edge,border:port.profiles.border}:null;return {key:token({xy:qp(world).slice(0,2),floorId:floor.id,channel:reservation?.channel||port.channel,layerId:reservation?.layerId||port.layerId,profile}),value:{heightM:world[2],field:s.values[i],paint:s.paint[i]},instanceId:instance.id,corner:i};});}
function mismatch(a,b,joinId){
  const details={joinId,a:{instanceId:a.instanceId,portId:a.id},b:{instanceId:b.instanceId,portId:b.id}};
  const bad=(code,message)=>({code,path:'/joins/'+joinId,message,action:'Supply a matching explicit boundary or a transition recipe.',...details});
  if(a.policy==='terminal'||b.policy==='terminal')return bad('TERMINAL_PORT','Terminal ports cannot form interfaces.');
  for(const key of ['floorId','channel','layerId','widthM','thicknessM'])if(a[key]!==b[key])return bad('PORT_'+key.toUpperCase()+'_MISMATCH','Boundary '+key+' disagrees.');
  if(!same(a.endpoint,b.endpoint))return bad('ENDPOINT_MISMATCH','World endpoints disagree.');if(!same(a.outward,b.outward.map(x=>Object.is(-x,-0)?0:-x)))return bad('OPPOSING_FACE_MISMATCH','Outward normals must oppose in the common world frame.');
  if(!same(a.profiles,b.profiles))return bad('PROFILE_MISMATCH','Boundary surface/edge/material/profile versions disagree.');if(!same(a.uvMapping,b.uvMapping))return bad('UV_MAPPING_MISMATCH','Direct boundaries require the same explicit world UV mapping; no periodic equivalence is guessed.');
  if(a.geometryDigest!==b.geometryDigest)return bad('BORDER_GEOMETRY_MISMATCH','Analytic/evaluator identity, fixed schedule or actual canonical samples/normals/UVs disagree.');
  if(a.flow.policy!==b.flow.policy)return bad('FLOW_POLICY_MISMATCH','Declare the same route-flow endpoint policy.');
  if(a.flow.policy!=='none'){const opposite=b.flow.vector.map(x=>Object.is(-x,-0)?0:-x),wanted=a.flow.policy==='opposed'?opposite:b.flow.vector,equal=same(a.flow.vector,wanted)||a.flow.policy==='unoriented'&&same(a.flow.vector,opposite);if(!equal)return bad('FLOW_TANGENT_MISMATCH','Route-flow tangents violate their declared direction policy.');}
  return null;
}
export function matchPorts(a,b,joinId){const diagnostic=mismatch(a,b,joinId);return diagnostic?{ok:false,diagnostics:[diagnostic]}:{ok:true,diagnostics:[],worldEdgeId:a.worldEdgeId};}
export function matchFaces(aPorts,bPorts,joinId){
  const remaining=[...bPorts.filter(p=>p.policy!=='terminal')],pairs=[],diagnostics=[];
  for(const a of aPorts.filter(p=>p.policy!=='terminal')){
    let index=remaining.findIndex(b=>matchPorts(a,b,joinId).ok);if(index>=0){const [b]=remaining.splice(index,1);pairs.push({a:{instanceId:a.instanceId,portId:a.id},b:{instanceId:b.instanceId,portId:b.id},worldEdgeId:a.worldEdgeId,dedupOwner:[a.instanceId,b.instanceId].sort()[0],accepted:true,skirtPolicy:{eligible:true,requiresBothResident:true,otherwise:'retain-exterior-boundary'},geometryCopies:'each-port',supportOwner:'retained-host'});continue;}
    const corresponding=remaining.find(b=>b.channel===a.channel&&b.layerId===a.layerId),near=corresponding||remaining[0];
    if(a.policy==='required'||corresponding||!pairs.length&&near){if(near)diagnostics.push(...matchPorts(a,near,joinId).diagnostics);else diagnostics.push({code:'UNMATCHED_REQUIRED_PORT',path:'/joins/'+joinId,message:'Required layered port has no counterpart.',joinId,instanceId:a.instanceId,portId:a.id});}
  }
  for(const b of remaining)if(b.policy==='required')diagnostics.push({code:'UNMATCHED_REQUIRED_PORT',path:'/joins/'+joinId,message:'Required layered port has no counterpart.',joinId,instanceId:b.instanceId,portId:b.id});
  return {ok:diagnostics.length===0,diagnostics,pairs};
}
