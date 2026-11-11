import {mountTrainControls} from '../index.js';
import type {TrainConnector} from '../../train-core/index.js';
declare const session:TrainConnector, slot:HTMLElement, walking:HTMLElement;
const ui=mountTrainControls(slot,{session,actorId:'player',walkingElement:walking,setWalkingEnabled(enabled:boolean){void enabled;}});
ui.setBlocked(true);ui.releaseInput('modal');ui.setActor('next-player');ui.setMuted(true);const muted:boolean=ui.state.feedback.muted;void muted;ui.dispose();
const compact=mountTrainControls(slot,{session,actorId:'player',walkingElement:walking,setWalkingEnabled(){},steamProfile:'compact-notched'});
const notch:0|1|2|3|null=compact.state.notch;void notch;compact.dispose();
// @ts-expect-error Opt-in profile names are explicit; arbitrary game strings are not profiles.
mountTrainControls(slot,{session,actorId:'player',walkingElement:walking,setWalkingEnabled(){},steamProfile:'automatic'});
// @ts-expect-error Confirmed notch presentation cannot grant or mutate authority.
compact.state.notch=0;
// @ts-expect-error The connector supplies authoritative snapshots, not an actor DTO.
mountTrainControls(slot,{session:{mode:'driver'},actorId:'player',walkingElement:walking,setWalkingEnabled(){}});
// @ts-expect-error Borrowed walking input needs an explicit disabling callback.
mountTrainControls(slot,{session,actorId:'player',walkingElement:walking});
// @ts-expect-error A requested direction is not confirmed, mutable gameplay state.
ui.state.requestedDirection='reverse';
// @ts-expect-error UI owns no simulation clock.
ui.advance(1);
// @ts-expect-error UI cannot save or grant occupancy.
ui.enterTrain('train/steam');
