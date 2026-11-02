// Executable metadata proof for contract review; no authoring or permission authority.
const panels=['workbench','library','brush','layers','requirements','content-pack'];
const scopes=['definition','preset','instance','selected-instances','content-pack'];
const targets=['recipe','preset','decoration','instance','requirements','content-pack'];
const bindingKeys=['workspaceId','workspaceToken','contextToken','policyToken','floorTableToken','contentToken','resourceToken'];
const fail=message=>{throw new TypeError(message);};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2048;
const uint=value=>Number.isSafeInteger(value)&&value>=0;
function keys(value,required,optional=[]){
  if(!plain(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key)))fail('Unknown or missing discovery fields.');
}
function diagnostics(rows){
  if(!Array.isArray(rows)||rows.length>128)fail('Bound diagnostics.');
  for(const row of rows){
    keys(row,['code','path','message','action'],['ownerIds','reservationIds','requiredCapability']);
    if(!['code','path','message','action'].every(key=>text(row[key])))fail('Diagnostic needs code, path, message and action.');
    for(const key of ['ownerIds','reservationIds'])if(row[key]!==undefined&&(!Array.isArray(row[key])||row[key].length>64||!row[key].every(text)))fail('Invalid diagnostic target IDs.');
    if(row.requiredCapability!==undefined&&!text(row.requiredCapability))fail('Invalid capability diagnostic.');
  }
}
function freeze(value){
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
}
/** Validate presentation metadata only. This does not validate command payloads,
 * authenticate tokens, enforce budgets or approve any edit. Unknown versions fail. */
export function readAuthoringDiscovery(value){
  keys(value,['kind','version','discoveryToken','binding','commands','notices']);
  if(value.kind!=='nautilus-tile-authoring-ui-discovery-proposal'||value.version!==1)fail('Bind the explicit reviewed discovery version.');
  if(!text(value.discoveryToken))fail('Capture the discovery token.');
  keys(value.binding,bindingKeys);
  if(!bindingKeys.every(key=>text(value.binding[key])))fail('Capture every Editor binding.');
  if(!Array.isArray(value.commands)||value.commands.length>64)fail('Bound command discovery.');
  const ids=new Set(),controls=new Set();
  for(const command of value.commands){
    keys(command,['id','version','label','summary','schema','target','effect','history','scopes','available','diagnostics','controls']);
    if(!['id','label','summary'].every(key=>text(command[key]))||!uint(command.version)||command.version<1||ids.has(command.id))fail('Use unique versioned command identities.');
    ids.add(command.id);keys(command.schema,['id','version','sha256']);
    if(!text(command.schema.id)||!uint(command.schema.version)||command.schema.version<1||!/^[a-f0-9]{64}$/.test(command.schema.sha256))fail('Pin the command payload schema.');
    if(!targets.includes(command.target)||!['read','edit'].includes(command.effect)||command.history!==(command.effect==='edit'?'one-entry':'none'))fail('Declare one atomic history entry for each edit.');
    keys(command.scopes,['default','allowed','confirmation']);
    const scope=command.scopes;
    if(!Array.isArray(scope.allowed)||!scope.allowed.length||new Set(scope.allowed).size!==scope.allowed.length||!scope.allowed.every(value=>scopes.includes(value))||!scope.allowed.includes(scope.default))fail('Declare explicit target scopes.');
    if(scope.confirmation!==null&&!text(scope.confirmation))fail('Invalid scope confirmation.');
    if((scope.allowed.includes('preset')||scope.allowed.includes('definition'))&&!text(scope.confirmation))fail('Reusable source changes need explicit scope copy.');
    if(command.target==='decoration'&&command.effect==='edit'&&(scope.default!=='instance'||!scope.allowed.every(value=>['instance','selected-instances'].includes(value))))fail('Decoration edits default to the placement; reusable defaults use a separate preset command.');
    diagnostics(command.diagnostics);
    if(typeof command.available!=='boolean'||(command.available?command.diagnostics.length!==0:command.diagnostics.length===0))fail('Unavailable commands need actionable reasons.');
    if(!Array.isArray(command.controls)||command.controls.length>16)fail('Bound UI hints.');
    for(const control of command.controls){
      keys(control,['id','label','panel','order','kind','argumentPath','unit']);
      if(!text(control.id)||controls.has(control.id)||!text(control.label)||!panels.includes(control.panel)||!uint(control.order)||!['button','number','select','reorder'].includes(control.kind))fail('Use unique bounded presentation controls.');
      controls.add(control.id);
      if(control.kind==='button'?control.argumentPath!==null:typeof control.argumentPath!=='string'||!control.argumentPath.startsWith('/')||control.argumentPath.length>256)fail('Fields need explicit payload paths; buttons have none.');
      if(control.unit!==null&&!text(control.unit))fail('Invalid unit.');
    }
  }
  diagnostics(value.notices);
  // Own a detached frozen read. Neither the supplied object nor agent metadata changes.
  return freeze(structuredClone(value));
}
/** Group service descriptors by their own presentation hints, without a UI command
 * registry, schema substitutions, hidden grants or fallback command IDs. */
export function projectAuthoringDiscovery(value){
  const discovery=readAuthoringDiscovery(value);
  const grouped=panels.map(id=>{
    const controls=discovery.commands.flatMap(command=>command.controls
      .filter(control=>control.panel===id).map(control=>({control,command})));
    controls.sort((a,b)=>a.control.order-b.control.order||
      (a.control.id<b.control.id?-1:a.control.id>b.control.id?1:0));
    return {id,controls};
  });
  return freeze({discoveryToken:discovery.discoveryToken,binding:discovery.binding,
    panels:grouped,agentDiscovery:discovery});
}
