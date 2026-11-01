"""Independent Fraction vertical-slab oracle, not the C1 ray/sector algorithm.

Within each arrangement x slab every endpoint is affine in x. Equality at two
distinct interior x values proves interval equality throughout that slab. Closed
limits from both neighboring slabs check event lines, including point contacts.
Manual JS cases separately assert component/void/sector topology.
"""
import json
import sys
from fractions import Fraction as F
from pathlib import Path

def exact(v):
    return F.from_float(v) if isinstance(v, float) else F(v)

def decode(v):
    return F(int(v[0]), int(v[1]))

def sub(a, b):
    return (a[0]-b[0], a[1]-b[1])

def cross(a, b):
    return a[0]*b[1]-a[1]*b[0]

def at(segment, x):
    a, b = segment
    return a[1] + (b[1]-a[1])*(x-a[0])/(b[0]-a[0])

def source_data(source):
    nodes = {n['id']: n for n in source['shape']['nodes']}
    reached = set()
    def visit(key):
        if key in reached:
            return
        reached.add(key)
        n = nodes[key]
        for child in ([] if n['kind']=='leaf' else [n['baseId'], n['subtractId']] if n['kind']=='difference' else n['inputs']):
            visit(child)
    visit(source['shape']['rootId'])
    primitives = {}
    segments = []
    for key in sorted(reached):
        n = nodes[key]
        if n['kind'] != 'leaf':
            continue
        for ring in n['shape']['outlines']:
            for primitive in ring.get('segments', [ring]):
                p = tuple(tuple(exact(v) for v in primitive[k][:2]) for k in ('a','b'))
                tag = (key, n['shape']['id'], ring['id'], primitive['id'])
                primitives[tag] = p
                segments.append((p, key))
    def evaluate(bits):
        cache = {}
        def run(key):
            if key in cache:
                return cache[key]
            n = nodes[key]
            if n['kind']=='leaf':
                result = bits.get(key, False)
            elif n['kind']=='union':
                result = any(run(c) for c in n['inputs'])
            elif n['kind']=='intersection':
                result = all(run(c) for c in n['inputs'])
            else:
                result = run(n['baseId']) and not run(n['subtractId'])
            cache[key] = result
            return result
        return run(source['shape']['rootId'])
    return segments, primitives, evaluate

def critical_x(segments):
    xs = {p[0] for s in segments for p in s}
    for i, (a,b) in enumerate(segments):
        for c,d in segments[i+1:]:
            r, s, q = sub(b,a), sub(d,c), sub(c,a)
            den = cross(r,s)
            if den:
                t, u = cross(q,s)/den, cross(q,r)/den
                if 0 <= t <= 1 and 0 <= u <= 1:
                    xs.add(a[0]+t*r[0])
    return sorted(xs)

def interval_functions(tagged, x, evaluate):
    events = {}
    for segment, key in tagged:
        a,b = segment
        if min(a[0],b[0]) < x < max(a[0],b[0]):
            y = at(segment,x)
            events.setdefault(y, []).append((segment,key))
    bits, opened, result = {}, None, []
    for y, events_at_y in sorted(events.items()):
        before = evaluate(bits)
        for segment,key in events_at_y:
            bits[key] = not bits.get(key, False)
        after = evaluate(bits)
        if not before and after:
            opened = events_at_y[0][0]
        if before and not after:
            assert opened is not None
            result.append((opened,events_at_y[0][0]))
            opened = None
    assert opened is None
    return result

def section(functions, x):
    return [(at(a,x),at(b,x)) for a,b in functions]

def closed_union(intervals):
    result = []
    for a,b in sorted(intervals):
        assert a <= b
        if result and a <= result[-1][1]:
            result[-1] = (result[-1][0],max(b,result[-1][1]))
        else:
            result.append((a,b))
    return result

