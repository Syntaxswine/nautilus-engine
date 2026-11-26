// Second probe: the close-event wait becomes a switch, and a Start key that does nothing
// records what the page says. Probe branch only.   node patch-arms-2.mjs <worktree>
import fs from 'node:fs';
import path from 'node:path';
const edit = (name, pairs) => {
  const file = path.join(process.argv[2], name); let text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  for (const [needle, next] of pairs) {
    const parts = text.split(needle.split('\n').join(eol));
    if (parts.length !== 2) throw Error('Needle not found exactly once in ' + name + ': ' + needle.slice(0, 70));
    text = parts.join(next.split('\n').join(eol));
  }
  fs.writeFileSync(file, text); console.log('patched', name);
};
edit('tools/review-game-starter.mjs', [
  [` await page.locator('[data-action=credits]').click();assert.equal(await page.locator('.ng-dialog[open]').count(),1);await page.keyboard.press('Escape');
 await page.locator('[data-action=start]').focus();await page.keyboard.press('Enter');await page.locator('#game').waitFor({state:'visible'});`,
   ` await page.locator('[data-action=credits]').click();assert.equal(await page.locator('.ng-dialog[open]').count(),1);
 if(arm.has('event'))await page.evaluate(()=>{window.creditsClosed=false;document.querySelector('.ng-dialog[open]').addEventListener('close',()=>{window.creditsClosed=true;},{once:true});});
 await page.keyboard.press('Escape');if(arm.has('event')){await page.waitForFunction(()=>window.creditsClosed);assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'credits');}
 await page.locator('[data-action=start]').focus();await page.keyboard.press('Enter');
 try{await page.locator('#game').waitFor({state:'visible'});}catch(error){fs.writeFileSync(path.join(out,'start-failure.json'),JSON.stringify(await page.evaluate(()=>({active:document.activeElement.dataset.action||document.activeElement.textContent,dialogs:document.querySelectorAll('.ng-dialog[open]').length,status:document.querySelector('.ng-status')?.textContent,busy:document.querySelector('.nautilus-title')?.getAttribute('aria-busy')})),null,2));throw error;}`],
]);
edit('tools/probe-starter-capture.mjs', [
  [`for (const name of ['capture-failure.json', 'capture-timing.json'])`, `for (const name of ['capture-failure.json', 'capture-timing.json', 'start-failure.json'])`],
  [`failure: read('capture-failure.json')})`, `failure: read('capture-failure.json'), start: read('start-failure.json')})`],
]);
edit('.github/workflows/starter-probe.yml', [
  [`          PROBE_CYCLES: '12'
`, `          PROBE_CYCLES: '100'
`],
  [`          PROBE_ARMS: '{"old":"","main":"close,front,visible,paint,state","close":"close","front":"front","paint":"visible,paint","state":"state","delay":"delay","viewport":"viewport"}'
`, `          PROBE_ARMS: '{"main":"close,front,visible,paint,state","fixed":"close,front,visible,paint,state,event"}'
`],
]);
