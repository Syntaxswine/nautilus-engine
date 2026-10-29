import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BEAR_PIN} from './snapshot-bear.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),base=path.join(root,'vendor/aft-bear',BEAR_PIN),output=path.join(root,'packages/actors-bear/adapted');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'provenance.json'))),records=[];
function replace(source,before,after,count=1){if(source.split(before).length-1!==count)throw Error('Bear adaptation drift: '+before.slice(0,90));return source.replaceAll(before,after);}
for(const file of manifest.files.filter(file=>file.usage==='runtime-source')){
  const original=fs.readFileSync(path.join(base,file.path)),hash=createHash('sha256').update(original).digest('hex');if(hash!==file.sha256)throw Error('Bear source changed: '+file.path);
  let source=original.toString(),patches=[];
  if(source.includes("'./vendor/three.module.js'")){source=replace(source,"'./vendor/three.module.js'","'../three.js'");patches.push('existing shared Three bridge');}
  if(file.path.endsWith('/red-hat-model.js')){
    source=replace(source,"const response=await fetch('./pig-foreman-10k-data.json');if(!response.ok)throw Error('Red Hat cap mesh failed to load');\n const donor=createPigForeman(await response.json());","const donor=createPigForeman(await loader.loadJSON('capMesh'));");
    source=replace(source,'donor.dispose();','donor.skeleton.dispose();donor.dispose();',2);patches.push('injected module-resolved cap data; cap donor skeleton owner');
  }
  if(file.path.endsWith('/grenade-model.js')){
    source=replace(source,"if(!paint&&typeof document!=='undefined'){ownsPaint=true;paint=new T.TextureLoader().load(new URL('../assets/equipment/painted-ui/grenade-surface.png',import.meta.url).href,t=>{if(disposed)t.dispose();});}","if(!paint)throw Error('Nautilus grenade presentation requires its explicitly resolved texture.');");patches.push('explicit grenade texture, no document-relative implicit load');
  }
  if(file.path.endsWith('/weapon-models.js')){source=replace(source,"if(id==='grenade')return createGrenadeModel();","if(id==='grenade')return createGrenadeModel(texture);");patches.push('forward the explicitly resolved grenade texture');}
  if(file.path.endsWith('/horse-model-paint.js')){
    source=replace(source,'const ratio=renderer.getPixelRatio();','const ratio=renderer.getPixelRatio();\n try{');
    source=replace(source,'renderer.setRenderTarget(oldTarget);renderer.outputColorSpace=oldSpace;renderer.toneMapping=oldTone;renderer.setClearColor(oldColor,oldAlpha);renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);','}finally{renderer.setRenderTarget(oldTarget);renderer.outputColorSpace=oldSpace;renderer.toneMapping=oldTone;renderer.setClearColor(oldColor,oldAlpha);renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);}');
    source=replace(source,'if(projection){for(let i=0;i<4;i++)projection.draw(renderer,i);projection.disposeMaterials();}',"if(projection){try{for(let i=0;i<4;i++)projection.draw(renderer,i);}catch(error){target.dispose();mask.dispose();throw error;}finally{projection.disposeMaterials();}}");patches.push('restore borrowed renderer state and dispose partial projection on failure');
  }
  const result='// Generated from AFT '+BEAR_PIN+' '+file.path+'; source SHA-256 '+hash+'.\n'+source,name=path.basename(file.path),destination=path.join(output,name);
  records.push({source:file.path,sourceSha256:hash,output:'packages/actors-bear/adapted/'+name,sha256:createHash('sha256').update(result).digest('hex'),patches});
  if(process.argv.includes('--write')){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(destination,result);}else if(fs.readFileSync(destination,'utf8')!==result)throw Error('Generated bear adapter differs: '+destination);
}
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'docs/reviews/bear/adaptations.json'),JSON.stringify({sourceCommit:BEAR_PIN,files:records},null,2)+'\n');
console.log(JSON.stringify({modules:records.length,bytes:records.reduce((n,file)=>n+fs.statSync(path.join(root,file.output)).size,0),written:process.argv.includes('--write')}));
