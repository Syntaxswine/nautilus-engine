import {compactDetent} from './compact-model.js';

// Pointer drag ends independently of the latched connector lease. The shared
// owner still retires that exact lease on every safety/context cancellation.
export function bindCompactLever({win,node,listen,active,blocked,notch,stamp,select,release}) {
  let drag = null;
  function cancel() {
    const prior = drag;drag = null;
    if (!prior) return false;
    try { node.releasePointerCapture(prior.id); } catch {}
    return true;
  }
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!active() || blocked() || drag.context !== stamp()) { release('notch-context');return; }
    if (event.pointerType !== 'touch' && event.buttons === 0) { release('notch-buttons-released');return; }
    const position = (event.clientY-drag.rect.top-16)/(drag.rect.height-32)*3;
    const next = compactDetent(position,drag.detent);
    // Track attempted detents separately from the confirmed grip. Pending or
    // denied direction requests never resend from stationary finger jitter.
    drag.detent = next;
    if (next !== drag.attempt) { drag.attempt = next;select(next,event); }
  }
  listen(node,'pointerdown',event => {
    if (event.button !== 0 || !active() || blocked() || drag) return;
    const rect = node.getBoundingClientRect();if (rect.height <= 32) return;
    event.preventDefault();node.focus({preventScroll:true});
    drag = {id:event.pointerId,context:stamp(),rect,detent:notch(),attempt:null};
    try { node.setPointerCapture(event.pointerId); } catch {}
    move(event);
  });
  listen(win,'pointermove',move,{capture:true});
  listen(win,'pointerup',event => { if (drag?.id === event.pointerId) cancel(); },{capture:true});
  listen(win,'pointercancel',event => { if (drag?.id === event.pointerId) release('notch-pointer-cancel'); },{capture:true});
  listen(node,'lostpointercapture',event => { if (drag?.id === event.pointerId) release('notch-capture-lost'); });
  listen(node,'keydown',event => {
    if (!active() || blocked() || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();if (event.repeat) return;
    const next = event.key === 'Home' ? 3 : event.key === 'End' ? 0 : Math.max(0,Math.min(3,notch()+(['ArrowUp','ArrowRight'].includes(event.key)?-1:1)));
    select(next,event);
  });
  return Object.freeze({cancel});
}
