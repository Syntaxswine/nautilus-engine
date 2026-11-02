"""Independent Draft 2020-12 validation of the generated candidate fixtures.

Uses a caller-supplied jsonschema installation; no engine runtime dependency.
Run measure-farmyard-doors.mjs first to create ignored structural cases.
"""
import importlib.metadata
import json
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path(__file__).resolve().parent.parent
folder = root / "packages/adapters/farmyard/doors"
schemas = [json.loads((folder / name).read_text(encoding="utf-8")) for name in ["door-state-v1.schema.json", "door-host-save-v1.schema.json"]]
registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in schemas)
cases = json.loads((root / "artifacts/farmyard-doors/schema-cases.json").read_text(encoding="utf-8"))
checked = 0
for schema, group in zip(schemas, ["stateCases", "hostCases"]):
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, registry=registry)
    for case in cases[group]:
        errors = list(validator.iter_errors(case["value"]))
        assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:2]])
        checked += 1
print(json.dumps({"status": "pass", "validator": "jsonschema " + importlib.metadata.version("jsonschema"), "draft": "2020-12", "cases": checked, "schemas": len(schemas), "scope": "Independent structural validation; replay/reference/resource-limit behavior is tested by the JavaScript loader."}))
