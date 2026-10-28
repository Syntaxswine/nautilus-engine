import {EditingDocument as Legacy} from './document.js';
import {validateMap} from './prefab-maps.js';
import {validateBlock,extractBlock,placeBlock} from './prefab-blocks.js';
import {prefabErrors,placeBuilding,removeBuilding,buildingAt,buildingCells,generateBuildingLayout,assertPrefabBlock} from '../prefab-core/index.js';

export class EditingDocument extends Legacy {
  open(text) {
    if(typeof text!=='string'||text.length>4*1024*1024)throw Error('Choose a map or block JSON file under 4 MB.');
    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));
    return super.open(text);
  }
  preview(command) {
    try {
      let result;
      if(command.tool==='building-prefab') {
        if(this.block)throw Error('Building prefabs belong to full maps.');
        if(command.start?.z!==0)throw Error('Place buildings on flat ground at layer 1.');
        const placed=placeBuilding(this.editor.map,{...command.options,x:command.start.x,y:command.start.y});
        result={ok:true,map:placed.map,cells:buildingCells(placed.instance),buildingPreview:placed.instance};
      } else if(command.tool==='building-remove') {
        const explicit=Object.hasOwn(command.options||{},'id');
        const instance=explicit?this.map.buildingPrefabs?.instances.find(p=>p.id===command.options.id):buildingAt(this.map,command.start?.x,command.start?.y);
        if(!instance)throw Error('Select a building prefab first.');
        result={ok:true,map:removeBuilding(this.editor.map,instance.id),cells:buildingCells(instance)};
      } else if(command.tool==='building-generate') {
        if(this.block)throw Error('Generate building layouts in a full map; reusable blocks cannot preserve prefabs.');
        const generated=generateBuildingLayout(this.editor.map,command.options);
        result={ok:true,map:generated.map,cells:generated.instances.flatMap(buildingCells)};
      } else result=super.preview(command);
      if(result.ok){const errors=prefabErrors(result.map);if(errors.length)return {...result,ok:false,error:errors[0]};}
      return result;
    } catch(error) {return {ok:false,error:error.message,cells:[]};}
  }
  replace(map) {if(this.block)assertPrefabBlock(map);const errors=prefabErrors(map);if(errors.length)throw Error(errors[0]);return super.replace(map);}
  inspect(x,y,z,options={}) {
    const base=super.inspect(x,y,z,options);if(!base)return null;
    const instance=buildingAt(this.map,base.x,base.y);
    if(instance&&['auto','prop',undefined].includes(options.mode))return {...base,type:'building',label:instance.asset.replaceAll('-',' '),data:instance,cells:buildingCells(instance)};
    return base;
  }
  rotate(selection) {
    if(selection?.type!=='building')return super.rotate(selection);
    try {const map=structuredClone(this.editor.map),instance=map.buildingPrefabs.instances.find(p=>p.id===selection.data.id);
      if(!instance)throw Error('This building no longer exists.');instance.turns=(instance.turns+1)%4;this.replace(map);return {ok:true};
    } catch(error){return {ok:false,error:error.message};}
  }
  capture(sx,sy) {if(this.block)return super.capture(sx,sy);return validateBlock(extractBlock(this.editor.map,sx,sy));}
  place(block,sx,sy) {if(this.block)throw Error('Place blocks in a full map.');this.replace(placeBlock(this.editor.map,block,sx,sy));}
  validate() {if(this.block)return super.validate();return validateMap(this.map);}
}
