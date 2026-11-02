/** Discoverable handoff notes travel with the installed package. No DOM required. */
export function gameAssetGuides(){
  return [
    {id:'standard-doors-stairs',version:1,status:'candidate',units:'metres; x/y ground, h feet height; explicit seconds',entry:'./interactions',guide:new URL('../../docs/standard-interactions.md',import.meta.url).href,
      provides:['open/close/unlock intent','live obstruction checks','continuous saved stair progress'],
      optional:['key/permission checks for unlock','game resource/cost policy','animation/audio consumers'],
      requires:['authored door bounds and stair landings','authoritative world queries','atomic state commit and host time'],
      decisions:['body size and native scale','key/permission policy','costs and animation','curved-world query provider']},
    {id:'standard-title-screen',version:1,status:'candidate',units:'CSS pixels; no world-scale ownership',entry:'./game-ui/title',style:'./game-ui/style.css',guide:new URL('../../docs/game-title.md',import.meta.url).href,
      provides:['start/continue/settings/credits flow','new-game confirmation','async loading/retry and disposal','keyboard and touch controls'],
      requires:['DOM mount point and game identity','start callback; save check + continue callback when continuation is offered','input and simulation gating'],
      optional:['title artwork','settings panel','credits','diagnostic error reporter'],
      decisions:['world-specific palette and typography','save replacement policy','settings and credits','audio after a player gesture']}
  ];
}