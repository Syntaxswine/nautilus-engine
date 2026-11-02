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
print(json.dumps({'status': 'pass', 'schemas': 2, 'cases': cases,
    'scope': 'Independent Draft2020-12 shapes only; no ownership or runtime proof'}))
