import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withArtReview} from '../../../tools/art-review-browser.mjs';
const groups=[];let output;
await withArtReview('Additive full-recipe menu adapter and asynchronous menu lifetime proof',async({page,baseURL,out,browser})=>{
  output=out;await page.goto(baseURL+'/packages/player-ui/tests/setup-menu.html');
  await page.evaluate(async()=>{
    const api=await import('/packages/player-ui/index.js');
    const content={id:'menu-contract-fixture',version:1,sourcePin:'7f50cb2a48aef87a16fc0465997549be9ed88dc2'};
    const native={id:'setup.native-actor',version:1,label:'Native actor fixture',ports:[],settings:[{id:'motion',label:'Animation role fixture',type:'enum',values:['gait','neutral'],default:'gait',change:'restart'}],guide:'fixture only',usageCard:'fixture only'};
    window.freshMenu=async(adapted=true)=>{
      await window.menuTest?.ui.dispose();
      const t={accepted:null,requests:[],pending:false,refuse:false},canvas=document.querySelector('#world');
      const services={
        [api.PLAYER_PORTS.scene.id]:{content,actorIds:['player'],inputElement:canvas,read:()=>({version:1,actorId:'player',mode:'on-foot',contextId:'ground',walkingAllowed:true,position:{x:0,y:0,h:0},status:[]}),subscribe:()=>()=>{}},
        [api.PLAYER_PORTS.walking.id]:{request:()=>({version:1,ok:true,committed:true,code:null,reason:null})},
        [api.PLAYER_PORTS.pause.id]:{acquire:()=>({setBlocked(value){t.paused=value;},dispose(){}})},
        [api.PLAYER_PORTS.bounds.id]:{publish(value){t.bounds=value;}}
      };
      const provider={descriptor:{id:'menu.fixture',version:1,ports:['scene','walking','pause','bounds'].map(n=>api.providerPort(api.PLAYER_PORTS[n]))},services};
      const configuration=api.createPlayerConfiguration({content});configuration.components=configuration.components.filter(c=>c.id!=='player.trains');
      t.accepted={...structuredClone(configuration),kind:'nautilus-player-setup',components:[...configuration.components,{id:native.id,version:1,settings:{motion:'gait'}}]};
      const adapter={descriptors:[...api.PLAYER_COMPONENTS,native],read:()=>structuredClone(t.accepted),connections:()=>({version:1,fixture:true}),
        validate(value){const errors=[];if(value.kind!=='nautilus-player-setup'||!value.components?.find(c=>c.id===native.id))errors.push({code:'FIXTURE_REQUIRED',path:'/components',message:'Keep the native fixture descriptor.',action:'Select the declared descriptor.'});return {ok:!errors.length,errors,configuration:errors.length?null:structuredClone(value)};},
        apply(recipe){const request={recipe:structuredClone(recipe)};t.requests.push(request);
          const finish=result=>{if(result.committed)t.accepted=structuredClone(recipe);return result;};
          if(t.pending)return new Promise(resolve=>{request.resolve=result=>resolve(finish(result));});
          return finish(t.refuse?{version:1,ok:false,committed:false,code:'FIXTURE_REFUSAL',reason:'Fixture preparation refused.'}:{version:1,ok:true,committed:true,code:null,reason:null});},
        presets:[{id:'fixture-neutral',label:'Neutral fixture'}],preset(recipe,id){if(id!=='fixture-neutral')throw Error('Unknown fixture preset');const next=structuredClone(recipe);next.components.find(c=>c.id===native.id).settings.motion='neutral';return next;}};
      t.ui=await api.mountPlayerUI(document.querySelector('#ui'),{providers:[provider],configuration,...(adapted?{setupMenu:adapter}:{})});
      window.menuTest=t;t.ui.openMenu();return true;
    };
  });
  await page.evaluate(()=>window.freshMenu(false));
  assert.equal(await page.getByRole('button',{name:'Farmyard phone',exact:true}).count(),1);
  assert.equal(await page.locator('[data-setting="pace"]').count(),1);
  await page.getByText('Save or load recipe',{exact:true}).click();await page.getByRole('button',{name:'Export accepted recipe',exact:true}).click();
  assert.equal(JSON.parse(await page.locator('textarea').inputValue()).kind,'nautilus-player-ui-configuration');
  groups.push('omitted adapter preserves the Stage1 presets/descriptors/export path');
  await page.evaluate(()=>window.freshMenu());
  assert.equal(await page.locator('[data-component="setup.native-actor"]').count(),1);
  assert.match(await page.getByRole('group',{name:'Native actor fixture',exact:true}).textContent(),/requires restart/);
  assert.equal(await page.getByRole('button',{name:'Farmyard phone',exact:true}).count(),0);
  await page.locator('[data-component="setup.native-actor"]').selectOption('neutral');
  await page.getByRole('button',{name:'Apply & try',exact:true}).click();
  assert.equal(await page.locator('.pui-setup').evaluate(n=>n.open),false);
  assert.equal(await page.evaluate(()=>window.menuTest.accepted.components.find(c=>c.id==='setup.native-actor').settings.motion),'neutral');
  await page.evaluate(()=>window.menuTest.ui.openMenu());await page.getByText('Save or load recipe',{exact:true}).click();await page.getByRole('button',{name:'Export accepted recipe',exact:true}).click();
  const full=JSON.parse(await page.locator('textarea').inputValue());assert.equal(full.kind,'nautilus-player-setup');assert.equal(full.components.at(-1).settings.motion,'neutral');
  groups.push('full recipe descriptor renders, applies, labels restart and exports without Stage1 coercion');
  await page.getByRole('button',{name:'Neutral fixture',exact:true}).click();await page.getByRole('button',{name:'Apply & try',exact:true}).click();
  groups.push('full recipe presets use only their explicit adapter callback');
  await page.evaluate(()=>{window.menuTest.refuse=true;window.menuTest.ui.openMenu();});
  await page.locator('[data-component="setup.native-actor"]').selectOption('gait');await page.getByRole('button',{name:'Apply & try',exact:true}).click();
  assert.equal(await page.locator('.pui-setup').evaluate(n=>n.open),true);assert.match(await page.locator('.pui-setup [role="status"]').textContent(),/refused/);
  assert.equal(await page.evaluate(()=>window.menuTest.accepted.components.at(-1).settings.motion),'neutral');
  groups.push('preparation refusal retains accepted recipe and active menu');
  await page.evaluate(()=>{window.menuTest.pending=true;});await page.getByRole('button',{name:'Apply & try',exact:true}).click();
  await page.waitForFunction(()=>window.menuTest.requests.at(-1).resolve);
  await page.evaluate(()=>{const t=window.menuTest;t.old=t.requests.at(-1);t.ui.closeMenu();t.ui.openMenu();});
  await page.getByRole('button',{name:'Apply & try',exact:true}).click();await page.waitForFunction(()=>window.menuTest.requests.at(-1)!==window.menuTest.old);
  const reopened=await page.evaluate(async()=>{const t=window.menuTest;document.querySelector('[data-component="setup.native-actor"]').focus();const focus=document.activeElement;t.old.resolve({version:1,ok:true,committed:true,code:null,reason:null});await new Promise(r=>setTimeout(r,0));return {open:document.querySelector('.pui-setup').open,disabled:[...document.querySelectorAll('button')].find(n=>n.textContent==='Apply & try').disabled,sameFocus:document.activeElement===focus,status:document.querySelector('.pui-setup [role=status]').textContent};});
  assert.deepEqual(reopened,{open:true,disabled:true,sameFocus:true,status:'Preparing selected parts…'});
  await page.evaluate(()=>window.menuTest.requests.at(-1).resolve({version:1,ok:false,committed:false,code:'REFUSED',reason:'Current preparation refused.'}));
  groups.push('closed/reopened lifetime ignores old success while a newer apply is pending');
  await page.evaluate(()=>{const t=window.menuTest;t.ui.closeMenu();t.ui.openMenu();});await page.getByRole('button',{name:'Apply & try',exact:true}).click();
  await page.evaluate(async()=>{window.retiredMenu=window.menuTest;await window.freshMenu();});
  const replaced=await page.evaluate(async()=>{const focus=document.activeElement;window.retiredMenu.requests.at(-1).resolve({version:1,ok:true,committed:true,code:null,reason:null});await new Promise(r=>setTimeout(r,0));return {count:document.querySelectorAll('.pui-setup').length,open:document.querySelector('.pui-setup').open,sameFocus:focus===document.activeElement,status:document.querySelector('.pui-setup [role=status]').textContent};});
  assert.deepEqual(replaced,{count:1,open:true,sameFocus:true,status:''});groups.push('retired shell completion cannot close or refocus its replacement');
  const subset=await page.evaluate(()=>window.menuTest.ui.applyConfiguration(window.menuTest.accepted));assert.equal(subset.committed,false);assert.equal(subset.code,'CONFIGURATION_NOT_READY');
  groups.push('public UI applyConfiguration retains its strict UI-subset contract');
  await page.evaluate(()=>window.menuTest.ui.dispose());
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'passed',base:'578a86113395ea3ebcb76c636ce8f0882600d03e',browser:browser.version(),groups,limits:'Menu adapter proof only; no Stage2 native/default startup claim.'},null,2)+'\n');
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output:'player-setup-menu-seam',timeoutMs:90000});
console.log(JSON.stringify({status:'passed',groups:groups.length,output}));
