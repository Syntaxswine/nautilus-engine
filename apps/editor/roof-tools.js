import {roofsOf} from '../../packages/roof-core/index.js';

export function installRoofTools({panel,getDocument,getSelection,apply,scene,status,isLoading}) {
  const $=id=>document.getElementById(id),box=document.createElement('section');box.id='sloped-roof-options';
  box.innerHTML=`<p class="roof-kicker">PROCEDURAL SLOPED ROOFS</p><p class="roof-intro">Drag a rectangular footprint, then release to place. The roof keeps its true slope and metre scale.</p><div class="row"><label>Shape<select id="roof-style"><option value="gable">Gable</option><option value="hip">Hip</option><option value="shed">Shed</option></select></label><label>Ridge / high-edge axis<select id="roof-axis"><option value="x">X</option><option value="y">Y</option></select></label></div><label>Shed rise direction<select id="roof-direction"><option value="1">Positive cross-axis</option><option value="-1">Negative cross-axis</option></select></label><label>Eaves height<select id="roof-eaves">${[1,2,3,4,5].map(z=>`<option value="${z}">${(z*2.12).toFixed(2)} m · ${z} ${z===1?'story':'stories'}</option>`).join('')}</select></label><div class="row"><label>Pitch · degrees<input id="roof-pitch" type="number" min="5" max="75" step="1" value="30"></label><label>Overhang · metres<input id="roof-overhang" type="number" min="0" max="2" step="0.05" value="0.25"></label></div><div class="row"><label>Surface<select id="roof-material"><option value="slate">Slate</option><option value="clay">Clay</option><option value="metal">Metal</option></select></label><label>Seed<input id="roof-seed" type="number" min="0" max="4294967295" step="1" value="7"></label></div><output id="roof-measure" aria-live="polite">Preview a bounded footprint before placement.</output><details id="roof-exact"><summary>Measured footprint · metres</summary><label>Roof<select id="roof-target"><option value="">New roof</option></select></label><div class="row"><label>Corner X<input id="roof-x" type="number" step="any" value="8"></label><label>Corner Y<input id="roof-y" type="number" step="any" value="8"></label></div><div class="row"><label>Width<input id="roof-width" type="number" min="0.5" max="240" step="0.5" value="8"></label><label>Depth<input id="roof-depth" type="number" min="0.5" max="240" step="0.5" value="6"></label></div><button id="roof-preview-exact">Preview roof</button><button id="roof-place-exact" disabled>Place previewed roof</button><button id="roof-use-selected">Use selected roof</button><button id="roof-delete" disabled>Delete this roof</button></details><p class="roof-note">The footprint corner uses tile-edge coordinates (0 to map size). Overhangs must also fit inside the map or block. Roofs do not add floors or climbing rules, and whole-building prefabs keep their own roofs.</p>`;
  panel.append(box);$('edit-tool').add(new Option('Procedural sloped roof','sloped-roof'));
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./roof-tools.css',import.meta.url).href;document.head.append(sheet);
  let lastDocument=null,revision=-1,preview=null,previewTicket=0;
  const options=()=>({eaves:Number($('roof-eaves').value),style:$('roof-style').value,axis:$('roof-axis').value,direction:Number($('roof-direction').value),
    pitch:$('roof-pitch').valueAsNumber,overhang:$('roof-overhang').valueAsNumber,material:$('roof-material').value,seed:$('roof-seed').valueAsNumber});
  const exact=()=>({tool:'sloped-roof',options:{...options(),id:$('roof-target').value||undefined,exact:true,
    x:$('roof-x').valueAsNumber,y:$('roof-y').valueAsNumber,width:$('roof-width').valueAsNumber,depth:$('roof-depth').valueAsNumber}});
  function invalidate(){++previewTicket;preview=null;$('roof-place-exact').disabled=true;scene.preview(null);}
  box.addEventListener('input',invalidate);box.addEventListener('change',invalidate);
  function coordinates(roof) {
    for(const [id,value]of Object.entries({'roof-x':roof.x,'roof-y':roof.y,'roof-width':roof.width,'roof-depth':roof.depth,'roof-eaves':roof.z,
      'roof-style':roof.style,'roof-axis':roof.axis,'roof-direction':roof.direction??1,'roof-pitch':roof.pitch,'roof-overhang':roof.overhang,'roof-material':roof.material,'roof-seed':roof.seed}))$(id).value=value;
    directionControl();
  }
  function directionControl(){const axis=$('roof-axis').value==='x'?'Y':'X',field=$('roof-direction');field.options[0].textContent='Rise toward +'+axis;field.options[1].textContent='Rise toward −'+axis;field.closest('label').hidden=$('roof-style').value!=='shed';}
  for(const id of ['roof-style','roof-axis'])$(id).addEventListener('change',directionControl);
  function describe(result) {
    const roof=result.roofPreview;if(!roof)return result.ok?'Roof edit applied.':result.error;
    const text=`${roof.style} · ${roof.width.toFixed(2)} × ${roof.depth.toFixed(2)} m · ${roof.pitch}° · eaves ${(roof.z*2.12).toFixed(2)} m`;
    $('roof-measure').textContent=text;return text;
  }
  function sync() {
    directionControl();
    const next=getDocument();if(!next)return;
    if(next===lastDocument&&next.revision===revision)return;
    lastDocument=next;revision=next.revision;invalidate();$('roof-width').max=$('roof-depth').max=String(next.size);
    const selected=$('roof-target').value;
    $('roof-target').replaceChildren(new Option('New roof',''),...roofsOf(next.map).map(r=>new Option(`${r.id} · ${r.style} · ${r.pitch}°`,r.id)));
    const roof=roofsOf(next.map).find(r=>r.id===selected);if(roof)$('roof-target').value=selected;
    $('roof-delete').disabled=!roof;$('roof-place-exact').textContent=roof?'Update previewed roof':'Place previewed roof';
  }
  function load(roof) {
    if(!roof)return status('Select a sloped roof first.');
    invalidate();$('edit-tool').value='sloped-roof';$('edit-tool').dispatchEvent(new Event('change'));sync();
    $('roof-target').value=roof.id;coordinates(roof);$('roof-exact').open=true;$('roof-delete').disabled=false;
    $('roof-place-exact').textContent='Update previewed roof';describe({roofPreview:roof});
  }
  $('roof-target').addEventListener('change',()=>{const roof=roofsOf(getDocument().map).find(r=>r.id===$('roof-target').value);if(roof)load(roof);else{$('roof-delete').disabled=true;$('roof-place-exact').textContent='Place previewed roof';}});
  $('roof-preview-exact').onclick=async()=>{
    if(isLoading())return status('Wait for the scene to finish loading.');
    invalidate();const ticket=previewTicket,doc=getDocument(),revision=doc.revision,command=exact(),signature=JSON.stringify(command),result=doc.preview(command);scene.preview(result);
    if(!result.ok){invalidate();return status(result.error);}
    status('Preparing painted roof preview…');
    try{await scene.prepareRoofs();}catch(error){if(ticket===previewTicket){invalidate();status(error.message);}return;}
    if(ticket!==previewTicket||doc!==getDocument()||revision!==doc.revision||signature!==JSON.stringify(exact()))return;
    preview={doc,revision,command,signature};$('roof-place-exact').disabled=false;status(describe(result)+' · previewed.');
  };
  $('roof-place-exact').onclick=async()=>{
    const current=preview;
    if(!current||current.doc!==getDocument()||current.revision!==getDocument().revision||current.signature!==JSON.stringify(exact())){invalidate();return status('The map or roof settings changed. Preview this roof again before placement.');}
    const result=await apply(current.command);if(result.ok){sync();applied(result);status(describe(result)+' · placed.');}
  };
  $('roof-delete').onclick=async()=>{const result=await apply({tool:'erase-sloped-roof',options:{id:$('roof-target').value}});if(result.ok){sync();status('Sloped roof removed.');}};
  $('roof-use-selected').onclick=()=>load(getSelection()?.type==='sloped-roof'?getSelection().data:null);
  function applied(result){if(result.roofPreview){coordinates(result.roofPreview);$('roof-target').value=result.roofPreview.id;$('roof-delete').disabled=false;$('roof-place-exact').textContent='Update previewed roof';describe(result);}}
  return {options,sync,describe,applied,useSelected:()=>load(getSelection()?.type==='sloped-roof'?getSelection().data:null),rotatePlacement(){const field=$('roof-axis');if($('roof-style').value==='shed'&&field.value==='x')$('roof-direction').value=-Number($('roof-direction').value);field.value=field.value==='x'?'y':'x';directionControl();invalidate();}};
}
