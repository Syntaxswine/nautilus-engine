const documents=new WeakMap();
export function prepareSetupStyles(document,url){
  const resolved=new URL(url,document.baseURI);if(resolved.origin!==new URL(document.baseURI).origin)throw Error('SETUP_STYLE_ORIGIN');
  let styles=documents.get(document);if(!styles){styles=new Map();documents.set(document,styles);}const shared=styles.get(resolved.href);
  const lease=entry=>{entry.refs++;let released=false;return {ready:entry.ready,dispose(){if(released)return;released=true;if(!--entry.refs){styles.delete(resolved.href);entry.dispose();}}};};
  if(shared)return lease(shared);
  const existing=[...document.querySelectorAll('link[rel=stylesheet]')].find(link=>link.href===resolved.href);
  if(existing?.sheet)return {ready:Promise.resolve(),dispose(){}};
  const link=document.createElement('link');link.rel='stylesheet';link.href=resolved.href;let settled=false,rejectReady;
  const ready=new Promise((resolve,reject)=>{rejectReady=reject;link.onload=()=>{settled=true;resolve();};link.onerror=()=>{settled=true;reject(Error('SETUP_STYLES_MISSING: '+resolved.href));};});
  ready.catch(()=>{});document.head.append(link);
  const entry={refs:0,ready,dispose(){link.onload=link.onerror=null;link.remove();if(!settled){settled=true;rejectReady(Error('SETUP_STYLES_RETIRED'));}}};styles.set(resolved.href,entry);return lease(entry);
}
export async function untilReady(ready,signal){if(signal.aborted)throw Error('PREPARATION_CANCELLED');let abort;
  try{await Promise.race([ready,new Promise((_,reject)=>{abort=()=>reject(Error('PREPARATION_CANCELLED'));signal.addEventListener('abort',abort,{once:true});})]);}
  finally{signal.removeEventListener('abort',abort);}
}
