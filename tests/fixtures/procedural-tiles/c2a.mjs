import {region,put,clone} from './catalogue.mjs';
export {clone};
export function setup(T,specs,options={}){
  const recipes=new Map();for(const s of specs)if(!recipes.has(s.recipeId??s.id)){const r=region(s.recipeId??s.id,s.w??2,s.d??2);if(s.skin)r.interior.skinId=s.skin;if(s.extra)r.reservations.push(...clone(s.extra));recipes.set(r.id,r);}
  if(!recipes.size)recipes.set('unused.original',region('unused.original'));
  const h=T.createTileCatalogue([...recipes.values()]),instances=specs.map(s=>({...put(T,s.id,recipes.get(s.recipeId??s.id),[s.x??0,s.y??0,s.z??0],{locked:s.locked??false,transform:s.transform??{quarterTurns:0,mirrorX:false},floorBindings:{base:s.floorId??'ground'}}),recipeVersion:1}));
  const layout={kind:'nautilus-tile-layout',version:2,id:'c2a-yard',revision:0,floors:options.floors??[{id:'ground',elevationM:0},{id:'upper',elevationM:3}],catalogueDigest:h.digest,instances,joins:clone(options.joins??[]),relations:clone(options.relations??[]),selection:{seed:7,policyVersion:1},annotations:{label:'Retained rectangle owners',description:''},compositions:[{kind:'planar-composition',version:1,id:'surface',operation:'union',profile:T.TILE_COMPOSITION_PROFILE,members:specs.filter(s=>s.group!==false).map(s=>({instanceId:s.id,primaryReservationId:'body'})),finishOrder:options.finishOrder??specs.filter(s=>s.group!==false).map(s=>s.id)}]};
  return T.tileBundle(layout,h);
}
export function refresh(T,bundle){const h=T.createTileCatalogue(bundle.recipes);bundle.layout.catalogueDigest=h.digest;for(const v of bundle.layout.instances){const r=bundle.recipes.find(r=>r.id===v.recipeId);v.recipeVersion=r.version;v.contentDigest=T.compileTileRecipe(r).contentDigest;}return T.tileBundle(bundle.layout,h);}
export function request(T,bundle,next,overrides={}){
  const changed=new Set([...bundle.layout.instances.map(v=>v.id),...next.layout.instances.map(v=>v.id)]),changedIds=[...changed].filter(id=>{const a=bundle.layout.instances.find(v=>v.id===id),b=next.layout.instances.find(v=>v.id===id);return JSON.stringify(a)!==JSON.stringify(b)||a&&b&&JSON.stringify(bundle.recipes.find(r=>r.id===a.recipeId))!==JSON.stringify(next.recipes.find(r=>r.id===b.recipeId));}).sort();
  return {kind:'planar-composition-edit',version:2,profile:T.TILE_COMPOSITION_PROFILE,id:'request.1',expected:{revision:bundle.layout.revision,layoutDigest:T.tileLayoutToken(bundle.layout),catalogueDigest:bundle.layout.catalogueDigest,contextToken:'a'.repeat(64)},editedOwnerIds:changedIds,finishCopies:[],nextBundle:next,limits:{...T.TILE_COMPOSITION_LIMITS},...overrides};
}
export function finish(T,bundle,ownerId,skinId,id='finish.1'){
  const next=clone(bundle),v=next.layout.instances.find(v=>v.id===ownerId),old=next.recipes.find(r=>r.id===v.recipeId),r=clone(old);r.id=T.tileCompositionFinishRecipeId(id,T.tileLayoutToken(bundle.layout),ownerId);r.interior.skinId=skinId;next.recipes.push(r);v.recipeId=r.id;next.layout.revision++;
  return request(T,bundle,refresh(T,next),{id,finishCopies:[{instanceId:ownerId,fromRecipeId:old.id,toRecipeId:r.id}]});
}
export function oracleCases(T){
  const cases=[],add=(name,specs,options={})=>cases.push({name,bundle:setup(T,specs,options)});
  add('empty explicit composition',[]);
  add('adjacent 8x4 across sector',[{id:'a',w:8,d:4,x:20},{id:'b',w:8,d:4,x:28}]);
  add('overlap union 48',[{id:'a',w:8,d:4},{id:'b',w:8,d:4,x:4}]);
  add('L',[{id:'a',w:4,d:1},{id:'b',w:1,d:4}]);
  add('H',[{id:'a',w:1,d:4},{id:'b',w:1,d:4,x:3},{id:'c',w:4,d:1,y:1.5}]);
  add('triple priority',[{id:'z',w:4,d:4,skin:'skin.z'},{id:'a',w:4,d:4,x:1,skin:'skin.a'},{id:'m',w:2,d:5,x:2,y:-.5,skin:'skin.m'}],{finishOrder:['m','z','a']});
  add('contained original owner',[{id:'outer',w:6,d:6},{id:'inner',x:2,y:2}],{finishOrder:['inner','outer']});
  add('point contact',[{id:'a'},{id:'b',x:2,y:2}]);
  add('partial coincident T',[{id:'a',w:2,d:4},{id:'b',x:2,y:1}]);
  add('native sub-grid gap',[{id:'a'},{id:'b',x:2.00000001}]);
  add('native sub-grid overlap',[{id:'a'},{id:'b',x:1.99999999}]);
  add('shared recipe owners',[{id:'a',recipeId:'shared'},{id:'b',recipeId:'shared',x:1}]);
  const ring=[{id:'west',w:1,d:1},{id:'north',w:1,d:1,x:1,y:1},{id:'east',w:1,d:1,x:2},{id:'south',w:1,d:1,x:1,y:-1}];
  add('four point-contact void neighbours',ring);add('void with inner island',[...ring,{id:'island',w:.5,d:.5,x:1.25,y:.25}]);
  add('16 rectangle ceiling',Array.from({length:16},(_,i)=>({id:'owner.'+i,w:1,d:1,x:(i%4)*2,y:Math.floor(i/4)*2})));
  for(let i=0;i<8;i++)add('independent D4 '+i,[{id:'a',w:4,d:3,x:100000,y:.0000003,transform:{quarterTurns:i%4,mirrorX:i>=4}},{id:'b',w:4,d:3,x:100002,y:1.0000003}]);
  for(let i=0;i<8;i++)add('source order '+i,[{id:'z',w:4,d:3},{id:'a',w:4,d:3,x:2,y:1},{id:'m',w:1,d:5,x:3,y:-1}].slice().sort((a,b)=>i&1?a.id.localeCompare(b.id):b.id.localeCompare(a.id)),{finishOrder:i&2?['a','m','z']:['z','a','m']});
  const native=setup(T,[{id:'native.region'}]),r=native.recipes[0];r.version=2;r.exposure=[];r.anchors=[{id:r.shape.id,kind:'shape',sourceId:r.shape.id,parentId:null,controlIndex:null}];cases.push({name:'original v2 region controls',bundle:refresh(T,native)});
  add('hostile root suffix owner IDs',Array.from({length:18},(_,i)=>({id:'c2a/root'+'.root'.repeat(i),recipeId:'shared',x:i*4,group:i<2})));
  add('bounded internal root namespace collisions',Array.from({length:32},(_,i)=>({id:'c2a/root/'+i,recipeId:'shared',x:i*4,group:i<2})));
  let seed=0x2a531;const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let i=0;i<32;i++)add('saved seed '+i,Array.from({length:3+next(4)},(_,j)=>({id:'r.'+j,x:(next(17)-8)/2,y:(next(17)-8)/2,w:(next(8)+1)/2,d:(next(8)+1)/2})),{});
  return cases;
}

