"""Independent Fraction vertical-slab oracle, not the C1 ray/sector algorithm.

Within each arrangement x slab every endpoint is affine in x. Equality at two
distinct interior x values proves interval equality throughout that slab. Closed
limits from both neighboring slabs check event lines, including point contacts.
Manual JS cases separately assert component/void/sector topology.
"""
import json
import sys
from copy import deepcopy
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
    exterior = set()
    if empty:
        for i,intervals in enumerate(bands):
            x = (xs[i]+xs[i+1])/2
            for j,(a,b) in enumerate(intervals):
                if i in (0,len(bands)-1) or at(a,x)==yrange[0] or at(b,x)==yrange[1]:
                    exterior.add(find((i,j)))
    def locate(point):
        x,y = point
        candidates = set()
        for i,intervals in enumerate(bands):
            if xs[i] <= x <= xs[i+1]:
                for j,(a,b) in enumerate(intervals):
                    if at(a,x) < y < at(b,x):
                        candidates.add(find((i,j)))
        assert len(candidates)==1, ('Expected one independent open-band region',point,candidates)
        return next(iter(candidates))
    return {'count':len(roots-exterior),'roots':roots,'bounded':roots-exterior,'exterior':exterior,'locate':locate}

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
    # Stay inside the oracle's strict exterior box as well as in the same
    # exact source-line/endpoint cell. This is a proved finite oracle witness.
    epsilon = F(1)/(2*max(abs(n[0]),abs(n[1]),F(1)))
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

def verify_associations(case, points, source_segments, tagged, evaluate, occupied, empty):
    g = case['result']['geometry']
    edges = {e['id']:e for e in g['edges']}
    walks = {w['id']:w for w in g['contours']}
    def directed(span):
        edge = edges[span['id']]
        a,b = points[edge['from']],points[edge['to']]
        return (a,b) if span['direction']==1 else (b,a)
    def walk_roots(walk_id, complex, expected_occupied):
        roots = set()
        for span in walks[walk_id]['spans']:
            a,b = directed(span)
            left,_ = side_witnesses(a,b,source_segments)
            assert evaluate(leaf_bits(tagged,left))==expected_occupied, (case['name'],'walk occupancy')
            roots.add(complex['locate'](left))
        assert len(roots)==1, (case['name'],'walk crosses independent open-band components',walk_id)
        return next(iter(roots))
    components = {c['id']:walk_roots(c['outerWalk'],occupied,True) for c in g['components']}
    assert len(set(components.values()))==len(components) and set(components.values())==occupied['roots'], (case['name'],'occupied component labels are not a bijection')
    for c in g['components']:
        for walk_id in c['holeWalks']:
            assert walk_roots(walk_id,occupied,True)==components[c['id']], (case['name'],'occupied hole-walk association')
    voids = {v['id']:walk_roots(v['outerWalk'],empty,False) for v in g['voids']}
    assert len(set(voids.values()))==len(voids) and set(voids.values())==empty['bounded'], (case['name'],'bounded void labels are not a bijection')
    inverse_components = {root:id for id,root in components.items()}
    inverse_voids = {root:id for id,root in voids.items()}
    outer_spans = outer_relations = sector_owners = 0
    for v in g['voids']:
        for walk_id in v['holeWalks']:
            assert walk_roots(walk_id,empty,False)==voids[v['id']], (case['name'],'inner island hole-walk void association')
        expected = set()
        for span in walks[v['outerWalk']]['spans']:
            a,b = directed(span)
            left,right = side_witnesses(a,b,source_segments)
            assert empty['locate'](left)==voids[v['id']], (case['name'],'void outer span owner')
            assert evaluate(leaf_bits(tagged,right)), (case['name'],'void outer right side must be occupied')
            expected.add(inverse_components[occupied['locate'](right)])
            outer_spans += 1
        assert 'surroundingComponent' not in v, (case['name'],'singular winning void owner is unsupported')
        assert v['surroundingComponents']==sorted(expected), (case['name'],'complete sorted outer-boundary component adjacency',v['surroundingComponents'],sorted(expected))
        outer_relations += len(expected)
    for incidence in g['incidence']:
        for sector in incidence['sectors']:
            a,b = directed(sector['from'])
            c,_ = directed(sector['to'])
            assert a==c==points[incidence['vertex']], (case['name'],'sector ray origins')
            left,_ = side_witnesses(a,b,source_segments)
            inside = evaluate(leaf_bits(tagged,left))
            assert inside==sector['occupied'], (case['name'],'sector occupancy')
            if inside:
                expected = inverse_components[occupied['locate'](left)]
            else:
                root = empty['locate'](left)
                expected = None if root in empty['exterior'] else inverse_voids[root]
            assert sector['regionId']==expected, (case['name'],'per-sector independent component/void ownership')
            sector_owners += 1
    return outer_spans,outer_relations,sector_owners

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
    occupied = connectivity(xs,expected_slabs)
    empty = connectivity(xs,expected_slabs,True,(min(ys)-1,max(ys)+1))
    assert occupied['count'] == len(result['geometry']['components']), (case['name'],'occupied components')
    assert empty['count'] == len(result['geometry']['voids']), (case['name'],'bounded voids')
    associations = verify_associations(case,points,source_segments,tagged,evaluate,occupied,empty)
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
    return (len(xs)-1, len(result['queries']), len(output), *associations)

