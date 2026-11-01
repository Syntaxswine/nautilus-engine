// One finite complete-candidate operation; persistence/history remain host-owned.
import {data,fields,id,digest,integer,array,unique,clone,token,freeze} from './data.js';
import {same} from './curves.js';
import {authoredTileBundle} from './v2-records.js';
import {arithmetic} from './planar-exact.js';
import {compositionBudget,TILE_COMPOSITION_PROFILE,chargeSource,preflight} from './composition-model.js';
import {resolveComposition,compositionFailure} from './composition-layout.js';
import {exactTools,refuse} from './composition-geometry.js';
const sorted=values=>[...values].sort();
export const tileCompositionFinishRecipeId=(requestId,layoutDigest,ownerId)=>{id(requestId,'/request/id');digest(layoutDigest,'/expected/layoutDigest');id(ownerId,'/ownerId');return 'c2a.finish.'+token([requestId,layoutDigest,ownerId]);};
export function prepareComposition(bundleInput,requestInput,contextInput){
  let budget;
  try{
    const context=data(contextInput);fields(context,['contextToken','cancelled'],'/context',['contextToken']);digest(context.contextToken,'/context/contextToken');if(context.cancelled!==undefined&&typeof context.cancelled!=='boolean')refuse('INVALID_CANCELLATION','Capture cancellation as a boolean.');if(context.cancelled)refuse('CANCELLED','Keep accepted state and history.');
    const request=data(requestInput);fields(request,['kind','version','profile','id','expected','editedOwnerIds','finishCopies','nextBundle','limits'],'/request');
    if(request.kind!=='planar-composition-edit'||request.version!==2||request.profile!==TILE_COMPOSITION_PROFILE)refuse('EDIT_PROFILE_REQUIRED','Use an explicit private C2a complete-candidate request.');id(request.id,'/request/id');
    const capture=compositionBudget({profile:request.profile,limits:request.limits});budget=capture.budget;const E=arithmetic(budget),shared={...capture,E},X=exactTools(E,budget);chargeSource({bundle:bundleInput,request,context},budget);
    fields(request.expected,['revision','layoutDigest','catalogueDigest','contextToken'],'/expected');integer(request.expected.revision,'/expected/revision',0,Number.MAX_SAFE_INTEGER);for(const k of ['layoutDigest','catalogueDigest','contextToken'])digest(request.expected[k],'/expected/'+k);
    const accepted=authoredTileBundle(bundleInput,budget),old=accepted.bundle,source=old.layout;
    if(source.version!==2||source.compositions?.length!==1)refuse('PROFILE_REQUIRED','Group-free A/B intent remains unresolved and cannot be silently upgraded by preparation.');
    if(request.expected.revision!==source.revision||request.expected.layoutDigest!==token(source)||request.expected.catalogueDigest!==source.catalogueDigest)refuse('STALE_LAYOUT','The complete accepted layout/catalogue changed.');if(request.expected.contextToken!==context.contextToken)refuse('STALE_CONTEXT','The retained host context changed.');
    const candidate=authoredTileBundle(request.nextBundle,budget),next=candidate.bundle,target=next.layout;
    if(target.version!==2||target.id!==source.id||source.revision===Number.MAX_SAFE_INTEGER||target.revision!==source.revision+1)refuse('REVISION_CONFLICT','Keep the layout identity and advance one safe revision.');
    for(const f of source.floors)if(!target.floors.some(n=>same(n,f)))refuse('FLOOR_REWRITE_UNSUPPORTED','Existing declared floor IDs/elevations are retained; new floors require explicit saved definitions and host context.');
    array(request.editedOwnerIds,'/editedOwnerIds',32);unique(request.editedOwnerIds,'/editedOwnerIds');request.editedOwnerIds.forEach(v=>id(v,'/editedOwnerIds'));
    const before=new Map(source.instances.map(v=>[v.id,v])),after=new Map(target.instances.map(v=>[v.id,v])),oldRecipes=new Map(old.recipes.map(r=>[r.id,r])),newRecipes=new Map(next.recipes.map(r=>[r.id,r]));
    for(const [key,r]of oldRecipes){const n=newRecipes.get(key);if(!n)refuse('CATALOGUE_PRUNING_UNSUPPORTED','Keep every retained recipe, including unused drafts.');if(!same(r,n)){if(n.contentVersion<=r.contentVersion)refuse('CONTENT_VERSION_CONFLICT','Descriptor changes need a newer content version.');if(n.interior.skinId!==r.interior.skinId)refuse('FINISH_COPY_REQUIRED','Cosmetic finish never mutates an existing shared recipe.');}}
    for(const [key,r]of newRecipes)if(!oldRecipes.has(key)&&!target.instances.some(v=>v.recipeId===key))refuse('UNUSED_RECIPE_ADDITION','New recipes belong to explicitly edited/added owners in this tranche.');
    const direct=sorted(new Set([...before.keys(),...after.keys()])),changed=direct.filter(key=>{const a=before.get(key),b=after.get(key);return !same(a,b)||a&&b&&!same(oldRecipes.get(a.recipeId),newRecipes.get(b.recipeId));});
    if(!same(changed,sorted(request.editedOwnerIds)))refuse('IMPLICIT_OWNER_EDIT','Name every source/binding change explicitly; shared descriptors affect every bound owner.');
    for(const v of source.instances)if(v.locked){const n=after.get(v.id);if(!n||!same(v,n)||!same(oldRecipes.get(v.recipeId),newRecipes.get(n.recipeId)))refuse('LOCK_CONFLICT','A whole-owner lock forbids source, placement, finish, port, anchor, binding or lock changes.');}
    array(request.finishCopies,'/finishCopies',16);unique(request.finishCopies,'/finishCopies',v=>v.instanceId);
    for(const f of request.finishCopies){
      fields(f,['instanceId','fromRecipeId','toRecipeId'],'/finishCopies');for(const k of Object.keys(f))id(f[k],'/finishCopies/'+k);const a=before.get(f.instanceId),b=after.get(f.instanceId),r=oldRecipes.get(f.fromRecipeId),n=newRecipes.get(f.toRecipeId);
      if(!a||!b||!r||!n||a.recipeId!==r.id||b.recipeId!==n.id||oldRecipes.has(n.id)||n.id!==tileCompositionFinishRecipeId(request.id,request.expected.layoutDigest,f.instanceId)||r.interior.skinId===n.interior.skinId)refuse('INVALID_FINISH_COPY','Finish uses a fresh explicit request/source/owner-bound ID and changes only that ownerÃ¢â‚¬â„¢s cosmetic skin.');
      const compare=clone(n);compare.id=r.id;compare.interior.skinId=r.interior.skinId;if(!same(compare,r))refuse('INVALID_FINISH_COPY','A cosmetic copy preserves every other original source value/control/profile/seed.');const binding=clone(b);binding.recipeId=a.recipeId;binding.contentDigest=a.contentDigest;if(!same(binding,a))refuse('INVALID_FINISH_COPY','Finish repoints only the same whole owner; no simultaneous geometry/lock rewrite.');
    }
    for(const key of changed){const a=before.get(key),b=after.get(key);if(a&&b&&oldRecipes.get(a.recipeId).interior.skinId!==newRecipes.get(b.recipeId).interior.skinId&&!request.finishCopies.some(f=>f.instanceId===key))refuse('FINISH_COPY_REQUIRED','Every existing ownerÃ¢â‚¬â„¢s cosmetic finish change requires the explicit copy-on-write contract.');}
    const previous=resolveComposition(source,old.recipes,accepted.catalogue.digest,null,shared),current=resolveComposition(target,next.recipes,candidate.catalogue.digest,null,shared);
    const affected=new Set(changed),links=[],possiblePairs=[],ids=sorted(new Set([...before.keys(),...after.keys()]));
    for(const l of [source,target]){
      for(const j of l.joins)links.push([j.a.instanceId,j.b.instanceId]);for(const r of l.relations)links.push([r.a,r.b]);for(const g of l.compositions)for(const m of g.members.slice(1))links.push([g.members[0].instanceId,m.instanceId]);
    }
    if(!same(source.compositions,target.compositions))for(const l of [source,target])for(const g of l.compositions)g.members.forEach(m=>affected.add(m.instanceId));
    for(const key of ['joins','relations'])for(const entry of [...source[key],...target[key]])if(!same(source[key].find(x=>x.id===entry.id),target[key].find(x=>x.id===entry.id))){if(key==='joins'){affected.add(entry.a.instanceId);affected.add(entry.b.instanceId);}else{affected.add(entry.a);affected.add(entry.b);}}
    const variants=new Map();
    for(const key of ids){const bounds=[];for(const owner of [previous.owners.get(key),current.owners.get(key)])if(owner){budget.take('source',1+owner.reservations.length);bounds.push(owner.bounds,...owner.reservations);}variants.set(key,bounds);}
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      let near=false;
      for(const a of variants.get(ids[i]))for(const b of variants.get(ids[j])){budget.take('pairs');if([0,1].every(k=>E.cmp(X.max(a.min[k],b.min[k]),X.min(a.max[k],b.max[k]))<=0))near=true;}
      if(near){budget.count('maxProvenanceLinks');const pair=[ids[i],ids[j]];possiblePairs.push(pair);links.push(pair);}
    }
    let expanded=true;while(expanded){expanded=false;for(const [a,b]of links){budget.take('graph');if(affected.has(a)!==affected.has(b)){affected.add(a);affected.add(b);expanded=true;}}budget.peak('maxAffectedOwners',affected.size);}
    for(const v of source.instances)if(v.locked){
      const a=previous.owners.get(v.id),b=current.owners.get(v.id);let common=E.zero;const oldArea=a.visible.reduce((n,p)=>E.add(n,X.area(p)),E.zero),newArea=b.visible.reduce((n,p)=>E.add(n,X.area(p)),E.zero);
      for(const x of a.visible)for(const y of b.visible){budget.take('membership');common=E.add(common,X.area(X.intersection(x,y)));}
      if(!E.eq(oldArea,newArea)||!E.eq(oldArea,common))refuse('LOCK_VISIBLE_COVERAGE','A locked ownerÃ¢â‚¬â„¢s exact visible coverage cannot be occluded or reordered.');
    }
    const anchors=resolved=>[...resolved.owners.values()].filter(o=>affected.has(o.id)).flatMap(o=>o.source.anchors.map(a=>({instanceId:o.id,recipeId:o.source.id,anchorId:a.id}))),oldBindings=previous.compiled.portBindings,newBindings=current.compiled.portBindings;
    const changes={affectedIds:sorted(affected),addedIds:changed.filter(k=>!before.has(k)),removedIds:changed.filter(k=>!after.has(k)),replacedIds:changed.filter(k=>before.has(k)&&after.has(k)),recipeIds:next.recipes.filter(r=>!same(oldRecipes.get(r.id),r)).map(r=>r.id).sort(),anchorsBefore:anchors(previous),anchorsAfter:anchors(current),groupIds:[target.compositions[0].id],portBindingIdsBefore:oldBindings.map(b=>b.id).sort(),portBindingIdsAfter:newBindings.map(b=>b.id).sort(),removedJoinIds:source.joins.filter(j=>!target.joins.some(n=>n.id===j.id)).map(j=>j.id).sort()};
    const upper={total:budget.limits.maxWork,units:Object.fromEntries(Object.keys(budget.units).map(k=>[k,budget.limits.maxWork])),counts:{...budget.limits}};current.compiled.work=upper;
    const result={ok:true,next:{bundle:clone(next),compiled:current.compiled},changes,expected:clone(request.expected),requestId:request.id,contextToken:context.contextToken,layoutDigest:token(target),catalogueDigest:candidate.catalogue.digest,diagnostics:[],dependencies:{affectedIds:sorted(affected),possiblePairs},work:upper};
    budget.peak('maxSerializedBytes',preflight(result,budget));result.work=budget.snapshot();current.compiled.work=budget.snapshot();return freeze(result);
  }catch(error){return compositionFailure(error,budget);}
}
