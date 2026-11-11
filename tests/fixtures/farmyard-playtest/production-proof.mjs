import assert from 'node:assert/strict';
import {
  Core, DEFAULT_BUILD, createSoloGame, decodeSave, encodeSave, hero, lineClear, walkSegment
} from '../../../vendor/farmyard-playtest/4a0bd292ee09abb7f61e743289f5a40f09655b2c/sites/tactical-animal/dist/solo-game.js';
import {WINDOW_REVIEW_ID} from '../../../vendor/farmyard-playtest/4a0bd292ee09abb7f61e743289f5a40f09655b2c/sites/tactical-animal/dist/window-review-map.js';
import {app} from '../../../vendor/farmyard-playtest/4a0bd292ee09abb7f61e743289f5a40f09655b2c/sites/tactical-animal/tests/app-harness.mjs';

export function preparePinnedFarmyardHost({authoredMap, signal}) {
  signal.throwIfAborted();
  const state = createSoloGame(DEFAULT_BUILD, 1947, WINDOW_REVIEW_ID, {authoredMap});
  const application = app({initialState: state});
  return {state, application, dispose() { application.view.dispose(); }};
}

function resources(state) {
  const actor = hero(state);
  const {id, x, y, heading, name, species, hp, ap, ammo, ammoPouch, pack, weapon} = actor;
  return {id, x, y, heading, name, species, hp, ap, ammo, ammoPouch, pack, weapon, dressings: state.solo.dressings};
}

function verifySavedDoor(state, expected, target) {
  const restored = decodeSave(encodeSave(state));
  assert.deepEqual(resources(restored), resources(state));
  const door = restored.interactables.find(leaf => leaf.id === expected.id);
  assert.deepEqual(door, expected);
  assert.equal(walkSegment(restored, hero(restored), target, hero(restored).id), expected.open);
  assert.equal(lineClear(restored, hero(restored), target), expected.open);
}

export function verifyProductionDoor(session, axis) {
  const {state, application} = session.host;
  const actor = hero(state);
  const across = axis === 'e' ? {x: 21, y: 25} : {x: 20, y: 26};
  const dx = across.x - actor.x, dy = across.y - actor.y;
  assert.equal(application.s, state);
  assert.deepEqual(state.solo.authoredMap, JSON.parse(session.sourceJSON));
  assert.deepEqual(state.worldBounds, {x: 0, y: 0, w: 240, h: 240});
  assert.equal(state.map.length, 240);
  assert.equal(state.map[239].length, 240);
  assert.equal(state.units.length, 1);
  assert.deepEqual([actor.x, actor.y, actor.heading], [20, 25, 270]);
  assert.equal(state.interactables.length, 1);
  const door = state.interactables[0];
  assert.equal(door.edge, axis + ':20:25');
  assert.deepEqual([door.x, door.y], [20 + dx / 2, 25 + dy / 2]);
  assert.equal(door.open, false);
  assert.equal(walkSegment(state, actor, across, actor.id), false);
  assert.equal(lineClear(state, actor, across), false);

  const hand = application.el('interaction-hand');
  application.view.options.onPick({interactionId: door.id});
  assert.equal(hand.hidden, false);
  const exploreAP = actor.ap;
  hand.click();
  assert.equal(door.open, true);
  assert.equal(state.edges[door.edge], 'door');
  assert.equal(actor.ap, exploreAP);
  assert.equal(walkSegment(state, actor, across, actor.id), true);
  assert.equal(lineClear(state, actor, across), true);
  actor.hp -= 5;
  actor.ammo[actor.weapon] -= 2;
  actor.pack.find(item => item.kind === actor.weapon).rounds = actor.ammo[actor.weapon];
  verifySavedDoor(state, door, across);

  assert.ok(Core.travel(state, actor, dx / 2, dy / 2) > 0);
  assert.ok(Math.hypot(actor.x - door.x, actor.y - door.y) < 1e-7);
  // Select combat accounting in this guard-free fixture.
  state.phase = 'player';
  actor.ap = 8;
  const occupied = encodeSave(state);
  const blocked = Core.performInteraction(state, door.id, 'close');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /Someone is in the doorway/);
  assert.equal(encodeSave(state), occupied);
  assert.equal(door.open, true);

  // Native refresh returns the guard-free yard to exploration during travel.
  assert.ok(Core.travel(state, actor, -dx / 2, -dy / 2) > 0);
  state.phase = 'player';
  const {ok, cost} = Core.previewInteraction(state, door.id, 'close');
  assert.equal(ok, true);
  assert.equal(cost, 1);
  const beforeClose = actor.ap;
  application.view.options.onPick({interactionId: door.id});
  hand.click();
  assert.equal(door.open, false);
  assert.equal(state.edges[door.edge], 'closed-door');
  assert.equal(actor.ap, beforeClose - cost);
  assert.equal(Core.performInteraction(state, door.id, 'close').ok, false);
  assert.equal(actor.ap, beforeClose - cost);
  verifySavedDoor(state, door, across);
  return {edge: door.edge, anchor: [door.x, door.y], openQueries: true, occupiedPreserved: true, closeAP: cost, saves: ['open', 'closed']};
}
