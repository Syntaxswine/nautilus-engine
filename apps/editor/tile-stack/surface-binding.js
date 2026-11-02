import {smartTileDigest,fail} from '../smart-tile/checkpoint.js';
import {capturePlannerSource} from './planner-seam.js';
import {stackOperationBinding} from './checkpoint.js';
import {validateSurfaceOperation} from './surface-route.js';
export function bindIsolatedLevelSurfaceTarget(domain,tiles,{document,hostContext,plan,prepared}){
  const current=capturePlannerSource(domain,tiles,document,hostContext);
  if(smartTileDigest(current)!==smartTileDigest(plan.frame))fail('STACK_EDITOR_STALE_FRAME','/frame','The complete accepted source or actual view context changed.');
  if(plan.route!=='public-v1-isolated-surface'||!prepared?.ok||prepared.requestId!==plan.request.id||!Array.isArray(prepared.changes?.affectedIds)||prepared.changes.affectedIds.length!==1||prepared.changes.affectedIds[0]!==plan.ownerId||!Array.isArray(prepared.dependencies?.affectedIds)||prepared.dependencies.affectedIds.some(id=>id!==plan.ownerId)||smartTileDigest(prepared.expected)!==smartTileDigest(plan.request.expected)||prepared.contextToken!==current.context.contextToken)fail('B2_SURFACE_PREPARED_SCOPE','/prepared','Use the one actual prepared single-owner result.');
  const target=domain.targetDocument(document,{tileBundle:prepared.next.bundle,constraints:document.constraints}),binding=stackOperationBinding(tiles,document,target,plan.request,current.context.contextToken);
  const op={action:'edit',request:plan.request,binding};validateSurfaceOperation(tiles,op,target,document);
  const owner=target.tileBundle.layout.instances.find(v=>v.id===plan.ownerId),recipe=target.tileBundle.recipes.find(v=>v.id===plan.recipe.id);
  if(smartTileDigest(owner)!==smartTileDigest(plan.owner)||smartTileDigest(recipe)!==smartTileDigest(plan.recipe))fail('B2_SURFACE_PREPARED_TARGET','/prepared/next','The actual prepared target must exactly retain the finite authored proposal.');
  return {targetDocument:target,binding,request:plan.request};
}
