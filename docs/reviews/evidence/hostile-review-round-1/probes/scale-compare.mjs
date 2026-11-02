const A='../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-geometry.js';
const B='../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
const scale=m=>{const n=m.roomBoxes({doorClosed:true,roof:true}),g=k=>n.find(p=>p.name===k);return {wallHeight:m.WALL_HEIGHT,tile:g('Left pier').size[0],wallThickness:g('Left pier').size[2],slab:g('Roof').size[1],door:g('Closed door').size,parts:n.length,names:n.map(p=>p.name).join(',')};};
const a=await import(A),b=await import(B);
console.log(JSON.stringify({aft781246a:scale(a),farmyardCopyInTinderboxPrefabs:scale(b)},null,1));
