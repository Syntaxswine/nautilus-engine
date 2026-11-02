// Turn each element of main's capture correction into a switch, on the probe branch only:
// with no switch set the review runs the flow from before b8dd25d; with all of them, main's.
//   node patch-arms.mjs <worktree>
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2], 'tools/review-game-starter.mjs');
let text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const sub = (needle, next) => {
  const n = needle.split('\n').join(eol), parts = text.split(n);
  if (parts.length !== 2) throw Error('Needle not found exactly once: ' + needle.slice(0, 70));
  text = parts.join(next.split('\n').join(eol));
};
sub(`const checks=[],check=(name,details={})=>`,
`// Probe only: which elements of the capture correction this run applies.
const arm=new Set((process.env.PROBE_ARM??'close,front,visible,paint,state').split(',').filter(Boolean));
const checks=[],check=(name,details={})=>`);
sub(` // Desktop retirement assertions are complete; release its compositor surface.
 await page.close();`, ` if(arm.has('close'))await page.close();`);
sub(`   await mobile.bringToFront();
   await mobile.goto(url);await mobile.locator('[data-action=start]').waitFor({state:'visible'});await mobile.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);`,
`   if(arm.has('front'))await mobile.bringToFront();
   await mobile.goto(url);const loaded=Date.now();if(arm.has('visible'))await mobile.locator('[data-action=start]').waitFor({state:'visible'});await mobile.waitForFunction(()=>!document.querySelector('[data-action=start]').disabled);`);
sub(`   await mobile.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});`,
`   if(arm.has('paint'))await mobile.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   if(arm.has('delay'))await mobile.waitForTimeout(1000);`);
sub(`   const captureSession=await phone.newCDPSession(mobile);let layoutMetrics;`,
`   if(arm.has('state')){
   const captureSession=await phone.newCDPSession(mobile);let layoutMetrics;`);
const shotLine = `   await mobile.screenshot({path:path.join(out,'title-phone.png'),fullPage:true});`;
const parts = text.split(shotLine + eol);
if (parts.length !== 2) throw Error('Capture line not found once');
text = parts.join(`   }
   const captureStart=Date.now(),sinceLoad=captureStart-loaded;
   try{await mobile.screenshot({path:path.join(out,'title-phone.png'),fullPage:!arm.has('viewport')});fs.writeFileSync(path.join(out,'capture-timing.json'),JSON.stringify({sinceLoad,captureMs:Date.now()-captureStart}));}
   catch(error){
    // What the page says just after an empty capture, and whether the capture is transient.
    const after={arm:[...arm],message:error.message,sinceLoad,captureMs:Date.now()-captureStart,retries:[]};
    after.page=await mobile.evaluate(()=>({visibility:document.visibilityState,focused:document.hasFocus(),ready:document.readyState,now:performance.now(),inner:[innerWidth,innerHeight],root:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]})).catch(e=>e.message);
    for(const wait of [0,250,1000]){await new Promise(resolve=>setTimeout(resolve,wait));const started=Date.now();try{await mobile.screenshot({path:path.join(out,'retry.png'),fullPage:true});after.retries.push({wait,ok:true,ms:Date.now()-started});break;}catch(e){after.retries.push({wait,ok:false,ms:Date.now()-started,message:e.message});}}
    fs.writeFileSync(path.join(out,'capture-failure.json'),JSON.stringify(after,null,2));
    throw error;
   }
`.split('\n').join(eol));
fs.writeFileSync(file, text);
console.log('patched', file);
