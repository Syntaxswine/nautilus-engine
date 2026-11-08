// The pinned donor files stay unchanged. Only the built Workshop's scenery copy is extended.
export function adaptCityProps(name, text, once) {
  const prefix = '../../../../../packages/city-props/';
  if (name.endsWith('/scenery-catalog.js')) {
    text = "import {CITY_SCENERY} from '" + prefix + "index.js';\n" + text;
    return once(text, 'export const SCENERY_PROPS=Object.freeze({',
      'export const SCENERY_PROPS=Object.freeze({\n ...CITY_SCENERY,', '1880s Workshop prop catalogue');
  }
  if (name.endsWith('/scenery-scene.js')) {
    text = "import {createCityPropLibrary,CITY_PAINT_URL} from '" + prefix + "three.js';\n" + text;
    text = once(text, "const paths=family==='helicopter'?", "const paths=family==='city1880'?[CITY_PAINT_URL]:family==='helicopter'?", '1880s paint loader');
    text = once(text, "const library=family==='chair'?", "const library=family==='city1880'?createCityPropLibrary(T,textures[0]):family==='chair'?", '1880s scenery library');
    return once(text, 'gameplayIntegrated:true', "gameplayIntegrated:family!=='city1880'", '1880s visual-only scenery marker');
  }
  return text;
}

// Replay the four exact Workshop additions on the independently verified build preimage.
export function cityWorkshopBuildSource(text, once) {
  const insertions = [
    ["import {adaptEditorRoofs} from './editor-roof-adapter.mjs';",
      "import {adaptEditorRoofs} from './editor-roof-adapter.mjs';\nimport {adaptCityProps} from './editor-city-props.mjs';"],
    ["      if (donor === 'aft') text = adaptEditorRoofs(entry.path,text,once);",
      "      if (donor === 'aft') text = adaptEditorRoofs(entry.path,text,once);\n      if (donor === 'aft') text = adaptCityProps(entry.path,text,once);"],
    ["fs.cpSync(path.join(root, 'assets/buildings'), path.join(output, 'assets/buildings'), {recursive: true});",
      "fs.cpSync(path.join(root, 'assets/buildings'), path.join(output, 'assets/buildings'), {recursive: true});\nfs.cpSync(path.join(root, 'assets/city-props'), path.join(output, 'assets/city-props'), {recursive: true});"],
    ['const assets = editorAssets();', 'const assets = editorAssets({includeCityProps: true});']
  ];
  for (const [before, after] of insertions) text = once(text, before, after);
  return text;
}
