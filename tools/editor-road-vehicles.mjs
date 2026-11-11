// Scenery aliases are selected only by the built Map Workshop document.
export function adaptRoadVehicles(file, text, once) {
  const root = '../../../../../packages/vehicle-visuals/';
  if (file.endsWith('/scenery-catalog.js')) {
    text = "import {ROAD_VEHICLE_SCENERY} from '" + root + "catalogue.js';\n" + text;
    return once(text, 'export const SCENERY_PROPS=Object.freeze({',
      'export const SCENERY_PROPS=Object.freeze({\n ...ROAD_VEHICLE_SCENERY,', 'Road vehicle scenery catalogue');
  }
  if (file.endsWith('/scenery-scene.js')) {
    text = "import {createRoadVehicleKit} from '" + root + "three.js';\n" + text;
    const anchor = "  const paths=family==='helicopter'?";
    const loaded = "  if(family==='road-vehicle'){const pending=Promise.resolve().then(()=>{if(this.disposed)return;const library=createRoadVehicleKit(T);this.loaded.set(family,{library});this.preview(this.previewProp);this.onReady();}).catch(error=>{if(!this.disposed)this.onError(error);});this.pending.set(family,pending);return;}\n";
    text = once(text, anchor, loaded + anchor, 'Shared road vehicle library');
    return once(text, 'gameplayIntegrated:true', "gameplayIntegrated:family!=='road-vehicle'", 'Road vehicle host binding');
  }
  return text;
}
const scenery = ['scenery-catalog.js', 'scenery-scene.js'];
const alias = file => 'nautilus-vehicles-' + file;
export function roadVehicleSceneryCopy(file, text, once) {
  const name = scenery.find(name => file === 'dist/tactics/' + name);
  return name ? {path: 'dist/tactics/' + alias(name), text: adaptRoadVehicles(file, text, once)} : null;
}
export function roadVehicleImportMap() {
  return '<script type="importmap">' + JSON.stringify({imports:
    Object.fromEntries(scenery.map(file => ['./' + file, './' + alias(file)]))}) + '</script>';
}
export function roadVehicleBuildSource(text, once) {
  const roofImport = "import {adaptEditorRoofs} from './editor-roof-adapter.mjs';";
  text = once(text, roofImport, roofImport +
    "\nimport {roadVehicleSceneryCopy, roadVehicleImportMap} from './editor-road-vehicles.mjs';", 'Road vehicle build import');
  const roofs = "      if (donor === 'aft') text = adaptEditorRoofs(entry.path,text,once);";
  const copies = [
    "      if (donor === 'aft') {",
    "        const vehicle = roadVehicleSceneryCopy(entry.path,text,once);",
    "        if (vehicle) {",
    "          const target = folder + '/' + vehicle.path, bytes = Buffer.from(vehicle.text);",
    "          write(target, bytes);",
    "          patches.push({path:target, sourcePath:folder + '/' + entry.path, sourceSha256:entry.sha256,",
    "            builtSha256:createHash('sha256').update(bytes).digest('hex')});",
    "        }",
    "      }"
  ].join('\n');
  text = once(text, roofs, roofs + '\n' + copies, 'Road vehicle Workshop scenery copies');
  const base = "html = once(html, '<head>', '<head><base href=\"./' + base + '\">', 'document base');";
  text = once(text, base, base.replace(", 'document base'", " + roadVehicleImportMap(), 'document base'"), 'Road vehicle import map');
  return once(text, 'const assets = editorAssets();', 'const assets = editorAssets({includeRoadVehicles: true});', 'Road vehicle editor entries');
}