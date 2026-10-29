// Adapted only from grenadeLob in the byte-preserved AFT 781246a... source.
// Source SHA-256 c6f39cef9fa6f3a501acc4d75e5e7c59a156e974909de4a613ea5e362083b595.
// See docs/reviews/2026-10-29-rock-distraction.sources.json for notices/exclusions.
// No rig release point, ammo, RNG, damage, fuse, floor conversion or world code.
export function lob(origin,target,gravity){
  const distance=Math.hypot(target.x-origin.x,target.y-origin.y),rise=Math.max(1.1+distance*.09,target.h-origin.h+.6),up=Math.sqrt(2*gravity*rise),time=(up+Math.sqrt(Math.max(0,up*up+2*gravity*(origin.h-target.h))))/gravity;
  return {velocity:{x:(target.x-origin.x)/time,y:(target.y-origin.y)/time,h:up},aimTime:time};
}
export function flightPoint(flight,seconds,gravity){return {x:flight.origin.x+flight.velocity.x*seconds,y:flight.origin.y+flight.velocity.y*seconds,h:flight.origin.h+flight.velocity.h*seconds-.5*gravity*seconds*seconds};}
export function positionAt(flight,seconds,gravity){
  if(!flight.settling)return flightPoint(flight,seconds,gravity);
  const {center,time}=flight.settling,elapsed=seconds-time;
  return {x:center.x,y:center.y,h:center.h-.5*gravity*elapsed*elapsed};
}
export const interpolate=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h:a.h+(b.h-a.h)*t});
