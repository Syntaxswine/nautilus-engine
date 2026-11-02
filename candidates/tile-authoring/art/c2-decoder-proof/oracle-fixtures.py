import os, sys, json, struct, zlib, hashlib, platform, datetime, ctypes
from pathlib import Path
from PIL import Image, __version__ as pillow_version
import threading
watchdog=threading.Timer(30,lambda:os._exit(124));watchdog.daemon=True;watchdog.start()
ROOT=Path.cwd(); OUT=ROOT/os.environ.get('NAUTILUS_PROOF_OUTPUT','artifacts/art-c2-decoder-proof/latest'); (OUT/'fixtures').mkdir(parents=True,exist_ok=True); (OUT/'oracle').mkdir(exist_ok=True)
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
class FT(ctypes.Structure): _fields_=[('lo',ctypes.c_uint32),('hi',ctypes.c_uint32)]
a,b,c,d=FT(),FT(),FT(),FT()
from ctypes import wintypes
K=ctypes.WinDLL('kernel32',use_last_error=True);K.GetCurrentProcess.restype=wintypes.HANDLE;K.GetProcessTimes.argtypes=[wintypes.HANDLE,ctypes.POINTER(FT),ctypes.POINTER(FT),ctypes.POINTER(FT),ctypes.POINTER(FT)];K.GetProcessTimes.restype=wintypes.BOOL
if not K.GetProcessTimes(K.GetCurrentProcess(),ctypes.byref(a),ctypes.byref(b),ctypes.byref(c),ctypes.byref(d)): raise ctypes.WinError(ctypes.get_last_error())
assert ((a.hi<<32)|a.lo)>0
helper={'owner':'Nautilus Artist','purpose':'Independent Pillow/zlib PNG oracle and synthetic decoder fixtures','pid':os.getpid(),'creationFiletime':str((a.hi<<32)|a.lo),'executable':sys.executable,'startedAt':now(),'endCondition':'Exit after oracle/fixture files written;self-exit30s watchdog','status':'running','ports':[],'restart':{'cwd':str(ROOT),'arguments':[str(ROOT/'candidates/tile-authoring/art/c2-decoder-proof/oracle-fixtures.py')]}}
(OUT/'oracle-helper.json').write_text(json.dumps(helper,indent=2)+'\n',encoding='utf8')
if os.environ.get('NAUTILUS_PROOF_START_FILE'):
    import time
    while not Path(os.environ['NAUTILUS_PROOF_START_FILE']).exists(): time.sleep(.01)
sha=lambda b:hashlib.sha256(b).hexdigest()
def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
sig=b'\x89PNG\r\n\x1a\n'
def ihdr(w,h,depth=8,color=6,interlace=0): return struct.pack('>IIBBBBB',w,h,depth,color,0,0,interlace)
def png(w,h,stream,extra_before=b'',extra_after=b'',split=None,header=None):
    parts=[stream] if split is None else [stream[i:i+split] for i in range(0,len(stream),split)]
    return sig+chunk(b'IHDR',header or ihdr(w,h))+extra_before+b''.join(chunk(b'IDAT',p) for p in parts)+extra_after+chunk(b'IEND',b'')
