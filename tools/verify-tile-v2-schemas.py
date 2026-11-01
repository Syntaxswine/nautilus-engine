"""Independent candidate structural checks; executable proofs are separate gates."""
import json
import sys
from pathlib import Path

if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path(__file__).resolve().parent.parent
names = {"recipe": "tile-recipe", "layout": "tile-layout", "bundle": "tile-bundle", "compiled": "compiled-tiles"}
schemas = {key + str(version): json.loads((root / "packages/tiles-core" / (name + "-v" + str(version) + ".schema.json")).read_text(encoding="utf-8")) for key, name in names.items() for version in (1, 2)}
registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in schemas.values())
for schema in schemas.values():
    Draft202012Validator.check_schema(schema)
validators = {key: Draft202012Validator(schema, registry=registry) for key, schema in schemas.items()}
cases = json.loads((root / "artifacts/procedural-tiles-v2/schema-cases.json").read_text(encoding="utf-8"))
validators['compositionRequest'] = Draft202012Validator({'$ref': schemas['compiled2']['$id']+'#/$defs/compositionRequest'}, registry=registry)
c2a = root / 'artifacts/procedural-tiles-c2a/schema-cases.json'
if c2a.exists():
    cases += json.loads(c2a.read_text(encoding='utf-8'))
count = 0
for case in cases:
    if case["schema"] == "meta":
        continue
    try:
        errors = list(validators[case["schema"]].iter_errors(case["value"]))
    except Exception as error:
        raise RuntimeError((case['label'], type(error).__name__)) from None
    assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:2]])
    count += 1
print(json.dumps({"status": "pass", "schemas": len(schemas), "cases": count, "scope": "Independent structure, including private C1 root-only evidence; private C2a preparation is separate; public registration and live adoption remain unavailable."}))
