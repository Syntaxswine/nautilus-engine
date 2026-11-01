import {readinessViewModel} from './readiness.js';
let instance=0;
export function mountReadiness(container,{onSelect=()=>{},onError=()=>{}}={}){
  const doc=container.ownerDocument,element=doc.createElement('section');element.className='nautilus-readiness';element.setAttribute('aria-label','Scene readiness');
  const heading=doc.createElement('h2'),state=doc.createElement('span'),summary=doc.createElement('p'),counts=doc.createElement('p'),parts=doc.createElement('ul'),issues=doc.createElement('ol');
  heading.id='readiness-'+(++instance);element.setAttribute('aria-labelledby',heading.id);state.className='nr-classification';summary.className='nr-summary';summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');counts.className='nr-counts';parts.className='nr-parts';issues.className='nr-problems';
  const header=doc.createElement('div');header.className='nr-header';header.append(heading,state);element.append(header,summary,counts,parts,issues);container.append(element);let disposed=false,model=null;
  const select=event=>{const target=event.target.closest('button[data-problem]');if(!target||!element.contains(target))return;const problem=model?.diagnostics[Number(target.dataset.problem)];if(!problem?.instanceId)return;try{onSelect({instanceId:problem.instanceId,partId:problem.partId,path:problem.path});}catch(error){onError(error);}};
  issues.addEventListener('click',select);
  function update(report){
    if(disposed)return;const focused=doc.activeElement?.dataset?.problem;model=readinessViewModel(report);heading.textContent=model.title;state.textContent=model.classification;state.dataset.classification=model.classification;
    summary.textContent=model.summary;counts.textContent=Object.entries(model.counts).map(([key,value])=>value+' '+key).join(' · ');parts.replaceChildren();issues.replaceChildren();
    for(const part of model.entries){const item=doc.createElement('li'),label=doc.createElement('span'),badge=doc.createElement('span');label.textContent=part.label;badge.textContent=part.classification;badge.dataset.classification=part.classification;item.append(label,badge);parts.append(item);}
    model.diagnostics.forEach((problem,index)=>{const item=doc.createElement('li'),code=doc.createElement('strong'),reason=doc.createElement('p'),remedy=doc.createElement('p'),source=doc.createElement('code');code.textContent=problem.code;reason.textContent=problem.reason;remedy.textContent=problem.remedy;remedy.className='nr-remedy';source.textContent=[problem.instanceId,problem.partId,problem.path].filter(Boolean).join(' · ');item.dataset.severity=problem.severity;item.append(code,reason,remedy,source);if(problem.instanceId){const button=doc.createElement('button');button.type='button';button.dataset.problem=String(index);button.textContent='Select affected part';button.setAttribute('aria-label','Select '+problem.instanceId+(problem.partId?' / '+problem.partId:''));item.append(button);}issues.append(item);});
    if(focused!==undefined)issues.querySelector('[data-problem="'+Number(focused)+'"]')?.focus({preventScroll:true});
    return model;
  }
  update({parts:[]});
  return Object.freeze({element,update,get model(){return structuredClone(model);},dispose(){if(disposed)return;disposed=true;issues.removeEventListener('click',select);element.remove();}});
}