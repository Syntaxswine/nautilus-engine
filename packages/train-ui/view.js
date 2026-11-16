// Static markup only; host data uses textContent. Compact parts adapt Tinderbox
// fb0628605c274550ff8abad50b151843f08747d1; original bytes remain in vendor/.
import {COMPACT_NOTCHES} from './compact-model.js';
const soundButton = `<button type="button" class="sound-toggle" data-audio-toggle aria-label="Mute train sounds" aria-pressed="false" title="Train sounds"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="sound-waves" d="M16 8q5 4 0 8M19 5q8 7 0 14"/><path class="sound-slash" d="M4 3l17 18"/></svg><span>Sound</span></button>`;
const lamps = `<div class="status-lamps" aria-label="Confirmed train state"><span data-lamp="traction" role="img"><i aria-hidden="true"></i>Traction</span><span data-lamp="aboard" role="img"><i aria-hidden="true"></i>Aboard</span><span data-lamp="brake" role="img"><i aria-hidden="true"></i>Brake</span></div>`;
export const VIEW_HTML = `
  <section data-part="entry" class="entry-card" aria-label="Train entry" hidden><p>Choose a train entrance</p><div data-part="entry-actions"></div></section>
  <section data-part="rider" class="rider-card" aria-label="Passenger controls" hidden>
    <div><p class="plate" data-part="rider-train">Passenger coach</p><h2>Riding</h2><p class="rider-note" data-part="rider-reason">Leave through the coach entrance.</p>${lamps}<p class="rider-note" data-part="rider-status" role="status"></p></div>
    <div class="rider-tools">${soundButton}<div class="exit-actions" data-part="rider-exit-actions"></div></div>
  </section>
  <section data-part="driver" class="train-panel" aria-label="Train driving controls" tabindex="0">
    <header class="panel-heading"><div><p class="plate">Nautilus · railway works</p><h2 data-part="cab-title">Steam locomotive</h2></div><span data-part="cab-facing" class="cab-facing">Forward-facing cab</span></header>
    ${lamps}
    <div class="instrument-row">
      <div data-part="notch-lever" class="compact-lever" role="slider" tabindex="0" aria-label="Steam regulator notch" aria-description="Drag between Forward II, Forward I, Neutral and Reverse. The selected gear stays engaged after release. Neutral coasts. Pull the chain or press B to brake. Arrow keys select a gear, Home selects reverse and End selects Forward II." aria-orientation="vertical" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1" aria-valuetext="Neutral" hidden><span class="compact-gate" aria-hidden="true">${COMPACT_NOTCHES.map((n,i)=>`<span class="compact-stop" style="--stop:${i/3*100}%"><b>${n.mark}</b><i></i></span>`).join('')}<span class="compact-knob"><i></i></span></span></div>
      <div class="speed-instrument">
        <p class="instrument-label">Road speed</p>
        <svg viewBox="0 0 132 108" aria-hidden="true"><path d="M17 90A53 53 0 1 1 98 97" class="dial-rim"/><path d="M25 81A43 43 0 1 1 94 86" class="dial-ticks"/><text x="20" y="90">0</text><text x="59" y="19">20</text><text x="105" y="90">40</text><g data-part="speed-needle"><path d="M65 64L31 83" class="dial-needle"/><circle cx="65" cy="64" r="5" class="dial-pin"/></g></svg>
        <div class="speed-number"><output data-part="speed">0.0</output><span>km/h</span></div><p data-part="confirmed-direction" class="travel-state">Stopped</p>
      </div>
      <fieldset class="direction-gate"><legend data-part="direction-label">Reverser</legend><div class="reverser-assembly">
        <div class="direction-lever" data-part="direction-lever" role="slider" tabindex="0" aria-label="Requested direction" aria-description="Drag to forward, neutral or reverse. Arrow keys change direction; Home selects reverse and End selects forward." aria-orientation="vertical" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0" aria-valuetext="neutral">
          <svg viewBox="0 0 48 148" aria-hidden="true"><path class="lever-mount" d="M12 5h24l6 8v123l-6 7H12l-6-7V13z"/><path class="lever-slot" d="M24 22v103"/><path class="lever-notch" d="M17 23h14M17 67h14M17 111h14"/><g class="lever-hand"><path class="lever-stem" d="M21 21h6v23h-6z"/><path class="lever-grip" d="M5 12q19-7 38 0l-2 16q-17 5-34 0z"/><path class="lever-wear" d="M9 14q13-3 27-1M10 24l8 1"/></g><path class="lever-rivet" d="M14 133h20"/></svg>
        </div>
        <div class="direction-buttons"><button type="button" data-direction="forward" aria-pressed="false"><span>Forward</span><kbd>F</kbd></button><button type="button" data-direction="neutral" aria-pressed="true"><span>Neutral</span><kbd>N</kbd></button><button type="button" data-direction="reverse" aria-pressed="false"><span>Reverse</span><kbd>R</kbd></button></div>
      </div></fieldset>
      <div class="brake-column"><span class="control-label">Brake</span><button type="button" data-part="brake" aria-label="Pull brake chain (B)" aria-pressed="false">
        <svg class="brake-chain" viewBox="0 0 64 163" aria-hidden="true"><path class="chain-anchor" d="M21 4h22v10H21z"/><path class="chain-anchor" d="M28 9v17h8V9"/><g class="chain-hanging"><g class="chain-links"><ellipse cx="32" cy="30" rx="7" ry="10"/><ellipse cx="32" cy="46" rx="3" ry="11"/><ellipse cx="32" cy="62" rx="7" ry="10"/><ellipse cx="32" cy="78" rx="3" ry="11"/></g><path class="chain-collar" d="M25 86h14v10H25z"/><ellipse class="chain-ring" cx="32" cy="116" rx="21" ry="25"/><path class="chain-highlight" d="M17 113q0-17 13-18M17 122l3 5"/></g></svg>
        <span class="compact-chain-art" aria-hidden="true"><span class="compact-anchor"></span><span class="compact-chain"><i></i><i></i><i></i><i></i><i></i><span class="compact-ring"></span></span></span>
        <span class="brake-paddle" aria-hidden="true"><i></i></span><strong data-part="brake-caption">Pull to brake</strong><kbd>B</kbd>
      </button><small data-part="brake-state">Released</small></div>
    </div>
    <div class="compact-status" data-part="compact-status" hidden><output data-part="compact-speed">0.0 km/h</output><p data-part="compact-applied">Stopped · 0% power</p><p data-part="compact-braking">Brake applied</p><p data-part="reverse-pending" role="status" hidden></p></div>
    <div class="power-row"><label data-power-label>Requested power <output data-part="power-request">35%</output></label><div class="power-controls"><button type="button" data-part="less-power" aria-label="Decrease power">−</button><input data-part="power" type="range" min="0" max="100" step="5" value="35" aria-label="Requested train power"><button type="button" data-part="more-power" aria-label="Increase power">+</button><button type="button" class="power-hold" data-part="power-hold" aria-pressed="false"><span data-part="power-caption">Hold regulator</span><kbd>Space</kbd></button></div><p data-part="confirmed-power">0% applied · neutral</p></div>
    <div class="signal-line" data-part="signal-line" hidden><span aria-hidden="true"></span><p data-part="signal-reason"></p></div>
    <p data-part="request-status" class="request-status" role="status" aria-live="polite"></p>
    <footer class="panel-footer"><span class="key-guide">F / N / R · direction<br>Space · power &nbsp; B · brake</span>${soundButton}<div class="exit-actions" data-part="exit-actions"></div></footer>
  </section>`;
