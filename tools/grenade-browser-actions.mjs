import assert from 'node:assert/strict';
export const snapshot=page=>page.evaluate(()=>window.grenadeReference.snapshot());
export async function loaded(page){await page.waitForFunction(()=>!!window.grenadeReference);await page.waitForFunction(()=>!window.grenadeReference.snapshot().loading,null,{timeout:60000});const value=await snapshot(page);assert.equal(value.error,null);return value;}
export async function newField(page,options={}){assert.equal(await page.evaluate(options=>window.grenadeReference.newField(options),options),true);return loaded(page);}
export async function aim(page,{touch=false}={}){
 await page.locator('.gc-trigger')[touch?'tap':'click']();
 if(touch)await page.evaluate(()=>window.scrollTo(0,document.querySelector('.field-layout').getBoundingClientRect().top+scrollY));
 const box=await page.locator('.gc-stick').boundingBox(),r=Math.hypot(10,12),offset={x:.56*12/r,y:.56*10/r},x=box.x+box.width/2+box.width*.3*offset.x,y=box.y+box.height/2+box.width*.3*offset.y;
 if(touch)await page.touchscreen.tap(x,y);else{await page.mouse.move(x,y);await page.mouse.down();assert.equal((await snapshot(page)).ui.ready,false);await page.mouse.up();}
 const value=await snapshot(page);assert.equal(value.ui.ready,true);assert.ok(Math.abs(value.ui.point.x-23)<.001);assert.ok(Math.abs(value.ui.point.y-10)<.001);return value;
}
export async function throwAtTarget(page,{touch=false}={}){await aim(page,{touch});const before=await snapshot(page),scheduled=before.stats.scheduled;await page.locator('.gc-trigger')[touch?'tap':'click']();await page.waitForFunction(count=>window.grenadeReference.snapshot().stats.scheduled===count+1,scheduled,{timeout:60000});const value=await snapshot(page);assert.equal(value.error,null);return value;}
