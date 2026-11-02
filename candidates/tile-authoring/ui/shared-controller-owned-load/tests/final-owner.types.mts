import type {PairingAdapter,ProducerFinalReadOwner,ResourceReadObservation,ProducerReadObservation} from '../adapter.mjs';
declare const adapter:PairingAdapter;
const read=adapter.getSnapshot(),owner=adapter.resourceReadOwner;
if(owner){const observation=owner.capture(read);const same=owner.visit(observation,read,actual=>actual);same.overlay.chosenArtwork;
 // @ts-expect-error DTO fields cannot mint the private observation.
 const fake:ResourceReadObservation={ready:true};
 // @ts-expect-error Final observation is not a boolean readiness port.
 owner.visit(true,read,actual=>actual);
 // @ts-expect-error No explicit-source retag argument is accepted.
 owner.capture(read,{epoch:123});
 // @ts-expect-error Resource owner performs no Stage or Apply.
 owner.apply(read);
}
declare const source:ProducerFinalReadOwner<object,typeof read>,scope:object,sourceTicket:ProducerReadObservation;
source.visit(sourceTicket,scope,read,actual=>actual);
// @ts-expect-error Bridge and producer observations have separate identities.
source.visit({} as ResourceReadObservation,scope,read,actual=>actual);
