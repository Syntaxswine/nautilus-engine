// Explicit protocol SourceReadOwner. No Host/Core/native/meter/WAL authority.
// The final visitor owns its source/lifetime facts; it calls no getter/predicate.
export function createProtocolSourceOwner(initial){
 let value=structuredClone(initial),epoch=0,lifetime=0,live=true,lastRead=null;const reads=new WeakMap(),tickets=new WeakMap(),proxies=new WeakMap(),originals=new WeakMap();
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const x of Object.values(value))freeze(x);Object.freeze(value);}return value;};
 const fail=code=>{throw Object.assign(new TypeError(code),{code});};
 function proxy(object){if(!object||typeof object!=='object')return object;let found=proxies.get(object);if(found)return found;found=new Proxy(object,{get(target,key){return proxy(Reflect.get(target,key));},set(target,key,next){Reflect.set(target,key,next&&typeof next==='object'?(originals.get(next)??next):next);epoch++;return true;},deleteProperty(target,key){Reflect.deleteProperty(target,key);epoch++;return true;}});proxies.set(object,found);originals.set(found,object);return found;}
 const finalReadOwner=Object.freeze({capture(read){const e=reads.get(read);if(!e)fail('PROTOCOL_FOREIGN_READ');const ticket=Object.freeze({});tickets.set(ticket,{read,e,used:false});return ticket;},visit(ticket,read,visit){const t=tickets.get(ticket),e=reads.get(read);if(!t||t.used||t.read!==read||t.e!==e||!live||e.epoch!==epoch||e.lifetime!==lifetime||typeof visit!=='function')fail('PROTOCOL_FINAL_READ_RETIRED');t.used=true;return visit(read);}});
 return Object.freeze({finalReadOwner,
  get model(){return proxy(value);},get rawModel(){return value;},get lastRead(){return lastRead;},get live(){return live;},
  setLive(next){if(live!==next){live=next;lifetime++;}},
  replace(fn){const next=structuredClone(value);fn(next);value=next;epoch++;},
  issue(){const read=freeze(structuredClone(value));reads.set(read,{epoch,lifetime});lastRead=read;return read;},
  isIssued(read){return reads.has(read);},
  diagnostics(){return Object.freeze({epoch,lifetime,live});}
 });
}
