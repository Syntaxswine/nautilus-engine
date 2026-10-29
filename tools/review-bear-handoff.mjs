import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';

const sha=data=>createHash('sha256').update(data).digest('hex');
const files=['apps/editor/assets.js','apps/editor/editor.css','docs/components/index.md','docs/components/bear-authoring.md','tools/review-bear-handoff.mjs'];
const report={status:'proposed bear guide; no provider or appearance support added',
  sourceCommit:execFileSync('git',['-c','safe.directory='+projectRoot.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),
  sourceFiles:files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(projectRoot,file)))})),
  buildProvenanceSha256:sha(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))),checks:{},captures:[]};
await withArtReview('Bear builder handoff discoverability, packaged guide status and desktop/phone library link',async({page,browser,baseURL,out,errors,failedRequests})=>{
  const capture=async name=>{await page.screenshot({path:path.join(out,name),animations:'disabled'});report.captures.push({file:name,sha256:sha(fs.readFileSync(path.join(out,name)))});};
  await page.goto(baseURL+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.editor3d?.document&&!window.editor3d.loading,undefined,{timeout:90000});
  report.browser=await browser.version();const before=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision,undo:window.editor3d.document.editor.undo.length,redo:window.editor3d.document.editor.redo.length}));
  await page.locator('#nautilus-assets').click();const link=page.locator('#asset-guides');await link.waitFor({state:'visible'});
  assert.equal(await link.getAttribute('href'),baseURL+'/docs/components/index.md');assert.equal(await link.getAttribute('target'),'_blank');
  assert.match(await link.getAttribute('aria-label'),/checklists/);
  const index=await page.request.get(await link.getAttribute('href'));assert.equal(index.status(),200);
  const indexText=await index.text();assert.match(indexText,/people:bear/);assert.match(indexText,/Proposed integration/);assert.match(indexText,/bear-authoring\.md/);
  const guide=await page.request.get(baseURL+'/docs/components/bear-authoring.md');assert.equal(guide.status(),200);
  const guideText=await guide.text();for(const required of ['@nautilus-engine/core','red-hats','hmg','rpg','unsupported-v0.8-bear.block.json','Save in this browser','Pending'])assert.ok(guideText.includes(required),required);
  await capture('library-guide-desktop.png');
  report.checks.desktopGuideDiscoveryStatusAndContent=true;
  await page.setViewportSize({width:390,height:844});await link.scrollIntoViewIfNeeded();const bounds=await link.boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.height>=44);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await link.focus();assert.equal(await link.evaluate(element=>element===document.activeElement),true);
  await capture('library-guide-phone-390.png');report.checks.phoneGuideVisibleKeyboardFocusableAndNoOverflow=true;
  await page.locator('#asset-close').click();
  const after=await page.evaluate(()=>({json:window.editor3d.export(),revision:window.editor3d.document.revision,undo:window.editor3d.document.editor.undo.length,redo:window.editor3d.document.editor.redo.length}));
  assert.deepEqual(after,before);report.checks.guideDiscoveryPreservesDocumentAndHistory=true;
  report.errors=errors;report.failedRequests=failedRequests;fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks));
},{output:'editor-bear-handoff',owner:process.env.CODEX_THREAD_ID||'01a1811b-5974-7d83-8cff-136a1d8b02ab',timeoutMs:180000});
