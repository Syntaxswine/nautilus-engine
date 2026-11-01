"""Independent exact C2a rectangle overlay, ownership, interval and contact oracle.
No JS runtime/helper, emitted classification or arrangement decision is reused.
"""
import copy
import json
import sys
from collections import defaultdict, deque
from fractions import Fraction as F
from pathlib import Path


def f(value):
    return F(value) if isinstance(value, int) else F.from_float(value)


def q(value):
    assert len(value) == 2 and int(value[1]) > 0
    result = F(int(value[0]), int(value[1]))
    assert [str(result.numerator), str(result.denominator)] == value
    return result


def point(value):
    return tuple(map(q, value))


def bounds(value):
    return point(value['min']), point(value['max'])


def area(b):
    return max(F(0), b[1][0]-b[0][0])*max(F(0), b[1][1]-b[0][1])


def native(p, instance):
    x, y, z = map(f, p)
    if instance['transform']['mirrorX']:
        x = -x
    for _ in range(instance['transform']['quarterTurns']):
        x, y = -y, x
    return x+f(instance['origin'][0]), y+f(instance['origin'][1]), z+f(instance['origin'][2])


def sign(v):
    return (v > 0)-(v < 0)


def ownership(rectangles, p, direction=(0, 0)):
    # Formal infinitesimal side membership, derived independently for rectangles.
    return tuple(sorted(key for key, b in rectangles.items() if all(
        (sign(p[k]-b[0][k]) or sign(direction[k])) > 0 and
        (sign(b[1][k]-p[k]) or -sign(direction[k])) > 0 for k in (0, 1))))


