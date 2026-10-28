// Build-only adaptations. Original donor files remain byte-preserved in vendor/.
export function adaptEditorPrefabs(name,text,once) {
  const change=(needle,replacement,label)=>{text=once(text,needle,replacement,'building prefabs: '+label);};
  if(name.endsWith('/editor-3d-scene.js')) {
    text="import {createInspectionRenderer} from '../../../../../app/inspection-renderer.js';\n"+text;
    change('new T.WebGLRenderer({canvas,antialias:true})','createInspectionRenderer(T,canvas)','renderer allocation fallback');
  }
  if(name.endsWith('/editor-3d.js')) {
    change("import {EditingDocument} from '../../../../../packages/map-core/document.js';","import {EditingDocument} from '../../../../../packages/map-core/prefab-document.js';",'public editing controller');
    change("import {InspectionScene} from '../../../../../app/wall-scene.js';","import {InspectionScene} from '../../../../../app/prefab-scene.js';",'shared scene layer');
    change('function render(){if(','function render(){try{if(','scene failure reporting');
    change('spotlightMenu?.draw();requestAnimationFrame(render);}','spotlightMenu?.draw();}catch(error){status("Scene render failed: "+error.message);throw error;}requestAnimationFrame(render);}','scene failure description');
    text=text.replaceAll("${next.map.canopies?.length||0} decorative roofs","${next.map.canopies?.length||0} decorative roofs · ${next.map.buildingPrefabs?.instances.length||0} buildings")
      .replaceAll("${documentModel.map.canopies?.length||0} decorative roofs","${documentModel.map.canopies?.length||0} decorative roofs · ${documentModel.map.buildingPrefabs?.instances.length||0} buildings");
  }
  if(name.endsWith('/editor-3d-library.js')) {
    change("import {rotateSceneryBlock} from '../../../../../packages/map-core/blocks.js'","import {rotateSceneryBlock} from '../../../../../packages/map-core/prefab-rotation.js'",'block rotation safety');
    change("from '../../../../../packages/map-core/blocks.js'","from '../../../../../packages/map-core/prefab-blocks.js'",'block safety');
    change("from '../../../../../packages/map-core/generator.js'","from '../../../../../packages/map-core/prefab-generator.js'",'generation safety');
  }
  if(name.endsWith('/editor-3d-tools.js')) {
    text="import {prefabPlacementOptions} from '../../../../../app/prefab-tools.js';\n"+text;
    change("['prefab','Preset structure']","['prefab','Preset structure'],['building-prefab','Building prefab']",'placement tool');
    change('const options=()=>({...wallTools.options(),foliageMode:','const options=()=>({...wallTools.options(),...prefabPlacementOptions(),foliageMode:','placement settings');
    change("const tool=s.type==='wall-run'?'erase-wall-run':s.type==='prop'?'erase-prop'","const tool=s.type==='building'?'building-remove':s.type==='wall-run'?'erase-wall-run':s.type==='prop'?'erase-prop'",'delete selection');
    change("if(s?.type==='tile'&&s.cells?.some", "if(s?.type==='building'){$('building-asset').value=s.data.asset;$('building-turns').value=s.data.turns;$('building-clearance').value=s.data.clearance;$('edit-tool').value='building-prefab';$('edit-tool').dispatchEvent(new Event('change'));}else if(s?.type==='tile'&&s.cells?.some",'copy selected building');
    change("if(tool==='land'){note=","if(tool==='building-prefab'){const select=$('building-turns');select.value=(Number(select.value)+1)%4;}else if(tool==='land'){note=",'quarter turns');
    change("if(e.target.closest?.('input,textarea,select')","if(e.defaultPrevented||e.target.closest?.('input,textarea,select')",'honour cancelled key actions');
    change("'Valid map — ready to playtest.'","getDocument().map.buildingPrefabs?.instances.length?'Valid building layout — game adapter support required.':'Valid map — ready to playtest.'",'validation description');
  }
  if(name.endsWith('/editor-workbench.js')) {
    change("['room','prefab']","['room','prefab','building-prefab']",'structures group');
    change("preset.hidden=group!=='structures';","preset.hidden=group!=='structures'||tool==='building-prefab';",'legacy preset visibility');
    change("group==='structures'?'Stamp a small structure.","tool==='building-prefab'?'Place a complete building on clear ground. Open Building library for interiors, sources and seeded layouts.':group==='structures'?'Stamp a small structure.",'tool description');
  }
  return text;
}
