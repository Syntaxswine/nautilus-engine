export const layeredStudy=()=>({name:'Water channel, bank, elevated bridge and kerb',bounds:[0,0,16,12],layers:[
 {id:'water',surface:'water',base:'grass',top:-.04,bottom:-.10,recipe:{kind:'bezier',points:[[5,-2],[1,5],[14,5],[10,14]],width:2.5}},
 {id:'bank',surface:'bank',base:'grass',top:.15,bottom:0,drawBase:false,recipe:{kind:'difference',shapes:[{kind:'bezier',points:[[5,-2],[1,5],[14,5],[10,14]],width:3.2},{kind:'bezier',points:[[5,-2],[1,5],[14,5],[10,14]],width:2.5}]}},
 {id:'bridge-deck',surface:'paving',base:'grass',top:2.12,bottom:1.92,drawBase:false,recipe:{kind:'stroke',points:[[-2,6],[18,6]],width:2.2}},
 {id:'bridge-kerb',surface:'stone',base:'grass',top:2.35,bottom:2.12,drawBase:false,recipe:{kind:'difference',shapes:[{kind:'stroke',points:[[-2,6],[18,6]],width:2.7},{kind:'stroke',points:[[-2,6],[18,6]],width:2.2}]}}
],qualification:'Visual stacked study only. Core must validate typed crossings, clearance, supports and floor bindings before gameplay.'});
