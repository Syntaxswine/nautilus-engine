"""Independent shape controls only; never a Host/runtime admission checker."""
import json
import sys
from pathlib import Path

args = dict(arg.split('=', 1) for arg in sys.argv[1:])
sys.path.insert(0, str(Path(args['--dependencies']).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

here = Path(__file__).resolve().parent
core = json.loads(Path(args['--core-schema']).read_text(encoding='utf-8'))
proposal = json.loads((here / 'projection.schema.json').read_text(encoding='utf-8'))
registry = Registry().with_resources((s['$id'], Resource.from_contents(s)) for s in [core, proposal])
for schema in [core, proposal]:
    Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(proposal, registry=registry)
source = json.loads((here / 'source.json').read_text(encoding='utf-8'))
cases = 0
for name in source['fixtures']:
    value = json.loads((here / 'fixtures' / name).read_text(encoding='utf-8'))
    assert not list(validator.iter_errors(value)), name
    cases += 1
    changed = dict(value)
    changed['extra'] = True
    assert list(validator.iter_errors(changed)), name + ': closed fixture'
    cases += 1
# The committed all30 pack is a SHAPE control only; the finite JS semantic
# controls reject it as overbroad. No valid selected-prefix producer is invented.
command = json.loads(Path(args['--command-controls']).read_text(encoding='utf-8'))
from copy import deepcopy
def check_shape(definition, value, valid):
    global cases
    selected = dict(proposal)
    selected['$ref'] = '#/$defs/' + definition
    selected.pop('oneOf', None)
    errors = list(Draft202012Validator(selected, registry=registry).iter_errors(value))
    assert bool(errors) != valid, definition
    cases += 1
retained = deepcopy(command)
retained['operations'] = [op for op in retained['operations'] if op['kind'] != 'content.import']
check_shape('BuiltinFirstMarkCommand', command, True)
check_shape('RetainedFirstMarkCommand', command, False)
check_shape('RetainedFirstMarkCommand', retained, True)
check_shape('BuiltinFirstMarkCommand', retained, False)
incomplete = deepcopy(command)
incomplete['operations'].pop()
check_shape('BuiltinFirstMarkCommand', incomplete, False)
duplicate_layers = deepcopy(command)
duplicate_layers['operations'][-1] = deepcopy(duplicate_layers['operations'][-2])
check_shape('BuiltinFirstMarkCommand', duplicate_layers, False)
extra_field = deepcopy(command)
extra_field['operations'][0]['body']['extra'] = True
check_shape('BuiltinFirstMarkCommand', extra_field, False)
wrong_order = deepcopy(command)
wrong_order['operations'] = wrong_order['operations'][1:] + wrong_order['operations'][:1]
# Count constraints alone cannot enforce a variable-length import prefix.
# The semantic sequence control must reject this despite structural acceptance.
check_shape('BuiltinFirstMarkCommand', wrong_order, True)
print(json.dumps({'status': 'pass', 'schemas': 2, 'cases': cases,
    'scope': 'Independent Draft2020-12 shapes only; no ownership or runtime proof'}))
