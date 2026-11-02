// A closed v3 policy over the existing codec, WAL and synchronous CAS authority.
// Core validates the canonical authoring module; no alternate content grammar.
import {createSmartTileCheckpointCodec,smartTileData,smartTileDigest,fields,id,fail} from '../smart-tile/checkpoint.js';
import {createSmartTileStorage} from '../smart-tile/storage.js';
import {SMART_TILE_INTERFACE,SMART_TILE_LIMITS} from '../smart-tile/contract.js';
import {validateTileStackDocument} from '../tile-stack/policy.js';
import {readAuthoringJSON} from './jsonl.js';

const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const TILE_AUTHORING_EDITOR=freeze({kind:'nautilus-tile-authoring-editor-adapter',version:3,
  checkpoint:'nautilus-tile-authoring-editor-checkpoint',journal:'nautilus-tile-authoring-editor-journal',operation:'nautilus-tile-authoring-editor-operation',
  tools:['authoring'],methods:SMART_TILE_INTERFACE.methods,storagePrefix:'nautilus-tile-authoring-editor-v3:',limits:SMART_TILE_LIMITS});
const documentFields=['kind','version','id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints','contentRevision','authoring','resourceRefs'];
const baseFields=['id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints'];
const bindingFields=['sourceDocumentDigest','targetDocumentDigest','sourceLayoutDigest','sourceCatalogueDigest','contextToken','sourceConstraintsDigest','nextConstraintsDigest','floorProfileDigest','requestDigest','commandDigest'];
const coreBindings=['commandDigest','sourceWorkspaceDigest','targetWorkspaceDigest','sourceHostDocumentDigest','targetHostDocumentDigest','sourceAuthorityToken','authorityContextToken','sourceContentDigest','targetContentDigest','sourceDecorationDigest','targetDecorationDigest','sourceConstraintsDigest','nextConstraintsDigest','floorProfileDigest','sourceResourceSetDigest','targetResourceSetDigest','resourceLeaseSetDigest','presentationProfileDigest','allocationLedgerDigest'];
const expectedFields=['workspaceRevision','workspaceDigest','hostDocumentDigest','hostAuthorityToken','authorityContextToken','contentDigest','decorationDigest','resourceSetDigest','floorProfileDigest','stackConstraintsDigest','tileLayoutDigest','tileCatalogueDigest'];
const digest=(v,p)=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))fail('AUTHORING_DIGEST',p,'Retain an exact captured digest.');};
export function tileAuthoringSource(d){return {kind:'nautilus-tile-authoring-source',version:1,id:d.id,revision:d.contentRevision,originalSourceJSON:d.sourceJSON,
  floorProfile:{id:d.floorBinding.profile.id,version:d.floorBinding.profile.version,floors:d.floorBinding.floors.map(({id,elevationM})=>({id,elevationM}))},
  finishCatalogue:{id:d.finishBinding.id,version:d.finishBinding.version,contentDigest:d.finishBinding.digest},tileBundle:d.tileBundle,stackConstraints:d.constraints,authoring:d.authoring};}
export function tileAuthoringExpected(tiles,d,hostAuthorityToken,authorityContextToken){
  const hash=tiles.tileLayoutToken;return {workspaceRevision:d.contentRevision,workspaceDigest:hash(tileAuthoringSource(d)),hostDocumentDigest:hash(d),hostAuthorityToken,authorityContextToken,
    contentDigest:hash(d.authoring.library),decorationDigest:hash(d.authoring.decorations),resourceSetDigest:hash(d.resourceRefs),floorProfileDigest:hash(d.floorBinding),stackConstraintsDigest:hash(d.constraints),tileLayoutDigest:hash(d.tileBundle.layout),tileCatalogueDigest:d.tileBundle.layout.catalogueDigest};
}
export function tileAuthoringOperationBinding(tiles,before,target,request,command,contextToken){return {
  sourceDocumentDigest:smartTileDigest(before),targetDocumentDigest:smartTileDigest(target),sourceLayoutDigest:tiles.tileLayoutToken(before.tileBundle.layout),sourceCatalogueDigest:before.tileBundle.layout.catalogueDigest,contextToken,
  sourceConstraintsDigest:tiles.tileLayoutToken(before.constraints),nextConstraintsDigest:tiles.tileLayoutToken(target.constraints),floorProfileDigest:tiles.tileLayoutToken(before.floorBinding),requestDigest:tiles.tileLayoutToken(request),commandDigest:tiles.tileLayoutToken(command)};}

