/** Static type consumers only; these declarations do not make live capabilities. */
import type {ExistingC1Read,C2Read,OverlayPorts,ThumbnailPresentation,Pin,Expected,Layer,MaskDraft,RetainedFirstMarkForm,RetainedFirstMarkCommand,BuiltinFirstMarkForm,BuiltinFirstMarkCommand,BuiltinDependencyPrefixOwner,OverlayOperation} from './projection.js';
type HitFromOwner = {readonly owner: 'existing-input-owner'};
type HandleFromOwner = {readonly owner: 'existing-thumbnail-owner'};
declare const read:C2Read<ExistingC1Read>;
declare const ports:OverlayPorts<ExistingC1Read,HitFromOwner,HandleFromOwner>;
declare const presenter:ThumbnailPresentation<HandleFromOwner>;
declare const element:HTMLElement;
declare const first:RetainedFirstMarkForm;
declare const art:Pin;
declare const hit:HitFromOwner;
const selected=ports.selectExisting(read,{kind:'surface',ownerId:'owner.one',surfaceId:'top'});
if(selected.status==='selected'){const point:readonly[number,number]|null=selected.localPointM;void point;}
ports.acceptCanvasSelection(read,hit);
const made=ports.constructOverlayCommand(read,first);
if(made.status==='constructed'){
  const exactTwo:2=made.command.operations.length;
  const firstKind:'surface.layers'=made.command.operations[0].kind;
  const secondKind:'decoration.add'=made.command.operations[1].kind;
  const fresh:1=made.command.operations[1].body.mark.revision;
  const ungrouped:null=made.command.operations[1].body.mark.groupId;
  void [exactTwo,firstKind,secondKind,fresh,ungrouped];
  // @ts-expect-error first batch cannot reverse operation order
  const reversed:RetainedFirstMarkCommand['operations']=[made.command.operations[1],made.command.operations[0]];
  // @ts-expect-error first batch is not a one-operation tuple
  const partial:RetainedFirstMarkCommand['operations']=[made.command.operations[0]];
  void [reversed,partial];
}
ports.constructOverlayCommand(read,{kind:'decoration.update',markId:'mark.one',expectedRevision:1,changes:[{field:'opacity',value:0.5},{field:'pivotUV',value:[0.2,0.8]}]});
const thumbnail=ports.resolveVerifiedThumbnail(read,art);
if(thumbnail.status==='verified'){const detach=presenter.attach(thumbnail.handle,element);detach();}
declare const missingExpected:Omit<Expected,'floorProfileDigest'>;
// @ts-expect-error Expected is complete, not a partial packet
const expected:Expected=missingExpected;
// @ts-expect-error copied source data is immutable
read.snapshot.document.contentRevision=12;
// @ts-expect-error artwork revision is immutable data
read.overlay.palette[0].artwork.revision=2;
// @ts-expect-error no invented saved visibility field
const layer:Layer={...read.overlay.selection!.layers[0].value,visible:false};
// @ts-expect-error no UI-supplied target/binding hash in a first-mark form
ports.constructOverlayCommand(read,{...first,target:{ownerId:'owner.one',surfaceId:'top',floorId:'F00',bindingDigest:'fake'}});
// @ts-expect-error mark.move is not a port form or canonical transport action
ports.constructOverlayCommand(read,{kind:'mark.move',markId:'mark.one',positionM:[1,2]});
// @ts-expect-error a numeric selection does not accept triangle identity
ports.selectExisting(read,{kind:'surface',ownerId:'owner.one',surfaceId:'top',triangleIndex:5});
// @ts-expect-error JSON coordinates do not implement the existing owner's hit type
ports.acceptCanvasSelection(read,{x:1,y:2});
// @ts-expect-error finite DTO entry is not a live thumbnail owner's handle
presenter.attach(read.overlay.palette[0],element);
// @ts-expect-error C1 decoration capture false default is fixed in this proposal
const base:ExistingC1Read={...read,presentation:{...read.presentation,includeSelectedDecorationDefaults:true}};
// @ts-expect-error typed private C2 output never groups an add
const add:Extract<OverlayOperation,{kind:'decoration.add'}>={opId:'op.one',kind:'decoration.add',body:{chunkId:'chunk.one',mark:{...read.overlay.selection!.selectedMark!,revision:1,groupId:'group.one'}}};
// @ts-expect-error source-grid hash cannot be supplied in a cell selection draft
const mask:MaskDraft={kind:'grid-cells',cells:[{i:0,j:0}],digest:'fake'};
void [expected,layer,base,add,mask];

declare const builtin:BuiltinFirstMarkForm;
declare const retainedCommand:RetainedFirstMarkCommand;
declare const builtinCommand:BuiltinFirstMarkCommand;
const imported=ports.constructOverlayCommand(read,builtin);
if(imported.status==='constructed'){
  const route:'builtin-prefix-first-mark'=imported.route;
  const prefixKind:'content.import'=imported.command.operations[0].kind;
  const conflict:'refuse-different-content'=imported.command.operations[0].body.conflict;
  void [route,prefixKind,conflict];
}
// @ts-expect-error missing content.import prefix cannot be a builtin first command
const missingPrefix:BuiltinFirstMarkCommand=retainedCommand;
// @ts-expect-error builtin command cannot be a two-operation retained tuple
const missingSuffix:BuiltinFirstMarkCommand['operations']=[builtinCommand.operations[0],retainedCommand.operations[0]];
// @ts-expect-error builtin prefix must precede the unchanged layers/add suffix
const reversedBuiltin:BuiltinFirstMarkCommand['operations']=[retainedCommand.operations[0],builtinCommand.operations[0],retainedCommand.operations[1]];
// @ts-expect-error UI form cannot supply canonical packs or a dependency prefix
ports.constructOverlayCommand(read,{...builtin,packs:[builtinCommand.operations[0].body.pack]});
// @ts-expect-error exact selected revision is numeric; no implicit latest route
ports.constructOverlayCommand(read,{...builtin,artwork:{...art,revision:'latest'}});
// @ts-expect-error first-mark form must explicitly identify its dependency route
ports.constructOverlayCommand(read,{kind:'first-mark',artwork:art,layer:first.layer,graphic:first.graphic});
type BytesFromOwner={readonly actualOwner:'existing-verified-byte-owner'};
declare const dependencyOwner:BuiltinDependencyPrefixOwner<ExistingC1Read,BytesFromOwner>;
const dependency=dependencyOwner.constructBuiltinDependencyPrefix(read,art);
if(dependency.status==='validated'){
  const bytes:BytesFromOwner=dependency.bytes;
  const png:'image/png'=dependency.packs[0].manifest.artwork[0].body.blob.mediaType;
  // @ts-expect-error consumer cannot mutate the validated prefix pack list
  dependency.packs.push(builtinCommand.operations[0].body.pack);
  void [bytes,png];
}
void [missingPrefix,missingSuffix,reversedBuiltin];
