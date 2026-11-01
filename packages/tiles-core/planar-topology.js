import {PlanarRefusal} from './planar-exact.js';

// The two sided walks are intentional. A tangent hole may be folded into one
// occupied weak walk, while its empty-side walk still bounds a distinct void.
export function planarTopology(arrangement,E,budget,hash){
  const {halfedges,vertices}=arrangement,fail=message=>{throw new PlanarRefusal('C1_INCIDENCE_UNPROVED',message);};
  const strings=(a,b)=>{budget.take('sort',1+a.length+b.length);return a<b?-1:a>b?1:0;};
  function rotation(list){
    const n=list.length;if(n<2)return list;let i=0,j=1,k=0;
    while(i<n&&j<n&&k<n){const c=strings(list[(i+k)%n],list[(j+k)%n]);if(c===0){k++;continue;}if(c>0){i+=k+1;if(i===j)i++;}else{j+=k+1;if(i===j)j++;}k=0;}const at=Math.min(i,j);return [...list.slice(at),...list.slice(0,at)];
  }
  const quadrant=v=>E.sign(v[1])>0||E.sign(v[1])===0&&E.sign(v[0])>=0?0:1;
  for(const vertex of vertices.values()){
    vertex.out.sort((a,b)=>{budget.take('sort');const x=E.vector(a.to.p,a.from.p),y=E.vector(b.to.p,b.from.p);return quadrant(x)-quadrant(y)||-E.sign(E.cross(x,y));});
    for(let i=0;i<vertex.out.length;i++){
      budget.take('topology');const a=vertex.out[i],b=vertex.out[(i+1)%vertex.out.length],x=E.vector(a.to.p,a.from.p),y=E.vector(b.to.p,b.from.p);a.angleIndex=i;
      if(vertex.out.length>1&&quadrant(x)===quadrant(y)&&E.sign(E.cross(x,y))===0)fail('Coincident outgoing rays were not fully split/consolidated.');
      if(a.left!==b.right||a.insideLeft!==b.insideRight)fail('Exact neighboring open-sector classifications disagree.');
    }
  }
  const selected=halfedges.filter(h=>h.insideLeft&&!h.insideRight);budget.count('maxBoundarySegments',selected.length);
  function walkSide(occupied){
    const list=occupied?selected:selected.map(h=>halfedges[h.twin]),chosen=new Set(list.map(h=>h.index)),next=new Map(),incoming=new Map();
    for(const h of list){
      const rays=h.to.out,start=halfedges[h.twin].angleIndex;let found=null;
      for(let step=1;step<=rays.length;step++){budget.take('topology');const candidate=rays[(start-step+rays.length)%rays.length];if(chosen.has(candidate.index)){found=candidate;break;}if(candidate.insideLeft!==occupied||candidate.insideRight!==occupied)fail('A boundary walk would cross an opposite occupied sector.');}
      if(!found)fail('A boundary sector has no successor.');next.set(h.index,found);incoming.set(found.index,(incoming.get(found.index)||0)+1);
    }
    if(list.some(h=>incoming.get(h.index)!==1))fail('Sector successors are not a permutation of the boundary halfedges.');
    const visited=new Set(),walks=[];
    for(const first of list){
      if(visited.has(first.index))continue;budget.count('maxContours');const edges=[];let h=first;
      while(!visited.has(h.index)){budget.take('topology');visited.add(h.index);edges.push(h);h=next.get(h.index);}
      if(h.index!==first.index)fail('A contour entered a different previously visited cycle.');
      const area=E.area(edges.map(h=>({a:h.from.p,b:h.to.p})));if(E.sign(area)===0)fail('A retained two-sided boundary has a zero-area contour.');
      const pointKeys=edges.map(h=>h.from.key),weak=new Set(pointKeys).size!==pointKeys.length;
      // Geometric identity removes only redundant forward collinear vertices.
      // Emitted spans, source events and incidence retain all of them.
      const turns=edges.filter((h,i)=>{budget.take('topology');const previous=edges[(i+edges.length-1)%edges.length],a=E.vector(h.from.p,previous.from.p),b=E.vector(h.to.p,h.from.p),axis=E.sign(a[0])?0:1;return E.sign(E.cross(a,b))!==0||E.sign(a[axis])!==E.sign(b[axis]);}).map(h=>h.from.key);
      if(turns.length<3)fail('A contour lacks a nondegenerate turn cycle.');
      walks.push({edges,area,weak,occupied,geometryKey:rotation(turns)});
    }
    return walks;
  }
  const filled=walkSide(true),empty=walkSide(false),walks=[...filled,...empty],boundaryByIndex=new Map(),edgeRecords=[];
  for(const h of selected){
    const coverage=h.edge.coverage.map(c=>{budget.take('provenance');return {nodeId:c.nodeId,shapeId:c.shapeId,outlineId:c.outlineId,primitiveId:c.primitiveId,from:E.encode(c.from),to:E.encode(c.to),direction:c.direction*(h.index%2===0?1:-1)};}).sort((a,b)=>strings(JSON.stringify(a),JSON.stringify(b))),record={from:h.from.key,to:h.to.key,coverage,leftMembership:h.left,rightMembership:h.right};
    record.id='c1-edge:'+hash(record);edgeRecords.push(record);boundaryByIndex.set(h.index,{id:record.id,direction:1});boundaryByIndex.set(h.twin,{id:record.id,direction:-1});
  }
  for(const w of walks){const refs=w.edges.map(h=>boundaryByIndex.get(h.index));w.refs=rotation(refs.map(r=>r.id+':'+r.direction));w.id='c1-contour:'+hash({side:w.occupied?'occupied':'empty',spans:w.refs});}
  const outer=filled.filter(w=>E.sign(w.area)>0),voids=empty.filter(w=>E.sign(w.area)>0);
  function parent(list,witness){
    let best=null;for(const w of list){budget.take('topology');if(E.parity(w.edges.map(h=>({a:h.from.p,b:h.to.p})),witness.m,witness.n)&&(!best||E.cmp(w.area,best.area)<0))best=w;}return best;
  }
  const witness=(h,left=true)=>E.witness(h.from.p,h.to.p,left),components=outer.map(w=>({id:w.id,outerWalk:w.id,holeWalks:[]})),voidRecords=voids.map(w=>({id:w.id,outerWalk:w.id,holeWalks:[],surroundingComponents:[]})),componentMap=new Map(components.map(c=>[c.id,c])),voidMap=new Map(voidRecords.map(c=>[c.id,c])),unboundedWalks=[],walkOwners=new Map(),occupiedOwners=new Map();
  for(const w of outer){budget.take('topology');walkOwners.set(w.id,w.id);}
  for(const w of filled.filter(w=>E.sign(w.area)<0)){const p=parent(outer,witness(w.edges[0]));if(!p)fail('An occupied hole cycle has no occupied outer component.');componentMap.get(p.id).holeWalks.push(w.id);budget.take('topology');walkOwners.set(w.id,p.id);}
  for(const w of empty.filter(w=>E.sign(w.area)<0)){const p=parent(voids,witness(w.edges[0]));if(p)voidMap.get(p.id).holeWalks.push(w.id);else unboundedWalks.push(w.id);}
  // A walk's LEFT face is connected through its exact sectors. Prove each
  // occupied span agrees with that component, then reuse its checked owner.
  for(const w of filled)for(const h of w.edges){budget.take('topology',2);const owner=walkOwners.get(w.id),p=parent(outer,witness(h));if(!owner||!p||p.id!==owner||!h.insideLeft||h.insideRight||occupiedOwners.has(h.index))fail('An occupied walk/span component association is unproved.');occupiedOwners.set(h.index,owner);}
  if(occupiedOwners.size!==selected.length)fail('Some occupied boundary spans have no checked component.');
  // The RIGHT face need not stay in one occupied component: point-touching
  // pieces may collectively border one void. Include ALL outer-walk spans;
  // inner island hole walks are intentionally separate from this relation.
  for(const w of voids){const owners=new Set();for(const h of w.edges){budget.take('topology',2);const owner=occupiedOwners.get(h.twin);if(h.insideLeft||!h.insideRight||!owner||!componentMap.has(owner))fail('A void outer span has no checked adjacent occupied component.');if(!owners.has(owner)){budget.count('maxProvenanceLinks');budget.take('topology');owners.add(owner);}}if(!owners.size)fail('A bounded void has no proved outer-boundary adjacency.');budget.take('topology',owners.size);voidMap.get(w.id).surroundingComponents=[...owners].sort(strings);}
  const usedVertices=new Map();for(const h of selected){usedVertices.set(h.from.key,h.from);usedVertices.set(h.to.key,h.to);}
  const incidence=[];
  for(const vertex of usedVertices.values()){
    const rays=vertex.out.filter(h=>h.insideLeft!==h.insideRight),sectors=[];
    for(let i=0;i<rays.length;i++){
      const h=rays[i],next=rays[(i+1)%rays.length];if(h.insideLeft!==next.insideRight)fail('Reduced boundary-sector labels disagree.');budget.take('topology',2);const owner=h.insideLeft?occupiedOwners.get(h.index):parent(voids,witness(h))?.id??null;if(h.insideLeft&&(!owner||occupiedOwners.get(next.twin)!==owner))fail('An occupied sector disagrees with its checked boundary-span components.');sectors.push({from:boundaryByIndex.get(h.index),to:boundaryByIndex.get(next.index),occupied:h.insideLeft,regionId:owner});
    }
    incidence.push({vertex:vertex.key,rays:rays.map(h=>boundaryByIndex.get(h.index)),sectors,touching:rays.length>2});
  }
  const area=E.area(selected.map(h=>({a:h.from.p,b:h.to.p})));if(selected.length&&(E.sign(area)<=0||!components.length))fail('A nonempty bounded footprint lacks positive area/components.');
  const sortId=(a,b)=>strings(a.id,b.id);for(const list of [components,voidRecords]){for(const r of list)r.holeWalks.sort(strings);list.sort(sortId);}unboundedWalks.sort(strings);edgeRecords.sort(sortId);incidence.sort((a,b)=>strings(a.vertex,b.vertex));
  const encodedVertices=[...usedVertices.values()].sort((a,b)=>{budget.take('sort');return E.pointCmp(a.p,b.p);}).map(v=>({id:v.key,point:E.encodePoint(v.p)})),contours=walks.map(w=>({id:w.id,side:w.occupied?'occupied':'empty',orientation:E.sign(w.area)>0?'ccw':'cw',area:E.encode(w.area),weak:w.weak,spans:w.refs.map(key=>{const at=key.lastIndexOf(':');return {id:key.slice(0,at),direction:Number(key.slice(at+1))};})})).sort(sortId);
  const geometricCycles=filled.map(w=>w.geometryKey).sort((a,b)=>strings(JSON.stringify(a),JSON.stringify(b)));
  return {encoded:{vertices:encodedVertices,edges:edgeRecords,contours,components,voids:voidRecords,unboundedWalks,incidence,area:E.encode(area)},selected,usedVertices,geometricCycles,area};
}
