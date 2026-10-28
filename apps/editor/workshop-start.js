// Use the complete native 3D editor when available. The plan presentation uses
// the same EditingDocument/brushes/storage in browsers without WebGL2.
const canvas=document.getElementById('scene');
let context;try{context=canvas.getContext('webgl2',{antialias:true});}catch{context=null;}
if(context){await import('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d.js');await import('./editor.js');}
else{await import('./plan-workshop.js');}
