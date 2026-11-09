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

const sceneryFiles = ['scenery-catalog.js', 'scenery-scene.js'];
const alias = file => 'nautilus-city-' + file;

export function cityWorkshopScenery(path, text, once) {
  const file = sceneryFiles.find(name => path === 'dist/tactics/' + name);
  if (!file) return null;
  return {path: 'dist/tactics/' + alias(file), text: adaptCityProps(path, text, once)};
}

export function cityWorkshopImportMap() {
  const imports = Object.fromEntries(sceneryFiles.map(file => ['./' + file, './' + alias(file)]));
  return '<script type="importmap">' + JSON.stringify({imports}) + '</script>';
}

// Replay the exact Workshop additions on the independently verified build preimage.
const importLine = "import {cityWorkshopScenery, cityWorkshopImportMap} from './editor-city-props.mjs';";
const sceneryCopies = `      if (donor === 'aft') {
        const city = cityWorkshopScenery(entry.path,text,once);
        if (city) {
          const target = folder + '/' + city.path, bytes = Buffer.from(city.text);
          write(target, bytes);
          patches.push({path:target, sourcePath:folder + '/' + entry.path, sourceSha256:entry.sha256, builtSha256:createHash('sha256').update(bytes).digest('hex')});
        }
      }`;
export function cityWorkshopBuildSource(text, once) {
  const roofImport = "import {adaptEditorRoofs} from './editor-roof-adapter.mjs';";
  const roofs = "      if (donor === 'aft') text = adaptEditorRoofs(entry.path,text,once);";
  const buildings = "fs.cpSync(path.join(root, 'assets/buildings'), path.join(output, 'assets/buildings'), {recursive: true});";
  const base = "html = once(html, '<head>', '<head><base href=\"./' + base + '\">', 'document base');";
  const insertions = [
    [roofImport, roofImport + '\n' + importLine],
    [roofs, roofs + '\n' + sceneryCopies],
    [buildings, buildings + "\nfs.cpSync(path.join(root, 'assets/city-props'), path.join(output, 'assets/city-props'), {recursive: true});"],
    [base, base.replace(", 'document base'", " + cityWorkshopImportMap(), 'document base'")],
    ['const assets = editorAssets();', 'const assets = editorAssets({includeCityProps: true});']
  ];
  for (const [before, after] of insertions) text = once(text, before, after);
  return text;
}
