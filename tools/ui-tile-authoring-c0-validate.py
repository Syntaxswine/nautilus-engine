"""C0 metadata/schema checks only. No parser alias, executor or host authority."""
import argparse, copy, hashlib, json, pathlib, sys
parser=argparse.ArgumentParser()
parser.add_argument("--dependencies",default="artifacts/ui-tile-authoring-c0/schema-validator")
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str((root/args.dependencies).resolve()))
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
base=root/"candidates/tile-authoring/ui"
schema=json.loads((base/"inputs/core-c0.schema.json").read_text(encoding="utf8"))
registry=Registry()
for file in (base/"inputs").glob("*.schema.json"):
    value=json.loads(file.read_text(encoding="utf8"))
    Draft202012Validator.check_schema(value)
    registry=registry.with_resource(value["$id"],Resource.from_contents(value))
def validator(pointer):
    return Draft202012Validator({"$ref":schema["$id"]+pointer},registry=registry)
def read(file):
    return json.loads((root/file).read_text(encoding="utf8"))
index=read("candidates/tile-authoring/ui/example-index.json")
positive=[]
for row in index["examples"]:
    value=read(row["file"])
    errors=list(validator(row["schemaPointer"]).iter_errors(value))
    if errors:
        raise AssertionError(row["file"]+": "+errors[0].message)
    positive.append(row["file"])
prefix="candidates/tile-authoring/ui/"
command=read(prefix+"examples/paint-command.json")
document=read(prefix+"inputs/core-document-v3.json")
snapshot=read(prefix+"examples/snapshot.json")
unknown=read(prefix+"examples/outcome-unknown.json")
artwork=document["authoring"]["library"]["artwork"][0]
negative=[]
def refuses(name,pointer,value):
    assert list(validator(pointer).iter_errors(value)),name
    negative.append(name)
bad=copy.deepcopy(command);bad["payload"]={};refuses("old payload wrapper","#/$defs/command",bad)
bad=copy.deepcopy(command);bad["command"]={"id":"tile.decoration.add"};refuses("old nested command identity","#/$defs/command",bad)
bad=copy.deepcopy(command);bad["operations"][0]["kind"]="tile.decoration.add";refuses("old operation alias","#/$defs/command",bad)
bad=copy.deepcopy(command);bad["expected"].pop("hostAuthorityToken");refuses("incomplete Expected","#/$defs/command",bad)
bad=copy.deepcopy(command);bad["expected"]["workspaceToken"]="a"*64;refuses("old Expected alias","#/$defs/command",bad)
bad=copy.deepcopy(command);bad["operations"][0]["body"]["mark"]["graphic"]["artwork"]={"id":"x","version":1,"sha256":"a"*64};refuses("old pin","#/$defs/command",bad)
bad=copy.deepcopy(command);g=bad["operations"][0]["body"]["mark"]["graphic"];g["tint"]=g.pop("tintLinearRGB");refuses("implicit non-linear tint alias","#/$defs/command",bad)
bad=copy.deepcopy(unknown);bad["committed"]=False;refuses("unknown is not rejected","#/$defs/applyOutcome",bad)
bad=copy.deepcopy(unknown);bad.pop("writesFrozen");refuses("unknown must freeze","#/$defs/applyOutcome",bad)
bad=copy.deepcopy(unknown);bad["potentiallyCommittedResources"]="delete";refuses("unknown must retain resources","#/$defs/applyOutcome",bad)
bad=copy.deepcopy(document);bad["version"]=2;refuses("no silent document migration","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(document);bad["constraints"]=None;refuses("full typed constraints required","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(document);bad["floorBinding"]=snapshot["source"]["floorProfile"];refuses("projection is not full floor binding","#/$defs/workbenchDocument",bad)
refuses("Source is not saved authority","#/$defs/workbenchDocument",snapshot["source"])
bad=copy.deepcopy(document);bad["library"]=bad["authoring"]["library"];refuses("one AuthoringModule authority","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(document);bad["resourceRefs"][0]["uri"]="https://moving.invalid/latest.png";refuses("resource URI not durable","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(document);bad["resourceRefs"][0]["blob"]=artwork["body"]["blob"];refuses("no second mutable descriptor","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(document);bad["resourceRefs"][0]["lease"]="temporary";refuses("lease not durable","#/$defs/workbenchDocument",bad)
bad=copy.deepcopy(artwork);bad["body"].pop("imageView");refuses("explicit image view required","#/$defs/artworkRecord",bad)
bad=copy.deepcopy(artwork);bad["body"]["imageView"]["sampler"].pop("alphaFloor8");refuses("explicit sampler required","#/$defs/artworkRecord",bad)
bad=copy.deepcopy(document["authoring"]["decorations"]["surfaces"][0]["layers"][0]);bad["opacity"]=1.1;refuses("bounded layer opacity","#/$defs/layer",bad)
refuses("pack is not old wrapper","#/$defs/pack",{"manifest":document["authoring"]["library"],"resources":[]})
metadata=read(prefix+"presentation.json")
assert metadata["runtimeImplemented"] is False
assert metadata["coordinates"]["storedImageUV"]=="top-left"
assert metadata["coordinates"]["storedPivotUV"]=="top-left"
assert snapshot["document"]["authoring"]==snapshot["source"]["authoring"]
report={"scope":"JSON Schema/metadata contract evidence only; no executor, decoder, renderer, authority or performance claim.",
        "core":metadata["coreCommit"],"positiveExamples":len(positive),"negativeCases":len(negative),
        "positive":positive,"negative":negative,"coordinateStatus":metadata["coordinates"]["status"]}
out=root/"artifacts/ui-tile-authoring-c0";out.mkdir(parents=True,exist_ok=True)
(out/"schema-proof.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
print(json.dumps({"positiveExamples":len(positive),"negativeCases":len(negative),"runtimeImplemented":False}))