def rgba(w,h): return bytes((i*37+(i//4)*13+(i//(w*4))*17)%256 for i in range(w*h*4))
def paeth(a,b,c):
    p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
    return a if pa<=pb and pa<=pc else b if pb<=pc else c

def filtered(raw,w,h,filters):
    stride=w*4;out=bytearray();prev=bytes(stride)
    for j in range(h):
        row=raw[j*stride:(j+1)*stride];f=filters[j%len(filters)];out.append(f)
        for i,v in enumerate(row):
            a=row[i-4] if i>=4 else 0;b=prev[i];c=prev[i-4] if i>=4 else 0
            p=[0,a,b,(a+b)//2,paeth(a,b,c)][f];out.append((v-p)&255)
        prev=row
    return bytes(out)
positive=[];negative=[]
def add_pos(name,w,h,filters=[0],split=None,level=6,strategy=None,ancillary=False):
    raw=rgba(w,h);data=filtered(raw,w,h,filters)
    if strategy is None: stream=zlib.compress(data,level)
    else:
        co=zlib.compressobj(level,zlib.DEFLATED,15,8,strategy);stream=co.compress(data)+co.flush()
    image=png(w,h,stream,chunk(b'caBX',b'fixture-metadata') if ancillary else b'',split=split)
    p=OUT/'fixtures'/f'{name}.png';p.write_bytes(image)
    with Image.open(p) as im:
        im.load(); assert im.mode=='RGBA'; oracle=im.tobytes(); assert oracle==raw
    op=OUT/'oracle'/f'{name}.rgba';op.write_bytes(oracle)
    positive.append({'name':name,'input':str(p.relative_to(ROOT)).replace('\\','/'),'rgba':str(op.relative_to(ROOT)).replace('\\','/'),'width':w,'height':h,'encodedBytes':len(image),'encodedSha256':sha(image),'rgbaBytes':len(oracle),'rgbaSha256':sha(oracle),'filters':filters,'independentDecoder':'Pillow'})

for f in range(5): add_pos(f'filter-{f}',31,7,[f])
add_pos('all-filters',29,20,list(range(5)),ancillary=True)
add_pos('tiny-straight',1,1)
add_pos('idat-byte-split',9,5,[0,1,2,3,4],split=1)
add_pos('stored-block',73,61,[0,1,2,3,4],level=0)
add_pos('fixed-huffman',73,61,[4],strategy=zlib.Z_FIXED)
add_pos('dynamic',113,83,[4])
inputs=json.loads((ROOT/'candidates/tile-authoring/art/c2-decoder-proof/inputs.json').read_text(encoding='utf-8-sig'))
golden=json.loads((ROOT/'candidates/tile-authoring/art/c2-decoder-proof/golden-oracle.json').read_text(encoding='utf-8-sig'))
assert sha(Path(__file__).read_bytes())==golden['oracleCode']['candidateSha256']
for key,value in {'python':platform.python_version(),'pillow':pillow_version,'zlibCompile':zlib.ZLIB_VERSION,'zlibRuntime':zlib.ZLIB_RUNTIME_VERSION}.items(): assert value==golden['oracle'][key],(key,value,golden['oracle'][key])
for r in inputs['art']:
    p=ROOT/r['path'];image=p.read_bytes();assert sha(image)==r['sha256']
    with Image.open(p) as im:
        im.load();assert im.mode=='RGBA';raw=im.tobytes();w,h=im.size
    name=Path(r['path']).stem;g=next(g for g in golden['originals'] if g['name']==name);assert (w,h,len(image),sha(image),len(raw),sha(raw))==(g['width'],g['height'],g['encodedBytes'],g['encodedSha256'],g['rgbaBytes'],g['rgbaSha256']);op=OUT/'oracle'/f'{name}.rgba';op.write_bytes(raw)
    positive.append({'name':name,'input':r['path'],'rgba':str(op.relative_to(ROOT)).replace('\\','/'),'width':w,'height':h,'encodedBytes':len(image),'encodedSha256':sha(image),'rgbaBytes':len(raw),'rgbaSha256':sha(raw),'original':True,'independentDecoder':'Pillow'})

raw=b'\0\x21\x42\x63\x84';zs=zlib.compress(raw);basic=png(1,1,zs)
def add_neg(name,data,codes):
    p=OUT/'fixtures'/f'{name}.png';p.write_bytes(data);negative.append({'name':name,'input':str(p.relative_to(ROOT)).replace('\\','/'),'expectedCodes':codes,'bytes':len(data),'sha256':sha(data)})
add_neg('signature',b'X'+basic[1:],['PNG_SIGNATURE'])
add_neg('crc',basic[:20]+bytes([basic[20]^1])+basic[21:],['PNG_CRC'])
add_neg('adler',png(1,1,zs[:-1]+bytes([zs[-1]^1])),['PNG_ADLER'])
add_neg('zlib-truncated',png(1,1,zs[:-2]),['PNG_ZLIB_TRUNCATED'])
add_neg('zlib-trailing',png(1,1,zs+b'junk'),['PNG_ZLIB_TRAILING'])
add_neg('zlib-concatenated',png(1,1,zs+zs),['PNG_ZLIB_TRAILING'])
add_neg('png-trailing',basic+b'junk',['PNG_TRAILING_BYTES'])
add_neg('truncated-chunk',basic[:-5],['PNG_TRUNCATED_CHUNK','PNG_CHUNK_BOUNDS'])
add_neg('missing-iend',basic[:-12],['PNG_MISSING_IEND'])
add_neg('invalid-filter',png(1,1,zlib.compress(b'\x05'+raw[1:])),['PNG_FILTER'])
add_neg('short-output',png(1,1,zlib.compress(raw[:-1])),['PNG_OUTPUT_LENGTH'])
add_neg('output-bomb',png(1,1,zlib.compress(b'\0'*1_000_000)),['PNG_OUTPUT_OVERRUN'])
add_neg('dimension-bomb',png(100000,100000,zs),['PNG_DIMENSIONS'])
add_neg('zero-dimension',png(0,1,zs),['PNG_DIMENSIONS'])
for name,h in [('rgb',ihdr(1,1,color=2)),('depth16',ihdr(1,1,depth=16)),('interlace',ihdr(1,1,interlace=1))]:add_neg(name,png(1,1,zs,header=h),['PNG_PROFILE_UNBOUND'])
add_neg('apng',png(1,1,zs,extra_before=chunk(b'acTL',struct.pack('>II',1,0))),['PNG_PROFILE_UNBOUND'])
add_neg('critical',png(1,1,zs,extra_before=chunk(b'ABCD',b'')),['PNG_CRITICAL_UNBOUND'])
add_neg('reserved-bit',png(1,1,zs,extra_before=chunk(b'caxX',b'')),['PNG_CHUNK_TYPE'])
add_neg('duplicate-ihdr',png(1,1,zs,extra_before=chunk(b'IHDR',ihdr(1,1))),['PNG_IHDR'])
add_neg('nonconsecutive-idat',sig+chunk(b'IHDR',ihdr(1,1))+chunk(b'IDAT',zs[:3])+chunk(b'teXT',b'x')+chunk(b'IDAT',zs[3:])+chunk(b'IEND',b''),['PNG_IDAT_ORDER'])
co=zlib.compressobj(zdict=b'dictionary');dictionary=co.compress(raw)+co.flush();add_neg('dictionary',png(1,1,dictionary),['PNG_DICTIONARY_UNBOUND'])
import gzip
add_neg('gzip',png(1,1,gzip.compress(raw,mtime=0)),['PNG_ZLIB_DATA'])
add_neg('bad-deflate',png(1,1,b'\x78\x9c\x07\0\0\0\0'),['PNG_ZLIB_DATA'])
# Empty valid stored blocks:bounded compressed-input/work stress without output.
stream=b'\x78\x01'+b'\0\0\0\xff\xff'*20000+b'\x01\x05\0\xfa\xff'+raw+struct.pack('>I',zlib.adler32(raw)&0xffffffff)
(OUT/'fixtures/work-bomb.png').write_bytes(png(1,1,stream))
report={'oracle':{'python':platform.python_version(),'executable':sys.executable,'pillow':pillow_version,'zlibCompile':zlib.ZLIB_VERSION,'zlibRuntime':zlib.ZLIB_RUNTIME_VERSION,'scope':'Independent raw RGBA decoder; no colour conversion/image editing'},'positive':positive,'negative':negative,'workBomb':str((OUT/'fixtures/work-bomb.png').relative_to(ROOT)).replace('\\','/')}
(OUT/'fixture-index.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
helper.update(status='completed',finishedAt=now(),outputs=['fixture-index.json','fixtures/','oracle/']);(OUT/'oracle-helper.json').write_text(json.dumps(helper,indent=2)+'\n',encoding='utf8')
print(json.dumps({'positive':len(positive),'negative':len(negative),'originalFullRGBA':sum(p['rgbaBytes'] for p in positive if p.get('original')),'oracle':report['oracle']}))

watchdog.cancel()
