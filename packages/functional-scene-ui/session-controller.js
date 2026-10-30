// Worker-private lifecycle prototype. This is not the authoritative scene/save ABI.
// Prepared handles are owned; renderers, document/history and host services are borrowed.
export function createPlayerSessionController({prepare,onError=()=>{}}={}){
  if(typeof prepare!=='function')throw Error('Supply a prepared-session factory.');
  let accepted=null,disposed=false,ticket=0,abort=null,view='title',phase='idle',error=null,progress=null,disposePromise;
  const listeners=new Set(),pending=new Set(),retired=new WeakMap(),cleanupErrors=[];
  const problem=(code,cause,remedy)=>({code,reason:cause instanceof Error?cause.message:String(cause),remedy});
  const snapshot=()=>({view,phase,hasSession:!!accepted,busy:phase==='preparing',progress:progress?{...progress}:null,error:error?{...error}:null,cleanupErrors:cleanupErrors.map(value=>({...value}))});
  const report=value=>{try{onError(value);}catch{/* Diagnostics must not alter accepted ownership. */}};
  const emit=()=>{const value=snapshot();for(const listener of listeners)try{listener(value);}catch(cause){report(problem('UI_OBSERVER_FAILED',cause,'Repair the presentation observer; authoritative state is unchanged.'));}};
  function retire(session){
    if(!session||!['object','function'].includes(typeof session))return Promise.resolve();
    if(retired.has(session))return retired.get(session);
    const task=Promise.resolve().then(()=>session.dispose()).catch(cause=>{const value=problem('UI_SESSION_DISPOSAL_FAILED',cause,'Retire only this owned scene handle; preserve the borrowed renderer and other sessions.');cleanupErrors.push(value);report(value);emit();});
    retired.set(session,task);return task;
  }
  function gate(session,value){if(session)session.setGated(value);}
  function valid(session){if(!session||typeof session!=='object'||['activate','setGated','dispose'].some(key=>typeof session[key]!=='function'))throw Error('Prepared sessions require activate, setGated and dispose handles.');}
  async function load(request){
    if(disposed)return {ok:false,code:'UI_DISPOSED',reason:'Player presentation is disposed.'};
    const generation=++ticket;abort?.abort();abort=new AbortController();const signal=abort.signal,previousView=view;let candidate=null;
    phase='preparing';error=null;progress={label:'Preparing scene',current:null,total:null};
    try{gate(accepted,true);}catch(cause){phase='error';error=problem('UI_GATE_FAILED',cause,'Stop the retained player input/clock before preparing another scene.');emit();return {ok:false,...error};}
    emit();
    const task=(async()=>{
      try{
        candidate=await prepare({request,signal,progress:value=>{
          if(disposed||generation!==ticket)return;
          progress={label:typeof value?.label==='string'?value.label.slice(0,160):'Preparing scene',current:Number.isFinite(value?.current)?value.current:null,total:Number.isFinite(value?.total)&&value.total>0?value.total:null};emit();
        }});
        if(candidate===accepted)throw Error('The factory must return a new owned prepared handle.');
        valid(candidate);
        if(disposed||generation!==ticket||signal.aborted){await retire(candidate);return {ok:false,code:'UI_CANCELLED',reason:'Preparation was superseded or cancelled.'};}
        gate(candidate,true);
        await candidate.activate({signal});
        if(disposed||generation!==ticket||signal.aborted){await retire(candidate);return {ok:false,code:'UI_CANCELLED',reason:'Preparation was superseded or cancelled.'};}
        gate(candidate,false);
        const previous=accepted,adopted=candidate;accepted=candidate;candidate=null;view='play';phase='ready';progress=null;error=null;emit();await retire(previous);
        if(disposed||generation!==ticket)return {ok:false,code:'UI_CANCELLED',reason:'The session was replaced or retired.'};
        emit();return {ok:true,session:adopted};
      }catch(cause){
        if(candidate&&candidate!==accepted)await retire(candidate);
        if(disposed||generation!==ticket||signal.aborted)return {ok:false,code:'UI_CANCELLED',reason:'Preparation was superseded or cancelled.'};
        view=previousView;phase='error';progress=null;error=problem('UI_PREPARATION_FAILED',cause,'Correct the reported bindings or retry. The accepted session is retained.');
        try{gate(accepted,view!=='play');}catch(gateError){cleanupErrors.push(problem('UI_GATE_FAILED',gateError,'Restore the retained session gate through its owning host.'));}
        emit();report(error);return {ok:false,...error};
      }
    })();
    pending.add(task);try{return await task;}finally{pending.delete(task);}
  }
  const api={
    get state(){return snapshot();},get current(){return accepted;},
    subscribe(listener){if(disposed)throw Error('Player presentation is disposed.');listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
    load,
    returnToTitle(){
      if(disposed)return;ticket++;abort?.abort();gate(accepted,true);view='title';phase=accepted?'ready':'idle';progress=null;error=null;emit();
    },
    resume(){
      if(disposed||!accepted||phase==='preparing')return false;gate(accepted,false);view='play';phase='ready';error=null;emit();return true;
    },
    settled(){return Promise.allSettled([...pending,...(disposePromise?[disposePromise]:[])]);},
    dispose(){
      if(disposePromise)return disposePromise;disposed=true;ticket++;abort?.abort();view='disposed';phase='disposed';progress=null;
      const previous=accepted;accepted=null;try{gate(previous,true);}catch(cause){cleanupErrors.push(problem('UI_GATE_FAILED',cause,'Inspect the owned session gate during retirement.'));}
      emit();listeners.clear();disposePromise=retire(previous);return disposePromise;
    }
  };
  return Object.freeze(api);
}