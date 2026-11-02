// Read-only design specimen. Never imports or invokes an Editor/runtime service.
import {projectAuthoringDiscovery} from './discovery.js';
const response=await fetch('./examples/discovery.json');
if(!response.ok)throw Error('Load the complete local discovery specimen.');
const projection=projectAuthoringDiscovery(await response.json());
for(const panel of projection.panels){
  const container=document.querySelector('[data-panel="'+panel.id+'"]'),reasons=new Map();
  for(const {control,command} of panel.controls){
    const row=document.createElement('div');row.className='control';row.dataset.commandId=command.id;row.dataset.controlId=control.id;
    const describedBy=[];
    for(const diagnostic of command.diagnostics){
      const key=JSON.stringify(diagnostic);
      if(!reasons.has(key)){
        const reason=document.createElement('p');reason.id='reason-'+panel.id+'-'+reasons.size;reason.className='command-reason';
        reason.textContent=diagnostic.message+' '+diagnostic.action;
        const code=document.createElement('code');code.textContent=diagnostic.code;reason.append(code);
        reasons.set(key,reason.id);container.append(reason);
      }
      describedBy.push(reasons.get(key));
    }
    let input;
    if(control.kind==='button'){input=document.createElement('button');input.textContent=control.label;}
    else{
      const label=document.createElement('label');label.textContent=control.label+(control.unit?' ('+control.unit+')':'');
      input=document.createElement(control.kind==='select'?'select':'input');
      if(input.tagName==='INPUT'){input.type='number';input.placeholder='Schema-defined value';}
      else{const option=document.createElement('option');option.textContent='Schema-defined choice';input.append(option);}
      label.append(input);row.append(label);
    }
    input.disabled=true;input.title='Design specimen: no authoring service is bound.';
    if(describedBy.length)input.setAttribute('aria-describedby',describedBy.join(' '));
    if(control.kind==='button')row.append(input);
    container.append(row);
  }
}
for(const diagnostic of projection.agentDiscovery.notices){
  const row=document.createElement('li');row.textContent=diagnostic.message+' '+diagnostic.action;
  document.getElementById('notices').append(row);
}
document.getElementById('discovery').textContent=JSON.stringify(projection.agentDiscovery,null,2);
document.body.dataset.ready='true';
