"""Independent structural/portable-resource contract check, not an executor."""
import copy,hashlib,io,json,sys,zipfile,subprocess
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
fixed_input_dir=ROOT/'candidates/tile-authoring/core/inputs'
fixed_inputs=load(fixed_input_dir/'fixed-inputs.json')
for entry in fixed_inputs['metadata']:
 original=subprocess.check_output(['git','show',entry['commit']+':'+entry['path']],cwd=ROOT)
 assert (fixed_input_dir/entry['file']).read_bytes()==original and len(original)==entry['byteLength'] and hashlib.sha256(original).hexdigest()==entry['sha256']
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
document=load(ART/'document.json')
assert validators['workbenchDocument'].is_valid(document)
assert source['originalSourceJSON']==document['sourceJSON'] and source['revision']==document['contentRevision']
assert source['tileBundle']==document['tileBundle'] and source['authoring']==document['authoring'] and source['stackConstraints']==document['constraints']
assert document['floorBinding']['sourceSha256']==hashlib.sha256(document['sourceJSON'].encode()).hexdigest()
assert source['floorProfile']=={'id':document['floorBinding']['profile']['id'],'version':document['floorBinding']['profile']['version'],'floors':[{'id':f['id'],'elevationM':f['elevationM']} for f in document['floorBinding']['floors']]}
expected_refs=[]
for a in manifest['artwork']:
 b=a['body'];assert b['imageView']['pageDigest']==token(b['blob'])
 x,y,w,h=b['imageView']['frame']['rectPx'];assert 0<=x<x+w<=b['blob']['widthPx'] and 0<=y<y+h<=b['blob']['heightPx']
 expected_refs.append({'kind':'nautilus-artwork-resource-ref','version':1,'artwork':{k:a[k] for k in ['id','revision','contentDigest']},'imageViewDigest':token({'blob':b['blob'],'imageView':b['imageView']})})
assert document['resourceRefs']==sorted(expected_refs,key=lambda r:(r['artwork']['id'],r['artwork']['revision']))
mapping=load(ART/'artist-import-mapping.json');commit='f5bfda9ec0f639018ccfee2415b1f70502e77cae';assert mapping['sourceCommit']==commit
raw=lambda p:subprocess.check_output(['git','show',commit+':'+p],cwd=ROOT)
artist_bytes=raw(mapping['sourceManifest']['path']);artist=json.loads(artist_bytes)
assert hashlib.sha256(artist_bytes).hexdigest()==mapping['sourceManifest']['sha256']
notice_bytes=raw(mapping['sourceNotice']['path']);assert hashlib.sha256(notice_bytes).hexdigest()==mapping['sourceNotice']['sha256']
assert len(mapping['rows'])==len(artist['artworks'])==30
for row,a in zip(mapping['rows'],artist['artworks']):
 assert row['sourceArtwork']=={k:a[k] for k in ['id','version','digest']}
 assert row['sourceResource']==a['resource'] and row['sourceFrameId']==a['frameId']
 page=next(r for r in artist['resources'] if {k:r[k] for k in ['id','version','sha256']}==a['resource'])
 frame=next(f for f in page['atlas']['frames'] if f['id']==a['frameId'])
 core=resolve(row['corePin']);b=core['body'];view=b['imageView']
 assert view['frame']=={'id':frame['id'],'rectPx':frame['rectPx'],'origin':'top-left','imageTop':'local-positive-v'}
 assert view['sampler']=={'profile':'linear-premultiplied-bilinear-frame-v1','alphaFloor8':page['alpha']['zeroAtOrBelow8'],'mipmaps':False,'stampOutside':'transparent','detailWrap':'repeat-frame'}
 assert b['blob']['sha256']==page['sha256'] and b['blob']['mediaType']==page['mediaType']
 assert [b['blob']['widthPx'],b['blob']['heightPx']]==[page['width'],page['height']]
 assert row['imageViewDigest']==token({'blob':b['blob'],'imageView':view})
 assert b['notices'][0]['noticeText'].encode()==notice_bytes
 assert row['graphicDefaults']['pivotUV']==a['pivotUV'] and row['graphicDefaults']['sizeM']==a['frameSizeM']
pack=load(ART/'pack-manifest.json');blobs={}
for entry in pack['blobEntries']:
 blob=(ART/'blobs'/(entry['sha256']+'.png')).read_bytes();assert hashlib.sha256(blob).hexdigest()==entry['sha256'] and len(blob)==entry['byteLength']
 b=next(a['body']['blob'] for a in pack['manifest']['artwork'] if a['body']['blob']['sha256']==entry['sha256'])
 assert blob[:8]==b'\x89PNG\r\n\x1a\n' and int.from_bytes(blob[16:20],'big')==b['widthPx'] and int.from_bytes(blob[20:24],'big')==b['heightPx']
 blobs[entry['entry']]=blob
assert len(blobs)==3
assert (ROOT/'assets/buildings/painted-materials-v2.png').read_bytes()==blobs[pack['blobEntries'][0]['entry']]
for r in artist['resources']:assert raw('candidates/tile-authoring/art/'+r['uri'])==blobs['blobs/'+r['sha256']+'.png']
manifest_bytes=(json.dumps(pack,ensure_ascii=False,separators=(',',':'))+'\n').encode()
def archive(entries):
 stream=io.BytesIO()
 with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_STORED) as z:
  for name,data in entries:
   info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));z.writestr(info,data)
 return stream.getvalue()
def reopen(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  names=z.namelist();assert len(names)==len(set(names));assert set(names)=={'manifest.json',*blobs}
  assert all(not n.startswith(('/', '\\')) and '..' not in n.split('/') and ':' not in n for n in names)
  p=json.loads(z.read('manifest.json'));assert validators['pack'].is_valid(p);assert p==pack
  for e in p['blobEntries']:
   b=z.read(e['entry']);assert len(b)==e['byteLength'] and hashlib.sha256(b).hexdigest()==e['sha256']
 return True
entries=[('manifest.json',manifest_bytes),*blobs.items()];packed=archive(entries);assert reopen(packed)
mutations=[('missing-blob',entries[:1]),('changed-blob',[entries[0],(entries[1][0],b'broken'),*entries[2:]]),('extra-traversal-entry',entries+[('../foreign',b'x')]),('duplicate-entry',entries+[entries[1]])]
controls=[]
for name,items in mutations:
 try:reopen(archive(items))
 except (AssertionError,KeyError):controls.append({'name':name,'actualArchiveRejected':True})
 else:raise AssertionError('Invalid actual archive accepted: '+name)
(ART/'portable-pack.zip').write_bytes(packed)
report={'schemaVersion':1,'status':'contract-shape/reference/portable-bytes-proof; no authoring runtime','validator':{'name':'jsonschema','version':version('jsonschema'),'draft':'2020-12'},'candidateSchemas':1,'publicV1SchemasBorrowed':len(public),'cases':len(cases),'recordDigestsChecked':len(records),'placedMarksChecked':len(marks),'pack':{'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'completeBlobs':len(pack['blobEntries']),'rawAssetBytesPreserved':True,'artistFramesExplicitlyMapped':len(mapping['rows']),'artistManifestSha256':mapping['sourceManifest']['sha256'],'originalNoticeBytesPreserved':True,'decodePerformed':False,'archiveMutations':controls},'backgroundHelpers':0}
(ART/'independent-report.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({'schemas':1,'borrowedV1Schemas':len(public),'cases':len(cases),'immutableRecords':len(records),'portableBlobs':len(blobs),'archiveMutationRejections':len(controls),'runtimeImplemented':False}))
