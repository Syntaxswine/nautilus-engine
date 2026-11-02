"""Independent candidate structural checks; executable proofs are separate gates."""
import json
import sys
from importlib.metadata import version
from pathlib import Path

if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
if version("jsonschema") != "4.23.0":
    raise RuntimeError("Use the isolated jsonschema==4.23.0 proof dependency")
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
EXPECTED_BASE_CASES, EXPECTED_C2A_CASES = 358, 174
c2a_cases = json.loads(c2a.read_text(encoding='utf-8'))
assert len([c for c in cases if c['schema'] != 'meta']) == EXPECTED_BASE_CASES
assert len(c2a_cases) == EXPECTED_C2A_CASES and all(c['schema'] != 'meta' for c in c2a_cases)
cases += c2a_cases
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
assert count == EXPECTED_BASE_CASES + EXPECTED_C2A_CASES
report = {"status": "pass", "schemas": len(schemas), "cases": count, "baseCases": EXPECTED_BASE_CASES, "c2aCases": len(c2a_cases), "validator": "jsonschema==4.23.0", "scope": "Independent structure, including private C1 and C2a evidence. Executable preparation, public registration and live adoption are separate."}
(root / "artifacts/procedural-tiles-c2a/schema-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
