const size=text=>new TextEncoder().encode(text).length;

// Editor-private coordination, NOT a parts schema/compiler or runtime API.
// The host must use the reviewed public serializer/compiler before accepting a
// ticket. Compilations are immutable, resource-free handles; UI's binder owns
// presentation resources separately. Nothing here interprets part records.
export function createPartAuthoringJournal({initialText,contextKey,maxEntries=64,maxBytes=16_000_000,maxDocumentBytes=8_000_000}) {
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>256||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64_000_000||!Number.isSafeInteger(maxDocumentBytes)||maxDocumentBytes<1||maxDocumentBytes>64_000_000)throw Error('Use bounded editor history/document budgets.');
  const checkText=text=>{if(typeof text!=='string'||!text.length||size(text)>maxDocumentBytes)throw Error('Supply a validated, bounded serialized authoring document.');return text;};
  const checkContext=value=>{if(typeof value!=='string'||!value.length||value.length>512)throw Error('Supply the pinned compiler/definitions/profile context key.');return value;};
  let text=checkText(initialText),context=checkContext(contextKey),revision=0,ordinal=0,pending=null,compilation=null,past=[],future=[];
  const record=value=>({text:value,bytes:size(value)});
  const historyBytes=()=>[...past,...future].reduce((total,item)=>total+item.bytes,0);
  const trim=()=>{while(past.length+future.length&&(past.length+future.length>maxEntries||historyBytes()>maxBytes)){if(past.length)past.shift();else future.shift();}};
  const cancel=()=>{const existed=!!pending;pending=null;ordinal++;return existed;};
  function begin(action,target) {
    cancel();if(target===null&&(action==='undo'||action==='redo'))return null;
    const ticket=Object.freeze({action,targetText:checkText(target),baseRevision:revision,contextKey:context,ordinal});
    pending=ticket;return ticket;
  }
  const current=ticket=>!!ticket&&ticket===pending&&ticket.ordinal===ordinal&&ticket.baseRevision===revision&&ticket.contextKey===context;
  return Object.freeze({
    get snapshot(){return Object.freeze({text,revision,contextKey:context,compilation,pending,
      compilationCurrent:!!compilation&&compilation.contextKey===context,
      history:Object.freeze({undo:past.length,redo:future.length,bytes:historyBytes(),maxEntries,maxBytes})});},
    beginEdit(target){return begin('edit',target);},
    beginOpen(target){return begin('open',target);},
    beginUndo(){return begin('undo',past.at(-1)?.text??null);},
    beginRedo(){return begin('redo',future.at(-1)?.text??null);},
    beginRebuild(){return begin('rebuild',text);},
    cancel,
    setContext(next) {
      checkContext(next);if(next===context)return false;
      cancel();context=next;return true;
    },
    reject(ticket){if(!current(ticket))return false;pending=null;return true;},
    accept(ticket,artifact) {
      if(!current(ticket))return {ok:false,code:'EDITOR_STALE_PREPARATION',revision};
      if(!artifact||typeof artifact!=='object')throw Error('Accept only a successfully prepared immutable compiler result.');
      const changed=ticket.targetText!==text;
      switch(ticket.action) {
        case 'edit': if(changed){past.push(record(text));future=[];}break;
        case 'open': past=[];future=[];break;
        case 'undo': past.pop();future.push(record(text));break;
        case 'redo': future.pop();past.push(record(text));break;
        case 'rebuild': break;
        default: throw Error('Unknown editor journal action.');
      }
      trim();text=ticket.targetText;compilation=Object.freeze({contextKey:context,value:artifact});pending=null;
      if(changed||ticket.action==='open')revision++;
      return {ok:true,changed,revision};
    }
  });
}
