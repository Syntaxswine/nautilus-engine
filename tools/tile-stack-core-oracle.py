"""Independent Decimal -> q1e6 interval oracle. No engine/planner imports."""
import copy, itertools, json, sys
from decimal import Decimal, ROUND_FLOOR
Q=Decimal(1000000)
def dec(x): return x if isinstance(x,Decimal) else Decimal(str(x))
def q(x): return int((dec(x)*Q+Decimal('.5')).to_integral_value(rounding=ROUND_FLOOR))
def point(recipe,owner,p):
    x,y,h=map(dec,p)
    if recipe['frame']=='world': return [x,y,h]
    if owner['transform']['mirrorX']: x=-x
    for _ in range(owner['transform']['quarterTurns']): x,y=-y,x
    return [x+dec(owner['origin'][0]),y+dec(owner['origin'][1]),h+dec(owner['origin'][2])]
def box(recipe,owner,bounds):
    pts=[point(recipe,owner,p) for p in itertools.product(*zip(bounds['min'],bounds['max']))]
    return {'min':[q(min(p[k] for p in pts)) for k in range(3)],'max':[q(max(p[k] for p in pts)) for k in range(3)]}
def candidate(case):
    src=case['input']['bundle']; request=case['result']['plan'].get('request'); recipes={r['id']:r for r in src['recipes']}; owners={v['id']:v for v in src['layout']['instances']}
    if request:
        recipes.update({r['id']:r for r in request['recipeUpdates']})
        for key in request['removeIds']+request['replaceIds']: owners.pop(key,None)
        for s in request['slots']: owners[s['id']]={**s,'recipeId':s['alternatives'][0]['recipeId'],'transform':s['alternatives'][0]['transform']}
        relations=request['relations']
    else:
        intent=case['input']['intent']; assert intent['kind']=='place-stack'
        r=intent['recipe'];recipes[r['id']]=r;slot=r['reservations'][0]['floorSlot']; floors={f['id']:f for f in src['layout']['floors']}
        for m in intent['members']: owners[m['id']]={**m,'recipeId':r['id'],'origin':[*intent['originXY'],floors[m['floorId']]['elevationM']],'floorBindings':{slot:m['floorId']},'transform':intent['transform']}
        relations=[]
    return src,recipes,owners,relations

def inspect(case):
    src,recipes,owners,relations=candidate(case); floors={f['id']:f for f in src['layout']['floors']}; refs={v['instanceId']:v['primaryReservationId'] for v in case['input']['constraints']['owners']}
    for v in case['input']['intent'].get('members',[]): refs[v['id']]=case['input']['intent']['primaryReservationId']
    for v in case['input']['intent'].get('upserts',[]): refs[v['id']]=v['primaryReservationId']
    facts={}; violations=[]
    for key,v in owners.items():
        r=recipes[v['recipeId']];s=r['shape'];assert s['kind']=='region'
        lines=s['outlines'][0]['segments'];assert len(lines)==4 and all(c['kind']=='line' for c in lines)
        controls=[p for c in lines for p in [c['a'],c['b']]]
        raw={'min':[min(dec(p[k]) for p in controls) for k in range(3)],'max':[max(dec(p[k]) for p in controls) for k in range(3)]};raw['max'][2]+=dec(s['thicknessM'])
        primary=next(p for p in r['reservations'] if p['id']==refs[key]);assert all(dec(primary['min'][k])<=raw['min'][k] and dec(primary['max'][k])>=raw['max'][k] for k in range(3))
        floor=v['floorBindings'][primary['floorSlot']];assert point(r,v,raw['min'])[2]==dec(floors[floor]['elevationM'])
        facts[key]={'floor':floor,'shape':box(r,v,raw),'reservations':[{**p,**box(r,v,p)} for p in r['reservations']]}
    radius=q(case['input']['limits']['neighbourRadiusM']); minimum=max(dec(case['input']['constraints']['minimumClearanceM']),dec(case['input']['intent']['minimumClearanceM'])); obligations=[];pairs=set()
    for (a,A),(b,B) in itertools.combinations(sorted(facts.items()),2):
        contacts=[('source',A['shape'],B['shape'])]+[('reservation',x,y) for x in A['reservations'] for y in B['reservations']]
        for kind,x,y in contacts:
            overlap=[min(x['max'][k],y['max'][k])-max(x['min'][k],y['min'][k]) for k in range(3)]
            if not all(overlap[k]>=-radius for k in [0,1]) or not any(overlap[k]>0 for k in [0,1]): continue
            positive=all(overlap[k]>0 for k in [0,1]);gap=max(x['min'][2],y['min'][2])-min(x['max'][2],y['max'][2]);required=q(minimum)
            matching=[r for r in relations if r['kind']=='cross' and {r['a'],r['b']}=={a,b}]
            required=max([required]+[q(r['clearanceM']) for r in matching])
            if A['floor']!=B['floor']:
                pairs.add((a,b)); obligations.append({'a':a,'b':b,'kind':kind,'reservationA':x.get('id',refs[a]),'reservationB':y.get('id',refs[b]),'positiveXY':positive,'gapQ':gap,'minimumClearanceQ':required})
                if not positive: violations.append('deferred-edge-near')
                elif gap<required: violations.append('insufficient-clearance')
                elif not matching: violations.append('missing-crossing')
            elif positive: violations.append('same-plane-overlap')
    ok=not violations
    if case['oracleExpected'] is not None: assert ok==case['oracleExpected'],(case['name'],violations)
    if case['name'] in ['uniform-fifteen','nonuniform-fifteen']:
        assert len(owners)==15 and len(pairs)==105 and len(relations)==105
        assert all(v['origin'][2]==floors[v['floorBindings']['base']]['elevationM'] for v in owners.values())
        assert sum(bool(v['locked']) for v in owners.values())==14
        assert min(o['gapQ'] for o in obligations)==2000000
        actual=case['result']['plan']['inspection']['obligations'];assert sorted(obligations,key=lambda o:json.dumps(o,sort_keys=True))==sorted([{k:o[k] for k in obligations[0]} for o in actual if o['phase']=='next'],key=lambda o:json.dumps(o,sort_keys=True))
    return {'name':case['name'],'ok':ok,'ownerPairs':len(pairs),'contactObligations':len(obligations),'minimumGapQ':min((o['gapQ'] for o in obligations),default=None),'violations':sorted(set(violations))}

def verify(data): return [inspect(c) for c in data['cases'] if c['oracleExpected'] is not None]
def main():
    data=json.load(open(sys.argv[1],encoding='utf-8'),parse_float=Decimal);results=verify(data)
    # Mutation controls independently prove omission and tall-envelope detection.
    forged=copy.deepcopy(next(c for c in data['cases'] if c['name']=='uniform-fifteen'));forged['result']['plan']['request']['relations'].pop()
    try: inspect(forged)
    except AssertionError: pass
    else: raise AssertionError('Oracle accepted a forged missing crossing')
    tall=copy.deepcopy(next(c for c in data['cases'] if c['name']=='tall-extra-reservation'));tall['oracleExpected']=True
    try: inspect(tall)
    except AssertionError: pass
    else: raise AssertionError('Oracle accepted the tall extra reservation')
    out={'schemaVersion':1,'method':'independent Decimal source controls and integer reservation intervals; no engine/planner imports','results':results,'mutationControls':2}
    text=json.dumps(out,indent=2)+'\n'
    if len(sys.argv)>2: open(sys.argv[2],'w',encoding='utf-8',newline='\n').write(text)
    print(json.dumps({'oracleCases':len(results),'mutationControls':2,'positiveFifteenPairs':105}))
if __name__=='__main__':main()
