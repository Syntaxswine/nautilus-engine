"""Independent Draft 2020-12 shape check; executable geometry checks remain JS."""
import json
import sys
from pathlib import Path

if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path(__file__).resolve().parent.parent
names = {"recipe": "tile-recipe", "layout": "tile-layout", "bundle": "tile-bundle", "compiled": "compiled-tiles"}
schemas = {key: json.loads((root / "packages/tiles-core" / (name + "-v1.schema.json")).read_text(encoding="utf-8")) for key, name in names.items()}
registry = Registry().with_resources((value["$id"], Resource.from_contents(value)) for value in schemas.values())
for schema in schemas.values():
    Draft202012Validator.check_schema(schema)
validators = {key: Draft202012Validator(value, registry=registry) for key, value in schemas.items()}
cases = json.loads((root / "artifacts/procedural-tiles/schema-cases.json").read_text(encoding="utf-8"))
for case in cases:
    errors = list(validators[case["schema"]].iter_errors(case["value"]))
    assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:3]])
print(json.dumps({"status": "pass", "draft": "2020-12", "schemas": len(schemas), "cases": len(cases), "scope": "Independent structure; content, analytic joins, readiness and retained authority are executable JS gates."}))
