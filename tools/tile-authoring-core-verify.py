"""Independent structural/portable-resource contract check, not an executor."""
import copy,hashlib,io,json,sys,zipfile
from decimal import Decimal
from pathlib import Path
from importlib.metadata import version
ROOT=Path(__file__).resolve().parent.parent
if len(sys.argv)==3 and sys.argv[1]=='--dependencies':sys.path.insert(0,str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry,Resource
assert version('jsonschema')=='4.23.0','Use the existing isolated jsonschema==4.23.0 checker'
ART=ROOT/'artifacts/tile-authoring-core'
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
contract=load(ROOT/'candidates/tile-authoring/core/contract.schema.json')
public=[load(ROOT/'packages/tiles-core'/f'{name}-v1.schema.json') for name in ['tile-recipe','tile-layout','tile-bundle','compiled-tiles']]
registry=Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in [contract,*public])
for s in [contract,*public]:Draft202012Validator.check_schema(s)
validators={k:Draft202012Validator({'$ref':contract['$id']+'#/$defs/'+k},registry=registry) for k in contract['$defs']}
cases=load(ART/'schema-cases.json')
for c in cases:
 errors=list(validators[c['schema']].iter_errors(c['value']))
 assert bool(errors)!=c['valid'],(c['label'],[e.message for e in errors[:2]])
# Whole-string identities are strict, including a newline after valid ASCII.
for name,value in [('id','valid\n'),('digest','a'*64+'\n')]:assert not validators[name].is_valid(value),name

def canonical(v):
 if v is None or isinstance(v,(bool,str)):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
 if isinstance(v,(int,float,Decimal)):
  d=Decimal(str(v))
  assert d.is_finite()
  if not d:return '0'
  if -6<=d.adjusted()<21:
   s=format(d,'f');return s.rstrip('0').rstrip('.') if '.' in s else s
  sign,digits,exponent=d.normalize().as_tuple();s=''.join(map(str,digits));power=len(s)+exponent-1
  return ('-' if sign else '')+s[0]+('.'+s[1:] if len(s)>1 else '')+'e'+('+' if power>=0 else '')+str(power)
 if isinstance(v,list):return '['+','.join(map(canonical,v))+']'
 return '{'+','.join(canonical(k)+':'+canonical(v[k]) for k in sorted(v,key=lambda k:k.encode('utf-16-be')))+'}'
def token(v):return hashlib.sha256(canonical(v).encode()).hexdigest()
def record_digest(r):return token({k:v for k,v in r.items() if k!='contentDigest'})
source=load(ART/'source.json');manifest=source['authoring']['library'];records=manifest['definitions']+manifest['presets']+manifest['artwork']
refs={}
for r in records:
 key=(r['id'],r['revision']);assert key not in refs;assert record_digest(r)==r['contentDigest'];refs[key]=r
resolve=lambda p:refs[(p['id'],p['revision'])] if refs[(p['id'],p['revision'])]['contentDigest']==p['contentDigest'] else (_ for _ in ()).throw(AssertionError('reference digest'))
for p in manifest['presets']:
 resolve(p['body']['definition'])
 for m in p['body']['defaultMarks']:resolve(m['graphic']['artwork'])
for d in manifest['definitions']:
 for s in d['body']['surfaces']:
  assert s['geometryDigest']==token({'profile':s['profile'],'frame':d['body']['recipe']['frame'],'shape':d['body']['recipe']['shape']})
  assert s['frameDigest']==token({k:v for k,v in s.items() if k!='frameDigest'})
marks=[m for c in source['authoring']['decorations']['chunks'] for m in c['marks']]
assert len(marks)==1 and marks[0]['target']['ownerId']=='owner.a'
assert not any(s['ownerId']=='owner.b' for s in source['authoring']['decorations']['surfaces'])
for m in marks:resolve(m['graphic']['artwork'])
pack=load(ART/'pack-manifest.json');blob=(ART/'blob.png').read_bytes();entry=pack['blobEntries'][0]
assert hashlib.sha256(blob).hexdigest()==entry['sha256'] and len(blob)==entry['byteLength']
artwork=pack['manifest']['artwork'][0]['body']['blob']
assert blob[:8]==b'\x89PNG\r\n\x1a\n' and int.from_bytes(blob[16:20],'big')==artwork['widthPx'] and int.from_bytes(blob[20:24],'big')==artwork['heightPx']
assert (ROOT/'assets/buildings/painted-materials-v2.png').read_bytes()==blob
manifest_bytes=(json.dumps(pack,ensure_ascii=False,separators=(',',':'))+'\n').encode()
def archive(entries):
 stream=io.BytesIO()
 with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_STORED) as z:
  for name,data in entries:
   info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));z.writestr(info,data)
 return stream.getvalue()
def reopen(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  names=z.namelist();assert len(names)==len(set(names));assert set(names)=={'manifest.json',entry['entry']}
  assert all(not n.startswith(('/', '\\')) and '..' not in n.split('/') and ':' not in n for n in names)
  p=json.loads(z.read('manifest.json'));assert validators['pack'].is_valid(p);assert p==pack
  for e in p['blobEntries']:
   b=z.read(e['entry']);assert len(b)==e['byteLength'] and hashlib.sha256(b).hexdigest()==e['sha256']
 return True
entries=[('manifest.json',manifest_bytes),(entry['entry'],blob)];packed=archive(entries);assert reopen(packed)
mutations=[('missing-blob',entries[:1]),('changed-blob',[entries[0],(entry['entry'],b'broken')]),('extra-traversal-entry',entries+[('../foreign',b'x')]),('duplicate-entry',entries+[entries[1]])]
controls=[]
for name,items in mutations:
 try:reopen(archive(items))
 except (AssertionError,KeyError):controls.append({'name':name,'actualArchiveRejected':True})
 else:raise AssertionError('Invalid actual archive accepted: '+name)
(ART/'portable-pack.zip').write_bytes(packed)
report={'schemaVersion':1,'status':'contract-shape/reference/portable-bytes-proof; no authoring runtime','validator':{'name':'jsonschema','version':version('jsonschema'),'draft':'2020-12'},'candidateSchemas':1,'publicV1SchemasBorrowed':len(public),'cases':len(cases),'recordDigestsChecked':len(records),'placedMarksChecked':len(marks),'pack':{'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'completeBlobs':len(pack['blobEntries']),'rawAssetBytesPreserved':True,'decodePerformed':False,'archiveMutations':controls},'backgroundHelpers':0}
(ART/'independent-report.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({'schemas':1,'borrowedV1Schemas':len(public),'cases':len(cases),'immutableRecords':len(records),'portableBlobs':1,'archiveMutationRejections':len(controls),'runtimeImplemented':False}))
