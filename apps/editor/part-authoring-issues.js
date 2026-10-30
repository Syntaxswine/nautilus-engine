// Private projection for the authoring inspector. Public compiler diagnostics
// and source maps will be adapted here only after their ABI is pinned. This is
// not a readiness service, capability evaluator or interaction kernel.
const labels=Object.freeze({functional:'Functional',decorative:'Decorative · visual only',incomplete:'Incomplete · authoring retained',unsupported:'Unsupported for this profile',preparing:'Preparing compilation',unbound:'Awaiting reviewed compiler/binder'});
export function partAuthoringStatus({state='unbound',mayPlay=false,mayExport=false}={}) {
  if(!Object.hasOwn(labels,state)||typeof mayPlay!=='boolean'||typeof mayExport!=='boolean')throw Error('Use an explicit projected authoring state and compiler eligibility.');
  const waiting=state==='preparing'||state==='unbound';
  return Object.freeze({state,label:labels[state],mayPlay:!waiting&&mayPlay,mayExport:!waiting&&mayExport});
}

// A host-issued string token includes authored-document AND compiler/definition/profile identity.
// Target IDs/paths are opaque source-map values, never decoded from suffixes.
export function selectPartAuthoringIssue({issue,issueToken,currentToken,select,focusProperty=()=>{}}) {
  if(typeof issueToken!=='string'||!issueToken||issueToken!==currentToken)return {ok:false,code:'EDITOR_STALE_ISSUE',message:'Recheck this issue against the current document and definitions.'};
  if(typeof select!=='function'||typeof focusProperty!=='function')throw Error('Supply inspector selection/focus callbacks.');
  const target=issue?.target;
  if(!target||typeof target.instanceId!=='string'||!target.instanceId||!(target.partId===null||typeof target.partId==='string'&&target.partId.length>0)||typeof target.propertyPath!=='string')return {ok:false,code:'EDITOR_ISSUE_WITHOUT_TARGET',message:issue?.remedy||'Select the assembly and inspect its definition requirements.'};
  const selected=Object.freeze({instanceId:target.instanceId,partId:target.partId,propertyPath:target.propertyPath});
  if(select(selected)===false)return {ok:false,code:'EDITOR_TARGET_UNAVAILABLE',message:'The affected part is unavailable. Recompile and select its parent assembly.'};
  if(selected.propertyPath)focusProperty(selected.propertyPath);
  return {ok:true,target:selected};
}
