import {wallRunsOf, snapWallPoint, measureWallRun} from '../packages/map-core/wall-runs.js';
import {angledBayExample} from '../packages/map-core/wall-example.js';

export function installWallTools({panel,getDocument,getSelection,apply,scene,status,open,isLoading}) {
  const $=id=>document.getElementById(id),box=document.createElement('section');box.id='wall-run-options';
  box.innerHTML=`<p class="wall-kicker">TRACE A FLOOR PLAN</p><p class="wall-intro">Drag between corners. Green rings join existing endpoints.</p><label>Angle snap<select id="wall-angle"><option value="45">45° · rooms & bays</option><option value="15">15° · finer angles</option><option value="90">90° · square corners</option><option value="0">Free angle</option></select></label><label>Grid snap<select id="wall-grid"><option value="0.5">0.5 m</option><option value="1">1 m</option><option value="0.25">0.25 m</option><option value="0.1">0.1 m</option><option value="0">Off</option></select></label><label class="check"><input id="wall-endpoint-snap" type="checkbox" checked> Join nearby endpoints</label><div class="row"><label>Stories<select id="wall-stories">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><label>Surface<select id="wall-material"><option value="wood">Wood</option><option value="brick">Brick</option><option value="concrete">Concrete</option></select></label></div><output id="wall-measure" aria-live="polite">2 m high · 0.16 m thick · native scale</output><button id="wall-plan-view">Trace in plan view</button><details id="wall-exact"><summary>Exact endpoints · metres</summary><label>Wall run<select id="wall-run-target"><option value="">New run</option></select></label><div class="row"><label>Start X<input id="wall-ax" type="number" step="any" value="7.5"></label><label>Y<input id="wall-ay" type="number" step="any" value="7.5"></label></div><div class="row"><label>End X<input id="wall-bx" type="number" step="any" value="11.5"></label><label>Y<input id="wall-by" type="number" step="any" value="11.5"></label></div><button id="wall-apply-exact">Place exact run</button><button id="wall-continue">Start next run here</button><button id="wall-load-selected">Use selected wall</button><button id="wall-delete-run" disabled>Delete this run</button><p class="muted">Exact coordinates bypass snaps. Pick a run to edit its endpoints; a completed edit is one Undo.</p></details><p class="wall-scale">1 m panels · 2 m walls · 2.12 m floors.<br>End panels are cut to fit; textures keep their metre scale.</p><button id="wall-bay-example">Bay-window practice block</button>`;
  panel.append(box);$('edit-tool').add(new Option('Angled wall run · native scale','wall-run'));
  let lastRevision=-1,lastDocument=null;
  const options=()=>({stories:Number($('wall-stories').value),material:$('wall-material').value,angleStep:Number($('wall-angle').value),step:Number($('wall-grid').value),endpointSnap:$('wall-endpoint-snap').checked});
  function sync() {
    const doc=getDocument();if(!doc)return;
    const active=$('edit-tool').value==='wall-run';scene.setWallDrawing(active);
    if(doc===lastDocument&&doc.revision===lastRevision)return;lastDocument=doc;lastRevision=doc.revision;
    const selected=$('wall-run-target').value;
    $('wall-run-target').replaceChildren(new Option('New run',''),...wallRunsOf(doc.map).map(r=>new Option(`${r.id} · ${measureWallRun(r).length.toFixed(2)} m · L${r.z+1}`,r.id)));
    const run=wallRunsOf(doc.map).find(r=>r.id===selected);
    if(run){$('wall-run-target').value=selected;coordinates(run);describe({wallRun:run,measurement:measureWallRun(run)});}
    $('wall-delete-run').disabled=!$('wall-run-target').value;
    $('wall-apply-exact').textContent=$('wall-run-target').value?'Update exact run':'Place exact run';
  }
  function coordinates(run) {for(const [id,value]of Object.entries({'wall-ax':run.a[0],'wall-ay':run.a[1],'wall-bx':run.b[0],'wall-by':run.b[1],'wall-stories':run.stories,'wall-material':run.material}))$(id).value=value;}
  function load(run) {
    if(!run)return status('Select an angled wall first.');
    $('edit-tool').value='wall-run';$('edit-tool').dispatchEvent(new Event('change'));sync();$('wall-run-target').value=run.id;
    coordinates(run);
    describe({wallRun:run,measurement:measureWallRun(run)});
    $('floor').value=run.z;$('floor').dispatchEvent(new Event('change'));$('wall-exact').open=true;$('wall-delete-run').disabled=false;$('wall-apply-exact').textContent='Update exact run';
  }
  $('wall-run-target').onchange=()=>{const run=wallRunsOf(getDocument().map).find(r=>r.id===$('wall-run-target').value);if(run)load(run);else{$('wall-delete-run').disabled=true;$('wall-apply-exact').textContent='Place exact run';}};
  $('wall-plan-view').onclick=()=>{$('camera').value='top';$('camera').dispatchEvent(new Event('change'));status('Plan view · drag between corners. Scroll to zoom; right-drag to pan.');};
  $('wall-load-selected').onclick=()=>load(getSelection()?.type==='wall-run'?getSelection().data:null);
  $('wall-apply-exact').onclick=async()=>{
    const z=Number($('floor').value),result=await apply({tool:'wall-run',start:{x:$('wall-ax').valueAsNumber,y:$('wall-ay').valueAsNumber,z},end:{x:$('wall-bx').valueAsNumber,y:$('wall-by').valueAsNumber,z},options:{...options(),id:$('wall-run-target').value||undefined,exact:true}});
    if(result.ok){sync();$('wall-run-target').value=result.wallRun.id;$('wall-delete-run').disabled=false;$('wall-apply-exact').textContent='Update exact run';status(describe(result)+' · placed.');}
  };
  $('wall-continue').onclick=()=>{$('wall-ax').value=$('wall-bx').value;$('wall-ay').value=$('wall-by').value;$('wall-run-target').value='';$('wall-delete-run').disabled=true;$('wall-apply-exact').textContent='Place exact run';$('wall-bx').focus();status('Enter the next endpoint to continue this wall.');};
  $('wall-delete-run').onclick=async()=>{const result=await apply({tool:'erase-wall-run',options:{id:$('wall-run-target').value}});if(result.ok){sync();$('wall-apply-exact').textContent='Place exact run';}};
  $('wall-bay-example').onclick=async()=>{if(isLoading())return;if(getDocument().changed&&!confirm('Replace this workspace with a practice block? Save or export your design first.'))return;try{await open(JSON.stringify(angledBayExample()));$('edit-tool').value='wall-run';$('edit-tool').dispatchEvent(new Event('change'));$('home').click();sync();status('Practice block · angled bay, two stories, native dimensions. Edit a run or trace another room.');}catch(error){status(error.message);}};
  function describe(result) {
    if(!result.wallRun)return result.ok?'Edit applied.':result.error;
    const {length,angle,fullPanels,trim}=result.measurement,run=result.wallRun;
    const text=`${length.toFixed(2)} m · ${angle.toFixed(1)}° · ${run.stories} ${run.stories===1?'story':'stories'}`;
    $('wall-measure').textContent=text+` · ${fullPanels} full panels${trim>0?' + '+trim.toFixed(2)+' m cut':''} / story`;
    return text+(result.snap==='endpoint'?' · endpoint joined':'');
  }
  return {options,sync,describe,useSelected:()=>load(getSelection()?.data),applied(result){if(result.wallRun){coordinates(result.wallRun);$('wall-run-target').value=result.wallRun.id;$('wall-delete-run').disabled=false;$('wall-apply-exact').textContent='Update exact run';describe(result);}},point(p){if(!p)return null;return snapWallPoint(p,{step:options().step,angleStep:0,anchors:options().endpointSnap?wallRunsOf(getDocument().map).filter(r=>r.z<=p.z&&r.z+r.stories>p.z).flatMap(r=>[r.a,r.b]):[]});}};
}
