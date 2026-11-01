"""Independent structural checks; not an engine/runtime dependency.

Generate cases with window-authoring-schema-cases.mjs first. Pass an isolated
jsonschema tool-dependency directory with --dependencies when needed.
"""
import json
import sys
from pathlib import Path

if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path(__file__).resolve().parent.parent
schema_file = root / "packages/windows-authoring/window-authoring-v1.schema.json"
base_file = root / "schemas/aft-map-v2.schema.json"
schema = json.loads(schema_file.read_text(encoding="utf-8"))
base = json.loads(base_file.read_text(encoding="utf-8"))
Draft202012Validator.check_schema(schema)
registry = Registry().with_resources([
    (schema_file.as_uri(), Resource.from_contents(schema)),
    (base_file.as_uri(), Resource.from_contents(base)),
    (schema["$id"], Resource.from_contents(schema)),
    (base["$id"], Resource.from_contents(base)),
])
# Resolve the schema's actual URI reference locally, without rewriting it or
# fetching schemas from the network.
validator = Draft202012Validator(schema, registry=registry)
cases = json.loads((root / "artifacts/window-authoring/schema-cases.json").read_text(encoding="utf-8"))
for case in cases:
    errors = list(validator.iter_errors(case["value"]))
    assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:2]])
report = {"status":"pass", "draft":"2020-12", "cases":len(cases), "scope":"Closed authoring wrapper and unchanged portable base structure; native semantics and aggregate limits also require executable validation."}
(root / "artifacts/window-authoring/schema-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))
