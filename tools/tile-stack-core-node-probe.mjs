// Run as a foreground child, outside node:test (whose own clocks are permitted).
import assert from 'node:assert/strict';
const names=['window','document','localStorage','sessionStorage','navigator','THREE','renderer','fetch','WebSocket','Worker','Date','performance'],saved=new Map();let attempts=0;
for(const name of names){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){attempts++;throw Error('Forbidden headless dependency: '+name);}});}
const random=Math.random;Math.random=()=>{attempts++;throw Error('Ambient RNG is forbidden');};
try{
 const C=await import(process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js'),P=await import('../candidates/tile-stack/core/index.js'),F=await import('../candidates/tile-stack/core/fixtures.mjs');
 const state=F.initial(C),result=P.prepareTileStack(C,F.input(C,state,F.stackIntent()));assert.equal(result.ok,true);assert.equal(result.plan.request.relations.length,105);assert.equal(attempts,0);process.stdout.write(JSON.stringify({ok:true,forbiddenDependencyAccesses:attempts,crossings:105})+'\n');
}finally{Math.random=random;for(const [name,d]of saved)if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}
