// Add route editing to the guarded Workshop projection. Donor bytes stay intact.
export function adaptEditorRailway(name, text, once) {
  const core = '../../../../../packages/map-core/', app = '../../../../../app/';
  const change = (anchor, replacement, label) => {
    if (text.split(anchor).length !== 2) throw new Error('Expected one Railway adapter anchor: ' + label);
    text = once(text, anchor, replacement, 'Railway: ' + label);
  };
  const guard = (map, label) => `refuseRailwayRoutes(${map},'${label}');`;
  const importRefusal = `import {refuseRailwayRoutes} from '${core}railway-routes.js';\n`;
  if (name.endsWith('/editor-3d.js')) {
    change(`from '${core}roof-document.js'`, `from '${core}railway-document.js'`, 'route document');
    change(`from '${app}roof-scene.js'`, `from '${app}railway-scene.js'`, 'route scene');
    change("next.map.sectorTemplate?.id&&!next.block?'Save as a new sector variant'",
      "next.map.sectorTemplate?.id&&!next.block&&!next.map.railwayRoutes?'Save as a new sector variant'", 'quick save label');
    change('documentModel?.map.sectorTemplate?.id&&!documentModel.block?sectorSave.show()',
      'documentModel?.map.sectorTemplate?.id&&!documentModel.block&&!documentModel.map.railwayRoutes?sectorSave.show()', 'quick local save');
  }
  if (name.endsWith('/editor-3d-tools.js')) {
    text = `import {installRailwayTools} from '${app}railway-tools.js';\n` + text;
    const roofInstall = 'const roofTools=installRoofTools({panel,getDocument,getSelection,apply,scene,status,isLoading});';
    change(roofInstall, roofInstall +
      '\n const railTools=installRailwayTools({panel,canvas,getDocument,apply,scene,status,isBusy:()=>busy||isLoading()});', 'route controls');
    change('const cancel=()=>{foliagePreview.stop();', 'const cancel=()=>{railTools.cancel();foliagePreview.stop();', 'discard draft');
    change("if(e.button!==0||$('edit-tool').value==='inspect')return;e.stopImmediatePropagation();",
      "if(e.button!==0||$('edit-tool').value==='inspect')return;if(railTools.active())return railTools.press(e);e.stopImmediatePropagation();", 'press');
    change("if($('edit-tool').value==='inspect'||e.buttons===2||busy||isLoading())return;e.stopImmediatePropagation();",
      "if($('edit-tool').value==='inspect'||e.buttons===2||busy||isLoading())return;if(railTools.active())return railTools.move(e,point);e.stopImmediatePropagation();", 'hover');
    change('if(e.button!==0||!stroke)return;e.stopImmediatePropagation();',
      'if(railTools.active())return railTools.release(e,point);if(e.button!==0||!stroke)return;e.stopImmediatePropagation();', 'waypoint release');
    change("canvas.addEventListener('pointerleave',()=>{if(!stroke)cancel();});",
      "canvas.addEventListener('pointerleave',()=>{if(railTools.active())railTools.leave();else if(!stroke)cancel();});", 'leave hover');
    change('function controls(){wallTools.sync();roofTools.sync();', 'function controls(){railTools.sync();wallTools.sync();roofTools.sync();', 'active panel');
    change('if(!d)return;wallTools.sync();roofTools.sync();', 'if(!d)return;railTools.sync();wallTools.sync();roofTools.sync();', 'history state');
    change("if(e.key==='Escape'){cancel();e.preventDefault();}",
      "if(e.key==='Enter'&&e.target===canvas&&railTools.active()){railTools.commit();e.preventDefault();}else if(e.key==='Escape'){cancel();e.preventDefault();}", 'commit on canvas');
    change('async function rotateBoth(){if(busy||isLoading())return;',
      "async function rotateBoth(){if(busy||isLoading())return;if(railTools.active())return status('Railway heading follows the waypoints.');", 'automatic orientation');
    change('roofTools.applied(result);status(result.roofPreview?',
      "roofTools.applied(result);status(result.railwayTrainMessage?result.railwayTrainMessage:result.railwayPreview?.replaces?'Railway split placed. Undo removes the branch.':result.railwayPreview?'Railway route placed. Undo removes the whole route.':result.roofPreview?", 'placed message');
    change("const tool=s.type==='sloped-roof'?'erase-sloped-roof'",
      "if(s.type==='railway-route')return apply({tool:'erase-railway-route',start:{z:0},options:{id:s.data.id}});const tool=s.type==='sloped-roof'?'erase-sloped-roof'", 'delete selected route');
    // The frozen Send click and the API share the normal capability boundary.
    change(":'Valid map — ready to playtest.'", ":getDocument().map.railwayRoutes?'Valid map. Game handoff requires railway route support.':'Valid map — ready to playtest.'", 'validate railway map');
  }
  if (name.endsWith('/editor-workbench.js')) {
    change("['roofs','⌑','Roofs',['roof-tile','sloped-roof']]",
      "['railway','═','Railway',['railway-route']],['roofs','⌑','Roofs',['roof-tile','sloped-roof']]", 'Railway build group');
    change("showFor(['sloped-roof-options'],['sloped-roof']);",
      "showFor(['sloped-roof-options'],['sloped-roof']);showFor(['railway-options'],['railway-route']);", 'Railway options visibility');
  }
  if (name.endsWith('/editor-3d-library.js')) {
    text = importRefusal + text;
    for (const previous of ['roof-blocks.js', 'roof-rotation.js', 'roof-generator.js']) {
      change(`from '${core}${previous}'`, `from '${core}railway-map.js'`, previous + ' route refusal');
    }
    change("mapOnly();const n=seed(),layout=$('generation-layout').value;",
      "mapOnly();" + guard('getDocument().map', 'Map generation') + "const n=seed(),layout=$('generation-layout').value;", 'protect seeded generation');
    change('mapOnly();const rows=await listDesigns(),blocks=',
      'mapOnly();' + guard('getDocument().map', 'Connected map generation') + 'const rows=await listDesigns(),blocks=', 'protect connected generation');
  }
  if (name.endsWith('/editor-sector-save.js')) {
    text = importRefusal + text;
    change('  const transform=doc.map.sectorTemplate.transform;',
      "  try{" + guard('doc.map', 'Sector variant publishing') + "}catch(error){return status(error.message);}\n  const transform=doc.map.sectorTemplate.transform;", 'sector variant preflight');
    change('   const request={id:current.id,name,status:progress,map:JSON.parse(doc.export())};',
      '   ' + guard('doc.map', 'Sector variant publishing') + '\n   const request={id:current.id,name,status:progress,map:JSON.parse(doc.export())};', 'sector variant write boundary');
  }
  return text;
}
