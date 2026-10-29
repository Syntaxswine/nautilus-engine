import {openWorld,serializeWorld,compileWorld,reportLegacyRepresentability} from '../../packages/world-core/index.js';

const bytes=value=>new TextEncoder().encode(value).length;
const failure=error=>({ok:false,code:error.code||'INVALID_EDIT',message:error.message,diagnostics:error.diagnostics||[]});
const fields=(value,expected)=>{
  if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==expected.length||expected.some(key=>!Object.hasOwn(value,key)))throw Error('Supply exactly '+expected.join(', ')+'.');
};

// The world contract owns validation/serde/queries. This editor facade adds
// bounded snapshot history and revision-bound previews, without a second schema.
export function createExtendedWorldDocument(input,{maxHistoryEntries=64,maxHistoryBytes=16_000_000}={}) {
  if(!Number.isSafeInteger(maxHistoryEntries)||maxHistoryEntries<1||maxHistoryEntries>256||!Number.isSafeInteger(maxHistoryBytes)||maxHistoryBytes<1||maxHistoryBytes>64_000_000)throw Error('Choose a finite editor history budget.');
  let json=serializeWorld(input),queries=compileWorld(JSON.parse(json)),revision=0,ticket=0,pending=null,past=[],future=[];
  const record=text=>({json:text,bytes:bytes(text)});
  const historyBytes=()=>[...past,...future].reduce((sum,item)=>sum+item.bytes,0);
  const trim=()=>{
    // Keep each direction contiguous: evict the oldest undo first, then the
    // farthest redo. A single oversized redo may leave no retained history.
    while(past.length+future.length&&(past.length+future.length>maxHistoryEntries||historyBytes()>maxHistoryBytes)) {
      if(past.length)past.shift();else future.shift();
    }
  };
  function prepare(command) {
    const world=JSON.parse(json);
    if(command?.type==='put-surface') {
      fields(command,['type','surface']);
      const next=structuredClone(command.surface),index=world.surfaces.findIndex(surface=>surface.id===next?.id);
      if(index<0)world.surfaces.push(next);else world.surfaces[index]=next;
    } else if(command?.type==='remove-surface') {
      fields(command,['type','id']);
      const index=world.surfaces.findIndex(surface=>surface.id===command.id);
      if(index<0)throw Error('The selected surface no longer exists.');
      world.surfaces.splice(index,1);
    } else throw Error('Use a put-surface or remove-surface authoring command.');
    const next=serializeWorld(world);
    return {json:next,queries:compileWorld(JSON.parse(next))};
  }
  function commit(candidate) {
    pending=null;
    if(candidate.json===json)return {ok:true,changed:false,revision};
    past.push(record(json));future=[];trim();json=candidate.json;queries=candidate.queries;revision++;
    return {ok:true,changed:true,revision};
  }
  const api={
    get revision(){return revision;},
    get history(){return {undo:past.length,redo:future.length,bytes:historyBytes(),maxHistoryEntries,maxHistoryBytes};},
    get queries(){return queries;},
    get previewState(){return pending?{token:pending.token,baseRevision:pending.baseRevision,world:pending.queries.snapshot()}:null;},
    snapshot(){return queries.snapshot();},
    export(){return json;},
    preview(command) {
      // Invalidate an older preview even when the replacement is invalid; the
      // previous ghost must never remain armed behind an invalid form.
      pending=null;
      try{const candidate=prepare(command);pending={...candidate,token:++ticket,baseRevision:revision};return {ok:true,token:pending.token,changed:candidate.json!==json};}
      catch(error){return failure(error);}
    },
    commitPreview(token) {
      if(!pending||pending.token!==token||pending.baseRevision!==revision)return {ok:false,code:'STALE_PREVIEW',message:'Preview was cancelled or superseded. Preview again before applying.',diagnostics:[]};
      return commit(pending);
    },
    cancelPreview(){const existed=!!pending;pending=null;return existed;},
    apply(command){try{return commit(prepare(command));}catch(error){return failure(error);}},
    undo() {
      pending=null;if(!past.length)return false;
      const item=past.at(-1),compiled=compileWorld(JSON.parse(item.json));
      past.pop();future.push(record(json));trim();json=item.json;queries=compiled;revision++;return true;
    },
    redo() {
      pending=null;if(!future.length)return false;
      const item=future.at(-1),compiled=compileWorld(JSON.parse(item.json));
      future.pop();past.push(record(json));trim();json=item.json;queries=compiled;revision++;return true;
    },
    replace(next) {
      try{
        const nextJSON=serializeWorld(openWorld(next)),compiled=compileWorld(JSON.parse(nextJSON));
        json=nextJSON;queries=compiled;past=[];future=[];pending=null;revision++;return {ok:true,revision};
      }catch(error){return failure(error);}
    },
    legacyReport(target='aft-map-v2') {return reportLegacyRepresentability(JSON.parse(json),{target,sourceProfile:'aft-render-v1'});}
  };
  return Object.freeze(api);
}
