// Guarded adaptations of the pinned editor. Original vendor bytes stay intact.
export function adaptWallEditor(file, text, once) {
  const core = '../../../../../packages/map-core/', app = '../../../../../app/';
  if (file.endsWith('/editor-3d.js')) {
    text = once(text, "from './editor-3d-model.js'", `from '${app}inspection-visuals.js'`, 'browser-only inspection footprints');
    text = once(text, "from './editor-3d-controller.js'", `from '${core}document.js'`, 'Nautilus wall document');
    text = once(text, "from './editor-3d-scene.js'", `from '${app}wall-scene.js'`, 'Nautilus wall scene');
    for (const model of ['next', 'documentModel']) text = once(text, '${' + model + '.map.props.length} objects', '${' + model + '.map.props.length} objects · ${' + model + '.map.wallRuns?.segments.length||0} wall runs', model + ' wall count');
  }
  if (file.endsWith('/editor-3d-library.js')) {
    text = once(text, "from './core/blocks.js'", `from '${core}blocks.js'`, 'wall-aware block library');
    text = once(text, "from './scenery-block-rotation.js'", `from '${core}blocks.js'`, 'wall-aware block rotation');
    text = once(text, "from './editor-3d-generator.js'", `from '${core}generator.js'`, 'wall-aware generator');
  }
  if (file.endsWith('/editor-workbench.js')) {
    text = once(text, "['wall','door','break-wall']", "['wall','wall-run','door','break-wall']", 'angled wall mode');
    text = once(text, "showFor(['site-options']", "showFor(['wall-run-options'],['wall-run']);showFor(['site-options']", 'angled wall options visibility');
  }
  if (file.endsWith('/editor-3d-tools.js')) {
    text = once(text, "from './editor-3d-controller.js'", `from '${core}editing-document.js'`, 'plain-data brush picking');
    text = `import {installWallTools} from '${app}wall-tools.js';\n` + text;
    text = once(text, 'hoverPoint=null;', 'hoverPoint=null;\n const wallTools=installWallTools({panel,getDocument,getSelection,apply,scene,status,open,isLoading});', 'install angled wall tools');
    text = once(text, 'const options=()=>({foliageMode:', 'const options=()=>({...wallTools.options(),foliageMode:', 'wall brush settings');
    text = once(text, 'return p&&brushPoint(p);', "return p&&($('edit-tool').value==='wall-run'?wallTools.point(p):brushPoint(p));", 'retain fractional wall endpoints');
    text = once(text, "['foliage-cover','clear-foliage','wall','door','erase-edge','break-wall'].includes", "['foliage-cover','clear-foliage','wall','wall-run','door','erase-edge','break-wall'].includes", 'wall drag endpoint');
    text = once(text, "status(r.ok?(r.cells.length+' tiles · Release to place · Escape cancels'):r.error)", "status(r.ok?(r.wallRun?wallTools.describe(r)+' · Release to place · Escape cancels':r.cells.length+' tiles · Release to place · Escape cancels'):r.error)", 'measured wall preview');
    text = once(text, "await changed();sync();status('Edit applied.');", "await changed();sync();wallTools.applied(result);status(result.wallRun?wallTools.describe(result)+' · placed.':'Edit applied.');", 'retain the last drawn endpoints');
    text = once(text, 'function controls(){rampControls();', 'function controls(){wallTools.sync();rampControls();', 'wall tool state');
    text = once(text, "const tool=s.type==='prop'?'erase-prop'", "const tool=s.type==='wall-run'?'erase-wall-run':s.type==='prop'?'erase-prop'", 'delete wall selection');
    text = once(text, 'z:s.z,edge:s.edge},options:{}', 'z:s.z,edge:s.edge,id:s.data?.id},options:{}', 'selected wall identity');
    text = once(text, "const s=getSelection();if(s?.type==='tile'", "const s=getSelection();if(s?.type==='wall-run'){wallTools.useSelected();return;}if(s?.type==='tile'", 'copy selected wall settings');
    text = once(text, 'function sync(){const d=getDocument();if(!d)return;', 'function sync(){const d=getDocument();if(!d)return;wallTools.sync();', 'wall history and workspace refresh');
    text = once(text,
      "$('playtest').onclick=()=>{try{if(busy||isLoading())return status('Wait for the current operation to finish.');if(getDocument().block)return status('Place the block in a full map to playtest.');if(validate().length)return;launchPlaytest(getDocument().export());status('Playtest opened. Your blueprint and undo history stay here.');}catch(e){status(e.message);}};",
      `$('playtest').onclick=async()=>{
        if(busy||isLoading())return status('Wait for the current operation to finish.');
        try {
          if(getDocument().block)return status('Place the block in a full map to send it to a game.');
          if(validate().length)return;
          busy=true;status('Sending map to the connected game…');
          await launchPlaytest(getDocument().export());
          status('Map sent to the connected game. Your blueprint and undo history stay here.');
        } catch(e) {status(e.message);} finally {busy=false;}
      };`, 'await game handoff result');
  }
  return text;
}
