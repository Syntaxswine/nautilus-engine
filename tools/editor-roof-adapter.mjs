// Guarded build adapters applied after the existing wall and prefab adapters.
// The byte-preserved donor editor is never edited in place.
export function adaptEditorRoofs(name,text,once) {
  const change=(needle,replacement,label)=>{text=once(text,needle,replacement,'sloped roofs: '+label);};
  const core='../../../../../packages/map-core/',app='../../../../../app/';
  if(name.endsWith('/editor-3d.js')) {
    change(`from '${core}prefab-document.js'`,`from '${core}roof-document.js'`,'roof-aware document');
    change(`from '${app}prefab-scene.js'`,`from '${app}roof-scene.js'`,'roof scene');
    // The root public facade may return an engine-owned document wrapper. Keep
    // this editor adapter composable without requiring that concrete class.
    change('text:new EditingDocument().open(text)','text:new EditingDocument().open(typeof text===\'string\'?text:text.export())','public document projection');
    for(const model of ['next','documentModel'])change('${'+model+'.map.buildingPrefabs?.instances.length||0} buildings','${'+model+'.map.buildingPrefabs?.instances.length||0} buildings · ${'+model+'.map.slopedRoofs?.roofs.length||0} sloped roofs',model+' roof count');
  }
  if(name.endsWith('/editor-3d-library.js')) {
    change(`from '${core}prefab-blocks.js'`,`from '${core}roof-blocks.js'`,'roof block preservation');
    change(`from '${core}prefab-rotation.js'`,`from '${core}roof-rotation.js'`,'roof rotation');
    change(`from '${core}prefab-generator.js'`,`from '${core}roof-generator.js'`,'roof generation');
  }
  if(name.endsWith('/editor-3d-tools.js')) {
    text=`import {installRoofTools} from '${app}roof-tools.js';\n`+text;
    change('const wallTools=installWallTools({panel,getDocument,getSelection,apply,scene,status,open,isLoading});',
      'const wallTools=installWallTools({panel,getDocument,getSelection,apply,scene,status,open,isLoading});\n const roofTools=installRoofTools({panel,getDocument,getSelection,apply,scene,status,isLoading});','roof tool installation');
    change('...prefabPlacementOptions(),foliageMode:','...prefabPlacementOptions(),...roofTools.options(),foliageMode:','roof settings');
    change("['foliage-cover','clear-foliage','wall','wall-run','door','erase-edge','break-wall'].includes","['foliage-cover','clear-foliage','wall','wall-run','sloped-roof','door','erase-edge','break-wall'].includes",'roof drag rectangle');
    change("status(r.ok?(r.wallRun?wallTools.describe(r)","status(r.ok?(r.roofPreview?roofTools.describe(r)+' · Release to place · Escape cancels':r.wallRun?wallTools.describe(r)",'roof preview description');
    change('sync();wallTools.applied(result);status(result.wallRun?',"sync();wallTools.applied(result);roofTools.applied(result);status(result.roofPreview?roofTools.describe(result)+' · placed.':result.wallRun?",'roof placement description');
    change('function controls(){wallTools.sync();','function controls(){wallTools.sync();roofTools.sync();','roof controls state');
    change('if(!d)return;wallTools.sync();','if(!d)return;wallTools.sync();roofTools.sync();','roof history state');
    change("const tool=s.type==='building'?'building-remove'","const tool=s.type==='sloped-roof'?'erase-sloped-roof':s.type==='building'?'building-remove'",'roof deletion');
    change("const s=getSelection();if(s?.type==='wall-run')","const s=getSelection();if(s?.type==='sloped-roof'){roofTools.useSelected();return;}if(s?.type==='wall-run')",'copy selected roof');
    change("if(tool==='building-prefab'){const select=", "if(tool==='sloped-roof'){roofTools.rotatePlacement();}else if(tool==='building-prefab'){const select=",'roof placement axis');
  }
  if(name.endsWith('/editor-workbench.js')) {
    change("['roofs','⌑','Roofs',['roof-tile']]","['roofs','⌑','Roofs',['roof-tile','sloped-roof']]",'roof modes');
    change("showFor(['wall-run-options'],['wall-run']);","showFor(['wall-run-options'],['wall-run']);showFor(['sloped-roof-options'],['sloped-roof']);",'roof options visibility');
  }
  return text;
}
