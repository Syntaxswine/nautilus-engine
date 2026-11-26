// Original art dimensions, metres. Gameplay reach, damage and inventory are host-owned.
export const EQUIPMENT_SPECS = [
 {id:'knife',label:'Belt knife',family:'blade',length:.42,off:null,parts:['blade','guard','grip','pommel'],surfaces:{edge:[0,.24,0],tip:[0,.32,0]}},
 {id:'short-sword',label:'Leaf short sword',family:'blade',length:.79,off:null,parts:['blade','fuller','guard','grip','pommel'],surfaces:{edge:[.035,.43,0],tip:[0,.67,0]}},
 {id:'sword',label:'Arming sword',family:'blade',length:1.17,off:null,parts:['blade','fuller','guard','grip','pommel'],surfaces:{edge:[.037,.61,0],tip:[0,1.02,0]}},
 {id:'axe',label:'Bearded hand axe',family:'tool',length:.80,off:null,parts:['haft','eye','head','edge','grip'],surfaces:{edge:[.225,.58,0],poll:[-.075,.64,0]}},
 {id:'pick',label:'Two-handed war pick',family:'tool',length:1.17,off:[0,.30,0],parts:['haft','eye','pick','poll','grip'],surfaces:{tip:[-.40,.61,0],poll:[.24,.74,0]}},
 {id:'blacksmith-hammer',label:'Two-handed smith sledge',family:'tool',length:1.20,off:[0,.32,0],parts:['haft','eye','head','face.left','face.right','grip'],surfaces:{'face.left':[-.23,.73,0],'face.right':[.23,.73,0]}},
 {id:'mace',label:'Six-flanged mace',family:'tool',length:.79,off:null,parts:['shaft','flanges','collar','grip','pommel'],surfaces:{head:[0,.55,0]}},
 {id:'spear',label:'Ash spear',family:'polearm',length:2.25,off:[0,.42,0],parts:['haft','socket','blade','butt','grip'],surfaces:{tip:[0,1.40,0],butt:[0,-.85,0]}},
 {id:'halberd',label:'Hooked halberd',family:'polearm',length:2.36,off:[0,.44,0],parts:['haft','langets','axe','hook','spike','butt','grip'],surfaces:{tip:[0,1.46,0],edge:[.25,1.06,0],hook:[-.25,1.10,0]}},
 {id:'bow',label:'Ash recurve bow',family:'ranged',length:1.49,off:[0,.11,-.15],ranged:true,parts:['riser','grip','limb.upper','limb.lower','string.upper','string.lower','projectile','arrow-rest'],surfaces:{aim:[0,.11,.20]}},
 {id:'crossbow',label:'Steel-prod crossbow',family:'ranged',length:1.10,off:[0,.105,.32],ranged:true,parts:['stock','grip','prod','limb.left','limb.right','string.left','string.right','projectile','rail','trigger','stirrup'],surfaces:{aim:[0,.16,.70]}},
 {id:'round-wood-shield',label:'Planked round shield',family:'shield',length:.70,off:[0,0,0],finishes:['standard','teal'],parts:['planks','rim','boss','rivets','back-braces','grip'],surfaces:{face:[0,0,.19],back:[0,0,-.045]}},
 {id:'emblem-metal-shield',label:'Relief badge shield',family:'shield',length:.61,off:[0,0,0],finishes:['standard','red'],parts:['shell','rim','emblem','rivets','arm-pad','arm-strap','grip'],surfaces:{face:[0,.03,.165],back:[0,0,-.045]}},
 {id:'tower-shield',label:'Braced pavise shield',family:'shield',length:1.31,off:[0,0,0],parts:['boards','rim','spine','foot','back-braces','arm-pad','arm-strap','grip'],surfaces:{face:[0,.19,.18],back:[0,0,-.045]}},
 {id:'riot-shield',label:'Modern riot shield',family:'shield',length:1.18,off:[0,0,0],finishes:['standard','opaque'],parts:['panel','edge','view-band','bolts','arm-pad','arm-strap','grip'],surfaces:{face:[0,.14,.17],back:[0,0,-.045]}}
];
export function equipmentSpec(id){const spec=EQUIPMENT_SPECS.find(x=>x.id===id);if(!spec)throw new RangeError('EQUIPMENT_ID: unknown equipment '+String(id));return spec;}
export function equipmentFinish(spec,finish='standard'){if(!(spec.finishes||['standard']).includes(finish))throw new RangeError('EQUIPMENT_FINISH: unsupported '+String(finish)+' for '+spec.id);return finish;}
export function equipmentPose(spec,input={},previous={draw:0,loaded:false}){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype)throw new TypeError('EQUIPMENT_POSE: expected a plain pose object.');
 const fields=Object.keys(input);if(fields.some(k=>!['draw','loaded'].includes(k))||(!spec.ranged&&fields.length))throw new TypeError('EQUIPMENT_POSE: unsupported articulation for '+spec.id);
 if(Object.hasOwn(input,'draw')&&(!Number.isFinite(input.draw)||input.draw<0||input.draw>1))throw new RangeError('EQUIPMENT_DRAW: finite draw in 0..1 required.');
 if(Object.hasOwn(input,'loaded')&&typeof input.loaded!=='boolean')throw new TypeError('EQUIPMENT_LOADED: boolean loaded required.');
 return {draw:Object.hasOwn(input,'draw')?input.draw:previous.draw,loaded:Object.hasOwn(input,'loaded')?input.loaded:previous.loaded};
}