def verify(case):
    bundle, result = case['bundle'], case['result']
    layout = bundle['layout']; group = layout['compositions'][0]
    recipes = {r['id']: r for r in bundle['recipes']}
    instances = {i['id']: i for i in layout['instances']}
    order = group['finishOrder']; members = {m['instanceId']: m for m in group['members']}
    rectangles, source, all_reservations = {}, [], []
    winner = lambda ids: next((i for i in order if i in ids), None)
    for key, instance in instances.items():
        recipe = recipes[instance['recipeId']]; outline = recipe['shape']['outlines'][0]
        vertices = [native(s['a'], instance) for s in outline['segments']]
        b = tuple(min(p[k] for p in vertices) for k in range(3)), tuple(max(p[k] for p in vertices) for k in range(3))
        b = b[0], (*b[1][:2], b[0][2]+f(recipe['shape']['thicknessM']))
        if key in members:
            rectangles[key] = b
            for segment in outline['segments']:
                source.append((key, recipe['shape']['id'], outline['id'], segment['id'], native(segment['a'], instance)[:2], native(segment['b'], instance)[:2]))
        for reservation in recipe['reservations']:
            corners = [native([x,y,z], instance) for x in (reservation['min'][0],reservation['max'][0]) for y in (reservation['min'][1],reservation['max'][1]) for z in (reservation['min'][2],reservation['max'][2])]
            rb = tuple(min(p[k] for p in corners) for k in range(3)), tuple(max(p[k] for p in corners) for k in range(3))
            all_reservations.append((key, reservation['id'], rb))
    assert result['source'] == layout
    assert result['statuses']['presentation'] == result['statuses']['support'] == result['statuses']['navigation'] == result['statuses']['game'] == 'unbound'
    if not rectangles:
        assert result['geometry'] is None and not result['partitions'] and not result['interfaces'] and not result['portBindings']
        return dict(cells=0, intervals=0, bindings=0, certificates=0, sectors=0)
    axes = [sorted({b[j][k] for b in rectangles.values() for j in (0,1)}) for k in (0,1)]
    expected = {}
    for ix in range(1,len(axes[0])):
        for iy in range(1,len(axes[1])):
            b = (axes[0][ix-1],axes[1][iy-1]),(axes[0][ix],axes[1][iy])
            ids = ownership(rectangles, tuple((a+z)/2 for a,z in zip(*b)))
            if ids:
                expected[b] = ids
    actual = {}; total = F(0)
    for partition in result['partitions']:
        b = bounds(partition['bounds']); assert b not in actual
        ids = expected[b]; win = winner(ids)
        assert tuple(partition['ownerIds']) == ids and partition['finishOwnerId'] == win
        assert partition['skinId'] == recipes[instances[win]['recipeId']]['interior']['skinId']
        assert q(partition['area']) == area(b)
        actual[b] = ids; total += area(b)
    assert actual == expected and q(result['geometry']['area']) == total
    # Independent source atomic intervals: split only actual crossings/contacts,
    # not every grid line. Every original identity and coincident owner survives.
    atomic = defaultdict(list)
    for owner, shape, outline, primitive, a, z in source:
        axis = 0 if a[0] != z[0] else 1; other = 1-axis
        cuts = {a[axis], z[axis]}
        lo, hi = sorted((a[axis],z[axis]))
        for _,_,_,_,c,d in source:
            if c[other] == d[other] == a[other]:
                cuts.update(v for v in (c[axis],d[axis]) if lo <= v <= hi)
            elif c[axis] == d[axis] and lo <= c[axis] <= hi and min(c[other],d[other]) <= a[other] <= max(c[other],d[other]):
                cuts.add(c[axis])
        cuts = sorted(cuts)
        for start,end in zip(cuts,cuts[1:]):
            p = (start,a[other]) if axis == 0 else (a[other],start)
            e = (end,a[other]) if axis == 0 else (a[other],end)
            t0,t1 = sorted(((start-a[axis])/(z[axis]-a[axis]),(end-a[axis])/(z[axis]-a[axis])))
            atomic[p,e].append((owner,shape,outline,primitive,t0,t1,1 if z[axis]>a[axis] else -1))
    def sides(a,z):
        mid = tuple((a[k]+z[k])/2 for k in (0,1)); delta = z[0]-a[0],z[1]-a[1]
        left = -delta[1],delta[0]
        return ownership(rectangles,mid,left),ownership(rectangles,mid,(-left[0],-left[1]))
    def coverage(records):
        return sorted((c['nodeId'],c['shapeId'],c['outlineId'],c['primitiveId'],q(c['from']),q(c['to']),c['direction']) for c in records)
    interfaces = {}
    for entry in result['interfaces']:
        a,z = point(entry['a']),point(entry['b']); assert (a,z) not in interfaces
        assert coverage(entry['coverage']) == sorted(atomic[a,z])
        left,right = sides(a,z)
        assert tuple(entry['leftOwners']) == left and tuple(entry['rightOwners']) == right
        assert entry['leftFinishOwnerId'] == winner(left) and entry['rightFinishOwnerId'] == winner(right)
        interfaces[a,z] = entry
    assert interfaces.keys() == atomic.keys()
    vertices = {v['id']:point(v['point']) for v in result['geometry']['vertices']}
    edges = {e['id']:e for e in result['geometry']['edges']}; emitted = {}
    leaf_ids = result['geometry']['sourceLeafIds']; assert leaf_ids == sorted(members)
    mask = lambda ids: sum(1<<leaf_ids.index(i) for i in ids)
    for edge in edges.values():
        a,z = vertices[edge['from']],vertices[edge['to']]; assert (a,z) not in emitted
        left,right = sides(a,z); assert left and not right
        assert edge['leftMembership'] == mask(left) and edge['rightMembership'] == mask(right)
        key = tuple(sorted((a,z))); records = atomic[key]
        if key != (a,z):
            records = [(*c[:-1],-c[-1]) for c in records]
        assert coverage(edge['coverage']) == sorted(records)
        emitted[a,z] = edge
    expected_boundary = {((a,z) if sides(a,z)[0] else (z,a)) for a,z in atomic if bool(sides(a,z)[0]) != bool(sides(a,z)[1])}
    assert emitted.keys() == expected_boundary
    # Verify every port interval against original independently placed controls.
    bindings = defaultdict(list)
    for binding in result['portBindings']:
        s = binding['source']; owner = s['instanceId']; inst = instances[owner]; recipe = recipes[inst['recipeId']]
        assert s['recipeId'] == recipe['id'] and s['shapeId'] == recipe['shape']['id'] and s['outlineId'] == recipe['shape']['outlines'][0]['id']
        port = next(p for p in recipe['ports'] if p['id'] == s['portId']); curve = port['boundary']['curve']
        assert s['portPrimitiveId'] == curve['id']
        a,z = native(curve['a'],inst)[:2],native(curve['b'],inst)[:2]; t0,t1 = q(s['from']),q(s['to']); assert 0<=t0<t1<=1
        start = tuple(a[k]+(z[k]-a[k])*t0 for k in (0,1)); end = tuple(a[k]+(z[k]-a[k])*t1 for k in (0,1))
        assert point(binding['start']) == start and point(binding['end']) == end
        records = atomic[tuple(sorted((start,end)))]; assert any(c[0]==owner and c[3]==s['primitiveId'] for c in records)
        left,right = sides(start,end); inside,outside = (left,right) if owner in left else (right,left)
        assert tuple(binding['insideOwners']) == inside and tuple(binding['outsideOwners']) == outside
        assert binding['insideFinishOwnerId'] == winner(inside) and binding['outsideFinishOwnerId'] == winner(outside)
        assert binding['finishVisible'] == (winner(inside)==owner) and binding['exposure'] == ('internal' if outside else 'exposed') and binding['renderPlan'] is None
        bindings[owner,port['id']].append((t0,t1))
    assert len(bindings) == 4*len(rectangles)
    for intervals in bindings.values():
        at=F(0)
        for a,z in sorted(intervals):
            assert a == at; at=z
        assert at == 1
    expected_bindings=sum(len(records) for records in atomic.values()); assert len(result['portBindings']) == expected_bindings
    # Contact certificates are exact per-reservation intervals, never pair-wide.
    expected_certificates = {}
    for i,(a,ra,x) in enumerate(all_reservations):
        for b,rb,y in all_reservations[i+1:]:
            if a == b or a not in members or b not in members or ra != members[a]['primaryReservationId'] or rb != members[b]['primaryReservationId']:
                continue
            ib=tuple(max(x[0][k],y[0][k]) for k in range(3)),tuple(min(x[1][k],y[1][k]) for k in range(3))
            if all(ib[0][k]<=ib[1][k] for k in (0,1)) and any(ib[0][k]<ib[1][k] for k in (0,1)):
                expected_certificates[a,ra,b,rb]=ib
    actual_certificates={}
    for cert in result['certificates']:
        key=cert['a'],cert['reservationA'],cert['b'],cert['reservationB']; assert key not in actual_certificates
        assert cert['groupId']==group['id'] and cert['kind']=='exact-primary-rectangle-contact'
        ib=bounds(cert['bounds']); assert ib==expected_certificates[key]
        assert cert['positiveVolume']==all(ib[0][k]<ib[1][k] for k in range(3));actual_certificates[key]=ib
    assert actual_certificates==expected_certificates
    # Padded exact grid gives independent open-area components and bounded voids.
    gridaxes=[[values[0]-1,*values,values[-1]+1] for values in axes]
    cells={}; n,m=len(gridaxes[0])-1,len(gridaxes[1])-1
    for x in range(n):
        for y in range(m):
            cells[x,y]=bool(ownership(rectangles,((gridaxes[0][x]+gridaxes[0][x+1])/2,(gridaxes[1][y]+gridaxes[1][y+1])/2)))
    regions={}; occupied=[]; voids=[]
    for cell in cells:
        if cell in regions: continue
        state=cells[cell]; component=set([cell]); todo=deque([cell]); label=len(occupied) if state else len(voids)
        while todo:
            p=todo.popleft()
            for d in ((1,0),(-1,0),(0,1),(0,-1)):
                z=p[0]+d[0],p[1]+d[1]
                if z in cells and cells[z]==state and z not in component:component.add(z);todo.append(z)
        for p in component:regions[p]=(state,label)
        (occupied if state else voids).append(component)
    bounded={i for i,cells0 in enumerate(voids) if all(x not in (0,n-1) and y not in (0,m-1) for x,y in cells0)}
    assert len(result['geometry']['components'])==len(occupied) and len(result['geometry']['voids'])==len(bounded)
    def region_at(p):
        candidates={regions[x,y] for x in range(n) for y in range(m) if gridaxes[0][x]<=p[0]<=gridaxes[0][x+1] and gridaxes[1][y]<=p[1]<=gridaxes[1][y+1]}
        # An unrelated grid line can cross one open geometric face. All cells
        # there must independently have the same occupancy/component label.
        assert len(candidates)==1, ('point not in one open face',p,candidates)
        return candidates.pop()
    def witness(a,z,left=True):
        mid=tuple((a[k]+z[k])/2 for k in (0,1));d=(-(z[1]-a[1]),z[0]-a[0]);d=tuple(sign(v)*(1 if left else -1) for v in d)
        positive=[abs(mid[k]-v) for k in (0,1) for v in gridaxes[k] if mid[k]!=v];eps=min(positive)/3
        return tuple(mid[k]+d[k]*eps for k in (0,1))
    contours={c['id']:c for c in result['geometry']['contours']}
    def walk(c):
        seq=[]
        for ref in c['spans']:
            e=edges[ref['id']];a,z=vertices[e['from']],vertices[e['to']]
            seq.append((a,z) if ref['direction']==1 else (z,a))
        assert all(z==seq[(i+1)%len(seq)][0] for i,(a,z) in enumerate(seq))
        assert q(c['area'])==sum(a[0]*z[1]-a[1]*z[0] for a,z in seq)/2
        return seq
    occupied_ids={}; void_ids={}
    for component in result['geometry']['components']:
        regions0={region_at(witness(a,z)) for name in [component['outerWalk'],*component['holeWalks']] for a,z in walk(contours[name])}
        assert len(regions0)==1; state,label=regions0.pop();assert state and label not in occupied_ids;occupied_ids[label]=component['id']
    for void in result['geometry']['voids']:
        regions0={region_at(witness(a,z)) for name in [void['outerWalk'],*void['holeWalks']] for a,z in walk(contours[name])}
        assert len(regions0)==1;state,label=regions0.pop();assert not state and label in bounded and label not in void_ids;void_ids[label]=void['id']
        adjacent={occupied_ids[region_at(witness(a,z,False))[1]] for a,z in walk(contours[void['outerWalk']])}
        assert void['surroundingComponents']==sorted(adjacent)
    assert set(occupied_ids)==set(range(len(occupied))) and set(void_ids)==bounded
    sectors=0
    for incidence in result['geometry']['incidence']:
        p=vertices[incidence['vertex']];rays=[]
        for ref in incidence['rays']:
            e=edges[ref['id']];a,z=vertices[e['from']],vertices[e['to']]
            if ref['direction']==-1:a,z=z,a
            assert a==p;rays.append((sign(z[0]-a[0]),sign(z[1]-a[1])))
        assert incidence['touching']==(len(rays)>2) and len(incidence['sectors'])==len(rays)
        for i,sector in enumerate(incidence['sectors']):
            assert sector['from']==incidence['rays'][i] and sector['to']==incidence['rays'][(i+1)%len(rays)]
            a,z=rays[i],rays[(i+1)%len(rays)];cross=a[0]*z[1]-a[1]*z[0];d=(a[0]+z[0],a[1]+z[1])
            if cross<0:d=(-d[0],-d[1])
            if d==(0,0):d=(-a[1],a[0])
            eps=min(abs(p[k]-v) for k in (0,1) for v in gridaxes[k] if p[k]!=v)/3
            state,label=region_at((p[0]+d[0]*eps,p[1]+d[1]*eps));expected_id=occupied_ids[label] if state else void_ids.get(label)
            assert sector['occupied']==state and sector['regionId']==expected_id;sectors+=1
    # Canonical copies retain mandatory count and upward directions/explicit UV.
    for compiled in result['instances']:
        recipe=recipes[instances[compiled['id']]['recipeId']]
        for port in compiled['ports']:
            original=next(p for p in recipe['ports'] if p['id']==port['id']);g=port['geometry'];count=original['boundary']['sampling']['segmentsPerPart']+1
            assert len(g['positions'])==len(g['normals'])==len(g['tangents'])==len(g['uv'])==count
            assert all(normal==[0,0,1000000000000] for normal in g['normals'])
            assert port['profiles']==original['profiles'] and port['uvMapping']==original['uv'] and g['materialIntervals']==original['boundary']['materialIntervals']
    return dict(cells=len(actual),intervals=len(atomic),bindings=expected_bindings,certificates=len(actual_certificates),sectors=sectors)