def classify(x, y, xs, slabs):
    if x in xs:
        i = xs.index(x)
        left = section(slabs[i-1],x) if i else []
        right = section(slabs[i],x) if i < len(slabs) else []
        closed = closed_union(left+right)
        if not any(a <= y <= b for a,b in closed):
            return 'exterior'
        return 'interior' if any(a < y < b for a,b in left) and any(a < y < b for a,b in right) else 'boundary'
    for i in range(len(xs)-1):
        if xs[i] < x < xs[i+1]:
            intervals = section(slabs[i],x)
            if any(a < y < b for a,b in intervals):
                return 'interior'
            return 'boundary' if any(a == y or b == y for a,b in intervals) else 'exterior'
    return 'exterior'

def connectivity(xs, slabs, empty=False, yrange=None):
    """Open bands connect across an event only through positive-length overlap.

    Thus corner/tangent contacts never become an interior connection. Empty
    bands use a strict exterior box; components reaching its boundary are the
    unbounded exterior, the remaining components are bounded voids.
    """
    bands = []
    for i,functions in enumerate(slabs):
        if not empty:
            bands.append(functions)
            continue
        lo,hi = yrange
        constant = lambda y: ((xs[0],y),(xs[-1],y))
        ends = [constant(lo)]
        for a,b in functions:
            ends += [a,b]
        ends.append(constant(hi))
        bands.append(list(zip(ends[0::2],ends[1::2])))
    parent = {}
    def find(k):
        parent.setdefault(k,k)
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k
    def join(a,b):
        parent[find(a)] = find(b)
    for i,intervals in enumerate(bands):
        for j,interval in enumerate(intervals):
            find((i,j))
            if i:
                a,b = (at(line,xs[i]) for line in interval)
                for k,previous in enumerate(bands[i-1]):
                    c,d = (at(line,xs[i]) for line in previous)
                    if max(a,c) < min(b,d):
                        join((i,j),(i-1,k))
    roots = {find(k) for k in parent}
    if not empty:
        return len(roots)
    exterior = set()
    for i,intervals in enumerate(bands):
        x = (xs[i]+xs[i+1])/2
        for j,(a,b) in enumerate(intervals):
            if i in (0,len(bands)-1) or at(a,x)==yrange[0] or at(b,x)==yrange[1]:
                exterior.add(find((i,j)))
    return len(roots-exterior)

def leaf_bits(tagged, p):
    bits = {}
    for (a,b),key in tagged:
        if (a[0]>p[0]) != (b[0]>p[0]):
            y = at((a,b),p[0])
            if y > p[1]:
                bits[key] = not bits.get(key,False)
    return bits

def side_witnesses(a,b,segments):
    m = ((a[0]+b[0])/2,(a[1]+b[1])/2)
    d = sub(b,a)
    n = (-d[1],d[0])
    epsilon = F(1)
    # This finite exact oracle probe is bounded away from every other source
    # line/endpoint, unlike the implementation's formal horizontal-ray probe.
    for p,q in segments:
        v = sub(q,p)
        c,k = cross(v,sub(m,p)),cross(v,n)
        if c and k:
            epsilon = min(epsilon,abs(c/k)/2)
        for endpoint in (p,q):
            for axis in (0,1):
                if n[axis] and endpoint[axis]!=m[axis]:
                    epsilon = min(epsilon,abs((endpoint[axis]-m[axis])/n[axis])/2)
    return tuple((m[0]+sign*epsilon*n[0],m[1]+sign*epsilon*n[1]) for sign in (1,-1))

