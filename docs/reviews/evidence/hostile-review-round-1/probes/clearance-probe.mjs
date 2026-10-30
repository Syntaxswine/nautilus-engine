import {readFileSync} from 'node:fs';import {blankMap} from '../../packages/map-core/index.js';import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
const recipe=JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json',import.meta.url)));
const m=blankMap(recipe.name);m.starts=structuredClone(recipe.starts);m.exits=structuredClone(recipe.exits);m.wallRuns={version:1,segments:[...structuredClone(recipe.walls),{id:'near',a:[20.6,24],b:[20.6,26],z:0,stories:1,material:'wood'}]};
for(const p of recipe.terrain)for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++)m.terrain[y][x]=p.value;
try{createTinderboxScene(m,recipe.policy);console.log('accepted');}catch(e){console.log(e.code);}