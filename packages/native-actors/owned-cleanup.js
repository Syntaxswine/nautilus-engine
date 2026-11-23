// Private ownership for pinned Three r180 resources. Dispose listeners include
// renderer deallocation hooks; one observer must not prevent the others.
export function createOwnedCleanup(message='Native owned cleanup failed.'){
  const units=[],known=new WeakMap(),errors=[];let retired=false,draining=false,depth=0;
  const flush=()=>{if(errors.length)throw new AggregateError(errors.splice(0),message);};
  function late(close){const cause=Error('Native resource owner is retired.');try{close();}catch(error){throw new AggregateError([cause,error],message,{cause});}throw cause;}
  function own(resource){
    if(!resource)return resource;
    if(known.has(resource))return resource;
    if(typeof resource.dispose!=='function'||typeof resource.dispatchEvent!=='function')throw TypeError('Own explicit Three disposable resources.');
    if(retired){const temporary=createOwnedCleanup(message);temporary.own(resource);return late(()=>temporary.dispose());}
    const original=resource.dispose;let released=false;
    function release(){
      if(released)return;released=true;++depth;
      const descriptor=Object.getOwnPropertyDescriptor(resource,'dispatchEvent'),inherited=resource.dispatchEvent;let dispatched=false,result;
      function dispatch(event){
        if(event.type!=='dispose')return inherited.call(resource,event);
        if(dispatched)return;dispatched=true;event.target=resource;
        try{for(const listener of [...(resource._listeners?.dispose||[])])try{listener.call(resource,event);}catch(error){errors.push(error);}}
        finally{event.target=null;if(resource._listeners)delete resource._listeners.dispose;}
      }
      try{resource.dispatchEvent=dispatch;try{result=original.call(resource);}catch(error){errors.push(error);}if(!dispatched)dispatch({type:'dispose'});}
      finally{if(descriptor)Object.defineProperty(resource,'dispatchEvent',descriptor);else delete resource.dispatchEvent;--depth;}
      if(!depth&&!draining)flush();return result;
    }
    known.set(resource,release);units.push(release);resource.dispose=release;return resource;
  }
  function defer(close){if(typeof close!=='function')throw TypeError('Supply an owned synchronous cleanup.');if(retired)return late(close);let released=false;units.push(()=>{if(released)return;released=true;close();});}
  function dispose(){if(retired)return;retired=true;draining=true;try{for(const close of units.splice(0).reverse())try{close();}catch(error){errors.push(error);}}finally{draining=false;}flush();}
  return Object.freeze({own,defer,dispose,get retired(){return retired;}});
}

export function nativeFailure(primary,cleanup,message){
  return cleanup?new AggregateError([primary,cleanup],message,{cause:primary}):primary;
}
