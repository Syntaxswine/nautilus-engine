// Largest axis-aligned clear rectangle. Enumerate obstacle x edges, then merge
// their blocked y intervals; no pixels, renderer or per-frame solver is needed.
export function hudSafeRectangle(viewport,occlusions,padding=8) {
  const width=viewport.width,height=viewport.height,blocks=occlusions.filter(r=>r.width>0&&r.height>0).map(r=>({x:Math.max(0,r.x-padding),right:Math.min(width,r.x+r.width+padding),y:Math.max(0,r.y-padding),bottom:Math.min(height,r.y+r.height+padding)}));
  const edges=[...new Set([0,width,...blocks.flatMap(r=>[r.x,r.right])])].sort((a,b)=>a-b);let best={x:0,y:0,width:0,height:0};
  const consider=(x,right,y,bottom)=>{const candidate={x,y,width:right-x,height:bottom-y};if(candidate.width*candidate.height>best.width*best.height)best=candidate;};
  for(let i=0;i<edges.length-1;i++)for(let j=i+1;j<edges.length;j++){
    const x=edges[i],right=edges[j],intervals=blocks.filter(r=>r.x<right&&r.right>x).sort((a,b)=>a.y-b.y);let cursor=0;
    for(const r of intervals){if(r.y>cursor)consider(x,right,cursor,r.y);cursor=Math.max(cursor,r.bottom);}if(cursor<height)consider(x,right,cursor,height);
  }
  return best;
}
