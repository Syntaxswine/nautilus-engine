/** One confirmed input owner. Mixed transports require explicit identity.
 * Legacy train-only scenes retain their existing connector compatibility path.
 */
export function resolveTransportOwner(scene,{train=null,vehicle=null}={}){
 const selected=[['train',train],['road-vehicle',vehicle]].filter(([,s])=>s),claims=selected.filter(([,s])=>s.mode!=='on-foot');
 if(scene.mode==='on-foot'){if(claims.length)throw Error('TRANSPORT_OCCUPANCY_CONFLICT: scene and connectors disagree.');return null;}
 if(claims.length!==1)throw Error('TRANSPORT_OCCUPANCY_CONFLICT: exactly one connector must confirm occupancy.');
 const [kind,s]=claims[0];if(s.actorId!==scene.actorId||s.mode!==scene.mode)throw Error('TRANSPORT_OCCUPANCY_CONFLICT: actor/mode mismatch.');
 const identity=scene.transport;
 if(!identity){if(kind==='train'&&selected.length===1)return 'train';throw Error('TRANSPORT_IDENTITY_REQUIRED: bind the confirmed occupied connector.');}
 if(identity.kind!==kind||identity.connectorId!==(kind==='road-vehicle'?s.connectorId:(s.connectorId||'train'))||identity.vehicleId!==(kind==='road-vehicle'?s.vehicleId:s.trainId))throw Error('TRANSPORT_OCCUPANCY_CONFLICT: occupied connector identity differs.');
 return kind;
}
