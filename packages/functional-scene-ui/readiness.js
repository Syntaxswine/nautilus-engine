// Worker-private presentation model; not a compiler schema or capability declaration.
export const PART_PRESENTATION_STATES=Object.freeze(['functional','decorative','incomplete','unsupported']);
function data(object,key,fallback){
  if(!object||Object.getPrototypeOf(object)!==Object.prototype)throw Error('Supply a plain UI readiness report.');
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor)return fallback;
  if(!Object.hasOwn(descriptor,'value'))throw Error('Readiness presentation does not invoke accessors.');
  return descriptor.value;
}
function text(value,fallback='',limit=600){if(value===undefined||value===null)return fallback;if(typeof value!=='string'||value.length>limit)throw Error('Invalid readiness text.');return value;}
function list(value,limit){if(!Array.isArray(value)||value.length>limit)throw Error('Invalid readiness list.');const output=[];for(let i=0;i<value.length;i++){const descriptor=Object.getOwnPropertyDescriptor(value,String(i));if(!descriptor||!Object.hasOwn(descriptor,'value'))throw Error('Supply a dense data list.');output.push(descriptor.value);}return output;}
function diagnostic(input,source={}){
  return {code:text(data(input,'code','UNKNOWN_PROBLEM'),'UNKNOWN_PROBLEM',128),severity:data(input,'severity','error')==='warning'?'warning':'error',
    instanceId:text(data(input,'instanceId',source.instanceId),null,256),partId:text(data(input,'partId',source.partId),null,256),
    path:text(data(input,'path',source.path||'/'),'/',512),reason:text(data(input,'reason','This part is not ready.')),
    remedy:text(data(input,'remedy','Review the affected part and connect its required services.'))};
}
export function readinessViewModel(input){
  try{
    const entries=list(data(input,'parts',[]),4096).map(part=>{
      const instanceId=text(data(part,'instanceId',null),null,256),partId=text(data(part,'partId',null),null,256),label=text(data(part,'label','Unnamed part'),'Unnamed part',160);
      let classification=data(part,'classification','incomplete');
      const diagnostics=list(data(part,'diagnostics',[]),256).map(item=>diagnostic(item,{instanceId,partId}));
      if(!PART_PRESENTATION_STATES.includes(classification)){classification='unsupported';diagnostics.push({code:'UI_UNSUPPORTED_CLASSIFICATION',severity:'error',instanceId,partId,path:'/',reason:'The report uses an unsupported part classification.',remedy:'Use the reviewed compiler-to-UI adapter for this engine version.'});}
      return {instanceId,partId,label,classification,diagnostics};
    });
    const diagnostics=[...list(data(input,'diagnostics',[]),1024).map(item=>diagnostic(item)),...entries.flatMap(part=>part.diagnostics)];
    const counts=Object.fromEntries(PART_PRESENTATION_STATES.map(state=>[state,entries.filter(part=>part.classification===state).length]));
    const classification=counts.unsupported?'unsupported':counts.incomplete||diagnostics.some(item=>item.severity==='error')||!entries.length?'incomplete':counts.functional?'functional':'decorative';
    const canPlay=classification==='functional';
    const summary=classification==='functional'?'Functional parts are ready for host validation.':classification==='decorative'?'This scene contains decorative parts only.':classification==='unsupported'?'Some parts need a different supported profile.':'Resolve the listed connections before entering play.';
    return {title:text(data(input,'title','Scene readiness'),'Scene readiness',160),classification,canPlay,summary,counts,entries,diagnostics};
  }catch(error){
    return {title:'Scene readiness',classification:'unsupported',canPlay:false,summary:'The readiness report could not be displayed.',counts:{functional:0,decorative:0,incomplete:0,unsupported:0},entries:[],diagnostics:[{code:'UI_INVALID_REPORT',severity:'error',instanceId:null,partId:null,path:'/',reason:error.message,remedy:'Connect the reviewed compiler-to-UI adapter; the accepted scene remains unchanged.'}]};
  }
}