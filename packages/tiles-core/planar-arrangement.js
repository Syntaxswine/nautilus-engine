import {PlanarRefusal} from './planar-exact.js';

export function arrangePlanar(recipe,E,budget,placements=null){
  if(recipe.version!==2||recipe.shape.kind!=='shape-graph')throw new PlanarRefusal('C1_SHAPE_UNSUPPORTED','C1 evaluates only a candidate shape-graph root.');
  const graph=recipe.shape,nodes=new Map(graph.nodes.map((n,i)=>[n.id,{...n,sourceIndex:i}])),references=n=>n.kind==='leaf'?[]:n.kind==='difference'?[n.baseId,n.subtractId]:n.inputs,depths=new Map();budget.count('maxGraphNodes',nodes.size);
  function depth(id){if(depths.has(id))return depths.get(id);const n=nodes.get(id),refs=references(n);budget.take('graph',1+refs.length);budget.peak('maxOperands',refs.length);const d=1+Math.max(0,...refs.map(depth));budget.peak('maxDepth',d);depths.set(id,d);return d;}for(const id of nodes.keys())depth(id);
  const seen=new Set(),order=[];function visit(id){if(seen.has(id))return;seen.add(id);for(const key of references(nodes.get(id))){budget.take('graph');visit(key);}order.push(nodes.get(id));}visit(graph.rootId);
  const leaves=[],segments=[],vertices=new Map(),edges=new Map();let plane=null;
  function vertex(p){const key=E.pointKey(p);if(!vertices.has(key)){budget.count('maxVertices');vertices.set(key,{key,p,out:[]});}return vertices.get(key);}
  function event(s,t,p){budget.take('split');s.events.set(E.key(t),{t,v:vertex(p)});}
  for(const node of order.filter(n=>n.kind==='leaf').sort((a,b)=>{budget.take('sort');return a.id<b.id?-1:a.id>b.id?1:0;})){
    budget.count('maxLeaves');const s=node.shape,path='/shape/nodes/'+node.sourceIndex+'/shape';
    if(s.kind!=='region'||Object.hasOwn(s,'clip'))throw new PlanarRefusal('C1_LEAF_UNSUPPORTED','Use an unclipped level region with original straight line controls; other native source remains unresolved.',path);
    const placement=placements?.get(node.id),nativePlane=placement?.plane??{baseM:s.baseM,thicknessM:s.thicknessM};
    if(plane&&(placement?(!E.eq(nativePlane.baseM,plane.baseM)||!E.eq(nativePlane.thicknessM,plane.thicknessM)):(s.baseM!==plane.baseM||s.thicknessM!==plane.thicknessM)))throw new PlanarRefusal('C1_PLANE_MISMATCH','Every reachable leaf must retain the exact same base and thickness.',path);plane??=nativePlane;
    budget.peak('maxRingsPerLeaf',s.outlines.length);const leaf={nodeId:node.id,index:leaves.length,shapeId:s.id,segments:[]};leaves.push(leaf);
    for(const [ring,outline]of s.outlines.entries()){
      const ps=outline.kind==='compound'?outline.segments:[outline],cycle=[];
      for(const [part,c]of ps.entries()){
        budget.take('source');if(c.kind!=='line')throw new PlanarRefusal('C1_CURVE_UNSUPPORTED','Arcs/cubics are retained source, not flattened into C1 lines.',path+'/outlines/'+ring);
        if(c.a[2]!==s.baseM||c.b[2]!==s.baseM)throw new PlanarRefusal('C1_LEVEL_REQUIRED','Every original endpoint must have the common native base height.',path+'/outlines/'+ring);
        budget.count('maxSegments');const a=placement?placement.point(c.a).slice(0,2):c.a.slice(0,2).map(E.number),b=placement?placement.point(c.b).slice(0,2):c.b.slice(0,2).map(E.number),record={index:segments.length,a,b,part,ring,ringSize:ps.length,leaf:leaf.index,nodeId:node.id,shapeId:s.id,outlineId:outline.id,primitiveId:c.id,events:new Map()};
        if(E.pointEq(a,b))throw new PlanarRefusal('C1_ZERO_EDGE','A native line must have positive planar extent.',path);segments.push(record);leaf.segments.push(record);cycle.push(record);event(record,E.zero,a);event(record,E.one,b);
      }
      if(cycle.some((s,i)=>!E.pointEq(s.b,cycle[(i+1)%cycle.length].a)))throw new PlanarRefusal('C1_NATIVE_RING_OPEN','Original endpoints must meet exactly; canonical-grid coincidence cannot close a native gap.',path+'/outlines/'+ring);
      if(E.sign(E.area(cycle))===0)throw new PlanarRefusal('C1_ZERO_AREA_RING','C1 leaves require nonzero-area simple native rings.',path+'/outlines/'+ring);
    }
  }
  function intersection(a,b){
    const r=E.vector(a.b,a.a),s=E.vector(b.b,b.a),q=E.vector(b.a,a.a),den=E.cross(r,s),inUnit=t=>E.cmp(t,E.zero)>=0&&E.cmp(t,E.one)<=0;
    if(E.sign(den)!==0){const t=E.div(E.cross(q,s),den),u=E.div(E.cross(q,r),den);return inUnit(t)&&inUnit(u)?{kind:'point',items:[{t,u,p:E.plus(a.a,E.scale(r,t))}]}:null;}
    if(E.sign(E.cross(q,r))!==0)return null;
    const axis=E.sign(r[0])?0:1,other=E.sign(s[0])?0:1,t0=E.div(E.sub(b.a[axis],a.a[axis]),r[axis]),t1=E.div(E.sub(b.b[axis],a.a[axis]),r[axis]),min=E.cmp(t0,t1)<=0?t0:t1,max=E.cmp(t0,t1)<=0?t1:t0,lo=E.cmp(min,E.zero)<0?E.zero:min,hi=E.cmp(max,E.one)>0?E.one:max;
    if(E.cmp(lo,hi)>0)return null;const at=t=>{const p=E.plus(a.a,E.scale(r,t));return {t,p,u:E.div(E.sub(p[other],b.a[other]),s[other])};};return E.eq(lo,hi)?{kind:'point',items:[at(lo)]}:{kind:'overlap',items:[at(lo),at(hi)]};
  }
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    budget.count('maxPairTests');budget.take('pairs');const a=segments[i],b=segments[j],hit=intersection(a,b);if(!hit)continue;
    if(a.leaf===b.leaf){const adjacent=a.ring===b.ring&&(b.part-a.part===1||b.part-a.part===a.ringSize-1),expected=b.part-a.part===1?a.b:a.a;if(!adjacent||hit.kind!=='point'||!E.pointEq(hit.items[0].p,expected))throw new PlanarRefusal(a.ring===b.ring?'C1_RING_NOT_SIMPLE':'C1_RINGS_TOUCH_OR_CROSS','Leaf rings must be simple, pairwise disjoint or strictly nested. Inter-leaf Boolean contacts remain supported.');}
    for(const {t,u,p}of hit.items){event(a,t,p);event(b,u,p);}
  }
  for(const s of segments){
    const list=[...s.events.values()].sort((a,b)=>{budget.take('sort');return E.cmp(a.t,b.t);});
    for(let i=1;i<list.length;i++){
      budget.take('split');const from=list[i-1],to=list[i],forward=E.pointCmp(from.v.p,to.v.p)<0,a=forward?from.v:to.v,b=forward?to.v:from.v,key=a.key+'|'+b.key;
      if(!edges.has(key)){budget.count('maxAtomicEdges');budget.count('maxHalfEdges',2);edges.set(key,{key,a,b,coverage:[]});}
      budget.count('maxProvenanceLinks');edges.get(key).coverage.push({nodeId:s.nodeId,shapeId:s.shapeId,outlineId:s.outlineId,primitiveId:s.primitiveId,from:from.t,to:to.t,direction:forward?1:-1});
    }
  }
  function mask(w){let value=0;for(const leaf of leaves)if(E.parity(leaf.segments,w.m,w.n))value|=1<<leaf.index;return value;}
  function decide(left,right){const states=new Map();for(const node of order){budget.take('graph');if(node.kind==='leaf'){const i=leaves.findIndex(l=>l.nodeId===node.id);budget.take('graph',leaves.length);states.set(node.id,[!!(left&(1<<i)),!!(right&(1<<i))]);}else{const refs=references(node);budget.take('graph',refs.length*2);const values=refs.map(id=>states.get(id));states.set(node.id,[0,1].map(k=>node.kind==='union'?values.some(v=>v[k]):node.kind==='intersection'?values.every(v=>v[k]):values[0][k]&&!values[1][k]));}}return states.get(graph.rootId);}
  const atomic=[...edges.values()].sort((a,b)=>{budget.take('sort');return E.pointCmp(a.a.p,b.a.p)||E.pointCmp(a.b.p,b.b.p);}),halfedges=[];
  for(const edge of atomic){
    const left=mask(E.witness(edge.a.p,edge.b.p)),right=mask(E.witness(edge.a.p,edge.b.p,false)),[insideLeft,insideRight]=decide(left,right),i=halfedges.length;
    const a={edge,from:edge.a,to:edge.b,index:i,twin:i+1,left,right,insideLeft,insideRight},b={edge,from:edge.b,to:edge.a,index:i+1,twin:i,left:right,right:left,insideLeft:insideRight,insideRight:insideLeft};halfedges.push(a,b);edge.a.out.push(a);edge.b.out.push(b);
  }
  return {plane,leaves,segments,vertices,atomic,halfedges,nodeStates:graph.nodes.map(n=>({nodeId:n.id,state:seen.has(n.id)?'evaluated':'unrequested-unresolved'}))};
}
