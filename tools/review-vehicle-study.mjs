import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const output=process.argv[2]||'vehicle-study-01';
const installed=process.argv.includes('--installed');
const result=await withArtReview('Compare the three approved vehicle designs with the reduced painted models',async({page,baseURL,out})=>{
 await page.setViewportSize({width:1600,height:1000});await page.goto(baseURL+'/tools/vehicle-art/study-01/viewer.html'+(installed?'?installed=1':''));await page.waitForFunction(()=>window.ready);
 const capture=async(name,options)=>{const stats=await page.evaluate(options=>window.review.draw(options),options);await page.screenshot({path:path.join(out,name+'.png')});return stats;};
 const lineup=await capture('lineup',{id:'all'}),views=[];
 for(const id of ['pickup','cargo-van','utility-suv'])for(const pose of ['front','side','rear','top','under'])views.push({id,pose,...await capture(id+'-'+pose,{id,pose})});
 await capture('game-grid',{id:'all',showGrid:true,lighting:installed?'studio':'game'});
 const paint=await page.evaluate(()=>window.review.checkPaint());
 for(const body of paint){for(const row of body.rows){assert.ok(row.glass[2]>=row.glass[0]);for(let c=0;c<3;c++)assert.ok(Math.abs(row.glass[c]-body.rows[0].glass[c])<=2,'Body finish changed the glass: '+JSON.stringify(body));}assert.ok(body.rows.some(row=>row.body.slice(0,3).reduce((n,v,c)=>n+Math.abs(v-body.rows[0].body[c]),0)>15));}
 const checks=await page.evaluate(()=>{
  const r=window.review,T=r.T,rows=[];
  for(let i=0;i<r.models.length;i++){const m=r.models[i],box=new T.Box3().setFromObject(m.root);
   rows.push({id:r.ids[i],triangles:m.root.children.reduce((n,o)=>n+o.geometry.index.count/3,0),boundsM:box.getSize(new T.Vector3()).toArray(),meshes:m.root.children.length});}
  if(r.renderer.getContext().getError()!==r.renderer.getContext().NO_ERROR)throw Error('Vehicle WebGL error');return rows;
 });
 for(const row of checks){assert.ok(row.triangles>10000&&row.triangles<14000);assert.equal(row.meshes,2);assert.ok(row.boundsM[0]<=2&&row.boundsM[1]<=2.12);}
 const timing=await page.evaluate(async installed=>{const times=[];for(let i=0;i<16;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const at=performance.now();window.review.draw({id:'all',lighting:installed?'studio':'game'});window.review.renderer.getContext().finish();times.push(performance.now()-at);}const gl=window.review.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {samples:times.length,meanMs:times.reduce((a,b)=>a+b)/times.length,maxMs:Math.max(...times),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',scope:'Controlled local review timing; not a target-device frame-rate claim'};},installed);
 await page.evaluate(()=>window.review.dispose());return {status:'pass',installed,lineup,views,checks,paint,timing};
},{source:true,output,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:240000});
fs.writeFileSync(path.join(projectRoot,'artifacts',output,'review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,status:result.status,checks:result.checks}));
