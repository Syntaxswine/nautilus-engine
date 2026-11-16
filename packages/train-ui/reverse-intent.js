import {COMPACT_NOTCHES} from './compact-model.js';

// Nautilus UI assistance, not a donor or Core rule. The host owns stopping,
// movement and eligibility; this local intent never survives a mount/checkpoint.
export function opposesTravel(snapshot,notch) {
  const direction=COMPACT_NOTCHES[notch]?.direction,train=snapshot?.train;
  if (!train || train.stopped || !direction || direction==='neutral') return false;
  const relative=train.signedSpeedMps*(snapshot.cabFacing||1);
  return direction==='reverse' ? relative>0 : relative<0;
}

export function createReverseIntent({schedule,readFresh,complete,invalidated=()=>{}}) {
  let pending=null,disposed=false;
  function cancel() {const had=!!pending;pending=null;return had;}
  function matches(intent,view) {
    const s=view?.snapshot,c=s?.train?.controls;
    return !!view?.active && view.owner===intent.owner && view.context===intent.context &&
      intent.owner.accepted && s?.mode==='driver' && s.actorId===intent.owner.actorId &&
      s.trainId===intent.owner.trainId && s.train?.stock==='steam' &&
      c?.leaseId===intent.owner.id && c.direction==='neutral' && c.power===0 && c.brake===1;
  }
  function invalidate(intent,reason,error) {
    if (pending!==intent) return;
    pending=null;invalidated(intent,reason,error);
  }
  function run(intent) {
    if (disposed || pending!==intent) return;
    let view;
    try {view=readFresh();}
    catch(error) {invalidate(intent,'read-failed',error);return;}
    if (disposed || pending!==intent) return;
    if (!matches(intent,view)) {invalidate(intent,'source-changed');return;}
    if (!view.snapshot.train.stopped) {intent.scheduled=false;return;}
    // Consume before dispatch: its post-commit notifications cannot schedule a
    // duplicate shift, and a refusal never starts an automatic retry loop.
    pending=null;
    try {complete(intent,view);}
    catch(error) {invalidated(intent,'completion-failed',error);}
  }
  function observe(view) {
    const intent=pending;if (!intent || disposed) return;
    if (!matches(intent,view)) {invalidate(intent,'source-changed');return;}
    if (view.snapshot.train.stopped && !intent.scheduled) {
      intent.scheduled=true;
      try {schedule(()=>run(intent));}
      catch(error) {invalidate(intent,'schedule-failed',error);}
    }
  }
  return Object.freeze({cancel,observe,
    arm({notch,owner,context,cue},view) {
      cancel();if (disposed || ![0,1,3].includes(notch)) return false;
      const intent={notch,owner,context,cue,scheduled:false};
      if (!matches(intent,view)) return false;
      pending=intent;observe(view);return true;
    },
    get notch() {return pending?.notch??null;},
    dispose() {disposed=true;cancel();}
  });
}