def forgery_checks(cases):
    overlap=next(c for c in cases if c['name']=='overlap union 48'); ring=next(c for c in cases if c['name']=='void with inner island')
    changes=[(overlap,lambda r:r['partitions'][0].__setitem__('finishOwnerId','forged')),
             (overlap,lambda r:r['partitions'][0].__setitem__('ownerIds',[])),
             (overlap,lambda r:r['portBindings'].pop()),
             (overlap,lambda r:r['portBindings'][0]['source'].__setitem__('from',['1','2'])),
             (overlap,lambda r:r['certificates'][0].__setitem__('reservationA','other')),
             (overlap,lambda r:r['certificates'][0]['bounds']['min'].__setitem__(0,['0','1'])),
             (overlap,lambda r:r['geometry'].__setitem__('area',['999','1'])),
             (overlap,lambda r:r['interfaces'][0]['coverage'].pop()),
             (overlap,lambda r:r['instances'][0]['ports'][0]['geometry']['positions'].pop()),
             (ring,lambda r:r['geometry']['voids'][0]['surroundingComponents'].pop()),
             (ring,lambda r:r['geometry']['incidence'][0]['sectors'][0].__setitem__('regionId','forged'))]
    for case,change in changes:
        bad=copy.deepcopy(case);change(bad['result'])
        try:verify(bad)
        except (AssertionError,KeyError,ValueError,StopIteration):continue
        raise AssertionError('Forged artifact accepted')
    return len(changes)


if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    filename=Path(sys.argv[1]) if len(sys.argv)>1 else root/'artifacts/procedural-tiles-c2a/oracle-cases.json'
    cases=json.loads(filename.read_text(encoding='utf-8'));assert cases
    counts=defaultdict(int)
    for case in cases:
        try:result=verify(case)
        except Exception as error:raise AssertionError(case['name']) from error
        for key,value in result.items():counts[key]+=value
    print(json.dumps(dict(status='pass',cases=len(cases),**counts,rejectedForgeries=forgery_checks(cases),scope='Independent Fraction source ownership, precedence, atomic intervals, port coverage, primary reservation certificates and topology associations. No physical/game binding.')))