export function oracleArtifacts(T){
  const cases=oracleCases(T).map(c=>({name:c.name,bundle:c.bundle,result:T.openTileBundle(c.bundle,{requireResolved:true}).compiled}));
  for(const [name,specs,owner]of [['prepared locked shared neighbour',[{id:'a',recipeId:'shared'},{id:'b',recipeId:'shared',x:2,locked:true}],'a'],['prepared covered finish owner',[{id:'a'},{id:'b',x:1}],'b']]){const b=setup(T,specs),result=T.prepareTileRepair(b,finish(T,b,owner,'skin.prepared'),{contextToken:'a'.repeat(64)});if(!result.ok)throw Error(JSON.stringify(result.diagnostics));cases.push({name,bundle:result.next.bundle,result:result.next.compiled});}
  return cases;
}

export function externalReservationWitnesses(T){
  const cases=[];
  const alter=(bundle,mode)=>{const b=clone(bundle),r=b.recipes.find(r=>r.id==='b');if(mode==='absent')r.reservations=[];else{r.reservations[0].min=[10,10,0];r.reservations[0].max=[12,12,.1];}return refresh(T,b);};
  for(const mode of ['absent','displaced'])for(const locked of [false,true]){
    const name=mode+' external reservation / '+(locked?'locked':'unlocked');
    cases.push({kind:'admission',name:name+' overlap admission',bundle:alter(setup(T,[{id:'a',locked},{id:'b',x:1,group:false}]),mode)});
    for(const x of [2,3,4]){const bundle=alter(setup(T,[{id:'a',locked},{id:'b',x,group:false}]),mode),next=clone(bundle);next.layout.revision++;next.layout.instances.find(v=>v.id==='b').origin=[1,0,0];cases.push({kind:'prepare',name:name+' movement from '+x,bundle,request:request(T,bundle,next),context:{contextToken:'a'.repeat(64)}});}
  }
  return cases;
}
export function externalContactArtifacts(T){
  return externalReservationWitnesses(T).map(c=>{
    const before=JSON.stringify(c),result=c.kind==='prepare'?T.prepareTileRepair(c.bundle,c.request,c.context):null;let inspection=null,requireResolvedRejected=null;
    if(c.kind==='admission'){const r=T.openTileBundle(c.bundle);inspection={ok:r.ok,compiled:r.compiled,diagnostics:r.diagnostics};try{T.openTileBundle(c.bundle,{requireResolved:true});requireResolvedRejected=false;}catch(error){if(!Array.isArray(error.diagnostics))throw error;requireResolvedRejected=true;}}
    return {...c,result,inspection,requireResolvedRejected,sourcePreserved:JSON.stringify(c)===before};
  });
}
