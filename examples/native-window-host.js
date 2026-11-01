// Explicit review host, NOT Farmyard gameplay. Empty actor set; demo button
// supplies a fixture confirmation. Real games bind their own complete queries,
// confirmed outcomes, costs, save validation and atomic persistence.
export function createWindowReviewHost(W,F,placements,{legacyWalls=[],publish=()=>{}}={}){
  const world={id:'native-window-review-world',floorId:'ground',grid:{width:64,height:64}},edges=new Map();
  for(const p of placements){const def=F.farmyardWindowDefinition({id:p.definitionId,...(p.joins?{joins:p.joins}:{}),...(p.dimensions?{dimensions:p.dimensions}:{})}),horizontal=(p.rotation??0)%180===0,along=horizontal?p.x:p.y,across=horizontal?p.y:p.x,start=along-(def.width-1)/2;
    for(let i=0;i<def.width;i++){const edge=horizontal?`s:${start+i}:${across-.5}`:`e:${across-.5}:${start+i}`;edges.set(edge,{edge,semantic:'wall',sourceKind:'concrete',locked:false,underlay:{semantic:'wall',sourceKind:'concrete',locked:false}});}
  }
  const wire={kind:'nautilus-window-placement-document',version:1,id:'native-window-review',profileId:W.WINDOW_GEOMETRY_CONTRACT.profileId,queryRevision:0,placements,bindings:placements.map((p,i)=>({placementId:p.id,engineInstanceId:'window-'+i})),observedBroken:{}};
  const base=W.compileWindowPlacements(wire,{definitions:F.FARMYARD_WINDOW_DEFINITIONS,world,edgeFacts:[...edges.values()]}),state=W.createWindowState(base,{id:'review-pane-state',contentEpoch:'review-epoch-1',broken:{}});
  const source={solo:{version:2},revision:0,seed:17,elapsed:12.5,map:Array.from({length:64},()=>Array(64).fill('yard')),queue:[],log:[],units:[],windows:structuredClone(placements),interactables:[],seen:[],visible:[],detected:[],edges:Object.fromEntries([...edges.keys(),...legacyWalls.map(w=>w.edge)].map(e=>[e,'concrete'])),windowBreaks:{},windowSequence:0,futureRetained:{label:'keep original opaque underlay',fraction:.125}};
  let store=F.createFarmyardWindowHostSave(state,source,{sequenceOrigin:0}),ack=null,approved=null,connection,lastCommand=null,disposed=false;
  const original=F.serializeFarmyardWindowHostSave(store,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),events=[];
  const kernel=()=>{const base=W.openWindowGeometry(store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,store.windowState);return {base,state,geometry:W.windowStateGeometry(state)};};
  const clipped=()=>legacyWalls.map(w=>W.clipWindowLegacyWall(kernel().geometry,w)).filter(Boolean);
  function boxEntry(ray,b){let lo=0,hi=1;for(const [axis,min,max]of [['x',b.x0,b.x1],['y',b.y0,b.y1],['h',b.z0,b.height]]){const d=ray.to[axis]-ray.from[axis];if(Math.abs(d)<1e-7){if(ray.from[axis]<min||ray.from[axis]>max)return null;continue;}const a=(min-ray.from[axis])/d,c=(max-ray.from[axis])/d;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));if(lo>hi)return null;}return lo>1e-7?lo:null;}
  function publishCurrent(receiptId,geometry){
    ack={token:F.farmyardWindowHostToken(store),geometryDigest:geometry.geometryDigest};const {state}=kernel();publish({state,publication:{receiptId,geometry},legacyWalls});
  }
  const services={
    'fixed-window-definitions-v1':{version:1,definitions:F.FARMYARD_WINDOW_DEFINITIONS},
    'complete-window-query-composition-v1':{version:1,context:loan=>F.farmyardWindowSourceToken(loan.source),capture(loan){const g=kernel().geometry;if(g.geometryDigest!==loan.geometry.geometryDigest)throw Error('Review context changed.');const hit=W.queryWindowSegment(g,loan.ray).nearest,opaque=clipped().map(w=>boxEntry(loan.ray,w.bounds)).filter(t=>t!==null).sort((a,b)=>a-b)[0];return {contextToken:F.farmyardWindowSourceToken(loan.source),hit:hit&&(opaque===undefined||hit.tEnter<opaque)?{placementId:hit.placementId,partId:hit.partId,paneId:hit.paneId,definitionDigest:hit.definitionDigest,point:hit.point,tEnter:hit.tEnter}:null};}},
    'confirmed-impact-authority-v1':{version:1,confirm(loan){if(loan.command.id!==approved)return {attestation:false,sourceNext:structuredClone(loan.source)};return {attestation:W.windowImpactAttestation(loan.command),sourceNext:structuredClone(loan.source)};}},
    'atomic-window-context-commit-v1':{version:1,read:()=>store,compareAndSwap(candidate){if(!candidate.canCommit()||candidate.expected.token!==F.farmyardWindowHostToken(store)||candidate.expected.contextToken!==F.farmyardWindowSourceToken(store.source))return false;store=candidate.next;return true;}},
    'window-geometry-invalidation-v1':{version:1,invalidate(value){events.push({type:'invalidate',receiptId:value.receiptId});},publish(value){events.push({type:'publish',receiptId:value.receiptId});publishCurrent(value.receiptId,value.geometry);},present(value){events.push({type:'present',receiptId:value.receiptId});}},
    'complete-window-save-staging-v1':{version:1,validate:loan=>{F.openFarmyardWindowHostSave(loan.save,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});return loan.save.source.futureRetained.fraction===.125;}}
  };
  connection=F.connectFarmyardWindows(services);
  return {
    start(){const g=kernel().geometry;publishCurrent('host-validated-initial-load',W.inspectWindowGeometry(g));},
    isCurrent(scope){return !disposed&&scope.mode==='runtime'&&scope.stateId===store.windowState.id&&scope.contentEpoch===store.windowState.contentEpoch&&scope.geometryDigest===store.windowState.geometryDigest&&scope.contentDigest===store.windowState.contentDigest&&ack?.geometryDigest===scope.geometryDigest&&ack.token===F.farmyardWindowHostToken(store);},
    breakPane(){const g=kernel().geometry,projection=W.inspectWindowGeometry(g),target=projection.members.find(m=>m.kind==='glass');if(!target)return false;const p=placements.find(p=>p.id===target.placementId),r=(p.rotation??0)*Math.PI/180,nx=Math.round(Math.sin(r)),ny=Math.round(Math.cos(r)),centre={x:(target.bounds.x0+target.bounds.x1)/2,y:(target.bounds.y0+target.bounds.y1)/2,h:(target.bounds.z0+target.bounds.height)/2},ray={purpose:'projectile',floorId:'ground',from:{x:centre.x+nx*2,y:centre.y+ny*2,h:centre.h},to:{x:centre.x-nx*2,y:centre.y-ny*2,h:centre.h}},q=connection.query(ray),hit=q.hit;if(!hit)return false;const commandId='review-button-'+store.windowState.revision,packet={version:1,id:W.windowImpactId(commandId,0,0),...q.scope,placementId:hit.placementId,partId:hit.partId,paneId:hit.paneId,definitionDigest:hit.definitionDigest,confirmation:{hostCommandId:commandId,round:0,impactIndex:0,geometryRevision:q.geometryRevision,geometryDigest:q.geometryDigest,hostToken:q.hostToken,queryToken:q.queryToken,cause:'bullet',point:hit.point,direction:-1,ray}};approved=packet.id;try{const result=connection.perform(packet);lastCommand=packet;return result.committed===true;}finally{approved=null;}},
    retry(){const before=events.length;if(lastCommand)connection.perform(lastCommand);return events.length===before;},
    quietRestore(){const saved=connection.save(),before=events.filter(e=>e.type==='present').length;connection.dispose();store=F.openFarmyardWindowHostSave(original,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});connection=F.connectFarmyardWindows(services);const result=connection.restore(saved);return {committed:result.committed,quiet:events.filter(e=>e.type==='present').length===before,savePreserved:connection.save()===saved};},
    inspect(){return {projection:W.inspectWindowGeometry(kernel().geometry),events:structuredClone(events),clippedWalls:clipped(),savedUnderlayIntact:JSON.stringify(store.source.edges)===JSON.stringify(JSON.parse(original).source.edges),saved:connection.save()};},
    dispose(){if(disposed)return;disposed=true;connection.dispose();}
  };
}
