"""Independent draft-2020-12 proof. Test-only: jsonschema==4.23.0.

Run with an isolated dependency directory on PYTHONPATH; nothing is added to the
engine package. No HTTP reference resolution or game/runtime imports occur.
"""
import copy
import json
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "tests/fixtures/parts"
FILES = ["part-definition", "functional-parts", "compiled-parts", "parts-runtime-save"]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


schemas = {name: read(ROOT / "schemas" / (name + "-v1.schema.json")) for name in FILES}
referenced = [
    read(ROOT / "packages/world-core/extended-world-v1.schema.json"),
    read(ROOT / "schemas/standard-interactions-v1.schema.json"),
]
registry = Registry().with_resources(
    (schema["$id"], Resource.from_contents(schema))
    for schema in [*schemas.values(), *referenced]
)
validators = {}
for name, schema in schemas.items():
    Draft202012Validator.check_schema(schema)
    validators[name] = Draft202012Validator(schema, registry=registry)

checks = 0


def accept(name, instance):
    global checks
    errors = list(validators[name].iter_errors(instance))
    if errors:
        first = errors[0]
        raise AssertionError(f"{name} /{'/'.join(map(str, first.absolute_path))}: {first.message}")
    checks += 1


def reject(name, instance):
    global checks
    assert not validators[name].is_valid(instance), f"Schema accepted malformed {name}"
    checks += 1


for definition in read(FIXTURES / "definitions.json"):
    accept("part-definition", definition)
for variant in ["single", "transformed", "second-layout"]:
    accept("functional-parts", read(FIXTURES / (variant + ".json")))
accept("compiled-parts", read(FIXTURES / "compiled-single.json"))
accept("parts-runtime-save", read(FIXTURES / "mid-stair-save.json"))

document = read(FIXTURES / "single.json")
for mutate in [
    lambda value: value.update(version=2),
    lambda value: value["instances"][0]["transform"].update(scale=1),
    lambda value: value["instances"][0]["transform"].update(quarterTurns=4),
    lambda value: value["instances"][0].update(id="invalid\n"),
    lambda value: value["connections"][0]["to"].update(unknown=True),
    lambda value: value["world"].update(unknown=True),
]:
    changed = copy.deepcopy(document)
    mutate(changed)
    reject("functional-parts", changed)
saved = read(FIXTURES / "mid-stair-save.json")
for mutate in [
    lambda value: value.update(sceneId="scene:short"),
    lambda value: value["runtime"].update(unknown=True),
    lambda value: value["runtime"]["actors"][0].update(position={"x": 0, "y": 0}),
    lambda value: value["runtime"]["journal"][0]["command"].update(unknown=True),
]:
    changed = copy.deepcopy(saved)
    mutate(changed)
    reject("parts-runtime-save", changed)
print(f"Independent jsonschema 4.23.0: four draft-2020-12 schemas, {checks} positive/negative cases pass; all refs resolved locally.")
