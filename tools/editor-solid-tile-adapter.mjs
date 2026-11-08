// The ordinary workshop keeps the pinned AFT bytes intact. These exact build
// seams add the native solid brush to the Land group and its shared swatches.
export function adaptEditorSolidTiles(name, text, once) {
  const change = (needle, replacement, label) => { text = once(text, needle, replacement, 'solid ground tiles: ' + label); };
  const core = '../../../../../packages/map-core/', app = '../../../../../app/';
  if (name.endsWith('/editor-3d.js')) {
    change(`from '${core}roof-document.js'`, `from '${core}solid-tile-document.js'`, 'document');
    change(`from '${app}roof-scene.js'`, `from '${app}solid-tile-scene.js'`, 'scene');
    change('function inspect(x,y){const p=scene.pick(x,y,canvas.clientWidth,canvas.clientHeight);',
      'function inspect(x,y){const p=scene.pickSolidTile(x,y,canvas.clientWidth,canvas.clientHeight)||scene.pick(x,y,canvas.clientWidth,canvas.clientHeight);', 'raised tile inspection');
  }
  if (name.endsWith('/editor-3d-library.js')) {
    for (const module of ['roof-blocks', 'roof-rotation', 'roof-generator']) {
      change(`from '${core}${module}.js'`, `from '${core}solid-tile-document.js'`, 'library ' + module);
    }
  }
  if (name.endsWith('/sector-variant.js')) {
    const start = "export function prepareVariant(entry,{id,name,status='in-progress',map}){";
    change(start, start + "\n if(map?.solidTiles!==undefined)throw Error('Sector presets do not support solid ground tiles yet. Use a named design or export your map as Nautilus JSON.');", 'explicit sector variant refusal');
  }
  if (name.endsWith('/editor-3d-tools.js')) {
    text = `import {installSolidTileTools} from '${app}solid-tile-tools.js';\n` + text;
    change('const roofTools=installRoofTools({panel,getDocument,getSelection,apply,scene,status,isLoading});',
      'const roofTools=installRoofTools({panel,getDocument,getSelection,apply,scene,status,isLoading});\n const solidTools=installSolidTileTools(panel);', 'height options');
    change("groundKind:$('ground-kind').value,", "groundKind:$('ground-kind').value,...($('edit-tool').value==='solid-block'?{solidSteps:solidTools.steps()}:{}),", 'active brush height');
    change("const point=e=>{const b=canvas.getBoundingClientRect(),p=(", "const point=e=>{const b=canvas.getBoundingClientRect(),p=(['solid-block','erase-solid-block'].includes($('edit-tool').value)&&scene.pickSolidTile(e.clientX-b.left,e.clientY-b.top,b.width,b.height))||(", 'pick the visible raised tile');
    change("['foliage-cover','clear-foliage','wall','wall-run','sloped-roof','door','erase-edge','break-wall'].includes",
      "['solid-block','erase-solid-block','foliage-cover','clear-foliage','wall','wall-run','sloped-roof','door','erase-edge','break-wall'].includes", 'rectangle drag');
    change("['ground-kind',['texture','land'].includes(tool)]", "['ground-kind',['texture','land','solid-block'].includes(tool)]", 'ground selector');
    change("const tool=s.type==='sloped-roof'?", "const tool=s.type==='solid-block'?'erase-solid-block':s.type==='sloped-roof'?", 'selected tile removal');
    change("const s=getSelection();if(s?.type==='sloped-roof')", "const s=getSelection();if(s?.type==='solid-block'){solidTools.useSelected(s);return;}if(s?.type==='sloped-roof')", 'copy tile settings');
    change("tool==='texture'&&diagonalRoad", "['texture','solid-block'].includes(tool)&&diagonalRoad", 'rotate a road skin before placement');
  }
  if (name.endsWith('/editor-workbench.js')) {
    change("['land','▲','Land',['land']]", "['land','▲','Land',['land','solid-block','erase-solid-block']]", 'Land modes');
    change("showFor(['land-options'],['land']);showFor(['ground-kind'],['texture','land']);",
      "showFor(['land-options'],['land']);showFor(['solid-steps'],['solid-block']);showFor(['ground-kind'],['texture','land','solid-block']);", 'show height and existing skins');
    change("head.insertBefore($('land-options'),gallery);", "head.insertBefore($('land-options'),gallery);head.insertBefore($('solid-steps').closest('label'),gallery);", 'height before swatches');
    // Swatch visibility, entries, pressed state, and click binding use the same palette.
    text = text.replaceAll("['texture','land','floor','water','bridge']", "['texture','land','solid-block','floor','water','bridge']");
    text = text.replaceAll("['texture','land'].includes(tool)", "['texture','land','solid-block'].includes(tool)");
    change("textContent=hedge?'Click or drag to plant joined hedges.", "textContent=tool==='solid-block'?'Choose a height and a ground skin. Click or drag on the ground layer to place or repaint blocks.':tool==='erase-solid-block'?'Click or drag to remove solid blocks and reveal the original ground.':hedge?'Click or drag to plant joined hedges.", 'brush instructions');
  }
  return text;
}
