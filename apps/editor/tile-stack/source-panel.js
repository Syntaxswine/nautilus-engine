import {smartTileFormValues,smartTileDraftFromFields} from '../smart-tile/panel-fields.js';

// Source controls borrow the existing pure field codec and the sole session.
// They do not bind canvas handlers, own history, or manufacture a stack result.
export function mountTileStackSource(container,session,{finishCatalogue,onError=()=>{}}){
 const doc=container.ownerDocument,events=new doc.defaultView.AbortController(),form=doc.createElement('form');form.className='stack-source';form.noValidate=true;
 const heading=doc.createElement('h2');heading.textContent='New surface';form.append(heading);let tool='rectangle',previous=null;
 const inputs=new Map(),labels=new Map(),make=(name,label,values=null)=>{const wrap=doc.createElement('label');wrap.textContent=label;const input=doc.createElement(values?'select':'input');input.name=name;input.id='stack-source-'+name;
  if(values)for(const [value,text]of values){const option=doc.createElement('option');option.value=value;option.textContent=text;input.append(option);}else {input.type='number';input.step='any';input.required=true;}
  wrap.htmlFor=input.id;wrap.append(input);form.append(wrap);inputs.set(name,input);labels.set(name,wrap);return input;};
 const toolbar=doc.createElement('div');toolbar.className='source-row';const tools=new Map();
 for(const [id,label]of [['rectangle','Rectangle'],['path','Level path']]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.dataset.sourceTool=id;button.addEventListener('click',()=>{const r=session.setTool(id);if(r.ok){tool=id;show();}},{signal:events.signal});toolbar.append(button);tools.set(id,button);}form.append(toolbar);
 make('x','Origin X (m)');make('y','Origin Y (m)');make('widthM','Width (m)');make('depthM','Depth (m)');make('seed','Variation seed');
 const kind=make('curveKind','Original curve',[['line','Line'],['arc','Arc'],['cubic','Cubic']]);
 for(const [name,label]of [['ax','Start X'],['ay','Start Y'],['bx','End X'],['by','End Y'],['cx','Centre X'],['cy','Centre Y'],['radius','Radius (m)'],['startRad','Start angle (rad)'],['sweepRad','Sweep angle (rad)'],...[0,1,2,3].flatMap(i=>[['p'+i+'x','Control '+i+' X'],['p'+i+'y','Control '+i+' Y']])])make(name,label);
 make('finishId','New surface finish',finishCatalogue.entries.map(v=>[v.id,v.label]));
 const update=doc.createElement('button');update.type='submit';update.textContent='Update source draft';update.dataset.action='sourceDraft';form.append(update);container.append(form);
 const values=()=>Object.fromEntries([...inputs].map(([k,n])=>[k,n.value]));
 function readDraft(){return {...smartTileDraftFromFields(tool,values(),previous,null),ownerId:null,finishId:inputs.get('finishId').value};}
 function show(){for(const [id,button]of tools)button.setAttribute('aria-pressed',String(tool===id));for(const key of ['depthM','curveKind','ax','ay','bx','by','cx','cy','radius','startRad','sweepRad',...[0,1,2,3].flatMap(i=>['p'+i+'x','p'+i+'y'])])labels.get(key).hidden=key==='depthM'?tool!=='rectangle':key==='curveKind'?tool!=='path':tool!=='path'||!(kind.value==='line'?['ax','ay','bx','by']:kind.value==='arc'?['cx','cy','radius','startRad','sweepRad']:[0,1,2,3].flatMap(i=>['p'+i+'x','p'+i+'y'])).includes(key);}
 const defaults={...smartTileFormValues(null),x:20,y:20,seed:771,finishId:finishCatalogue.entries[0].id};for(const [k,input]of inputs)input.value=String(defaults[k]);show();
 kind.addEventListener('change',show,{signal:events.signal});form.addEventListener('submit',event=>{event.preventDefault();try{const r=session.setDraft(readDraft());if(!r.ok)onError(new Error(r.code));}catch(e){onError(e);}},{signal:events.signal});
 form.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();},{signal:events.signal});
 const unsubscribe=session.subscribe(snapshot=>{for(const button of tools.values())button.disabled=!snapshot.actions.setTool;for(const input of inputs.values())input.disabled=!snapshot.actions.setDraft;update.disabled=!snapshot.actions.setDraft;
  if(['rectangle','path'].includes(snapshot.tool)){tool=snapshot.tool;show();}if(snapshot.draft&&['rectangle','path'].includes(snapshot.draft.tool)&&JSON.stringify(snapshot.draft)!==JSON.stringify(previous)){previous=snapshot.draft;for(const [k,v]of Object.entries({...smartTileFormValues(previous),finishId:previous.finishId}))if(inputs.has(k))inputs.get(k).value=String(v);show();}
 });
 return Object.freeze({readDraft,dispose(){events.abort();unsubscribe();form.remove();}});
}
