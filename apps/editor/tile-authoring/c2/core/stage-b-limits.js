import {fail} from './data.js';
export function documentLimits(d,b){
 if(d.tileBundle.layout.instances.length>b.limits.owners||d.tileBundle.recipes.length>b.limits.mapRecipes)fail('REFERENCE_MAP_LIMIT','/limits','All source owners/recipes, including unused records, count against effective limits.');
 for(const k of ['definitions','presets','artwork']){b.take();if(d.authoring.library[k].length>b.limits[k])fail('CONTENT_LIMIT','/limits/'+k,'All retained immutable source versions count.');}
}
