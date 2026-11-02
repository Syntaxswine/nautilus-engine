import {EditingDocument as Legacy} from './prefab-document.js';
import {assertRoofData,setRoofs,roofFootprint,roofAuthoringErrors,authoredRoofsOf as roofsOf} from './roof-data.js';
import {validateMap} from './roof-maps.js';
import {validateBlock,extractBlock,placeBlock} from './roof-blocks.js';
import {rotateRoof} from './roof-rotation.js';

export class EditingDocument extends Legacy {
  open(text) {
    if(typeof text!=='string'||text.length>4000000)throw Error('Choose a map or block JSON file under 4 MB.');
    const raw=JSON.parse(text);assertRoofData(raw,raw?.kind==='red-shift-block'?24:240);
    if(raw?.kind==='red-shift-block')validateBlock(raw);
    super.open(text);
    if(this.block){setRoofs(this.editor.map,roofsOf(raw),raw.slopedRoofs);this.refresh();this.changed=false;this.revision=0;}
    return this;
  }
  refresh() {
    super.refresh();
    if(this.block)for(const target of [this.map,this.original])setRoofs(target,roofsOf(this.editor.map),this.editor.map.slopedRoofs);
  }
  preview(command) {
    try {
      if(!['sloped-roof','erase-sloped-roof'].includes(command?.tool)) {
        const result=super.preview(command);if(result.ok)assertRoofData(result.map,this.size);return result;
      }
      const map=structuredClone(this.editor.map),options=command.options||{},current=roofsOf(map);
      let roof;
      if(command.tool==='erase-sloped-roof') {
        const id=options.id||command.start?.id;
        if(!current.some(r=>r.id===id))throw Error('Select a sloped roof first.');
        setRoofs(map,current.filter(r=>r.id!==id));
      } else {
        let id=options.id,next=1;
        if(id&&!current.some(r=>r.id===id))throw Error('The selected roof no longer exists.');
        if(!id){do{id='roof-'+next++;}while(current.some(r=>r.id===id));}
        const explicit=options.exact===true,start=command.start,end=command.end||start;
        const footprint=explicit?{x:options.x,y:options.y,width:options.width,depth:options.depth}:{
          x:Math.min(start?.x,end?.x),y:Math.min(start?.y,end?.y),
          width:Math.abs(end?.x-start?.x)+1,depth:Math.abs(end?.y-start?.y)+1};
        const previous=current.find(r=>r.id===id)||{};
        roof={...structuredClone(previous),id,...footprint,
          z:options.eaves??start?.z??previous.z,style:options.style??previous.style??'gable',axis:options.axis??previous.axis??'x',direction:options.direction??previous.direction??1,
          pitch:options.pitch??previous.pitch??30,overhang:options.overhang??previous.overhang??.25,material:options.material??previous.material??'slate',seed:options.seed??previous.seed??7};
        if(!Number.isInteger(roof.z)||roof.z<1||roof.z>5)throw Error('Choose an eaves layer from 1 to 5 (2.12–10.6 metres).');
        map.levels=Math.max(map.levels,roof.z+1);while(map.upper.length<map.levels-1)map.upper.push({});
        setRoofs(map,[...current.filter(r=>r.id!==id),roof]);
      }
      assertRoofData(map,this.size);
      const errors=validateMap(map,{connectivity:false});if(errors.length)throw Error(errors[0]);
      if(this.block)validateBlock(extractBlock(map));
      return {ok:true,map,cells:[],edges:[],...(roof?{roofPreview:structuredClone(roof)}:{})};
    } catch(error) {return {ok:false,error:error.message,cells:[],edges:[]};}
  }
  replace(map) {assertRoofData(map,this.size);if(this.block)validateBlock(extractBlock(map));return super.replace(map);}
  inspect(x,y,z=0,options={}) {
    if(options.roofs!==false&&['auto','prop',undefined].includes(options.mode)) {
      const roof=roofsOf(this.map).filter(r=>r.z===z).find(r=>{const b=roofFootprint(r);return x+.5>=b.x&&x+.5<=b.x+b.width&&y+.5>=b.y&&y+.5<=b.y+b.depth;});
      if(roof)return {x,y,z,type:'sloped-roof',label:`${roof.style} roof · ${roof.pitch}°`,data:structuredClone(roof),cells:[]};
    }
    return super.inspect(x,y,z,options);
  }
  rotate(selection) {
    if(selection?.type!=='sloped-roof')return super.rotate(selection);
    try {
      const map=structuredClone(this.editor.map),roof=roofsOf(map).find(r=>r.id===selection.data.id);
      if(!roof)throw Error('The selected roof no longer exists.');
      const rotated=rotateRoof(roof,roof.x+roof.width/2,roof.y+roof.depth/2);
      setRoofs(map,roofsOf(map).map(r=>r.id===roof.id?rotated:r));this.replace(map);return {ok:true};
    }catch(error){return {ok:false,error:error.message};}
  }
  capture(sx=0,sy=0) {if(this.block&&(sx!==0||sy!==0))throw Error('A reusable block has only one sector.');return validateBlock(extractBlock(this.editor.map,sx,sy));}
  place(block,sx,sy) {if(this.block)throw Error('Place blocks in a full map.');this.replace(placeBlock(this.editor.map,block,sx,sy));}
  validate() {if(!this.block)return validateMap(this.map);return [...super.validate(),...roofAuthoringErrors(this.original,24)];}
}
