"""Offline structural proposal check only; never a combined/producer executor."""
import argparse,copy,json,sys
from pathlib import Path
from importlib.metadata import version
root=Path(__file__).resolve().parents[5]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--dependencies',required=True,help='Existing isolated jsonschema==4.23.0 package directory')
args=parser.parse_args();sys.path.insert(0,str(Path(args.dependencies).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry,Resource
assert version('jsonschema')=='4.23.0'
load=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
paths=['candidates/tile-authoring/core/c2/contract.schema.json','candidates/tile-authoring/core/c2/abi/proposal.schema.json','candidates/tile-authoring/core/c2/proposals/combined-route.schema.json','candidates/tile-authoring/core/c2/proposals/surface-target.schema.json',*[f'packages/tiles-core/{x}-v1.schema.json' for x in ['tile-recipe','tile-layout','tile-bundle']]]
schemas=[load(p) for p in paths]
registry=Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in schemas)
for schema in schemas:Draft202012Validator.check_schema(schema)
core,abi,combined,surface=schemas[:4]
def validator(schema,name):return Draft202012Validator({'$ref':schema['$id']+'#/$defs/'+name},registry=registry)
doc=load('candidates/tile-authoring/core/c2/fixtures/stage-b-golden-save.json')
binding=doc['authoring']['decorations']['surfaces'][0];seed={k:x for k,x in binding.items() if k!='layers'}
# Deliberately only a structural source-digest placeholder, never a stale-source
# or live authority positive. Semantic acceptance still requires implementation.
source={'document':doc,'expectedSource':{'hostDocumentDigest':'a'*64,'workspaceRevision':doc['contentRevision']},'selection':{'ownerId':binding['ownerId'],'surfaceId':binding['surfaceId'],'definition':binding['definition']}}
assert validator(surface,'SurfaceTargetInput').is_valid(source)
assert validator(surface,'SurfaceBindingSeed').is_valid(seed)
assert validator(core,'surfaceBinding').is_valid(binding)
cases=3
for mutate in [lambda x:x.pop('expectedSource'),lambda x:x['selection'].update({'bindingDigest':'a'*64}),lambda x:x.update({'query':{'kind':'surface.target'}}),lambda x:x['selection']['definition'].update({'contentDigest':'bad'})]:
 bad=copy.deepcopy(source);mutate(bad);assert not validator(surface,'SurfaceTargetInput').is_valid(bad);cases+=1
bad={**seed,'layers':[]};assert not validator(surface,'SurfaceBindingSeed').is_valid(bad);cases+=1
assert not validator(core,'surfaceBinding').is_valid(bad);cases+=1
for k in ['maxSteps','maxClosure','maxSpatialTests','maxGeometryWork']:assert combined['$defs']['PublicRequestSubset']['properties'][k]['minimum']==1
print(json.dumps({'status':'pass','validator':'jsonschema==4.23.0','offlineDraft202012Schemas':len(schemas),'structuralCases':cases,'scope':'Schema structure and closed vocabulary only; no digest/lock/work/live ownership or proposed runtime proof.'}))
