"""Private contract generator only. No authoring reducer, storage or renderer."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'candidates/tile-authoring/core'
ID='urn:nautilus:candidate:tile-authoring:core:1'
def ref(name):return {'$ref':ID+'#/$defs/'+name}
def obj(props,optional=()):return {'type':'object','additionalProperties':False,'properties':props,'required':[k for k in props if k not in optional]}
def arr(items,maxn=128,minn=0):return {'type':'array','items':items,'minItems':minn,'maxItems':maxn}
def enum(*v):return {'enum':list(v)}
def const(v):return {'const':v}
def integer(lo=0,hi=65535):return {'type':'integer','minimum':lo,'maximum':hi}
def num(lo=-1000000,hi=1000000):return {'type':'number','minimum':lo,'maximum':hi}
def text(n=2048):return {'type':'string','maxLength':n}
def vec(n=2,lo=-1000000,hi=1000000):return {'type':'array','items':num(lo,hi),'minItems':n,'maxItems':n}
def record(kind,body):return obj({'kind':const(kind),'version':const(1),'id':ref('id'),'revision':integer(1),'body':body,'contentDigest':ref('digest')})
D={}
D['id']={'type':'string','minLength':1,'maxLength':96,'pattern':r'^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])'}
D['digest']={'type':'string','pattern':r'^[a-f0-9]{64}(?![\s\S])'}
D['pin']=obj({'id':ref('id'),'revision':integer(1),'contentDigest':ref('digest')})
D['pose']=obj({'quarterTurns':integer(0,3),'mirrorX':{'type':'boolean'}})
D['notice']=obj({'id':ref('id'),'licenseRef':text(128),'attribution':text(),'noticeText':text(131072),'source':obj({'repository':{'type':'string','pattern':r'^https://[^\s]+$','maxLength':512},'commit':{'type':'string','pattern':r'^[a-f0-9]{40}$'},'path':text(256)})})
D['grid']=obj({'id':ref('id'),'version':const(1),'originM':vec(),'cellSizeM':vec(2,.000001,100000),'profile':const('owner-local-grid-v1')})
D['surface']=obj({'id':ref('id'),'sourceAnchorId':ref('id'),'floorSlot':ref('id'),'floorOffsetM':num(),'profile':const('owner-local-level-top-v1'),'originM':vec(3),'axes':const([[1,0,0],[0,1,0]]),'normal':const([0,0,1]),'grid':ref('grid'),'geometryDigest':ref('digest'),'frameDigest':ref('digest')})
D['recipeRecord']=record('nautilus-recipe-definition',obj({'label':text(120),'recipe':{'$ref':'urn:nautilus:schema:tile-recipe:1'},'sourceProfile':enum('local-level-region-v1','local-flat-field-v1','local-level-path-v1'),'surfaces':arr(ref('surface'),8,1),'requires':arr(ref('id'),16),'notices':arr(ref('notice'),32,1)}))
D['recipeRecord']['properties']['body']['properties']['recipe']['allOf']=[{'properties':{'frame':const('local'),'shape':{'not':{'required':['clip']}}}}]
D['recipeRecord']['properties']['body']['allOf']=[{'if':{'properties':{'sourceProfile':const(profile)},'required':['sourceProfile']},'then':{'properties':{'recipe':{'properties':{'shape':{'properties':{'kind':const(kind)}}}}}}} for profile,kind in [('local-level-region-v1','region'),('local-flat-field-v1','field-cell'),('local-level-path-v1','profile-sweep')]]
D['blob']=obj({'sha256':ref('digest'),'byteLength':integer(1,16777216),'mediaType':enum('image/png','image/webp'),'widthPx':integer(1,2048),'heightPx':integer(1,2048),'colorSpace':const('srgb'),'alphaMode':const('straight')})
D['artworkRecord']=record('nautilus-tile-artwork',obj({'label':text(120),'blob':ref('blob'),'channels':const(['color','alpha']),'requires':arr(ref('id'),16),'notices':arr(ref('notice'),32,1)}))
D['gridRef']=obj({'id':ref('id'),'version':const(1),'digest':ref('digest')})
D['span']=obj({'i0':integer(-65536,65535),'count':integer(1,4096)})
D['mask']={'oneOf':[obj({'kind':const('all-surface')}),obj({'kind':const('grid-spans'),'grid':ref('gridRef'),'rows':arr(obj({'j':integer(-65536,65535),'spans':arr(ref('span'),64,1)}),256,1)})]}
D['graphicTransform']=obj({'positionM':vec(),'sizeM':vec(2,.000001,100000),'rotationRad':num(-3.141592653589793,3.141592653589793),'mirrorU':{'type':'boolean'},'pivotUV':vec(2,0,1)})
D['graphic']=obj({'artwork':ref('pin'),'form':enum('stamp','detail'),'transform':ref('graphicTransform'),'opacity':num(0,1),'tintLinearRGB':vec(3,0,1),'mask':ref('mask'),'wrap':enum('clamp','repeat')})
D['graphic']['allOf']=[{'if':{'properties':{'form':const('stamp')},'required':['form']},'then':{'properties':{'wrap':const('clamp')}},'else':{'properties':{'wrap':const('repeat')}}}]
D['defaultMark']=obj({'id':ref('id'),'surfaceId':ref('id'),'layerId':ref('id'),'ordinal':integer(0,4294967295),'graphic':ref('graphic')})
D['layer']=obj({'id':ref('id'),'order':integer(0,7),'label':text(120),'opacity':num(0,1),'blendProfile':const('source-over-linear-premultiplied-v1')})
D['presetRecord']=record('nautilus-tile-preset',obj({'label':text(120),'definition':ref('pin'),'defaultLayers':arr(obj({'surfaceId':ref('id'),'layer':ref('layer')}),64),'defaultMarks':arr(ref('defaultMark'),4096),'requires':arr(ref('id'),16),'notices':arr(ref('notice'),32,1)}))
D['manifest']=obj({'kind':const('nautilus-tile-content'),'version':const(1),'id':ref('id'),'definitions':arr(ref('recipeRecord'),128),'presets':arr(ref('presetRecord'),128),'artwork':arr(ref('artworkRecord'),256)})
D['surfaceBinding']=obj({'ownerId':ref('id'),'surfaceId':ref('id'),'floorId':ref('id'),'definition':ref('pin'),'geometryDigest':ref('digest'),'frameDigest':ref('digest'),'gridDigest':ref('digest'),'bindingDigest':ref('digest'),'layers':arr(ref('layer'),8,1)})
D['markTarget']=obj({'ownerId':ref('id'),'surfaceId':ref('id'),'floorId':ref('id'),'bindingDigest':ref('digest')})
D['mark']=obj({'id':ref('id'),'revision':integer(1),'target':ref('markTarget'),'layerId':ref('id'),'ordinal':integer(0,4294967295),'graphic':ref('graphic'),'groupId':{'oneOf':[ref('id'),{'type':'null'}]}})
D['strokeGroup']=obj({'id':ref('id'),'floorId':ref('id'),'memberMarkIds':arr(ref('id'),1024,1),'capturedPhase':obj({'profile':const('captured-floor-plan-v1'),'originXYM':vec(),'transform':ref('graphicTransform'),'artwork':ref('pin'),'ownerPoseDigests':arr(obj({'ownerId':ref('id'),'digest':ref('digest')}),32,1)})})
D['decorations']=obj({'kind':const('nautilus-local-decorations'),'version':const(1),'surfaces':arr(ref('surfaceBinding'),256),'chunks':arr(obj({'id':ref('id'),'marks':arr(ref('mark'),4096)}),128),'groups':arr(ref('strokeGroup'),128)})
D['module']=obj({'kind':const('nautilus-tile-authoring-module'),'version':const(1),'library':ref('manifest'),'decorations':ref('decorations'),'ownerPins':arr(obj({'ownerId':ref('id'),'definition':ref('pin'),'preset':{'oneOf':[ref('pin'),{'type':'null'}]}}),32)})
D['floorProfile']=obj({'id':ref('id'),'version':integer(1),'floors':arr(obj({'id':ref('id'),'elevationM':num()}),64,1)})
D['stackConstraints']=obj({'kind':const('nautilus-stack-constraints'),'version':const(1),'floorProfileId':ref('id'),'minimumClearanceM':num(.000001,100000),'owners':arr(obj({'instanceId':ref('id'),'primaryReservationId':ref('id')}),128),'managedRelations':arr(obj({'id':ref('id'),'kind':const('cross'),'a':ref('id'),'b':ref('id'),'clearanceM':num(.000001,100000)}),256)})
D['source']=obj({'kind':const('nautilus-tile-authoring-source'),'version':const(1),'id':ref('id'),'revision':integer(0,9007199254740991),'originalSourceJSON':text(4000000),'floorProfile':ref('floorProfile'),'finishCatalogue':obj({'id':ref('id'),'version':integer(1),'contentDigest':ref('digest')}),'tileBundle':{'$ref':'urn:nautilus:schema:tile-bundle:1'},'stackConstraints':{'oneOf':[ref('stackConstraints'),{'type':'null'}]},'authoring':ref('module')})
D['expected']=obj({k:ref('digest') for k in ['workspaceDigest','hostDocumentDigest','hostAuthorityToken','authorityContextToken','contentDigest','decorationDigest','resourceSetDigest','floorProfileDigest','stackConstraintsDigest','tileLayoutDigest','tileCatalogueDigest'] }|{'workspaceRevision':integer(0,9007199254740991)})
D['anchorDecision']=obj({'markId':ref('id'),'action':enum('preserve-identical','reanchor','delete'),'replacement':{'oneOf':[ref('mark'),{'type':'null'}]}})
D['placement']=obj({'ownerId':ref('id'),'originM':vec(3),'floorBindings':{'type':'object','minProperties':1,'maxProperties':8,'propertyNames':ref('id'),'additionalProperties':ref('id')},'transform':ref('pose'),'locked':{'type':'boolean'},'anchorIds':arr(ref('id'),256),'freshMarkIds':arr(obj({'templateId':ref('id'),'markId':ref('id')}),4096),'freshLayerIds':arr(obj({'templateId':ref('id'),'layerId':ref('id')}),64),'chunkId':ref('id')})
OPS={
'recipe.create':obj({'definition':ref('recipeRecord')}),
'recipe.clone':obj({'base':ref('pin'),'definition':ref('recipeRecord')}),
'recipe.revise':obj({'base':ref('pin'),'definition':ref('recipeRecord')}),
'preset.save':obj({'preset':ref('presetRecord')}),
'preset.place':obj({'preset':ref('pin'),'placements':arr(ref('placement'),32,1),'defaults':enum('copy-explicit','empty')}),
'placement.upgrade':obj({'ownerIds':arr(ref('id'),32,1),'from':ref('pin'),'to':ref('pin'),'anchorDecisions':arr(ref('anchorDecision'),4096),'newRecipeAnchorIds':arr(obj({'ownerId':ref('id'),'anchorIds':arr(ref('id'),256)}),32,1)}),
'owner.remove':obj({'ownerIds':arr(ref('id'),32,1),'deleteDecorationIds':arr(ref('id'),4096)}),
'decoration.add':obj({'chunkId':ref('id'),'mark':ref('mark')}),
'decoration.update':obj({'markId':ref('id'),'expectedRevision':integer(1),'replacement':ref('mark'),'groupPolicy':enum('preserve-whole-group','detach-explicit')}),
'decoration.remove':obj({'markIds':arr(ref('id'),1024,1),'groupPolicy':enum('preserve-whole-group','detach-explicit')}),
'surface.layers':obj({'target':ref('markTarget'),'layers':arr(ref('layer'),8),'removedLayerMarkIds':arr(ref('id'),4096)}),
'stroke.group':obj({'group':ref('strokeGroup')}),
'content.import':obj({'pack':ref('pack'),'conflict':const('refuse-different-content')}),
}
D['operation']={'oneOf':[obj({'opId':ref('id'),'kind':const(name),'body':body}) for name,body in OPS.items()]}
D['command']=obj({'kind':const('nautilus-tile-authoring-command'),'version':const(1),'requestId':ref('id'),'expected':ref('expected'),'operations':arr(ref('operation'),1024,1),'budgetProfile':const('authoring-reference-proposal-v1')})
D['blobEntry']=obj({'sha256':ref('digest'),'byteLength':integer(1,16777216),'entry':{'type':'string','pattern':r'^blobs/[a-f0-9]{64}\.(png|webp)$'}})
D['pack']=obj({'kind':const('nautilus-tile-content-pack'),'version':const(1),'manifest':ref('manifest'),'blobEntries':arr(ref('blobEntry'),256),'requires':arr(ref('id'),32)})
D['diagnostic']=obj({'code':ref('id'),'path':text(512),'message':text(),'action':text(),'ownerIds':arr(ref('id'),32)})
D['bindings']=obj({k:ref('digest') for k in ['commandDigest','sourceWorkspaceDigest','targetWorkspaceDigest','sourceHostDocumentDigest','targetHostDocumentDigest','sourceAuthorityToken','authorityContextToken','sourceContentDigest','targetContentDigest','sourceDecorationDigest','targetDecorationDigest','sourceConstraintsDigest','nextConstraintsDigest','floorProfileDigest','sourceResourceSetDigest','targetResourceSetDigest','resourceLeaseSetDigest','presentationProfileDigest','allocationLedgerDigest']})
D['costBounds']=obj({'sourceMarks':integer(0,524288),'maxLayersOnSurface':integer(0,8),'newBlobBytes':integer(0,4294967295),'declaredUniqueDecodedBytes':integer(0,33554432),'residentMarksAllViews':integer(0,1024),'rootsAllViews':integer(0,2),'trianglesAllViews':integer(0,50000),'cellsAllViews':integer(0,1024),'boundKind':const('proposal-only-not-performance-measurement')})
D['costBounds']['properties']['planning']=obj({'unitsCharged':integer(0,1000000),'inputBytes':integer(0,6000000),'outputBytes':integer(0,4000000),'definitionVisits':integer(0,1000000),'maskCellsEvaluated':integer(0,1000000),'dependencyEdges':integer(0,1000000),'resourceReferences':integer(0,1000000)});D['costBounds']['required'].append('planning')
D['prepareView']=obj({'kind':const('nautilus-tile-authoring-review'),'version':const(1),'requestId':ref('id'),'reviewToken':ref('digest'),'bindings':ref('bindings'),'targetSource':ref('source'),'costBounds':ref('costBounds'),'tilePreparation':enum('public-v1-prepared','source-unchanged'),'resourceReadiness':const('host-bound'),'status':const('reviewable')})
D['refusal']=obj({'kind':const('nautilus-tile-authoring-refusal'),'version':const(1),'requestId':ref('id'),'ok':const(False),'targetSource':{'type':'null'},'diagnostics':arr(ref('diagnostic'),128,1)})
D['applyRequest']=obj({'requestId':ref('id'),'reviewToken':ref('digest'),'expectedTargetDigest':ref('digest')})
D['applyOutcome']={'oneOf':[
obj({'outcome':const('committed'),'requestId':ref('id'),'committed':const(True),'workspaceDigest':ref('digest'),'hostDocumentDigest':ref('digest'),'authorityToken':ref('digest'),'receiptId':ref('id'),'presentation':enum('ready','pending','failed')}),
obj({'outcome':const('rejected'),'requestId':ref('id'),'committed':const(False),'diagnostics':arr(ref('diagnostic'),128,1)}),
obj({'outcome':const('unknown'),'requestId':ref('id'),'committed':{'type':'null'},'recoveryRequestId':ref('id'),'writesFrozen':const(True),'potentiallyCommittedResources':const('retain-until-same-id-recovery')})]}
D['query']={'oneOf':[obj({'kind':const('requirements.inspect'),'subject':{'oneOf':[ref('pin'),ref('source')]}}),obj({'kind':const('content.export'),'presetRefs':arr(ref('pin'),128,1),'includeAllDependencies':const(True)})]}
D['snapshot']=obj({'source':ref('source'),'expected':ref('expected'),'hostProtocolVersion':const(1),'missingBindings':arr(ref('id'),32)})
D['requirementsResult']=obj({'kind':const('nautilus-tile-authoring-requirements'),'version':const(1),'subjectDigest':ref('digest'),'requiredProfiles':arr(ref('id'),32),'requiredResources':arr(ref('pin'),256),'unavailable':arr(ref('diagnostic'),128)})
D['exportPlan']=obj({'kind':const('nautilus-tile-content-export-plan'),'version':const(1),'pack':ref('pack'),'manifestDigest':ref('digest'),'blobSetDigest':ref('digest'),'status':const('host-byte-export-required')})
D['transport']={'oneOf':[obj({'action':const('describe')}),obj({'action':const('snapshot')}),obj({'action':const('query'),'query':ref('query')}),obj({'action':const('prepare'),'command':ref('command')}),obj({'action':const('apply'),'request':ref('applyRequest')}),obj({'action':const('cancel'),'reviewToken':ref('digest')}),obj({'action':const('recover'),'requestId':ref('id')})]}
schema={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':ID,'title':'Private tile-authoring contract proposal v1','description':'Contract/design only. Valid JSON does not create authoring, rendering or commit capability. Public v1 recipe/bundle schemas remain closed and unchanged.','oneOf':[ref(n) for n in ['manifest','module','source','command','pack','prepareView','refusal']], '$defs':D}
LIMITS={'layersPerSurface':8,'sourceMarksPerLogicalChunk':4096,'residentMarksAllViews':1024,'uniqueAdditionalDecodedBytes':33554432,'rootsAllViews':2,'trianglesAllViews':50000,'cellsAllViews':1024,'operationsPerCommand':1024,'targetOwnersPerCommand':32,'activeRecipes':32,'definitions':128,'presets':128,'artworkRecords':256,'maskCellsPerMark':4096,'manifestBytes':4000000,'sourceBytes':4000000,'commandBytes':1000000,'plannerUnits':1000000,'encodedPackBytes':67108864}
discovery={'kind':'nautilus-tile-authoring-discovery','version':1,'status':'contract-design-only','executorImplemented':False,'publicRegistration':False,'schema':ID,'commands': [{'name':n,'schemaPointer':'#/$defs/operation','effectDomain':'appearance' if n.startswith(('decoration.','surface.','stroke.')) else 'content-and-explicit-placement'} for n in OPS], 'queries':['requirements.inspect','content.export'],'transport':{'proposedCLI':'nautilus tile-authoring session --stdio --host <authorized-workspace-host>','framing':'one closed JSON request and response per line; same persistent connection owns review tokens','entryImplemented':False,'humanAgentParity':'identical command bytes and one host authority'},'proposedLimits':LIMITS,'limitsMeasured':False,'profiles':{'source':['local-level-region-v1','local-flat-field-v1','local-level-path-v1'],'surface':'owner-local-level-top-v1','blend':'source-over-linear-premultiplied-v1','mask':'owner-local-grid-v1','status':'proposed-unregistered-needs-real-provider-proof'},'unsupported':['arbitrary-js','functional-interior/extensions','world-fixed-paint','path-parameter-anchors','physical-crater','3d-plant','displacement','animated-or-expiring-core-marks','new-clipping-or-solid-grammar','grades','unproved-intersections']}
if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True)
 for name,value in [('contract.schema.json',schema),('discovery.json',discovery)]:
  (OUT/name).write_bytes((json.dumps(value,indent=2)+'\n').encode())
 print(json.dumps({'candidateSchemas':1,'definitions':len(D),'operations':len(OPS),'runtimeImplemented':False}))
