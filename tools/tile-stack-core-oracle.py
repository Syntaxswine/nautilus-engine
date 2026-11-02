"""Independent intended-source/interval/output oracle; no engine/planner imports.

Intent and accepted source define the geometry. Requests/targets are observations
to check. Budget cases receive envelope checks, not interval outcome predictions.
"""
import copy
import hashlib
import itertools
import json
import sys
from decimal import Decimal, ROUND_FLOOR
Q = Decimal(1000000)
PROFILE = 'nautilus-rectangle-stack-intent-v1'

class OracleMismatch(AssertionError):
    def __init__(self, code, detail):
        self.code = code
        super().__init__(f'{code}: {detail}')

def require(condition, code, detail):
    if not condition:
        raise OracleMismatch(code, detail)

def dec(value):
    return value if isinstance(value, Decimal) else Decimal(str(value))

def q(value):
    return int((dec(value) * Q + Decimal('.5')).to_integral_value(rounding=ROUND_FLOOR))

def canonical(value):
    """JSON scalar spellings from captured JS JSON; sorted UTF-16 record keys."""
    if value is None or isinstance(value, (str, bool)):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    if isinstance(value, (int, float, Decimal)):
        d = dec(value)
        require(d.is_finite(), 'NONFINITE', str(d))
        if not d:
            return '0'
        if -6 <= d.adjusted() < 21:
            text = format(d, 'f')
            return text.rstrip('0').rstrip('.') if '.' in text else text
        sign, digits, exponent = d.normalize().as_tuple()
        text = ''.join(map(str, digits))
        power = len(text) + exponent - 1
        coefficient = text[0] + ('.' + text[1:] if len(text) > 1 else '')
        return ('-' if sign else '') + coefficient + 'e' + ('+' if power >= 0 else '') + str(power)
    if isinstance(value, list):
        return '[' + ','.join(canonical(v) for v in value) + ']'
    require(isinstance(value, dict), 'JSON_SCOPE', type(value).__name__)
    keys = sorted(value, key=lambda k: k.encode('utf-16-be'))
    return '{' + ','.join(canonical(k) + ':' + canonical(value[k]) for k in keys) + '}'