def verify(case):
    result = case['result']
    assert result['resolution']['state'].startswith('resolved-'), (case['name'],result['resolution'])
    tagged, primitives, evaluate = source_data(result['source'])
    points = {p['id']: tuple(decode(v) for v in p['point']) for p in result['geometry']['vertices']}
    output = [(points[e['from']], points[e['to']]) for e in result['geometry']['edges']]
    source_segments = [s for s,key in tagged]
    xs = critical_x(source_segments+output)
    xs = [xs[0]-1]+xs+[xs[-1]+1]
    expected_slabs, actual_slabs, area = [], [], F(0)
    for left,right in zip(xs,xs[1:]):
        mid = (left+right)/2
        expected = interval_functions(tagged,mid,evaluate)
        actual = interval_functions([(s,'root') for s in output],mid,lambda bits: bits.get('root',False))
        for x in ((2*left+right)/3,(left+2*right)/3):
            assert section(expected,x) == section(actual,x), (case['name'],'slab mismatch',str(x))
        area += (right-left)*sum((b-a for a,b in section(expected,mid)),F(0))
        expected_slabs.append(expected)
        actual_slabs.append(actual)
    for i,x in enumerate(xs):
        expected = closed_union((section(expected_slabs[i-1],x) if i else [])+(section(expected_slabs[i],x) if i<len(expected_slabs) else []))
        actual = closed_union((section(actual_slabs[i-1],x) if i else [])+(section(actual_slabs[i],x) if i<len(actual_slabs) else []))
        assert expected == actual, (case['name'],'critical-line mismatch',str(x))
    assert decode(result['geometry']['area']) == area, (case['name'],'area')
    assert (area == 0) == (result['resolution']['state']=='resolved-empty')
    ys = [p[1] for s in source_segments for p in s]
    assert connectivity(xs,expected_slabs) == len(result['geometry']['components']), (case['name'],'occupied components')
    assert connectivity(xs,expected_slabs,True,(min(ys)-1,max(ys)+1)) == len(result['geometry']['voids']), (case['name'],'bounded voids')
    for q in result['queries']:
        x,y = map(decode,q['point'])
        assert classify(x,y,xs,expected_slabs) == q['classification'], (case['name'],'query',q)
    # Every output edge must carry ALL original collinear covering spans, not
    # merely one arbitrarily selected owner. Parameter endpoints are exact.
    for edge,(a,b) in zip(result['geometry']['edges'],output):
        owners = {}
        for tag,(p,q) in primitives.items():
            d = sub(q,p)
            if cross(d,sub(a,p)) or cross(d,sub(b,p)):
                continue
            axis = 0 if d[0] else 1
            ta,tb = (a[axis]-p[axis])/d[axis], (b[axis]-p[axis])/d[axis]
            if 0 <= ta <= 1 and 0 <= tb <= 1:
                owners[tag] = (min(ta,tb),max(ta,tb),1 if ta<tb else -1)
        actual = {(c['nodeId'],c['shapeId'],c['outlineId'],c['primitiveId']):(decode(c['from']),decode(c['to']),c['direction']) for c in edge['coverage']}
        assert owners == actual, (case['name'],'coincident provenance')
        for side,point in zip(('leftMembership','rightMembership'),side_witnesses(a,b,source_segments)):
            bits = leaf_bits(tagged,point)
            mask = sum(1<<i for i,key in enumerate(result['geometry']['sourceLeafIds']) if bits.get(key,False))
            assert mask == edge[side], (case['name'],'leaf membership bits')
            assert evaluate(bits) == (side=='leftMembership'), (case['name'],'occupied-left decision')
    # Verify exact affine placement without reproducing a Number addition.
    o = result['options']
    for v in result['worldProjection']['vertices']:
        x,y = points[v['id']]
        if o['transform']['mirrorX']:
            x = -x
        for _ in range(o['transform']['quarterTurns']):
            x,y = -y,x
        assert tuple(map(decode,v['point'])) == (x+exact(o['origin'][0]),y+exact(o['origin'][1]))
    assert decode(result['worldProjection']['baseM']) == exact(result['source']['shape']['nodes'][next(i for i,n in enumerate(result['source']['shape']['nodes']) if n['kind']=='leaf')]['shape']['baseM'])+exact(o['origin'][2])
    return len(xs)-1, len(result['queries']), len(output)

root = Path(__file__).resolve().parent.parent
path = Path(sys.argv[1]) if len(sys.argv)>1 else root/'artifacts/procedural-tiles-c1/oracle-cases.json'
cases = json.loads(path.read_text(encoding='utf-8'))
counts = [0,0,0]
for case in cases:
    totals = verify(case)
    counts = [a+b for a,b in zip(counts,totals)]
print(json.dumps({'status':'pass','cases':len(cases),'exactSlabs':counts[0],'queries':counts[1],'allOwnerEdges':counts[2],'scope':'Exact Fraction slab/event-line set, area, open-band components/voids, query, all-owner/side-bit provenance and affine checks; manual incidence cases remain separate.'}))