def reject_relation_forgeries(cases):
    ring = next(c for c in cases if c['name']=='four-component point-contact ring')
    island = next(c for c in cases if c['name']=='point-contact ring with inner island')
    mutations = []
    missing = deepcopy(ring)
    missing['result']['geometry']['voids'][0]['surroundingComponents'] = missing['result']['geometry']['voids'][0]['surroundingComponents'][:1]
    mutations.append(('missing three outer neighbors',missing))
    mixed = deepcopy(island)
    g = mixed['result']['geometry']
    extra = next(c['id'] for c in g['components'] if c['id'] not in g['voids'][0]['surroundingComponents'])
    g['voids'][0]['surroundingComponents'] = sorted(g['voids'][0]['surroundingComponents']+[extra])
    mutations.append(('inner island conflated with outer adjacency',mixed))
    duplicate = deepcopy(ring)
    values = duplicate['result']['geometry']['voids'][0]['surroundingComponents']
    values.append(values[0])
    mutations.append(('duplicate neighbor',duplicate))
    unordered = deepcopy(ring)
    unordered['result']['geometry']['voids'][0]['surroundingComponents'].reverse()
    mutations.append(('unordered neighbors',unordered))
    wrong_sector = deepcopy(ring)
    g = wrong_sector['result']['geometry']
    sector = next(s for i in g['incidence'] for s in i['sectors'] if s['occupied'])
    sector['regionId'] = next(c['id'] for c in g['components'] if c['id']!=sector['regionId'])
    mutations.append(('wrong occupied-sector owner',wrong_sector))
    for label,case in mutations:
        try:
            verify(case)
        except AssertionError:
            continue
        raise AssertionError(('Independent oracle accepted forged relation',label))
    return len(mutations)

root = Path(__file__).resolve().parent.parent
path = Path(sys.argv[1]) if len(sys.argv)>1 else root/'artifacts/procedural-tiles-c1/oracle-cases.json'
cases = json.loads(path.read_text(encoding='utf-8'))
counts = [0]*6
for case in cases:
    totals = verify(case)
    counts = [a+b for a,b in zip(counts,totals)]
negative = reject_relation_forgeries(cases)
print(json.dumps({'status':'pass','cases':len(cases),'exactSlabs':counts[0],'queries':counts[1],'allOwnerEdges':counts[2],'voidOuterSpans':counts[3],'voidOuterAssociations':counts[4],'sectorOwners':counts[5],'rejectedRelationForgeries':negative,'scope':'Independent exact open-band component/void labels, complete outer-boundary adjacency, separate inner hole walks and per-sector ownership, alongside set/area/query/provenance/affine checks.'}))
