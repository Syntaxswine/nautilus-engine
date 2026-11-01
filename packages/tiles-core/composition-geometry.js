// Exact native placement/ownership, separate from inherited q1e6 boundary views.
import {same} from './curves.js';
import {token,clone} from './data.js';
import {compileInstance} from './interfaces.js';
import {PlanarRefusal} from './planar-exact.js';
import {arrangePlanar} from './planar-arrangement.js';
import {planarTopology} from './planar-topology.js';
import {overlayBudget,preflight} from './composition-model.js';
export const refuse=(code,message,path='/compositions')=>{throw new PlanarRefusal('C2A_'+code,message,path);};
export function exactTools(E,budget){
  const min=(a,b)=>E.cmp(a,b)<=0?a:b,max=(a,b)=>E.cmp(a,b)>=0?a:b;
  const hash=value=>{const size=preflight(value,budget);budget.take('provenance',size*2+1);return token(value);};
  const bounds=points=>({min:[0,1,2].map(k=>points.reduce((v,p)=>min(v,p[k]),points[0][k])),max:[0,1,2].map(k=>points.reduce((v,p)=>max(v,p[k]),points[0][k]))});
  const encodeBounds=b=>({min:b.min.map(E.encode),max:b.max.map(E.encode)});
  const intersection=(a,b)=>({min:a.min.map((v,k)=>max(v,b.min[k])),max:a.max.map((v,k)=>min(v,b.max[k]))});
  const positive=(b,axes=[0,1,2])=>axes.every(k=>E.cmp(b.min[k],b.max[k])<0);
  const area=b=>positive(b,[0,1])?E.mul(E.sub(b.max[0],b.min[0]),E.sub(b.max[1],b.min[1])):E.zero;
  return {min,max,hash,bounds,encodeBounds,intersection,positive,area};
}
export function rectangleOwner(r,v,floors,E,budget){
  const X=exactTools(E,budget),s=r.shape;budget.count('maxOriginalSegments',4);
  if(s.kind!=='region'||Object.hasOwn(s,'clip')||s.outlines.length!==1||s.outlines[0].kind!=='compound'||s.outlines[0].segments.length!==4||s.outlines[0].segments.some(c=>c.kind!=='line')||r.exposure?.length)refuse('RECTANGLE_REQUIRED','This profile evaluates one unclipped original four-line rectangle per owner; other authored grammar stays unresolved.');
  const lines=s.outlines[0].segments,origin=v.origin.map(E.number),t=v.transform;
  function point(p){let [x,y,h]=p.map(E.number);if(t.mirrorX)x=E.neg(x);for(let i=0;i<t.quarterTurns;i++)[x,y]=[E.neg(y),x];return [E.add(x,origin[0]),E.add(y,origin[1]),E.add(h,origin[2])];}
  function vector(p){let [x,y,h]=p.map(E.number);if(t.mirrorX)x=E.neg(x);for(let i=0;i<t.quarterTurns;i++)[x,y]=[E.neg(y),x];return [x,y,h];}
  const equal3=(a,b)=>a.every((n,k)=>E.eq(n,b[k]));
  for(const [i,c]of lines.entries())if(c.a[2]!==s.baseM||c.b[2]!==s.baseM||!equal3(c.b.map(E.number),lines[(i+1)%4].a.map(E.number)))refuse('NATIVE_RECTANGLE_OPEN','Every original endpoint must close exactly at its authored base.');
  const points=lines.map(c=>point(c.a)),b=X.bounds(points),base=E.add(E.number(s.baseM),origin[2]),thickness=E.number(s.thicknessM),top=E.add(base,thickness);
  if(!X.positive(b,[0,1])||new Set(points.map(p=>E.pointKey(p.slice(0,2)))).size!==4||points.some(p=>![0,1].every(k=>E.eq(p[k],b.min[k])||E.eq(p[k],b.max[k])))||lines.some(c=>{const a=point(c.a),z=point(c.b);return E.eq(a[0],z[0])===E.eq(a[1],z[1]);}))refuse('RECTANGLE_REQUIRED','Keep four distinct axis-aligned native corners; no fitted, diagonal or degenerate source.');
  b.min[2]=base;b.max[2]=top;
  const reservations=r.reservations.map(q=>{
    budget.take('source',8);const floorId=v.floorBindings[q.floorSlot];if(!floors.has(floorId))refuse('FLOOR_REQUIRED','Bind every reservation to a declared floor.');
    const corners=[];for(const x of [q.min[0],q.max[0]])for(const y of [q.min[1],q.max[1]])for(const h of [q.min[2],q.max[2]])corners.push(point([x,y,h]));
    return {id:q.id,instanceId:v.id,floorId,channel:q.channel,layerId:q.layerId,...X.bounds(corners)};
  });
  if(r.ports.length!==4||new Set(r.ports.map(p=>p.faceId)).size!==4)refuse('FULL_SIDE_PORTS_REQUIRED','The first rectangle profile requires one complete port per distinct side.');
  const used=new Set(),ports=r.ports.map(p=>{
    const c=p.boundary.curve;if(c.kind!=='line')refuse('STRAIGHT_PORT_REQUIRED','Retain original straight full-side ports.');
    const a=c.a.map(E.number),z=c.b.map(E.number),side=lines.findIndex(l=>equal3(a,l.a.map(E.number))&&equal3(z,l.b.map(E.number))||equal3(a,l.b.map(E.number))&&equal3(z,l.a.map(E.number)));
    if(side<0||used.has(side))refuse('FULL_SIDE_PORTS_REQUIRED','Ports must bijectively describe the original complete rectangle sides.');used.add(side);
    const start=point(c.a),end=point(c.b),axis=E.eq(start[0],end[0])?0:1,along=1-axis,n=vector(p.outward),forward=equal3(a,lines[side].a.map(E.number));
    const wanted=E.eq(start[axis],b.min[axis])?E.neg(E.one):E.one;
    if(!E.eq(n[axis],wanted)||n.some((x,k)=>k!==axis&&E.sign(x)!==0))refuse('OUTWARD_MISMATCH','Native outward must point away from this exact side.');
    const direction=vector(p.tangent),sign=E.sign(E.sub(end[along],start[along]));
    if(!E.eq(direction[along],sign<0?E.neg(E.one):E.one)||direction.some((x,k)=>k!==along&&E.sign(x)!==0))refuse('TANGENT_MISMATCH','Keep the original forward parameter tangent.');
    const endpoint=point(p.endpoint),mid=start.map((x,k)=>E.mul(E.add(x,end[k]),E.half));
    if(!equal3(endpoint,mid)||!E.eq(E.number(p.widthM),E.sub(b.max[along],b.min[along]))||!E.eq(E.number(p.thicknessM),thickness))refuse('PORT_DIMENSION_MISMATCH','Full side width, midpoint and vertical thickness must agree exactly with original source.');
    const floorId=v.floorBindings[p.floor.slot],floor=floors.get(floorId);
    if(!floor||!E.eq(base,E.add(E.number(floor.elevationM),E.number(p.floor.offsetM))))refuse('NATIVE_FLOOR_MISMATCH','Check native origin plus base against the declared floor plus offset exactly, without double height or grid snapping.');
    if(p.flow.policy!=='none'||p.boundary.normal.kind!=='constant'||!same(p.boundary.normal.vector,[0,0,1])||p.boundary.materialIntervals.length!==1)refuse('BOUNDARY_CONTRACT_UNSUPPORTED','First profile has constant upward normals, no route flow and one whole-interval boundary material.');
    const contract={profiles:p.profiles,uv:p.uv,sampling:p.boundary.sampling,normal:p.boundary.normal,materialIntervals:p.boundary.materialIntervals,flow:p.flow};
    return {id:p.id,source:p,side,primitiveId:lines[side].id,forward,start,end,axis,along,outward:n,endpoint,floorId,contract,bindings:[]};
  });
  const first=ports[0];if(ports.some(p=>p.floorId!==first.floorId||p.source.channel!==first.source.channel||p.source.layerId!==first.source.layerId||!same(p.contract,first.contract)))refuse('OWNER_PROFILE_MISMATCH','Every side must retain one compatible full boundary contract/floor/channel/layer in this first profile.');
  const canonicalCost=r.ports.reduce((n,p)=>n+(p.boundary.sampling.segmentsPerPart+1)*16,0)+r.reservations.length*32;budget.take('source',canonicalCost);
  const canonical=compileInstance({source:r,contentDigest:token(r)},v,floors);for(const p of ports)p.canonical=canonical.ports.find(q=>q.id===p.id);
  const geometryIdentity=X.hash({frame:r.frame,shape:r.shape,ports:r.ports,reservations:r.reservations,templates:r.templates,origin:v.origin,transform:v.transform,floorBindings:Object.entries(v.floorBindings).map(([slot,id])=>({slot,...floors.get(id)}))});
  return {id:v.id,source:r,instance:v,point,plane:{baseM:base,thicknessM:thickness},bounds:b,reservations,ports,canonical,geometryIdentity,visible:[]};
}
export function compositionOverlay(group,owners,E,budget){
  const X=exactTools(E,budget),members=group.members.map(m=>owners.get(m.instanceId));budget.peak('maxGroupRectangles',members.length);
  if(!members.length)return {geometry:null,partitions:[],interfaces:[],portBindings:[],nativePartitions:[]};
  const first=members[0],port=first.ports[0];
  for(const owner of members){
    const m=group.members.find(m=>m.instanceId===owner.id),q=owner.reservations.find(r=>r.id===m.primaryReservationId),p=owner.ports[0];
    if(!q||!q.min.every((n,k)=>E.eq(n,owner.bounds.min[k]))||!q.max.every((n,k)=>E.eq(n,owner.bounds.max[k]))||q.floorId!==p.floorId||q.channel!==p.source.channel||q.layerId!==p.source.layerId)refuse('PRIMARY_RESERVATION_MISMATCH','Each named primary reservation must equal this exact rectangle footprint/base/thickness and semantic binding.');
    if(owner.ports.some(p=>p.source.policy!=='open'))refuse('OPEN_PORTS_REQUIRED','Required/terminal ports cannot be hidden or split by the first composition profile.');
    if(!E.eq(owner.plane.baseM,first.plane.baseM)||!E.eq(owner.plane.thicknessM,first.plane.thicknessM)||p.floorId!==port.floorId||p.source.channel!==port.source.channel||p.source.layerId!==port.source.layerId||!same(p.contract,port.contract))refuse('GROUP_PROFILE_MISMATCH','Union members need the same exact plane, thickness, floor, channel/layer and full boundary contract.');
    owner.primaryReservationId=m.primaryReservationId;owner.groupId=group.id;
  }
  let rootId=members[0].id;
  if(members.length>1){
    // At most 32 checked owners: 33 fixed, <=11-character candidates guarantee
    // a free identity. Never grow/truncate a source-dependent ID. Precharge
    // each bounded allocation/lookup to the same whole-operation graph budget.
    rootId=null;
    for(let i=0;i<=owners.size;i++){budget.take('graph',12);const candidate='c2a/root/'+i;if(!owners.has(candidate)){rootId=candidate;break;}}
    if(rootId===null)refuse('INTERNAL_ID_COLLISION','No bounded internal union identity is available.');
  }
  const nodes=members.map(o=>({kind:'leaf',id:o.id,shape:o.source.shape}));if(members.length>1)nodes.push({kind:'union',id:rootId,inputs:members.map(o=>o.id)});
  const internal={version:2,shape:{kind:'shape-graph',id:group.id,nodes,rootId}},placements=new Map(members.map(o=>[o.id,{point:o.point,plane:o.plane}])),child=overlayBudget(budget),arrangement=arrangePlanar(internal,E,child,placements),topology=planarTopology(arrangement,E,child,X.hash);
  const maskIds=mask=>arrangement.leaves.filter(l=>mask&(1<<l.index)).map(l=>l.nodeId),winner=ids=>group.finishOrder.find(id=>ids.includes(id))??null;
  const coordinates=axis=>{const values=new Map();for(const o of members)for(const n of [o.bounds.min[axis],o.bounds.max[axis]])values.set(E.key(n),n);return [...values.values()].sort((a,b)=>{budget.take('sort');return E.cmp(a,b);});};
  const xs=coordinates(0),ys=coordinates(1),partitions=[],nativePartitions=[];
  for(let x=1;x<xs.length;x++)for(let y=1;y<ys.length;y++){
    budget.take('membership');const bounds={min:[xs[x-1],ys[y-1]],max:[xs[x],ys[y]]},m=bounds.min.map((n,k)=>E.mul(E.add(n,bounds.max[k]),E.half)),ids=[];
    for(const leaf of arrangement.leaves)if(E.parity(leaf.segments,m)){budget.count('maxProvenanceLinks');ids.push(leaf.nodeId);}
    if(!ids.length)continue;budget.count('maxPartitions');const finishOwnerId=winner(ids),entry={id:'c2a-partition:'+X.hash({bounds:X.encodeBounds(bounds),ownerIds:ids}),bounds:X.encodeBounds(bounds),ownerIds:ids,finishOwnerId,skinId:owners.get(finishOwnerId).source.interior.skinId,area:E.encode(X.area(bounds))};
    partitions.push(entry);nativePartitions.push({bounds,ownerIds:ids,finishOwnerId});owners.get(finishOwnerId).visible.push(bounds);
  }
  const area=nativePartitions.reduce((n,p)=>E.add(n,X.area(p.bounds)),E.zero);if(!E.eq(area,topology.area))refuse('PARTITION_UNPROVED','The complete owner partition must exactly cover the regularized root area.');
  const interfaces=[],portBindings=[];
  for(const edge of arrangement.atomic){
    const h=arrangement.halfedges.find(h=>h.edge===edge&&h.index%2===0),leftOwners=maskIds(h.left),rightOwners=maskIds(h.right),a=E.encodePoint(edge.a.p),b=E.encodePoint(edge.b.p);
    const coverage=edge.coverage.map(c=>{budget.count('maxProvenanceLinks');return {...c,from:E.encode(c.from),to:E.encode(c.to)};});
    const entry={id:'c2a-interface:'+X.hash({a,b,coverage}),a,b,leftOwners,rightOwners,leftFinishOwnerId:winner(leftOwners),rightFinishOwnerId:winner(rightOwners),coverage};interfaces.push(entry);
    for(const c of edge.coverage){
      const owner=owners.get(c.nodeId),p=owner.ports.find(p=>p.primitiveId===c.primitiveId),forward=c.direction*(p.forward?1:-1)>0,from=p.forward?c.from:E.sub(E.one,c.to),to=p.forward?c.to:E.sub(E.one,c.from),start=forward?edge.a.p:edge.b.p,end=forward?edge.b.p:edge.a.p;
      const left=forward?leftOwners:rightOwners,right=forward?rightOwners:leftOwners,outwardLeft=E.sign(E.cross(E.vector(end,start),p.outward))>0,insideOwners=outwardLeft?right:left,outsideOwners=outwardLeft?left:right;
      if(!insideOwners.includes(owner.id)||outsideOwners.includes(owner.id))refuse('PORT_INCIDENCE_UNPROVED','Original side membership and outward must agree with the exact arrangement.');
      budget.count('maxPortBindings');budget.count('maxProvenanceLinks');
      const source={instanceId:owner.id,recipeId:owner.source.id,shapeId:owner.source.shape.id,outlineId:owner.source.shape.outlines[0].id,primitiveId:c.primitiveId,portId:p.id,portPrimitiveId:p.source.boundary.curve.id,from:E.encode(from),to:E.encode(to)};
      const binding={id:'c2a-port-binding:'+X.hash({ownerId:owner.id,portId:p.id,primitiveId:c.primitiveId,from:source.from,to:source.to,a,b}),source,interfaceId:entry.id,start:E.encodePoint(start),end:E.encodePoint(end),exposure:outsideOwners.length?'internal':'exposed',finishVisible:winner(insideOwners)===owner.id,insideOwners,outsideOwners,insideFinishOwnerId:winner(insideOwners),outsideFinishOwnerId:winner(outsideOwners),spanKey:'c2a-native-span:'+X.hash({a,b,plane:{baseM:E.encode(owner.plane.baseM),thicknessM:E.encode(owner.plane.thicknessM)},floorId:p.floorId,channel:p.source.channel,layerId:p.source.layerId,contract:p.contract,canonicalGeometry:p.canonical.geometry}),renderPlan:null};
      p.bindings.push(binding);portBindings.push(binding);
    }
  }
  // Every source side remains a complete exact partition of [0,1], even when hidden.
  for(const o of members)for(const p of o.ports){let at=E.zero;const list=p.bindings.sort((a,b)=>E.cmp(E.make(BigInt(a.source.from[0]),BigInt(a.source.from[1])),E.make(BigInt(b.source.from[0]),BigInt(b.source.from[1]))));for(const b of list){const f=E.make(BigInt(b.source.from[0]),BigInt(b.source.from[1])),t=E.make(BigInt(b.source.to[0]),BigInt(b.source.to[1]));if(!E.eq(f,at)||E.cmp(t,f)<=0)refuse('PORT_INTERVAL_UNPROVED','Port intervals cannot omit or duplicate source span.');at=t;}if(!E.eq(at,E.one))refuse('PORT_INTERVAL_UNPROVED','Every complete original source port must be retained.');}
  return {geometry:{plane:{baseM:E.encode(first.plane.baseM),thicknessM:E.encode(first.plane.thicknessM)},...topology.encoded,sourceLeafIds:arrangement.leaves.map(l=>l.nodeId),nodeStates:arrangement.nodeStates},partitions,interfaces,portBindings,nativePartitions};
}
