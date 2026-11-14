// Neutral atmospheric surface layer. Heights are metres above the ground plane y=0.
export const VON_KARMAN=0.41;
export const REFERENCE_HEIGHT=10;
// Davenport's roughness classes as updated by Wieringa (1992); z0 is the aerodynamic roughness length in metres.
export const TERRAIN=Object.freeze({
  open:Object.freeze({z0:.03,label:'Open: flat grass, few obstacles'}),
  'roughly-open':Object.freeze({z0:.1,label:'Roughly open: low crops, occasional obstacles'}),
  rough:Object.freeze({z0:.25,label:'Rough: high crops, scattered obstacles'}),
  'very-rough':Object.freeze({z0:.5,label:'Very rough: orchards, bushes, scattered buildings'}),
  closed:Object.freeze({z0:1,label:'Closed: regular large obstacles, suburbs, forest'})
});
export function terrainRoughness(terrain){const t=TERRAIN[terrain];if(!t)throw Error('Unknown terrain class: '+terrain);return t.z0;}
function checkProfile(speed,z0,zRef){if(!(speed>=0&&speed<=80))throw Error('Wind speed must be 0 to 80 m/s.');if(!(z0>0&&z0<=5))throw Error('Roughness length z0 must be in (0, 5] m.');if(!(zRef>z0))throw Error('The reference height must exceed z0.');}
// u* from the speed measured at zRef: U(z) = (u*/kappa) ln((z+z0)/z0). The +z0 keeps U(0)=0.
export function frictionVelocity(speed,z0,zRef=REFERENCE_HEIGHT){checkProfile(speed,z0,zRef);return VON_KARMAN*speed/Math.log((zRef+z0)/z0);}
export function profileSpeed(y,speed,z0,zRef=REFERENCE_HEIGHT){checkProfile(speed,z0,zRef);return y<=0?0:speed*Math.log((y+z0)/z0)/Math.log((zRef+z0)/z0);}
// Meteorological bearing: the direction the wind blows FROM, clockwise from north.
// North is -z and east is +x, as in the tile edges. Returns the [x, z] direction the air moves.
export function windDirection(fromDeg){
  if(!Number.isFinite(fromDeg))throw Error('Wind bearing must be finite.');
  const a=((fromDeg%360)+360)%360*Math.PI/180,snap=v=>Math.abs(v)<1e-12?0:v;
  return[snap(-Math.sin(a)),snap(Math.cos(a))];
}
export function bearingName(fromDeg){const names=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];return names[Math.round((((fromDeg%360)+360)%360)/22.5)%16];}
