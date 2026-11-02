// Round 4 reviewer's mutants: the brief's list, verbatim from the author's instruments, plus new
// glue, state and clearance mutants. Each is a list of exact edits; every needle must occur once.
export const E = 'apps/editor/editor.js', H = 'apps/editor/game-handoff.js', T = 'packages/adapters/tinderbox/index.js';
const e = (file, find, replace) => ({file, find, replace});
const BYPASS_FIND = '  connectGame: handoff.connectGame,\n  sendToGame: handoff.sendToGame';
export const MUTANTS = {
  // --- The brief's list (verbatim from round4-mut.mjs / browser-mut4.mjs) ---
  E01: ['E01 page wires a bypass', [e(E, BYPASS_FIND, '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}')]],
  E05: ['E05 exportMap closure drops its call', [e(E, 'exportMap: () => window.nautilus.export()', 'exportMap: () => window.nautilus.export')]],
  E06: ['E06 onChange not wired', [e(E, ', onChange: () => refreshHandoff()});', '});')]],
  E07: ['E07 page hasGameAdapter getter always true', [e(E, 'get hasGameAdapter() { return handoff.hasGameAdapter; },', 'get hasGameAdapter() { return true; },')]],
  E09: ['E09 bypass only on the no-argument sendToGame()', [e(E, BYPASS_FIND, '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json) {return json === undefined ? window.bypassHost.openMap({json: this.export(), contract: MAP_CONTRACT}) : handoff.sendToGame(json);}')]],
  E10: ['E10 page sendToGame ignores its argument', [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: json => handoff.sendToGame()\n')]],
  E11: ['E11 sendToGame assigned connectGame', [e(E, '  sendToGame: handoff.sendToGame\n', '  sendToGame: handoff.connectGame\n')]],
  E12: ['E12 page bypass for feature-list hosts only', [e(E, BYPASS_FIND, '  connectGame(adapter) {window.bypassHost = adapter; return handoff.connectGame(adapter);},\n  sendToGame(json = this.export()) {return window.bypassHost.manifest ? handoff.sendToGame(json) : window.bypassHost.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT});}')]],
  E17: ['E17 the editor sync is not observed', [e(E, "if (originalHandoff) handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});", '')]],
  G08: ['G08 a refused connect drops the current host', [e(H, 'host = checkGameAdapter(adapter); onChange();', 'host = null; host = checkGameAdapter(adapter); onChange();')]],
  G09: ['G09 connect refreshes before the host is set', [e(H, 'host = checkGameAdapter(adapter); onChange();', 'checkGameAdapter(adapter); onChange(); host = adapter;')]],
  G10: ['G10 disconnect refreshes before the host is cleared', [e(H, 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {onChange(); host = null;}')]],
  G11: ['G11 connect checks only that openMap is truthy', [e(H, 'host = checkGameAdapter(adapter); onChange();', "if (!adapter?.openMap) throw new TypeError('Expected a game adapter.'); host = adapter; onChange();")]],
  // --- New glue mutants (round 4 reviewer) ---
  N01: ['N01 refresh drops its change guard (writes disabled every time)', [e(E, 'if (button.disabled !== disabled) button.disabled = disabled;', 'button.disabled = disabled;')]],
  N02: ['N02 the editor-sync observer watches child nodes, not the disabled attribute', [e(E, "handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});", 'handoffState.observe(originalHandoff, {childList: true});')]],
  N03: ['N03 settings feedback observes only characterData (misses textContent replacement)', [e(E, 'new MutationObserver(reflect).observe(source, {childList: true, subtree: true, characterData: true});', 'new MutationObserver(reflect).observe(source, {characterData: true});')]],
  N04: ['N04 settings feedback installed again on every refresh', [e(E, "if (!heading || !source || document.getElementById('nautilus-settings-feedback')) return;", 'if (!heading || !source) return;')]],
  N05: ['N05 settings feedback loses role=status / aria-live', [e(E, "feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');", '')]],
  N06: ['N06 open() does not await the editor', [e(E, 'await window.editor3d.open(document);', 'window.editor3d.open(document);')]],
  N07: ['N07 Example yard replaces an edited design only when the user CANCELS', [e(E, "if (window.editor3d?.document?.changed && !confirm(", "if (window.editor3d?.document?.changed && confirm(")]],
  N08: ['N08 Escape opens the options panel instead of closing it', [e(E, "if (event.key === 'Escape') showOptions(false);", "if (event.key === 'Escape') showOptions(true);")]],
  N09: ['N09 the properties panel loses the id that aria-controls names', [e(E, "document.querySelector('.properties').id = 'nautilus-properties';", "document.querySelector('.properties').id = 'nautilus-props';")]],
  N10: ['N10 About dialog never opens', [e(E, "document.getElementById('nautilus-help').onclick = () => help.showModal();", "document.getElementById('nautilus-help').onclick = () => {};")]],
  N11: ['N11 quick Send ignores a block (mirrors the host, not Send)', [e(E, 'quick.disabled = button.disabled;', 'quick.disabled = !handoff.hasGameAdapter;')]],
  N12: ['N12 Send title follows the disabled state, not the host', [e(E, "button.title = handoff.hasGameAdapter ?'Send", "button.title = !button.disabled ?'Send")]],
  N13: ['N13 Example yard load failure is reported as success', [e(E, "try {await window.nautilus.open(exampleYard());status('Example yard · edit freely, save a copy, or export JSON.');} catch (error) {status(error.message);}", "try {window.nautilus.open(exampleYard()).catch(() => {});status('Example yard · edit freely, save a copy, or export JSON.');} catch (error) {status(error.message);}")]],
  N14: ['N14 Example yard ignores the loading guard', [e(E, "if (window.editor3d?.loading) return status('Wait for the current map to finish loading.');", '')]],
  N15: ['N15 sendToGame wrapped async (a refusal becomes a rejected promise)', [e(E, '  sendToGame: handoff.sendToGame\n', '  async sendToGame(json) {return handoff.sendToGame(json);}\n')]],
  // --- Build-patch faults on the click path (tools/, browser-only) ---
  F01: ['F01 launchPlaytest drops its return (the click no longer awaits the host)', [e('tools/build.mjs', 'return window.nautilus.sendToGame(json);}', 'window.nautilus.sendToGame(json);}')]],
  F02: ['F02 the click handler does not await the handoff', [e('tools/editor-wall-adapter.mjs', '          await launchPlaytest(getDocument().export());', '          launchPlaytest(getDocument().export());')]],
  // --- New state mutants ---
  G12: ['G12 disconnect clears the host but does not refresh', [e(H, 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {host = null;}')]],
  G13: ['G13 a newer connect refreshes only the first time', [e(H, 'host = checkGameAdapter(adapter); onChange();', 'const was = host; host = checkGameAdapter(adapter); if (!was) onChange();')]],
  // --- New clearance mutants ---
  C28: ['C28 clearance checks start 0, not the selected start', [e(T, 'const player = starts[policy.playerStart], radius', 'const player = starts[0], radius')]],
  C29: ['C29 left bound padded by half a tile', [e(T, 'if (player.x < radius ||', 'if (player.x < radius + 0.5 ||')]],
  C30: ['C30 epsilon widened to 1 mm', [e(T, '< radius - 1e-10;', '< radius - 1e-3;')]],
  C34: ['C34 y term signed (player.y - m.y), the side C21 does not cover', [e(T, 'Math.abs(player.y - m.y)', '(player.y - m.y)')]],
  C33: ['C33 bounds use radius + 0.4 everywhere (sub-tile pad)', [e(T, 'if (player.x < radius || player.y < radius || player.x > r.width - radius || player.y > r.height - radius ||', 'if (player.x < radius + 0.4 || player.y < radius + 0.4 || player.x > r.width - radius - 0.4 || player.y > r.height - radius - 0.4 ||')]]
};
// All the non-handoff glue mutants at once, for one browser run: if the acceptance passes with all
// of them applied, it cannot see any of them.
MUTANTS.NX = ['NX N05+N07+N08+N09+N10+N13+N14 combined (editor glue outside the handoff)', ['N05', 'N07', 'N08', 'N09', 'N10', 'N13', 'N14'].flatMap(id => MUTANTS[id][1])];
// The body observer is never installed (equivalent in the real page, where Send exists at load);
// the bridge test's "stops observing the body" assertion then has nothing to look at.
MUTANTS.N16 = ['N16 the body observer is never installed', [{file: E, find: 'observer.observe(document.body, {childList: true, subtree: true}); refreshHandoff();', replace: 'refreshHandoff();'}]];
// Round 3's clearance mutants, verbatim from the author's round4-mut.mjs.
{
  const L157 = 'Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2', c = (id, label, find, replace) => { MUTANTS[id] = [label, [{file: T, find, replace}]]; };
  c('C18', 'C18 epsilon dropped (< radius)', '< radius - 1e-10;', '< radius;');
  c('C19', 'C19 swap only for heading pi/2 (walls drawn upwards misread)', 'Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) === 1;');
  c('C20', 'C20 x term signed (m.x - player.x)', L157, '(m.x - player.x) - (swap ? m.depth : m.width) / 2');
  c('C23', 'C23 right bound padded by a tile', 'player.x > r.width - radius ||', 'player.x > r.width - radius - 1 ||');
  c('C24', 'C24 bottom bound padded by a tile', 'player.y > r.height - radius ||', 'player.y > r.height - radius - 1 ||');
  c('C27', 'C27 right bound compared with the height', 'player.x > r.width - radius ||', 'player.x > r.height - radius ||');
}
