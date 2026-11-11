// Browser-only fixture. Each candidate runs the pinned Farmyard app in its own frame.
const $ = id => document.getElementById(id);

export async function prepareBrowserFarmyardHost({authoredMap, signal}, retired) {
  signal.throwIfAborted();
  const frame = document.createElement('iframe');
  frame.title = 'Farmyard door proof';
  frame.hidden = true;
  frame.style.cssText = 'position:fixed;right:8px;bottom:8px;width:min(350px,calc(100% - 16px));' +
    'height:290px;border:1px solid #8d987e;border-radius:10px;z-index:50;background:#18231c';
  frame.src = new URL('./host.html', import.meta.url);
  const loaded = new Promise(resolve => frame.addEventListener('load', resolve, {once: true}));
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, {once: true});
  });
  try {
    document.body.append(frame);
    const proof = await Promise.race([
      loaded.then(() => frame.contentWindow.farmyardReady),
      aborted
    ]);
    signal.throwIfAborted();
    proof.open(authoredMap);
    return {
      frame, proof,
      dispose() {
        try {
          retired.push(proof.disposeView());
        } finally {
          frame.remove();
        }
      }
    };
  } catch (error) {
    frame.remove();
    throw error;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export async function initializeFarmyardProof(ids) {
  document.body.innerHTML = [
    '<h1>Farmyard door playtest</h1><ul id="markers" aria-label="Map marker roles"></ul>',
    '<section id="battle" hidden>',
    '<button id="pick-door">Select door</button> ',
    '<button id="interaction-hand" hidden><span id="interaction-icon"></span>',
    '<span id="interaction-label"></span> <small id="interaction-cost"></small></button> ',
    '<button id="menu">Field menu</button><output id="door-probes" aria-live="polite"></output>',
    '</section>',
    '<section id="prep"><button id="resume" hidden>Resume</button></section>',
    '<p id="toast" role="status" hidden></p>',
    '<dialog id="overlay"><div id="overlay-content"></div>',
    '<div id="context" hidden></div><div id="overlay-actions"></div></dialog>',
    '<dialog id="control-picker"></dialog><div id="support" hidden><span class="portrait-number"></span></div>'
  ].join('');
  for (const id of ids) {
    if ($(id)) continue;
    const element = document.createElement(id === 'operation-select' ? 'select' : 'div');
    element.id = id;
    $('support').append(element);
  }

  // The original app binds actual DOM events and saves. Advance movement through
  // the simulation explicitly so the AP fixture is independent of frame timing.
  window.requestAnimationFrame = () => 0;
  const [app, game, {WINDOW_REVIEW_ID}, {OPERATION_SLOT}] = await Promise.all([
    import('./app.js'),
    import('./solo-game.js'),
    import('./window-review-map.js'),
    import('./operation-storage.js')
  ]);
  const stateIds = new WeakMap();
  let serial = 0;
  let source;
  const across = {x: 21, y: 25};
  function inspect() {
    const {state} = app.inspectProofApp();
    const actor = game.hero(state);
    const {id, x, y, heading, ap, hp, ammo, ammoPouch, weapon, pack} = actor;
    const door = state.interactables[0];
    if (!stateIds.has(state)) stateIds.set(state, ++serial);
    return {
      stateId: stateIds.get(state),
      actor: {id, x, y, heading, ap, hp, ammo, ammoPouch, weapon, pack},
      actorCount: state.units.length,
      phase: state.phase,
      door: structuredClone(door),
      edge: state.edges[door.edge],
      walk: game.walkSegment(state, actor, across, actor.id),
      sight: game.lineClear(state, actor, across),
      authoredMapMatches: JSON.stringify(state.solo.authoredMap) === source
    };
  }
  function showProbes() {
    const {door, walk, sight} = inspect();
    $('door-probes').textContent = (door.open ? 'Open' : 'Closed') +
      ' · Walk ' + (walk ? 'clear' : 'blocked') + ' · Sight ' + (sight ? 'clear' : 'blocked');
  }
  $('pick-door').onclick = () => {
    const {state, view} = app.inspectProofApp();
    view.options.onPick({interactionId: state.interactables[0].id});
  };
  $('interaction-hand').addEventListener('click', showProbes);
  $('resume').addEventListener('click', () => {
    if (!$('battle').hidden) showProbes();
  });
  return {
    open(authoredMap) {
      source = JSON.stringify(authoredMap);
      app.startProof(game.createSoloGame(game.DEFAULT_BUILD, 1947, WINDOW_REVIEW_ID, {authoredMap}));
      if ($('battle').hidden) throw Error($('toast').textContent || 'Farmyard did not start.');
      showProbes();
    },
    present(markers) {
      const roles = {
        'solo-spawn': 'Solo start',
        'retained-squad-marker': 'Squad marker (retained)',
        'retained-travel-marker': 'Travel marker (retained)'
      };
      $('markers').replaceChildren(...markers.map(marker => {
        const item = document.createElement('li');
        item.textContent = roles[marker.role] + ' · ' + marker.x + ', ' + marker.y;
        return item;
      }));
    },
    inspect,
    saved() { return localStorage.getItem(OPERATION_SLOT + WINDOW_REVIEW_ID); },
    combatAt(x, y) {
      const {state} = app.inspectProofApp();
      const actor = game.hero(state);
      state.phase = 'explore';
      const moved = game.Core.travel(state, actor, x - actor.x, y - actor.y);
      state.phase = 'player';
      actor.ap = 8;
      app.refreshProof();
      return moved;
    },
    disposeView() {
      const {view} = app.inspectProofApp();
      view?.dispose();
      return view?.disposed === true;
    }
  };
}
