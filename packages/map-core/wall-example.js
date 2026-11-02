import {blockCanvas, extractBlock} from './blocks.js';
// Generic tracing practice, not a reconstruction of a particular catalogue plan.
export function angledBayExample() {
  const block=extractBlock(blockCanvas('Angled bay · practice block'));
  const corners=[[7.5,7.5],[15.5,7.5],[17.5,9.5],[17.5,13.5],[15.5,15.5],[7.5,15.5]];
  block.wallRuns={version:1,segments:corners.map((a,i)=>({id:'bay-'+(i+1),a,b:corners[(i+1)%corners.length],z:0,stories:2,material:'wood'}))};
  for(let y=8;y<=15;y++)for(let x=8;x<=15;x++)block.terrain[y][x]='ground-wood-planks';
  return block;
}
