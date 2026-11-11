import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview, projectRoot} from './art-review-browser.mjs';
import {ROAD_VEHICLES, VEHICLE_BODIES, ROAD_VEHICLE_FEATURE} from '../packages/vehicle-visuals/catalogue.js';

const output = process.argv[2] || 'road-vehicle-workshop-review';
const hashes = Object.fromEntries(['packages/vehicle-visuals/catalogue.js', 'packages/vehicle-visuals/sculpt.js',
  'packages/vehicle-visuals/three.js', 'apps/editor/assets.js', 'apps/editor/asset-catalog.js'].map(file =>
  [file, createHash('sha256').update(fs.readFileSync(path.join(projectRoot, file))).digest('hex')]));
const report = await withArtReview('Place, rotate, save and reopen all painted road vehicles in Map Workshop',
  async ({page, baseURL, out}) => {
    page.setDefaultTimeout(20000);
    await page.setViewportSize({width:1600,height:1000});
    await page.goto(baseURL + '/');
    const ready = () => page.waitForFunction(() => window.editor3d?.scene.sceneryAssets && !window.editor3d.loading);
    await ready();
    const portable = () => page.evaluate(() => window.nautilus.export());
    const frame = (x, y, span = 24) => page.evaluate(async view => {
      Object.assign(window.editor3d.view, view);
      window.editor3d.scene.previewMinutes = 670;
      window.editor3d.scene.changed();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, {x,y,span,preset:'0'});
    await page.evaluate(async () => {
      const {blankMap} = await import('/packages/map-core/index.js');
      await window.nautilus.open(blankMap('Painted road vehicles'));
    });
    await frame(11, 11, 24);
    await page.evaluate(async () => {
      const {SceneryScene} = await import('/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-scene.js');
      const rebuild = SceneryScene.prototype.rebuild;
      SceneryScene.prototype.rebuild = function(...args) {
        const result = rebuild.apply(this, args);
        for (const item of this.items.values()) {
          if (item.prop.kind === 'vehicle-pickup-sage' && item.root.parent && item.root.children.length === 2) {
            window.vehiclePreviewVisible = true;
          }
        }
        return result;
      };
    });
    await page.locator('#nautilus-assets').click();
    await page.locator('#asset-category').selectOption('Vehicles');
    assert.equal(await page.locator('#asset-results button').count(), 24);
    await page.locator('#asset-search').fill('pickup');
    assert.equal(await page.locator('#asset-results button').count(), 6);
    await page.locator('[data-asset="Vehicles:vehicle-pickup-sage"]').click();
    await page.waitForFunction(() => !document.getElementById('asset-use').disabled);
    await page.waitForFunction(() => window.vehiclePreviewVisible === true);
    await page.screenshot({path:path.join(out,'asset-library.png')});
    await page.locator('#asset-use').click();
    assert.equal(await page.locator('#prop-kind').inputValue(), 'vehicle-pickup-sage');
    const initial = await portable();
    const point = await page.evaluate(async () => {
      const T = await import('/packages/render-effects/three.js');
      const canvas = document.getElementById('scene'), rect = canvas.getBoundingClientRect();
      const p = new T.Vector3(8,0,8).project(window.editor3d.scene.camera);
      return [rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2];
    });
    await page.mouse.click(...point);
    await page.waitForFunction(() => window.editor3d.document.map.props.some(p => p.kind === 'vehicle-pickup-sage'));
    await page.keyboard.press('Control+z');
    assert.equal(await portable(), initial);
    await page.keyboard.press('Control+Shift+z');
    assert.equal(JSON.parse(await portable()).props.filter(p => p.kind === 'vehicle-pickup-sage').length, 1);

    const all = await page.evaluate(async () => {
      const {ROAD_VEHICLES} = await import('/packages/vehicle-visuals/catalogue.js');
      const {blankMap} = await import('/packages/map-core/index.js');
      await window.nautilus.open(blankMap('Painted road vehicles'));
      const editor = window.editor3d;
      for (const [i, row] of ROAD_VEHICLES.entries()) {
        const at = {x: 4 + (i % 8) * 8, y: 4 + Math.floor(i / 8) * 8, z:0};
        const result = editor.document.apply({tool:'prop',start:at,
          options:{propKind:row.id,rotation:(i % 4) * 90}});
        if (!result.ok) throw Error(row.id + ': ' + result.error);
      }
      await editor.scene.update(editor.document);
      editor.scene.changed();
      return editor.document.map.props.length;
    });
    assert.equal(all,24);
    await page.waitForFunction(() => window.editor3d.scene.sceneryAssets.items.size === 24);
    const before = await portable();
    const block = await page.evaluate(async () => {
      const {createBlockDocument, rotateSceneryBlock} = await import('/packages/map-core/index.js');
      const doc = createBlockDocument('Vehicle rotation proof');
      const result = doc.apply({tool:'prop',start:{x:2,y:2,z:0},options:{propKind:'vehicle-crew-pickup-sage'}});
      if (!result.ok) throw Error(result.error);
      const original = JSON.parse(doc.export());
      let rotated = original;
      const turns = [];
      for (let i=0;i<4;i++) {rotated=rotateSceneryBlock(rotated);turns.push(rotated.props[0].rotation);}
      if (JSON.stringify(rotated.props) !== JSON.stringify(original.props)) throw Error('Four block turns changed the vehicle source');
      return turns;
    });
    assert.deepEqual(block,[90,180,270,0]);
    const rejection = await page.evaluate(async () => {
      let calls=0;
      const disconnect=window.nautilus.connectGame({features:[],openMap(){calls++;}});
      let error='';
      try {await window.nautilus.sendToGame();} catch(e) {error=e.message;}
      disconnect();
      return {error,calls};
    });
    assert.ok(rejection.error.includes(ROAD_VEHICLE_FEATURE));
    assert.equal(rejection.calls,0);
    await page.locator('#settings-button').click();
    await page.locator('#save-map').click();
    await page.waitForFunction(() => document.getElementById('nautilus-settings-feedback')?.textContent.includes('Saved in this browser'));
    const saved = await page.locator('#saved-designs').inputValue();
    const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
    const mapFile=path.join(out,'vehicles-map.json');
    await download.saveAs(mapFile);
    assert.equal(fs.readFileSync(mapFile,'utf8'),before);
    await page.locator('#close-settings').click();
    await page.reload();await ready();
    await page.locator('#settings-button').click();
    await page.locator('#saved-designs').selectOption(saved);
    await page.locator('#load-map').click();
    await page.waitForFunction(() => !window.editor3d.loading && window.editor3d.scene.sceneryAssets.items.size === 24);
    assert.equal(await portable(),before);
    await page.locator('#close-settings').click();
    await page.evaluate(async before => {
      const {blankMap} = await import('/packages/map-core/index.js');
      await window.nautilus.open(blankMap('Empty before import'));
      await window.nautilus.open(before);
    },before);
    await page.waitForFunction(() => window.editor3d.scene.sceneryAssets.items.size===24);
    assert.equal(await portable(),before);

    const poses = await page.evaluate(async () => {
      const {VEHICLE_BODIES}=await import('/packages/vehicle-visuals/catalogue.js');
      const {blankMap}=await import('/packages/map-core/index.js');
      const map=blankMap('Painted road vehicles');
      const rows=VEHICLE_BODIES.map((body,i)=>({kind:'vehicle-'+body.id+'-'+['teal','oxide','sage'][i%3],
        x:4+i%4*4,y:4+Math.floor(i/4)*8,z:0,rotation:0,rotated:false}));
      map.props=rows;await window.nautilus.open(map);
      return rows;
    });
    await page.waitForFunction(()=>window.editor3d.scene.sceneryAssets.items.size===8);
    await frame(11,10,24);
    await page.screenshot({path:path.join(out,'workshop.png')});
    async function artwork(name,x,y,span) {
      await frame(x,y,span);
      const png=await page.evaluate(()=>{
        const scene=window.editor3d.scene;
        scene.lights.render(scene.renderer,scene.camera);
        return scene.renderer.domElement.toDataURL('image/png').split(',')[1];
      });
      fs.writeFileSync(path.join(out,name),Buffer.from(png,'base64'));
    }
    await artwork('lineup.png',11,10,17);
    await artwork('cars-and-pickups.png',11,6,10.8);
    await artwork('vans-and-suvs.png',11,14,10.8);
    const lifecycle=await page.evaluate(async()=>{
      const {createRoadVehicleKit}=await import('/packages/vehicle-visuals/three.js');
      const T=await import('/packages/render-effects/three.js');
      const scene=window.editor3d.scene,renderer=scene.renderer,context=renderer.getContext(),kit=createRoadVehicleKit(T);
      const a=kit.create('vehicle-sedan-teal'),b=kit.create('vehicle-sedan-sage');
      a.root.visible=b.root.visible=false;scene.scene.add(a.root,b.root);
      const geometry=a.root.children[0].geometry;let disposals=0;
      geometry.addEventListener('dispose',()=>{disposals++;});
      a.dispose();
      if(disposals||a.root.parent||!b.root.parent)throw Error('One car released another car');
      kit.dispose();kit.dispose();
      if(disposals!==1||b.root.parent||renderer.getContext()!==context||context.isContextLost())throw Error('Shared car cleanup affected the renderer');
      scene.changed();
      return {oneCarPreservesOther:true,sharedGeometryDisposedOnce:true,rendererContextAlive:true};
    });
    return {bodyCount:VEHICLE_BODIES.length,variants:ROAD_VEHICLES.length,poses,blockTurns:block,
      saveReload:true,exportImport:true,undoRedo:true,unsupportedHandoff:rejection,lifecycle,hashes};
  },{output,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:240000});
fs.writeFileSync(path.join(projectRoot,'artifacts',output,'review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,variants:report.variants,lifecycle:report.lifecycle}));