export function createTileAuthoringCheckpointCodec(deps,initialDocument){
  if(typeof deps.authoring?.inspectTileAuthoringRequirements!=='function')fail('AUTHORING_CORE_REQUIRED','/core','Borrow the actual public authoring validator/query.');
  const checked=new WeakSet();let identity=null;
  function validateDocument(input){
    if(input&&typeof input==='object'&&checked.has(input))return input;
    const d=readAuthoringJSON(input,{maxBytes:16_000_000,maxNodes:1_000_000,maxDepth:40});fields(d,documentFields,'/document');
    if(d.kind!=='nautilus-tile-workbench-document'||d.version!==3)fail('AUTHORING_DOCUMENT_VERSION','/document/version','Open an explicit complete v3 document; v1/v2 migration is not implicit.');
    validateTileStackDocument(deps,Object.fromEntries(baseFields.map(k=>[k,d[k]])));
    const requirements=deps.authoring.inspectTileAuthoringRequirements(deps.tiles,{document:d,subject:tileAuthoringSource(d)});
    if(requirements?.kind!=='nautilus-tile-authoring-requirements')fail('AUTHORING_DOCUMENT_REFUSED','/document','Core did not validate the complete authoring source.');
    const fixed={id:d.id,sourceJSON:d.sourceJSON,floorBinding:d.floorBinding,finishBinding:d.finishBinding,layoutId:d.tileBundle.layout.id,minimumClearanceM:d.constraints.minimumClearanceM};
    if(identity!==null&&smartTileDigest(fixed)!==identity)fail('AUTHORING_WORKSPACE_BINDING','/document','Retain the exact original source, workspace, layout, floor, finish and clearance bindings.');
    freeze(d);checked.add(d);return d;
  }
  const initial=validateDocument(initialDocument);identity=smartTileDigest({id:initial.id,sourceJSON:initial.sourceJSON,floorBinding:initial.floorBinding,finishBinding:initial.finishBinding,layoutId:initial.tileBundle.layout.id,minimumClearanceM:initial.constraints.minimumClearanceM});
  const formats=freeze({checkpoint:TILE_AUTHORING_EDITOR.checkpoint,checkpointVersion:3,journal:TILE_AUTHORING_EDITOR.journal,journalVersion:3,operation:TILE_AUTHORING_EDITOR.operation,operationVersion:3});
  const domain=freeze({formats,bindingToken:identity,floorRecords:initial.floorBinding.floors.map(({id,label,elevationM})=>({id,label,elevationM})),validateDocument,
    contextToken(document,host){const d=validateDocument(document);fields(host,['floorId','mode','floorEpoch','providerToken'],'/context');if(!d.floorBinding.floors.some(f=>f.id===host.floorId)||!['manual','character-follow','contact-inspection'].includes(host.mode)||!Number.isSafeInteger(host.floorEpoch)||host.floorEpoch<0||typeof host.providerToken!=='string'||!host.providerToken.length||host.providerToken.length>512)fail('AUTHORING_CONTEXT','/context','Capture the actual floor, mode, epoch and provider.');return smartTileDigest({policyToken:identity,documentDigest:smartTileDigest(d),...host});}
  });
  const policy={formats,validateDocument,
    targetDocument(_before,operation){return validateDocument(operation.target);},
    validateOperation(op,_document,_deps,before,target){
      fields(op,['kind','version','id','documentId','action','expected','request','target','binding','authoringBinding','tilePreparation','command'],'/operation');id(op.id,'/operation/id');
      if(op.documentId!==initial.id||!['edit','undo','redo'].includes(op.action)||!['source-unchanged','public-v1-prepared'].includes(op.tilePreparation))fail('AUTHORING_OPERATION','/operation','Retain the workspace, exact action and preparation classification.');
      fields(op.expected,['token','contextToken'],'/operation/expected');Object.entries(op.expected).forEach(([k,v])=>digest(v,'/operation/expected/'+k));
      fields(op.binding,bindingFields,'/operation/binding');Object.entries(op.binding).forEach(([k,v])=>digest(v,'/operation/binding/'+k));const b=op.binding;
      if(op.request?.id!==op.id||b.contextToken!==op.expected.contextToken||b.targetDocumentDigest!==smartTileDigest(target)||b.nextConstraintsDigest!==deps.tiles.tileLayoutToken(target.constraints)||b.floorProfileDigest!==deps.tiles.tileLayoutToken(target.floorBinding)||b.requestDigest!==deps.tiles.tileLayoutToken(op.request)||b.commandDigest!==deps.tiles.tileLayoutToken(op.command))fail('AUTHORING_OPERATION_BINDING','/operation/binding','Retain the complete target, original request, command and fixed full floor binding.');
      if(op.action==='edit'){
        fields(op.command,['kind','version','requestId','expected','operations','budgetProfile'],'/operation/command');
        if(op.command.kind!=='nautilus-tile-authoring-command'||op.command.version!==1||op.command.requestId!==op.id||op.command.budgetProfile!=='authoring-reference-proposal-v1'||!Array.isArray(op.command.operations)||!op.command.operations.length||op.command.operations.length>1024)fail('AUTHORING_COMMAND_BINDING','/operation/command','Retain the original finite canonical command.');
        const cb=op.authoringBinding;fields(cb,coreBindings,'/operation/authoringBinding');Object.entries(cb).forEach(([k,v])=>digest(v,'/operation/authoringBinding/'+k));
        const expected=tileAuthoringExpected(deps.tiles,target,op.expected.token,op.expected.contextToken);
        for(const [key,value]of Object.entries({commandDigest:b.commandDigest,sourceHostDocumentDigest:b.sourceDocumentDigest,targetHostDocumentDigest:b.targetDocumentDigest,sourceAuthorityToken:op.expected.token,authorityContextToken:b.contextToken,nextConstraintsDigest:b.nextConstraintsDigest,floorProfileDigest:b.floorProfileDigest,targetWorkspaceDigest:expected.workspaceDigest,targetContentDigest:expected.contentDigest,targetDecorationDigest:expected.decorationDigest,targetResourceSetDigest:expected.resourceSetDigest}))if(cb[key]!==value)fail('AUTHORING_TARGET_BINDING','/operation/authoringBinding/'+key,'The Core binding must describe the exact complete target.');
        const e=op.command.expected;
        fields(e,expectedFields,'/operation/command/expected');for(const key of expectedFields.filter(k=>k!=='workspaceRevision'))digest(e[key],'/operation/command/expected/'+key);
        if(!Number.isSafeInteger(e.workspaceRevision)||e.workspaceRevision<0)fail('AUTHORING_CONTENT_REVISION','/operation/command/expected/workspaceRevision','Retain a bounded source content revision.');
        for(const [key,value]of Object.entries({sourceWorkspaceDigest:e.workspaceDigest,sourceContentDigest:e.contentDigest,sourceDecorationDigest:e.decorationDigest,sourceResourceSetDigest:e.resourceSetDigest,sourceConstraintsDigest:e.stackConstraintsDigest}))if(cb[key]!==value)fail('AUTHORING_SOURCE_BINDING','/operation/authoringBinding/'+key,'Retain every exact captured Core source binding.');
        if(e.hostAuthorityToken!==op.expected.token||e.authorityContextToken!==b.contextToken||e.hostDocumentDigest!==b.sourceDocumentDigest||e.tileLayoutDigest!==b.sourceLayoutDigest||e.tileCatalogueDigest!==b.sourceCatalogueDigest||e.stackConstraintsDigest!==b.sourceConstraintsDigest||e.floorProfileDigest!==b.floorProfileDigest||target.contentRevision!==e.workspaceRevision+1)fail('AUTHORING_SOURCE_BINDING','/operation/command/expected','Keep the captured full source and one content revision per command.');
        if(op.tilePreparation==='source-unchanged'){
          fields(op.request,['id','kind','version'],'/operation/request');if(op.request.kind!=='nautilus-tile-authoring-source-unchanged'||op.request.version!==1||b.sourceLayoutDigest!==deps.tiles.tileLayoutToken(target.tileBundle.layout)||b.sourceCatalogueDigest!==target.tileBundle.layout.catalogueDigest||b.sourceConstraintsDigest!==b.nextConstraintsDigest)fail('SOURCE_UNCHANGED_MISMATCH','/operation','A metadata command cannot change layout, catalogue or constraints.');
        }else if(op.request.version!==1||target.tileBundle.layout.revision!==op.request.expected?.revision+1||op.request.expected.layoutDigest!==b.sourceLayoutDigest||op.request.expected.catalogueDigest!==b.sourceCatalogueDigest||op.request.expected.contextToken!==b.contextToken)fail('AUTHORING_REQUEST_TARGET','/operation/request','Bind the actual ordinary public-v1 prepared target.');
        if(before&&smartTileDigest(op.command.expected)!==smartTileDigest(tileAuthoringExpected(deps.tiles,before,op.expected.token,op.expected.contextToken)))fail('STALE_SOURCE','/operation/command/expected','The command must bind every field of its actual accepted source.');
      }else{
        fields(op.request,['id','kind','action','targetDocumentDigest'],'/operation/request');
        if(op.command!==null||op.authoringBinding!==null||op.request.kind!=='smart-tile-history-restore'||op.request.action!==op.action||op.request.targetDocumentDigest!==smartTileDigest(target))fail('HISTORY_TARGET_MISMATCH','/operation','History restores the exact complete historical document.');
      }
      if(before){
        if(smartTileDigest(b)!==smartTileDigest(tileAuthoringOperationBinding(deps.tiles,before,target,op.request,op.command,op.expected.contextToken)))fail('AUTHORING_OPERATION_SOURCE','/operation/binding','Bind the exact complete accepted source.');
        const same=smartTileDigest(before.tileBundle)===smartTileDigest(target.tileBundle)&&smartTileDigest(before.constraints)===smartTileDigest(target.constraints);
        if((op.tilePreparation==='source-unchanged')!==same)fail('SOURCE_UNCHANGED_MISMATCH','/operation/tilePreparation','Classify the actual whole source/target pair.');
      }
      return op;
    }};
  return Object.freeze({codec:createSmartTileCheckpointCodec(deps,policy),domain});
}
export function tileAuthoringStorageKey(workspaceId){id(workspaceId,'/workspaceId');return TILE_AUTHORING_EDITOR.storagePrefix+workspaceId;}
export function createTileAuthoringStorage(deps,{binding,storage,initialCheckpoint,...options}){
  const {codec}=binding,owned=codec.open(initialCheckpoint),key=tileAuthoringStorageKey(owned.document.id),existing=storage.getItem(key);
  if(existing!==null)codec.open(existing);
  return createSmartTileStorage(deps,{...options,storage,key,initialCheckpoint:owned,codec,keyPolicy:value=>value===key});
}
