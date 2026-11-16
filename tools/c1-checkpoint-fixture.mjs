// Browser-proof fixture setup only. No application/runtime fallback or reload
// hook: install the actual accepted native record before the app first starts.
import assert from 'node:assert/strict';
export async function captureC1CheckpointFixture(page,checkpointJSON){
  return page.evaluate(value=>{const keys=Object.keys(localStorage);if(keys.length!==1||!keys[0].startsWith('nautilus-tile-authoring-editor-v3:')||localStorage.getItem(keys[0])!==value)throw Error('The C1 fixture must capture the exact accepted authoritative record.');return {origin:location.origin,key:keys[0],value};},checkpointJSON);
}
export async function openC1CheckpointFixture(page,url,fixture){
  assert.equal(new URL(url).origin,fixture.origin);assert.ok(fixture.key.startsWith('nautilus-tile-authoring-editor-v3:'));assert.equal(typeof fixture.value,'string');
  // Keep the storage writer and the application in the same live page. A
  // browser-managed temporary storageState page can close before this page is
  // opened; the collector previously never verified that copied starting data.
  const bootstrap=route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><title>C1 checkpoint fixture</title>'});
  await page.route(url,bootstrap,{times:1});let installed;
  try{await page.goto(url);installed=await page.evaluate(({origin,key,value})=>{if(location.origin!==origin||localStorage.length!==0)throw Error('Start the C1 checkpoint fixture in a fresh same-origin context.');localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('C1 fixture checkpoint copy did not persist byte-for-byte.');return {origin,key,bytes:value.length};},fixture);}
  finally{await page.unroute(url,bootstrap);}
  // The one-shot bootstrap is gone. Every later reload runs the real app and
  // reads whatever WAL/receipt the tested command actually left in storage.
  await page.goto(url);return installed;
}
