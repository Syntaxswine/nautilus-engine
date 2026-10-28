// Browser-only inspection preview adapter. Public map/rules documents do not
// import cargo paint, geometry, textures or the renderer to discover these hints.
import {CARGO_FORMS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/painted-cargo.js';

export const PREVIEW_FOOTPRINTS=[{id:'truck',name:'Canvas truck',tiles:[2,3]},...CARGO_FORMS.map(({id,name,tiles})=>({id,name,tiles:[...tiles]}))];
