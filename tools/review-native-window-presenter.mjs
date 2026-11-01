import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {withArtReview,projectRoot as root} from './art-review-browser.mjs';
import {packProfile} from './distribution.mjs';
const installed=process.argv.includes('--installed'),source=process.argv.includes('--source'),mode=installed?'installed':source?'source':'built',owner='01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output='native-window-presenter-'+mode;
const prefix='/artifacts/native-window-presenter-installed-browser/';
let entry='/examples/native-window-presenter.html';
if(installed){
  const stage=path.join(root,'artifacts/native-window-presenter-installed-browser'),player=path.join(stage,'player');fs.mkdirSync(player,{recursive:true});
  const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),core=packProfile('core'),renderer=packProfile('renderer'),privateArchive=path.join(root,'artifacts/native-window-presenter-package/nautilus-private-native-window-presenter-0.0.0.tgz');
  if(!fs.existsSync(privateArchive))throw Error('Run the actual installed package proof first.');
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'installed-window-browser-review',private:true,type:'module'}));
  execFileSync(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund',core.file,renderer.file,privateArchive],{cwd:stage,windowsHide:true,stdio:'pipe',timeout:120000});
  for(const f of ['native-window-presenter.js','native-window-host.js','native-window-materials.js'])fs.copyFileSync(path.join(root,'examples',f),path.join(player,f));
  const html=fs.readFileSync(path.join(root,'examples/native-window-presenter.html'),'utf8').replace('../packages/windows-core/index.js','../node_modules/@nautilus-engine/core/packages/windows-core/index.js').replace('../packages/adapters/farmyard/windows.js','../node_modules/@nautilus-engine/core/packages/adapters/farmyard/windows.js').replace('../packages/render-effects/three.js','../node_modules/@nautilus-engine/renderer/packages/render-effects/three.js').replace('../packages/native-window-presenter/three.js','../node_modules/@nautilus-private/native-window-presenter/packages/native-window-presenter/three.js');
  fs.writeFileSync(path.join(player,'native-window-presenter.html'),html);entry=prefix+'player/native-window-presenter.html';
}
const captures=[],checks=[];
await withArtReview('Native static window presenter '+mode+' desktop/phone review',async({page,context,browser,baseURL,out,errors})=>{
  if(installed)await context.route('**/*',route=>{const u=new URL(route.request().url()),allowed=u.origin===baseURL&&(u.pathname.startsWith(prefix+'player/')||u.pathname.startsWith(prefix+'node_modules/'));if(allowed)return route.continue();errors.push('Installed request escaped private fixture/packages: '+u.pathname);return route.abort();});
  const ready=async p=>{await p.waitForFunction(()=>document.body.dataset.ready==='true');},snap=p=>p.evaluate(()=>windowPresenterReview.snapshot());
  await page.setViewportSize({width:1456,height:900});await page.goto(baseURL+entry);await ready(page);
  async function capture(name,p=page){const file=path.join(out,name+'.png');await p.screenshot({path:file});captures.push({name,file:path.relative(root,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
  assert.equal((await snap(page)).placements,39);await capture('catalogue-desktop');
  for(const study of ['skins','joins','borderless','clipping']){await page.getByRole('button',{name:{skins:'Finishes',joins:'Joined run',borderless:'Tall glass',clipping:'Wall opening'}[study],exact:true}).click();const s=await snap(page);assert.equal(s.mode,study);assert.equal(s.underlayPreserved,true);if(study==='clipping'){assert.equal(s.clippedWalls,6);assert.equal(s.legacyViewWalls,6);}await capture(study+'-desktop');checks.push({study,snapshot:s});}
  await page.getByRole('button',{name:'Back view',exact:true}).click();await capture('clipping-back');assert.equal((await snap(page)).back,true);await page.getByRole('button',{name:'Back view',exact:true}).click();
  assert.equal(await page.evaluate(()=>windowPresenterReview.breakPane()),true);let s=await snap(page);assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.glints,5);assert.equal(await page.evaluate(()=>windowPresenterReview.retry()),true);const restored=await page.evaluate(()=>windowPresenterReview.restore());assert.deepEqual(restored,{committed:true,quiet:true,savePreserved:true});s=await snap(page);assert.equal(s.hiddenPanes,1);assert.equal(s.presentations,1);assert.equal(s.underlayPreserved,true);await capture('broken-restored-desktop');checks.push({study:'acknowledged break / quiet live restore / retry',snapshot:s});
  await page.getByRole('button',{name:'Tall glass',exact:true}).click();await page.getByRole('button',{name:'Back view',exact:true}).click();await capture('borderless-back');
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  if(installed)await mobile.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===baseURL&&(u.pathname.startsWith(prefix+'player/')||u.pathname.startsWith(prefix+'node_modules/')))return route.continue();errors.push('Installed phone request escaped package fixture.');return route.abort();});
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(baseURL+entry+'?mode=clipping');await ready(phone);await capture('clipping-phone',phone);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await phone.getByRole('button',{name:'Confirm pane break',exact:true}).click();assert.equal((await snap(phone)).hiddenPanes,1);await phone.getByRole('button',{name:'Quiet restore',exact:true}).click();assert.equal((await snap(phone)).restore.quiet,true);await capture('broken-restored-phone',phone);await phone.evaluate(()=>windowPresenterReview.dispose());await mobile.close();
  await page.evaluate(()=>windowPresenterReview.dispose());
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',mode,installed,core:'actual declared package when installed; exact main public modules otherwise',provider:'unregistered private candidate',captures,checks,errors},null,2)+'\n');
},{source:source||installed,owner,output,timeoutMs:180000});
console.log(JSON.stringify({status:'pass',mode,captures:captures.length,checks:checks.length,output}));
