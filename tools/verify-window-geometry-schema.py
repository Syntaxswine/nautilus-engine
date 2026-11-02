"""Independent structural validation; no runtime dependency or schema registry edits.

Run farmyard-window-geometry-schema.mjs --cases first. The executable loader also
checks ownership, finite float limits, references, semantic conflicts and digests.
"""
import json
import sys
from pathlib import Path

# The bundled embedded Python ignores PYTHONPATH; an explicit isolated tool
# dependency directory keeps this validator out of engine/runtime dependencies.
if len(sys.argv) == 3 and sys.argv[1] == "--dependencies":
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parent.parent
schema = json.loads((root / "packages/windows-core/window-geometry-v1.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
cases = json.loads((root / "artifacts/farmyard-windows/schema-cases.json").read_text(encoding="utf-8"))
for case in cases:
    errors = list(validator.iter_errors(case["value"]))
    assert (not errors) == case["valid"], (case["label"], [error.message for error in errors[:2]])
print(json.dumps({"status": "pass", "draft": "2020-12", "cases": len(cases), "scope": "Geometry snapshot structure only; no full-game save or pane transaction claim."}))
