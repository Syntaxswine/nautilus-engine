"""Independent Draft 2020-12 structural validation, without runtime dependencies.

Generate ignored cases with measure-farmyard-window-impacts.mjs first. The JS
loader additionally verifies complete replay, ownership, references and budgets.
"""
import json
import sys
from pathlib import Path

if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path(__file__).resolve().parent.parent
schemas = [json.loads((root / file).read_text(encoding="utf-8")) for file in [
    "packages/windows-core/window-geometry-v1.schema.json",
    "packages/windows-core/window-pane-state-v1.schema.json",
    "packages/adapters/farmyard/windows/window-host-save-v1.schema.json",
]]
registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in schemas)
for schema in schemas:
    Draft202012Validator.check_schema(schema)
validators = {"state": Draft202012Validator(schemas[1], registry=registry), "host": Draft202012Validator(schemas[2], registry=registry)}
cases = json.loads((root / "artifacts/farmyard-windows/impact-schema-cases.json").read_text(encoding="utf-8"))
for case in cases:
    errors = list(validators[case["schema"]].iter_errors(case["value"]))
    assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:3]])
print(json.dumps({"status": "pass", "draft": "2020-12", "schemas": len(schemas), "cases": len(cases), "scope": "Independent prospective state/host structure; deterministic replay and live authority are JS gates."}))
