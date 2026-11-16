import assert from 'node:assert/strict';
// Shared observed-outcome check, also applied to an acknowledged-but-unmoved
// fault fixture. A successful button receipt cannot satisfy this workflow.
export function requireVehicleMotion(before,after,{direction=1,minimumM=.05}={}){
 assert.equal(after.mode,'driver','Workflow requires confirmed driver occupancy.');assert.equal(after.vehicle.id,before.vehicle.id);assert.ok(after.vehicle.revision>before.vehicle.revision,'Acknowledged control did not advance the authoritative vehicle revision.');
 const dx=after.vehicle.position.x-before.vehicle.position.x,dy=after.vehicle.position.y-before.vehicle.position.y,along=dx*Math.sin(before.vehicle.headingRad)+dy*Math.cos(before.vehicle.headingRad);
 assert.ok(along*direction>minimumM,'Acknowledged control did not move the authoritative vehicle in the requested signed direction.');assert.equal(Math.sign(after.vehicle.speedMps),direction);return {distanceM:Math.hypot(dx,dy),alongM:along,speedMps:after.vehicle.speedMps};
}
