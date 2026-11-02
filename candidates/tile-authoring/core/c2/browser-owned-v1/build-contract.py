"""Generate the isolated browser family. Never modifies strict/public inputs."""
from pathlib import Path
import copy,hashlib,json
f=Path(__file__).resolve().parent
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
abi=load(f.parent/'abi/proposal.schema.json')['$defs'];root=load(f/'schema-inputs/approved-row-patch.json')['$defs'];d=copy.deepcopy(root)
C='urn:nautilus:candidate:tile-authoring:core:1#/$defs/';A='urn:nautilus:proposal:tile-authoring:c2-capture:1#/$defs/'
c=lambda n:{'$ref':C+n};a=lambda n:{'$ref':A+n};r=lambda n:{'$ref':'#/$defs/'+n};const=lambda x:{'const':x};count=lambda maximum=9007199254740991,minimum=0:{'type':'integer','minimum':minimum,'maximum':maximum};nullable=lambda v:{'oneOf':[v,{'type':'null'}]};arr=lambda v,n=1024:{'type':'array','items':v,'maxItems':n,'uniqueItems':True};obj=lambda p:{'type':'object','additionalProperties':False,'properties':p,'required':list(p)}
catalogue=load(f/'resource-catalogue.json');catalogueDigest=hashlib.sha256(json.dumps(catalogue,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
binding={'accountingScope':const('engine-owned-and-api-logical-only'),'profileDigest':c('digest')};stamp={'ownerLifetimeId':c('id'),'contextId':c('id'),'contextEpoch':count()}
d['TextureLayout']['properties'].update({'baseLevel':const(0),'storeGeneration':count()});d['TextureLayout']['required']=list(d['TextureLayout']['properties'])
d['BufferLayout']['properties']['storeGeneration']=count();d['BufferLayout']['required']=list(d['BufferLayout']['properties'])
d['GeometryLayout']=obj({'profile':const('public-canonical-flat-tile-art-v1'),'attribute':{'enum':['position','normal','uv','index']},'arrayType':{'enum':['Float32Array','Uint16Array','Uint32Array']},'itemSize':{'enum':[1,2,3]},'count':count(150000),'byteOffset':const(0),'byteLength':count(1800000),'bufferCapacityBytes':count(1800000)})
for row in d['BrowserAllocation']['oneOf']:
 p=row['properties'];p['contentRevision']=count();p['geometryLayout']=r('GeometryLayout') if p['charge']['const']=='geometry-governed' and p['allocationClass']['const']!='application-reservation' else {'type':'null'};row['required']=list(p)
d['BrowserRangeLease']['properties']['ownerRequestId']=nullable(c('id'));d['BrowserRangeLease']['required']=list(d['BrowserRangeLease']['properties'])
d['BrowserReference']=obj({'referenceId':c('id'),'kind':{'enum':['source','candidate','history','redo','pending','export','cache','borrowed']},'ownerLifetimeId':c('id'),'requestId':nullable(c('id')),'documentOrHistoryDigest':nullable(c('digest')),'allocationIds':arr(c('id')),'viewIds':arr(c('id')),'materialIds':arr(c('id')),'rangeLeaseIds':arr(c('id')),'state':{'enum':['active','release-pending']}})
totals={'additionalDecodedOwnedLogicalBytes':33554432,'derivedOwnedLogicalBytes':4194304,'encodedOwnedLogicalBytes':67108864,'baselineApiTextureBytes':9007199254740991,'geometryOwnedCpuBytes':9007199254740991,'geometryApiBufferBytes':9007199254740991,'sampledAllocationsAndReservationsAllOwners':4,'rootsAllOwners':2,'trianglesAllOwners':50000,'cellsAllOwners':1024,'residentMarksAllOwners':1024,'appearanceMaterialsAllOwners':64,'contributorsPerBin':8,'binReferencesAllOwners':32768}
d['BrowserTotals']=obj({k:count(v) for k,v in totals.items()})
d['BrowserProfiles']=obj({k:const(v) for k,v in {'host':'nautilus-tile-authoring-c2-browser-owned-host-v1','appearance':'owner-local-rectangle-appearance-v1','ledger':'browser-owned-appearance-transition-v1','accounting':'nautilus-browser-owned-appearance-accounting@1','decoder':'png-rgba8-srgb-straight-v1','sampler':'linear-premultiplied-bilinear-frame-v1','clip':'candidate.level-rectangle-top-v1'}.items()})
d['BrowserContentUpdate']=obj({'kind':const('nautilus-browser-owned-content-update'),'version':const(1),**binding,**stamp,'receiptId':c('id'),'requestId':c('id'),'allocationId':c('id'),'beforeRevision':count(),'afterRevision':count(),'sourceProtectedRegionsDigest':c('digest'),'admittedWriteRegionsDigest':c('digest'),'observationDigest':c('digest')})
d['BrowserResourceCatalogueBinding']=obj({'catalogueDigest':const(catalogueDigest),'sourceCommit':const(catalogue['sourceCommit']),'sourceSha256':const(catalogue['sourceSha256'])})
d['BrowserLedger']=obj({'resourceCatalogue':r('BrowserResourceCatalogueBinding'),'kind':const('nautilus-browser-owned-appearance-ledger'),'version':const(1),**binding,'ownerLifetimeId':c('id'),'mutationEpoch':count(),'rendererContextId':c('id'),'rendererContextEpoch':count(),'scopeDigest':c('digest'),'baselineInventoryDigest':c('digest'),'preservedObjectsDigest':c('digest'),'allocations':arr(r('BrowserAllocation')),'references':arr(r('BrowserReference')),'materials':arr(r('BrowserMaterial'),128),'geometry':r('BrowserGeometry'),'rangeLeases':arr(r('BrowserRangeLease')),'residency':copy.deepcopy(abi['LedgerObservation']['properties']['residency']),'bins':copy.deepcopy(abi['LedgerObservation']['properties']['bins']),'totals':r('BrowserTotals'),'releaseReceipts':arr(r('BrowserReleaseReceipt'),64),'fulfillmentReceipts':arr(r('BrowserFulfillmentReceipt'),64),'contentUpdates':arr(r('BrowserContentUpdate'),64),'opaque':r('Opaque')})
coverage=load(f/'coverage.json');raw=coverage['rawCeilings'];d['WorkAmount']=obj({k:count() for k in raw});d['WorkCeilings']=obj({k:count(v) for k,v in raw.items()})
d['ReferenceAmount']=obj({k:count() for k in ['charged','reserved','unresolved','conservativeCharged']})
d['AttemptBudgetStamp']=obj({'ownerId':c('id'),'attemptId':c('id'),'requestId':c('id'),'purpose':{'enum':['authoring','outcome-recovery','presentation-retry']},'phase':{'type':'string','minLength':1,'maxLength':32},'sequence':count(),'sourceDigest':nullable(c('digest')),'observationId':c('id'),'observationDigest':c('digest')})
def qualify(v):
 if isinstance(v,dict):
  if isinstance(v.get('$ref'),str) and v['$ref'].startswith('#/$defs/'):v['$ref']=A+v['$ref'].split('/')[-1]
  for x in v.values():qualify(x)
 elif isinstance(v,list):
  for x in v:qualify(x)
def oldprops(n):
 p=copy.deepcopy(abi[n]['properties']);qualify(p);return p
p=oldprops('SourceCapture');p.update({'kind':const('nautilus-tile-authoring-browser-source-capture'),'profiles':r('BrowserProfiles'),'ledger':r('BrowserLedger'),**binding,'attemptBudget':r('AttemptBudgetStamp'),'resourceCatalogue':r('BrowserResourceCatalogueBinding')});d['BrowserSourceCapture']=obj(p)
p=oldprops('AppearancePlan');p.update({'kind':const('nautilus-tile-authoring-browser-appearance-plan'),'version':const(1),**binding,'sourceCapture':r('BrowserSourceCapture'),'attemptBudget':r('AttemptBudgetStamp')});d['BrowserAppearancePlan']=obj(p)
p=oldprops('CapacityBound');p.update({'kind':const('nautilus-tile-authoring-browser-capacity-bound'),**binding,**d['BrowserCapacitySourceStamp']['properties'],'planDigest':c('digest'),'attemptBudget':r('AttemptBudgetStamp'),'basis':const('conservative-headless-data-bound')});d['BrowserCapacityBound']=obj(p)
d['BrowserLedgerStep']=obj({'eventId':c('id'),'action':{'enum':['acquire','admit','fulfill-reservation','content-update','release-logical','release-unverified','context-ended','prune-released']},'ownerRequestId':c('id'),'ledger':r('BrowserLedger')})
p=oldprops('PreparedCapture');p.pop('planningCarry');p.update({'kind':const('nautilus-tile-authoring-browser-prepared-capture'),**binding,'profiles':r('BrowserProfiles'),'sourceGeometry':r('BrowserGeometry'),'admittedGeometry':r('BrowserGeometry'),'candidateBaseView':nullable(r('BrowserCandidateView')),'capacityBound':r('BrowserCapacityBound'),'ledgerTrace':arr(r('BrowserLedgerStep'),64),'peakTotals':r('BrowserTotals'),'attemptBudget':r('AttemptBudgetStamp')});d['BrowserPreparedCapture']=obj(p)
p=oldprops('RecoveryRetention');p.update({'kind':const('nautilus-tile-authoring-browser-recovery-retention'),**binding,'candidateBaseView':nullable(r('BrowserCandidateView')),'retainedLedger':r('BrowserLedger'),'attemptBudget':r('AttemptBudgetStamp')});d['BrowserRecoveryRetention']=obj(p)
p=oldprops('CandidateRetirementObservation');p.pop('retirementReceiptDigest');p.update({'kind':const('nautilus-tile-authoring-browser-candidate-release'),**binding,'sourceGeometry':r('BrowserGeometry'),'candidateBaseView':r('BrowserCandidateView'),'outcome':{'enum':['logical-released','unverified']},'releaseReceipt':nullable(r('BrowserReleaseReceipt')),'finalLedger':r('BrowserLedger'),'attemptBudget':r('AttemptBudgetStamp')});d['BrowserCandidateRelease']=obj(p)
d['BrowserAuthoringTarget']=obj({'kind':const('nautilus-tile-authoring-browser-target'),'version':const(1),'ok':const(True),'committable':const(False),**binding,'requestId':c('id'),'targetDocument':c('workbenchDocument'),'bindings':c('bindings'),'fingerprints':copy.deepcopy(abi['AppearancePlan']['properties']['fingerprints']),'tilePreparation':const('source-unchanged'),'costBounds':c('costBounds'),'attemptBudget':r('AttemptBudgetStamp')});qualify(d['BrowserAuthoringTarget']['properties']['fingerprints'])
# Only browser or harmless original data records can appear in browser containers.
for name in ['BrowserPreparedFieldPatch','BrowserCapacityFieldPatch','BrowserBudgetBinding','BrowserBudgetObservation','BrowserBudgetCounters'] :d.pop(name,None)
schema={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:nautilus:private:browser-owned-core:1','description':'Closed PRIVATE candidate data family. No Host/native adoption or write authority. Profile equality, ownership, totals, byte/layout/transition/attempt equations require the actual producer guards. Strict Plan2/Capacity1/C0 untouched.','$defs':d}
def canon(v):return '['+','.join(canon(x) for x in v)+']' if isinstance(v,list) else '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+canon(v[k]) for k in sorted(v))+'}' if isinstance(v,dict) else json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v):return hashlib.sha256(canon(v).encode()).hexdigest()
def write(name,v):(f/name).write_bytes((json.dumps(v,indent=2)+'\n').encode())
write('browser.schema.json',schema)
contracts={'status':'PRIVATE data producer/validators; Host/Native/codec UNBOUND','schemaId':schema['$id'],'schemaCanonicalSha256':sha(schema),'coverageCanonicalSha256':sha(coverage),'containers':[n for n in d if n.startswith('Browser')],'normalizedPolicy':{'ceiling':1000000,'rule':'one real owner gate plus ten independently capped raw domains; actual Core deltas only; decoder already covered by actual Artist workBytes is not added again'},'capacityBasis':'conservative headless data envelope bound, not real counted Host WAL','liveBindings':{'CoreReferenceSink':'BOUND','Host':'UNBOUND','Native':'UNBOUND','Artist':'UNBOUND','Decoder':'UNBOUND','actualCodec':'UNBOUND','publicRepair':'UNBOUND'},'strictFallback':'forbidden','counterCreditFromDTO':'forbidden','corePrivateHooks':['take','node','text','hash','readData','clone','output'],'phaseEscrows':'same-owner nonwithdrawable continuation escrow before acquisition; this component acquires no native resources','schemasFullyEnumerated':True,'coreByteDomains':coverage['rawDomainMapping'],'separateMonotonicFlowDomains':coverage['separateMonotonicFlowDomains'],'resourceCatalogue':{'catalogueDigest':catalogueDigest,'sourceCommit':catalogue['sourceCommit'],'sourceSha256':catalogue['sourceSha256']},'preCommandResources':'separately bounded resource scope, no authoring IDs or edit credit; stock observed by the subsequent attempt; actual acquisition UNBOUND here'}
write('contracts.json',contracts)
profile=load(f/'vendor/20118a84/docs/reviews/tile-authoring/architect/browser-accounting-v1/profile.json');profile.update({'contractsCanonicalSha256':sha(contracts),'coverageCanonicalSha256':sha(coverage),'attemptBudgetProfile':'browser-owned-reference-and-ten-raw-domains-v1','schemaId':schema['$id'],'schemaCanonicalSha256':sha(schema),'referenceWorkCeiling':1000000,'rawDomainCeilings':raw,'textureStoreRule':'base0 contiguous full mip chain; immutable storage generation/layout; content updates require same-owner source-protected-range receipt','candidateStatus':'PRIVATE headless data; Host/Native/codec UNBOUND','resourceCatalogue':contracts['resourceCatalogue']})
write('profile.json',profile);write('profile-digest.json',{'algorithm':'SHA256 UTF8 canonical JSON, sorted object keys, array order preserved','profileDigest':sha(profile),'contractsCanonicalSha256':sha(contracts),'schemaCanonicalSha256':sha(schema),'coverageCanonicalSha256':sha(coverage),'status':'PRIVATE candidate only, no public/native/Host adoption'})
# Explicit generated aliases for every closed browser definition. Existing C0 and
# harmless strict data shapes remain imported, not widened or reimplemented.
c0={'id':'string','digest':'string','workbenchDocument':'C0.WorkbenchDocument','bindings':'C0.Bindings','costBounds':'C0.CostBounds','command':'C0.Command','stackConstraints':'C0.StackConstraints','resourceRefs':'C0.ResourceRef[]'}
def typ(s):
 if '$ref'in s:
  ref=s['$ref'];name=ref.split('/')[-1]
  if ref.startswith('#/'):return name
  if ref.startswith(C):return c0.get(name,'unknown')
  if ref.startswith(A):return 'C0.'+name if name in ['AuthoringContext','AuthoringLimits'] else 'C0.AuthoringLimits' if name=='EffectiveLimits' else 'Strict.'+name
  return 'unknown'
 if 'const'in s:return json.dumps(s['const'],ensure_ascii=False)
 if 'enum'in s:return '|'.join(json.dumps(x) for x in s['enum'])
 if 'oneOf'in s:return '('+'|'.join(typ(x) for x in s['oneOf'])+')'
 t=s.get('type')
 if t=='object':return '{'+';'.join(json.dumps(k)+('' if k in s.get('required',[]) else '?')+':'+typ(v) for k,v in s.get('properties',{}).items())+'}'
 if t=='array':return '('+typ(s.get('items',{}))+')[]'
 return {'string':'string','integer':'number','number':'number','boolean':'boolean','null':'null'}.get(t,'unknown')
lines=['/** GENERATED private closed browser data family; no authority from DTOs. */',"import type * as C0 from '../../../../../packages/tile-authoring-core/index.js';","import type * as Strict from '../abi/types.js';"]
for n,v in d.items():lines.append('export type '+n+'='+typ(v)+';')
(f/'types.d.ts').write_bytes(('\n'.join(lines)+'\n').encode())
print(json.dumps({'profileDigest':sha(profile),'definitions':len(d),'rawDomains':len(raw)}))
