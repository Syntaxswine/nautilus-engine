// Public pure value/planning entry. No retained host, journal or renderer.
import {Budget,fail,readData,corePort,fields,shape,hash,equal,freeze,clone,refusal} from './data.js';
import {validateDocument,validateContext,documentDigests,presentationFingerprints,sourceProjection,resourceRefs} from './model.js';
import {stageOperations} from './operations.js';
import {geometryPlan} from './geometry.js';
export {tileAuthoringDiscovery} from './contract.js';
export {createRectangleDefinition} from './geometry.js';
export {sealTileContentRecord,inspectTileAuthoringRequirements} from './model.js';
export {bindTileAuthoringTarget} from './target.js';
function stagedData(d){return {authoring:d.authoring,resourceRefs:d.resourceRefs,recipes:d.tileBundle.recipes,owners:d.tileBundle.layout.instances};}
function costs(d,c,b){return {sourceMarks:d.authoring.decorations.chunks.reduce((n,x)=>n+x.marks.length,0),maxLayersOnSurface:Math.max(0,...d.authoring.decorations.surfaces.map(s=>s.layers.length)),newBlobBytes:0,...c.allocations,boundKind:'proposal-only-not-performance-measurement',planning:b.snapshot()};}
export function planTileAuthoring(actual,input){
 let b=new Budget(),requestId='invalid-request';try{
 const t=corePort(actual),raw=readData(input,b,b.limits.inputBytes);fields(raw,['document','command','context','limits'],'/plan',['document','command','context']);const tightened=new Budget(raw.limits??{});tightened.take(b.units);tightened.nodes=b.nodes;tightened.input(b.inputBytes);b=tightened;
 const before=readData(raw.document,b,b.limits.sourceBytes,{chargeInput:false}),command=readData(raw.command,b,b.limits.commandBytes,{chargeInput:false}),context=readData(raw.context,b,b.limits.sourceBytes,{chargeInput:false});requestId=command?.requestId;shape(t,'command',command,b);if(command.operations.length>b.limits.operations)fail('OPERATION_LIMIT','/operations','Operation count exceeds captured bound.');validateContext(t,context,b);validateDocument(t,before,b);
 const source=documentDigests(t,before,b);for(const [key,value]of Object.entries(source))if(command.expected[key]!==value)fail('STALE_SOURCE','/expected/'+key,'Capture every exact source/document/profile/resource digest from the one host snapshot.');if(command.expected.hostAuthorityToken!==context.hostAuthorityToken||command.expected.authorityContextToken!==context.authorityContextToken)fail('STALE_CONTEXT','/expected','Captured host/journal/context tokens changed.');if(!equal(t,before.resourceRefs,context.resourceBindings,b))fail('UNBOUND_RESOURCE_SET','/context/resourceBindings','All durable resource descriptors need actual host bindings.');
 const staged=stageOperations(t,before,command,context,b);if(equal(t,staged,before,b))fail('NO_CHANGE','/operations','No write/history change; retain redo.');if(before.contentRevision===Number.MAX_SAFE_INTEGER)fail('CONTENT_REVISION_LIMIT','/contentRevision','Content revision cannot overflow.');
 const metadata=equal(t,before.tileBundle,staged.tileBundle,b),stack=metadata?null:geometryPlan(t,before,staged,context,b,command.requestId),target=metadata?{...staged,contentRevision:before.contentRevision+1}:null;if(target)validateDocument(t,target,b,{legacy:false});
 const fingerprints={source:presentationFingerprints(t,before,context,b),target:target?presentationFingerprints(t,target,context,b):null};if(metadata&&!equal(t,fingerprints.source,fingerprints.target,b))fail('METADATA_GEOMETRY_CHANGE','/target','Source-unchanged requires equal geometry AND appearance fingerprints.');
 const result={kind:'nautilus-tile-authoring-plan',version:1,ok:true,committable:false,requestId:command.requestId,route:metadata?'source-unchanged':'public-v1-repair',command,commandDigest:hash(t,command,b),expected:clone(command.expected),context,limits:clone(b.limits),request:stack?.request??null,constraints:stack?.constraints??clone(before.constraints),stackBinding:stack?.binding??null,staged:stagedData(staged),targetDocument:target,fingerprints,costBounds:costs(staged,context,b)};
 b.output(result);result.costBounds.planning=b.snapshot();if(JSON.stringify(result).length>b.limits.outputBytes)fail('AUTHORING_OUTPUT_LIMIT','/plan','Plan bound exceeded.');return freeze(result);
 }catch(e){return refusal(requestId,e);}
}