def token(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()

def equal(actual, expected, code, detail):
    require(canonical(actual) == canonical(expected), code, detail)

def by_id(values, detail):
    require(isinstance(values, list), 'LIST', detail)
    out = {v['id']: v for v in values}
    require(len(out) == len(values), 'DUPLICATE_ID', detail)
    return out

def pair(a, b):
    return tuple(sorted((a, b)))

def catalogue_digest(recipes):
    return token([{'id': key, 'contentDigest': token(recipes[key])} for key in sorted(recipes)])

def template_source(recipes):
    templates = {}
    for r in recipes.values():
        for t in r['templates']:
            if t['id'] in templates:
                equal(t, templates[t['id']], 'TEMPLATE_SOURCE', t['id'])
            templates[t['id']] = t
    return [templates[key] for key in sorted(templates)]

def bundle_integrity(bundle, label):
    require(bundle['kind'] == 'nautilus-tile-bundle' and bundle['version'] == 1, 'BUNDLE_VERSION', label)
    recipes = by_id(bundle['recipes'], label + '/recipes')
    layout = bundle['layout']
    require(layout['catalogueDigest'] == catalogue_digest(recipes), 'CATALOGUE_DIGEST', label)
    equal(bundle['templates'], template_source(recipes), 'TEMPLATE_SOURCE', label)
    owners = by_id(layout['instances'], label + '/instances')
    by_id(layout['floors'], label + '/floors')
    by_id(layout['relations'], label + '/relations')
    by_id(layout['joins'], label + '/joins')
    for key, owner in owners.items():
        require(owner['recipeId'] in recipes, 'OWNER_RECIPE', label + '/' + key)
        require(owner['contentDigest'] == token(recipes[owner['recipeId']]), 'CONTENT_DIGEST', label + '/' + key)
        require(type(owner['locked']) is bool, 'LOCK_TYPE', key)
    return recipes, owners

def point(recipe, owner, p):
    x, y, h = map(dec, p)
    if recipe['frame'] == 'world':
        return [x, y, h]
    if owner['transform']['mirrorX']:
        x = -x
    for _ in range(owner['transform']['quarterTurns']):
        x, y = -y, x
    return [x + dec(owner['origin'][0]), y + dec(owner['origin'][1]), h + dec(owner['origin'][2])]

def box(recipe, owner, bounds):
    pts = [point(recipe, owner, p) for p in itertools.product(*zip(bounds['min'], bounds['max']))]
    return {'min': [q(min(p[k] for p in pts)) for k in range(3)],
            'max': [q(max(p[k] for p in pts)) for k in range(3)]}

def curve_controls(curve):
    if curve['kind'] == 'compound':
        return [p for c in curve['segments'] for p in curve_controls(c)]
    if curve['kind'] == 'line':
        return [curve['a'], curve['b']]
    require(curve['kind'] == 'cubic', 'FIXTURE_GEOMETRY_SCOPE', curve['kind'])
    return curve['points']

def rectangle(recipe, owner, floors, primary_id):
    s = recipe['shape']
    require(s['kind'] == 'region' and 'clip' not in s and len(s['outlines']) == 1,
            'FIXTURE_GEOMETRY_SCOPE', owner['id'])
    outline = s['outlines'][0]
    require(outline['kind'] == 'compound' and len(outline['segments']) == 4, 'RECTANGLE_SOURCE', owner['id'])
    lines = outline['segments']
    require(all(c['kind'] == 'line' for c in lines), 'RECTANGLE_SOURCE', owner['id'])
    corners = [c['a'] for c in lines]
    low = [min(dec(p[k]) for p in corners) for k in range(2)]
    high = [max(dec(p[k]) for p in corners) for k in range(2)]
    require(len({tuple(p) for p in corners}) == 4 and all(low[k] < high[k] for k in range(2)), 'RECTANGLE_SOURCE', owner['id'])
    for i, line in enumerate(lines):
        equal(line['b'], lines[(i + 1) % 4]['a'], 'RECTANGLE_CLOSURE', owner['id'])
        require(line['a'][2] == s['baseM'] == line['b'][2], 'RECTANGLE_LEVEL', owner['id'])
        require((line['a'][0] == line['b'][0]) != (line['a'][1] == line['b'][1]), 'RECTANGLE_AXIS', owner['id'])
        require(all(dec(line['a'][k]) in (low[k], high[k]) for k in range(2)), 'RECTANGLE_CORNERS', owner['id'])
    raw = {'min': [*low, dec(s['baseM'])], 'max': [*high, dec(s['baseM']) + dec(s['thicknessM'])]}
    reservations = by_id(recipe['reservations'], owner['id'] + '/reservations')
    require(primary_id in reservations, 'PRIMARY_SOURCE', owner['id'])
    primary = reservations[primary_id]
    require(all(dec(primary['min'][k]) <= raw['min'][k] and dec(primary['max'][k]) >= raw['max'][k]
                for k in range(3)), 'PRIMARY_ENVELOPE', owner['id'])
    floor_id = owner['floorBindings'][primary['floorSlot']]
    base = point(recipe, owner, raw['min'])[2]
    require(floor_id in floors and base == dec(floors[floor_id]['elevationM']), 'FLOOR_SOURCE', owner['id'])
    controls = list(corners)
    for port in recipe['ports']:
        pts = curve_controls(port['boundary']['curve'])
        require(all(p[2] == s['baseM'] and all(low[k] <= dec(p[k]) <= high[k] for k in range(2))
                    for p in pts), 'BOUNDARY_SOURCE', owner['id'])
        controls += pts + [port['endpoint']]
    projected = []
    for reservation in recipe['reservations']:
        require(owner['floorBindings'][reservation['floorSlot']] in floors, 'RESERVATION_FLOOR', owner['id'])
        projected.append({'id': reservation['id'], **box(recipe, owner, reservation)})
        controls += list(itertools.product(*zip(reservation['min'], reservation['max'])))
    world = [point(recipe, owner, p) for p in controls]
    hull = {'min': [q(min(p[k] for p in world)) - 1 for k in range(2)],
            'max': [q(max(p[k] for p in world)) + 1 for k in range(2)]}
    return {'floor': floor_id, 'base': base, 'shape': box(recipe, owner, raw),
            'primary': primary_id, 'reservations': projected, 'hull': hull}

def delta(source, change):
    values = by_id(copy.deepcopy(source), 'explicit delta')
    for key in change['removeIds']:
        require(key in values, 'DELTA_SOURCE', key)
        del values[key]
    for record in change['upserts']:
        values[record['id']] = copy.deepcopy(record)
    return list(values.values())

def near(a, b, radius):
    return all(max(a['min'][k], b['min'][k]) - min(a['max'][k], b['max'][k]) <= radius for k in range(2))

def model(case):
    """Derive intended source and pair policy from accepted source + intent."""
    inp = case['input']
    src, intent, saved = inp['bundle'], inp['intent'], inp['constraints']
    old_recipes, old_owners = bundle_integrity(src, 'accepted')
    layout = src['layout']
    floors = by_id(layout['floors'], 'accepted floors')
    equal(inp['context']['floorProfile']['floors'], layout['floors'], 'PROFILE_TABLE', case['name'])
    require(saved['floorProfileId'] == inp['context']['floorProfile']['id'], 'PROFILE_ID', case['name'])
    source_digest = token(saved)
    require(inp['expected']['sourceConstraintsDigest'] == source_digest == inp['context']['sourceConstraintsDigest'], 'ACCEPTED_CONSTRAINT_BINDING', case['name'])
    require(inp['expected']['floorProfileDigest'] == token(inp['context']['floorProfile']), 'PROFILE_BINDING', case['name'])
    require(inp['expected']['layoutDigest'] == token(layout) and inp['expected']['catalogueDigest'] == layout['catalogueDigest']
            and inp['expected']['revision'] == layout['revision'], 'ACCEPTED_SOURCE_BINDING', case['name'])
    require(inp['expected']['contextToken'] == inp['context']['contextToken'] and inp['context']['cancelled'] is False, 'CONTEXT_BINDING', case['name'])
    require(dec(intent['minimumClearanceM']) >= dec(saved['minimumClearanceM']), 'INTENT_MINIMUM', case['name'])
    old_refs = {v['instanceId']: v['primaryReservationId'] for v in saved['owners']}
    require(len(old_refs) == len(saved['owners']), 'PRIMARY_DUPLICATE', case['name'])
    refs, recipes, owners = copy.deepcopy(old_refs), copy.deepcopy(old_recipes), copy.deepcopy(old_owners)
    managed = by_id(saved['managedRelations'], 'accepted managed')
    old_relation_map = by_id(layout['relations'], 'accepted relations')
    saved_pairs = {}
    for record in managed.values():
        equal(record, old_relation_map.get(record['id']), 'ACCEPTED_MANAGED_SOURCE', record['id'])
        key = pair(record['a'], record['b'])
        require(key not in saved_pairs, 'ACCEPTED_MANAGED_PAIR', str(key))
        saved_pairs[key] = record
    if intent['kind'] == 'place-stack':
        recipe = intent['recipe']
        if recipe['id'] in recipes:
            equal(recipe, recipes[recipe['id']], 'PLACE_RECIPE_SOURCE', recipe['id'])
            updates = []
        else:
            updates = [copy.deepcopy(recipe)]
        primary = next(p for p in recipe['reservations'] if p['id'] == intent['primaryReservationId'])
        upserts = [{'id': member['id'], 'recipeId': recipe['id'],
                    'origin': [*intent['originXY'], floors[member['floorId']]['elevationM']],
                    'floorBindings': {primary['floorSlot']: member['floorId']}, 'transform': intent['transform'],
                    'locked': member['locked'], 'anchorIds': member['anchorIds'],
                    'primaryReservationId': primary['id']} for member in intent['members']]
        removes, join_delta, relation_delta = [], {'removeIds': [], 'upserts': []}, {'removeIds': [], 'upserts': []}
    else:
        require(intent['kind'] == 'edit-owners', 'INTENT_SCOPE', intent['kind'])
        upserts, removes, updates = intent['upserts'], intent['removeIds'], intent['recipeUpdates']
        join_delta, relation_delta = intent['joins'], intent['relations']
    changed_recipes = set()
    for r in updates:
        if r['id'] in recipes and canonical(r) != canonical(recipes[r['id']]):
            require(r['contentVersion'] > recipes[r['id']]['contentVersion'], 'CONTENT_VERSION', r['id'])
            changed_recipes.add(r['id'])
        recipes[r['id']] = copy.deepcopy(r)
    direct = set(removes)
    for key in removes:
        require(key in owners and not owners[key]['locked'], 'REMOVE_AUTHORITY', key)
        del owners[key]
    slots, replace_ids = [], []
    for v in upserts:
        require(v['id'] not in removes, 'CONFLICTING_INTENT', v['id'])
        require(v['id'] not in old_owners or not old_owners[v['id']]['locked'], 'REPLACE_AUTHORITY', v['id'])
        if v['id'] in old_owners:
            replace_ids.append(v['id'])
        direct.add(v['id'])
        refs[v['id']] = v['primaryReservationId']
        target = copy.deepcopy(v)
        del target['primaryReservationId']
        target['contentDigest'] = token(recipes[v['recipeId']])
        owners[v['id']] = target
        slots.append({k: copy.deepcopy(v[k]) for k in ['id', 'origin', 'floorBindings', 'locked', 'anchorIds']})
        slots[-1]['alternatives'] = [{'recipeId': v['recipeId'], 'transform': copy.deepcopy(v['transform'])}]
    for key, v in old_owners.items():
        if v['recipeId'] in changed_recipes:
            require(not v['locked'], 'RECIPE_LOCK', key)
            direct.add(key)
            if key in owners:
                owners[key]['contentDigest'] = token(recipes[v['recipeId']])
    joins = delta(layout['joins'], join_delta)
    explicit_relations = delta(layout['relations'], relation_delta)
    manual = [r for r in explicit_relations if r['id'] not in managed]
    for before, after in [(layout['joins'], joins), (layout['relations'], explicit_relations)]:
        a, b = by_id(before, 'before links'), by_id(after, 'after links')
        for key in a.keys() | b.keys():
            if canonical(a.get(key)) != canonical(b.get(key)):
                for record in [a.get(key), b.get(key)]:
                    if record is not None:
                        direct.update((record['a']['instanceId'], record['b']['instanceId']) if isinstance(record['a'], dict) else (record['a'], record['b']))
    facts = {'old': {key: rectangle(old_recipes[v['recipeId']], v, floors, old_refs[key]) for key, v in old_owners.items()},
             'next': {key: rectangle(recipes[v['recipeId']], v, floors, refs[key]) for key, v in owners.items()}}
    keys = sorted(set(old_owners) | set(owners))
    radius = q(inp['limits']['neighbourRadiusM'])
    links, discovery = [], []
    for a, b in itertools.combinations(keys, 2):
        variants = [[phase[key]['hull'] for phase in facts.values() if key in phase] for key in [a, b]]
        if any(near(x, y, radius) for x in variants[0] for y in variants[1]):
            links.append((a, b))
            discovery.append({'a': a, 'b': b, **{label: a in facts[phase] and b in facts[phase]
                             and near(facts[phase][a]['hull'], facts[phase][b]['hull'], radius)
                             for phase, label in [('old', 'oldNear'), ('next', 'newNear')]}})
    for records in [layout['joins'], joins, layout['relations'], manual]:
        for r in records:
            links.append((r['a']['instanceId'], r['b']['instanceId']) if isinstance(r['a'], dict) else (r['a'], r['b']))
    affected = set(direct)
    while True:
        more = {key for a, b in links if a in affected or b in affected for key in [a, b]}
        if more <= affected:
            break
        affected |= more
    obligations, required, unsupported, geometry_failures = [], {}, [], []
    for phase, table in facts.items():
        for a, b in itertools.combinations(sorted(affected & table.keys()), 2):
            A, B = table[a], table[b]
            minimum = max(dec(saved['minimumClearanceM']), dec(saved_pairs.get(pair(a, b), {}).get('clearanceM', 0)),
                          dec(intent['minimumClearanceM']) if phase == 'next' and ({a, b} & direct) else Decimal(0))
            contacts = [('source', A['shape'], B['shape'], A['primary'], B['primary'])]
            contacts += [('reservation', x, y, x['id'], y['id']) for x in A['reservations'] for y in B['reservations']]
            if A['base'] == B['base'] and all(min(A['shape']['max'][k], B['shape']['max'][k]) > max(A['shape']['min'][k], B['shape']['min'][k]) for k in range(2)):
                unsupported.append({'a': a, 'b': b, 'kind': 'same-plane'})
            for kind, x, y, ra, rb in contacts:
                overlaps = [min(x['max'][k], y['max'][k]) - max(x['min'][k], y['min'][k]) for k in range(3)]
                if not all(overlaps[k] >= -radius for k in range(2)) or not any(overlaps[k] > 0 for k in range(2)):
                    continue
                positive = all(overlaps[k] > 0 for k in range(2))
                gap = max(x['min'][2], y['min'][2]) - min(x['max'][2], y['max'][2])
                record = {'phase': phase, 'a': a, 'b': b, 'kind': kind, 'reservationA': ra, 'reservationB': rb,
                          'positiveXY': positive, 'gapQ': gap, 'minimumClearanceQ': q(minimum)}
                obligations.append(record)
                if A['floor'] != B['floor'] and not positive:
                    unsupported.append(record)
                if phase == 'next' and A['floor'] != B['floor'] and positive:
                    required[pair(a, b)] = minimum
                    if gap < q(minimum):
                        geometry_failures.append('insufficient-clearance')
    relations = copy.deepcopy(manual)
    next_managed = [copy.deepcopy(r) for r in managed.values() if not ({r['a'], r['b']} & affected)]
    relations += copy.deepcopy(next_managed)
    occupied = set(old_relation_map) | {r['id'] for r in relation_delta['upserts']}
    for (a, b), minimum in required.items():
        prior = saved_pairs.get((a, b))
        if not prior and any(r['kind'] == 'cross' and pair(r['a'], r['b']) == (a, b) and dec(r['clearanceM']) >= minimum for r in manual):
            continue
        if prior:
            identity = prior['id']
        else:
            seed = {'kind': PROFILE, 'id': intent['id'], 'sourceLayoutDigest': token(layout), 'pair': [a, b]}
            identity = next(('stk.cross.' + token({**seed, 'attempt': attempt}) for attempt in range(257)
                             if 'stk.cross.' + token({**seed, 'attempt': attempt}) not in occupied), None)
            require(identity is not None, 'ID_BOUND', str((a, b)))
        occupied.add(identity)
        record = {'id': identity, 'kind': 'cross', 'a': a, 'b': b, 'clearanceM': minimum}
        relations.append(record)
        next_managed.append(copy.deepcopy(record))
    relations.sort(key=lambda r: r['id'])
    next_constraints = {**copy.deepcopy(saved),
                        'owners': [{'instanceId': key, 'primaryReservationId': refs[key]} for key in sorted(refs) if key in owners],
                        'managedRelations': sorted(next_managed, key=lambda r: r['id'])}
    request = {'version': 1, 'id': intent['id'], 'expected': {k: inp['expected'][k] for k in ['revision', 'layoutDigest', 'catalogueDigest', 'contextToken']},
               'selection': copy.deepcopy(layout['selection']), 'replaceIds': sorted(replace_ids), 'removeIds': sorted(removes),
               'slots': slots, 'joins': joins, 'relations': relations, 'recipeUpdates': copy.deepcopy(updates),
               **{k: inp['limits'][k] for k in ['maxSteps', 'maxClosure', 'maxSpatialTests', 'maxGeometryWork', 'neighbourRadiusM']}}
    target = {**copy.deepcopy(src), 'recipes': [recipes[key] for key in sorted(recipes)], 'templates': template_source(recipes),
              'layout': {**copy.deepcopy(layout), 'revision': layout['revision'] + 1, 'catalogueDigest': catalogue_digest(recipes),
                         'instances': [owners[key] for key in sorted(owners)], 'joins': joins, 'relations': relations}}
    return {'request': request, 'target': target, 'constraints': next_constraints, 'facts': facts,
            'required': required, 'geometryFailures': geometry_failures, 'unsupported': unsupported,
            'direct': sorted(direct), 'closure': sorted(affected), 'discovery': discovery, 'obligations': obligations}


def envelope(case):
    result, plan = case['result'], case['result']['plan']
    require(type(result['ok']) is bool and type(plan['ok']) is bool, 'OUTCOME_TYPE', case['name'])
    preparation = result['preparation']
    if not plan['ok']:
        require(result['ok'] is False and preparation is None and plan['request'] is None and plan['constraints'] is None,
                'PLANNER_REFUSAL_ENVELOPE', case['name'])
        require(case['publicRequest'] is None, 'PLANNER_REFUSAL_SUBMISSION', case['name'])
    else:
        require(isinstance(preparation, dict) and type(preparation['ok']) is bool, 'PUBLIC_OUTCOME_TYPE', case['name'])
        require(result['ok'] == preparation['ok'], 'OVERALL_PUBLIC_OUTCOME', case['name'])
        if preparation['ok']:
            require(isinstance(preparation['nextBundle'], dict), 'PUBLIC_SUCCESS_TARGET', case['name'])
        else:
            require(preparation['nextBundle'] is None, 'PUBLIC_REFUSAL_TARGET', case['name'])
    return preparation


def inspect(case):
    preparation = envelope(case)
    m = model(case)
    result, plan, inp = case['result'], case['result']['plan'], case['input']
    supported = not m['unsupported']
    require(plan['ok'] == supported, 'PLANNER_PROFILE_OUTCOME', case['name'])
    violations = []
    if not supported:
        require(any(d.get('requiredCapability') == 'versioned-floor-separation' and d.get('code') == 'STACK_FLOOR_SEPARATION_UNSUPPORTED'
                    and any(pair(*d.get('ownerIds', [])) == pair(w['a'], w['b']) for w in m['unsupported'])
                    for d in plan['diagnostics']), 'UNSUPPORTED_WITNESS', case['name'])
        violations = ['deferred-edge-near']
        predicted = False
    else:
        equal(plan['request'], m['request'], 'PLANNED_REQUEST_VS_INTENT', case['name'])
        equal(plan['constraints'], m['constraints'], 'NEXT_CONSTRAINTS_VS_REQUIREMENTS', case['name'])
        expected_binding = {'sourceLayoutDigest': token(inp['bundle']['layout']),
                            'sourceCatalogueDigest': inp['bundle']['layout']['catalogueDigest'],
                            'contextToken': inp['context']['contextToken'],
                            'sourceConstraintsDigest': token(inp['constraints']),
                            'nextConstraintsDigest': token(m['constraints']),
                            'floorProfileDigest': token(inp['context']['floorProfile']),
                            'requestDigest': token(m['request'])}
        equal(plan['binding'], expected_binding, 'PLAN_BINDING', case['name'])
        equal(plan['inspection']['closureOwnerIds'], m['closure'], 'CLOSURE_INSPECTION', case['name'])
        equal(plan['inspection']['validatedOwnerIds'], m['closure'], 'VALIDATED_INSPECTION', case['name'])
        equal(plan['inspection']['discovery'], m['discovery'], 'DISCOVERY_INSPECTION', case['name'])
        equal(sorted(plan['inspection']['obligations'], key=canonical), sorted(m['obligations'], key=canonical), 'OBLIGATION_INSPECTION', case['name'])
        # Fault submission cannot rewrite the bound plan or intended geometry.
        submitted = copy.deepcopy(m['request'])
        fault = case['injectedFault']
        if fault is not None:
            require(fault['kind'] == 'omit-one-crossing', 'INJECTION_SCOPE', case['name'])
            record = next((r for r in submitted['relations'] if r['id'] == fault['relationId']), None)
            require(record is not None and record['kind'] == 'cross', 'INJECTION_SOURCE', case['name'])
            submitted['relations'].remove(record)
        equal(case['publicRequest'], submitted, 'PUBLIC_REQUEST_VS_INTENT', case['name'])
        violations += m['geometryFailures']
        for (a, b), minimum in m['required'].items():
            matching = [r for r in submitted['relations'] if r['kind'] == 'cross' and pair(r['a'], r['b']) == (a, b)]
            if not matching:
                violations.append('missing-crossing')
            elif not any(dec(r['clearanceM']) >= minimum for r in matching):
                violations.append('understated-crossing')
        predicted = not violations
        require(preparation['ok'] == predicted, 'PUBLIC_GEOMETRIC_OUTCOME', case['name'] + '/' + ','.join(sorted(set(violations))))
        if predicted:
            target = copy.deepcopy(m['target'])
            target['layout']['relations'] = submitted['relations']
            bundle_integrity(preparation['nextBundle'], 'actual public target')
            equal(preparation['nextBundle'], target, 'PUBLIC_TARGET_VS_INTENT', case['name'])
            equal(preparation['expected'], submitted['expected'], 'PUBLIC_EXPECTATION', case['name'])
            require(preparation['requestId'] == submitted['id'] and preparation['contextToken'] == inp['context']['contextToken'], 'PUBLIC_IDENTITY', case['name'])
            require(preparation['layoutDigest'] == token(target['layout']) and preparation['catalogueDigest'] == target['layout']['catalogueDigest'], 'PUBLIC_TARGET_DIGEST', case['name'])
        else:
            require(preparation['nextBundle'] is None and bool(preparation['diagnostics']), 'PUBLIC_REFUSAL_EVIDENCE', case['name'])
    require(result['ok'] == predicted, 'ACTUAL_OVERALL_OUTCOME', case['name'])
    # Expectation markers are extra fixture assertions, never the acceptance rule.
    if case['oracleExpected'] is not None:
        require(result['ok'] == case['oracleExpected'], 'FIXTURE_EXPECTATION', case['name'])
    next_obligations = [o for o in m['obligations'] if o['phase'] == 'next']
    crossing_pairs = {pair(o['a'], o['b']) for o in next_obligations
                      if m['facts']['next'][o['a']]['floor'] != m['facts']['next'][o['b']]['floor']}
    minima = {}
    for r in m['constraints']['managedRelations']:
        key = canonical(r['clearanceM'])
        minima[key] = minima.get(key, 0) + 1
    return {'name': case['name'], 'ok': predicted, 'actualOverallOK': result['ok'], 'planOK': plan['ok'],
            'actualPreparationOK': preparation['ok'] if preparation else None,
            'ownerPairs': len(crossing_pairs), 'contactObligations': len(next_obligations),
            'inspectedOldAndNextObligations': len(m['obligations']) if plan['ok'] else 0,
            'directOwnerIds': m['direct'], 'managedClearanceCounts': minima,
            'minimumGapQ': min((o['gapQ'] for o in next_obligations), default=None),
            'violations': sorted(set(violations)), 'actualTargetChecked': bool(preparation and preparation['ok']),
            'constraintsAndDigestsChecked': plan['ok'], 'intendedSourceDerivedIndependently': True}


def verify(data):
    require(data['schemaVersion'] == 2, 'EVIDENCE_VERSION', 'use captured source/public submission format 2')
    by_id([{'id': c['name']} for c in data['cases']], 'case names')
    for case in data['cases']:
        envelope(case)
    return [inspect(c) for c in data['cases'] if c['oracleExpected'] is not None]


def refresh_public_metadata(case):
    p = case['result']['preparation']
    target = p['nextBundle']
    recipes = by_id(target['recipes'], 'mutated recipes')
    target['layout']['catalogueDigest'] = catalogue_digest(recipes)
    for v in target['layout']['instances']:
        v['contentDigest'] = token(recipes[v['recipeId']])
    p['catalogueDigest'], p['layoutDigest'] = target['layout']['catalogueDigest'], token(target['layout'])


def mutation_controls(data):
    originals = {c['name']: c for c in data['cases']}
    controls = []

    def reject(name, source, mutate, complete=False):
        c = copy.deepcopy(originals[source])
        before_input, before_marker = canonical(c['input']), canonical(c['oracleExpected'])
        mutate(c)
        require(canonical(c['input']) == before_input and canonical(c['oracleExpected']) == before_marker, 'MUTATION_CONTROL_SCOPE', name)
        if complete:
            bundle_integrity(c['result']['preparation']['nextBundle'], 'complete forged target')
        try:
            inspect(c)
        except OracleMismatch as error:
            controls.append({'name': name, 'case': source, 'rejected': True, 'code': error.code,
                             'inputAndExpectationUnchanged': True, 'completeCoherentTarget': complete})
        else:
            raise OracleMismatch('MUTATION_ACCEPTED', name)

    def success_flags(c):
        c['result']['ok'] = c['result']['preparation']['ok'] = True

    for source in ['tall-extra-reservation', 'missing-one-crossing']:
        reject(source + '-forged-success-flags', source, success_flags)

    def old_empty(c):
        c['result']['preparation']['nextBundle'] = copy.deepcopy(c['input']['bundle'])
    reject('positive-returned-old-empty-bundle', 'uniform-fifteen', old_empty)

    def missing_managed(c):
        c['result']['plan']['constraints']['managedRelations'].pop()
        c['result']['plan']['binding']['nextConstraintsDigest'] = token(c['result']['plan']['constraints'])
    reject('next-managed-105-to-104-with-recomputed-digest', 'uniform-fifteen', missing_managed)
    reject('finish-returned-no-obligations', 'finish-unlocked', lambda c: c['result']['plan']['inspection'].update(obligations=[]))

    def complete_forged_success(c):
        success_flags(c)
        p = c['result']['preparation']
        p.update(copy.deepcopy(originals['uniform-fifteen']['result']['preparation']))
        p['expected'] = copy.deepcopy(c['publicRequest']['expected'])
        p['requestId'] = c['publicRequest']['id']
        p['contextToken'] = c['input']['context']['contextToken']
        refresh_public_metadata(c)
    for source in ['tall-extra-reservation', 'missing-one-crossing']:
        reject(source + '-complete-coherent-forged-success', source, complete_forged_success, True)

    def coherent_empty(c):
        old_empty(c)
        c['result']['preparation']['nextBundle']['layout']['revision'] += 1
        refresh_public_metadata(c)
    reject('positive-empty-target-with-coherent-digests', 'uniform-fifteen', coherent_empty, True)

    def wrong_origin(c):
        c['result']['preparation']['nextBundle']['layout']['instances'][-1]['origin'][0] += 1
        refresh_public_metadata(c)
    reject('positive-moved-target-with-coherent-digests', 'uniform-fifteen', wrong_origin, True)

    def changed_seed(c):
        c['result']['preparation']['nextBundle']['recipes'][0]['interior']['variantSeed'] += 1
        refresh_public_metadata(c)
    reject('positive-changed-seed-with-coherent-digests', 'uniform-fifteen', changed_seed, True)

    def rewritten_intent(c):
        plan = c['result']['plan']
        plan['request']['slots'][-1]['origin'][0] += 1
        plan['binding']['requestDigest'] = token(plan['request'])
        c['publicRequest'] = copy.deepcopy(plan['request'])
        wrong_origin(c)
    reject('plan-and-target-coherently-disagree-with-intended-origin', 'uniform-fifteen', rewritten_intent, True)

    def lowered_top(c):
        plan = c['result']['plan']
        relation = next(r for r in plan['constraints']['managedRelations'] if r['clearanceM'] == 3)
        relation['clearanceM'] = 2
        for records in [plan['request']['relations'], c['publicRequest']['relations'], c['result']['preparation']['nextBundle']['layout']['relations']]:
            next(r for r in records if r['id'] == relation['id'])['clearanceM'] = 2
        plan['binding']['nextConstraintsDigest'] = token(plan['constraints'])
        plan['binding']['requestDigest'] = token(plan['request'])
        refresh_public_metadata(c)
    reject('stronger-top-requirement-lowered-with-coherent-source-and-digests', 'stronger-top-only', lowered_top, True)

    def wrong_inspection_minimum(c):
        next(o for o in c['result']['plan']['inspection']['obligations'] if o['phase'] == 'next' and o['a'] == 'deck.00' and o['b'] == 'deck.01')['minimumClearanceQ'] = 3000000
    reject('stronger-top-inspection-invented-lower-pair-minimum', 'stronger-top-only', wrong_inspection_minimum)

    def false_public(c):
        p = c['result']['preparation']
        c['result']['ok'] = p['ok'] = False
        p['nextBundle'] = None
        p['diagnostics'] = [{'code': 'SYNTHETIC_FALSE_REFUSAL'}]
    reject('positive-forged-public-refusal', 'uniform-fifteen', false_public)

    def refused_target(c):
        c['result']['preparation']['nextBundle'] = copy.deepcopy(originals['uniform-fifteen']['result']['preparation']['nextBundle'])
    reject('public-refusal-retains-a-complete-candidate', 'tall-extra-reservation', refused_target, True)

    # Original bound-request omission control retained with expectations fixed.
    reject('original-bound-request-omission', 'uniform-fifteen', lambda c: c['result']['plan']['request']['relations'].pop())
    return controls


def main():
    with open(sys.argv[1], encoding='utf-8') as handle:
        data = json.load(handle, parse_float=Decimal)
    results = verify(data)
    controls = mutation_controls(data)
    out = {'schemaVersion': 2, 'method': 'independent intended source + Decimal/q1e6 intervals + actual outcomes/targets/constraints/bindings/inspection; no engine/planner imports',
           'results': results, 'envelopeCases': len(data['cases']),
           'budgetCasesOutsideIntervalPrediction': [c['name'] for c in data['cases'] if c['oracleExpected'] is None],
           'mutationControls': len(controls), 'mutations': controls}
    text = json.dumps(out, indent=2) + '\n'
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(text)
    print(json.dumps({'oracleCases': len(results), 'envelopeCases': len(data['cases']), 'mutationControls': len(controls),
                      'allMutationsLeaveInputAndExpectationsFixed': True, 'positiveFifteenPairs': 105}))

if __name__ == '__main__':
    main()
