"""Independent UI structural parity, never a Host/ownership/canonical hash proof."""
import json
import sys
from pathlib import Path
args = dict(arg.split('=', 1) for arg in sys.argv[1:])
sys.path.insert(0, str(Path(args['--python-deps']).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
base = Path(__file__).resolve().parent.parent
core = json.loads((base / 'vendor/core/8b4cd72c2d8f424d6811196d9651916bb7e9e2bd/contract.schema.json').read_text(encoding='utf-8'))
ui = json.loads((base / 'vendor/ui/05723c3cada36249c6b6777dd40c8a478701bccb/projection.schema.json').read_text(encoding='utf-8'))
registry = Registry().with_resources((s['$id'], Resource.from_contents(s)) for s in [core, ui])
for schema in [core, ui]:
    Draft202012Validator.check_schema(schema)
cases = json.loads(Path(args['--cases']).read_text(encoding='utf-8'))
for case in cases:
    schema = dict(ui)
    schema['$ref'] = '#/$defs/' + case['shape']
    valid = not list(Draft202012Validator(schema, registry=registry).iter_errors(case['value']))
    assert valid == case['valid'], case['name']
print(json.dumps({'status': 'pass', 'schemas': 2, 'cases': len(cases), 'meaning': 'Independent finite shapes only; no actual Host/native/WAL or canonical-source proof.'}))
