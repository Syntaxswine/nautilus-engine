"""Independent offline schema/byte check of actual private producer results."""
import argparse,copy,json,subprocess,sys
from pathlib import Path
from importlib.metadata import version
root=Path(__file__).resolve().parents[4]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--dependencies',required=True)
args=parser.parse_args();sys.path.insert(0,str(Path(args.dependencies).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry,Resource
assert version('jsonschema')=='4.23.0'
prefix='candidates/tile-authoring/core/c2/'
paths=[prefix+'contract.schema.json',prefix+'abi/proposal.schema.json',prefix+'proposals/combined-route.schema.json',prefix+'proposals/surface-target.schema.json',prefix+'surface-target.schema.json',*[f'packages/tiles-core/{x}-v1.schema.json' for x in ['tile-recipe','tile-layout','tile-bundle']]]
schemas=[json.loads((root/p).read_text(encoding='utf-8')) for p in paths]
registry=Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in schemas)
for schema in schemas:Draft202012Validator.check_schema(schema)
runtime=schemas[4]
def validator(name):return Draft202012Validator({'$ref':runtime['$id']+'#/$defs/'+name},registry=registry)
script="""import {C,T,input,unpainted,painted} from './tools/tile-authoring-core-c2-surface-target-fixtures.mjs';
console.log(JSON.stringify([unpainted,painted].map(d=>{const args=input(d);return {args,result:C.deriveTileSurfaceTarget(T,args)};})));"""
options={'creationflags':subprocess.CREATE_NO_WINDOW} if sys.platform=='win32' else {}
data=json.loads(subprocess.check_output(['node','--input-type=module'],input=script.encode('utf-8'),cwd=root,**options))
cases=0
for row in data:
 assert validator('SurfaceTargetInput').is_valid(row['args']);cases+=1
 assert validator('SurfaceTargetResult').is_valid(row['result']);cases+=1
 exact=len(json.dumps(row['result'],ensure_ascii=False,separators=(',',':')).encode('utf-8'));assert exact==row['result']['work']['outputBytes'];cases+=1
 bad=copy.deepcopy(row['result']);bad['bindingSeed']['layers']=[];assert not validator('SurfaceTargetResult').is_valid(bad);cases+=1
 bad=copy.deepcopy(row['args']);bad['selection']['bindingDigest']='a'*64;assert not validator('SurfaceTargetInput').is_valid(bad);cases+=1
 bad=copy.deepcopy(row['result']);bad['committable']=True;assert not validator('SurfaceTargetResult').is_valid(bad);cases+=1
print(json.dumps({'status':'pass','validator':'jsonschema==4.23.0','offlineDraft202012Schemas':len(schemas),'genuineProducerInputResultCases':2,'structuralAndIndependentByteCases':cases,'scope':'Actual headless producer input/output closed shapes and independent final UTF-8 byte counts; no Host/native/renderer authority claim.'}))
