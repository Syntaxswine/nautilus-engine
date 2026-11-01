// Compact canonical recipes. Variations are generated, never pre-baked products.
const rotate=(p,q)=>{let [x,z]=p.map(v=>v-.5);for(let i=0;i<q;i++)[x,z]=[-z,x];return [x+.5,z+.5];};
export function curveTileStudies(){const out=[],add=(id,family,recipe,parameters={})=>out.push({id,family,recipe,parameters,appearanceOnly:true});
 for(let mask=0;mask<16;mask++)for(const center of [5,10].includes(mask)?['inside','outside']:['inside'])add('mask-'+mask+'-'+center,'corner-connectivity',{kind:'corners',cell:[0,0],mask,center},{mask,center});
 for(let mask=0;mask<16;mask++)for(let variant=0;variant<3;variant++)add('aft-mask-'+mask+'-'+variant,'aft-reference',{kind:'aft-shore',cell:[0,0],mask,variant},{mask,variant});
 for(let angle=0;angle<360;angle+=15){const a=angle*Math.PI/180,n=[Math.cos(a),Math.sin(a)];add('cut-'+angle,'diagonals',{kind:'half-plane',normal:n,offset:(n[0]+n[1])*.5},{angle});}
 for(const denominator of [2,3,4])for(const mirror of [-1,1])for(let q=0;q<4;q++){const a=Math.atan2(mirror,denominator)+q*Math.PI/2,n=[Math.cos(a),Math.sin(a)];add('slope-1-'+denominator+'-'+mirror+'-'+q,'shallow-diagonals',{kind:'half-plane',normal:n,offset:(n[0]+n[1])*.5},{rise:mirror,run:denominator,quarterTurn:q});}
 for(const radius of [.5,1,2,3,4,6,8,12,16,24,32])for(let q=0;q<4;q++)for(const side of ['convex','concave']){const disk={kind:'disk',center:rotate([.5-radius/Math.SQRT2,.5-radius/Math.SQRT2],q),radius};add('arc-'+radius+'-'+q+'-'+side,'adjustable-arcs',side==='convex'?disk:{kind:'difference',shapes:[{kind:'fill'},disk]},{radius,quarterTurn:q,side});}
 for(const radius of [1,2,4,8,16])for(const width of [.25,.5,1,2,3,4])if(width<=radius*2)for(const anchor of ['outer','inner']){const r=radius+(anchor==='outer'?width/2:-width/2);add('band-'+radius+'-'+width+'-'+anchor,'bands-and-banks',{kind:'ring',center:[.5-r/Math.SQRT2,.5-r/Math.SQRT2],radius,width},{radius,width,anchor});}
 for(const width of [.25,.5,1,2]){add('round-cap-'+width,'caps',{kind:'stroke',points:[[-2,.5],[.4,.5]],width},{width});const h={kind:'stroke',points:[[-2,.5],[3,.5]],width},v={kind:'stroke',points:[[.5,-2],[.5,.5]],width};add('junction-t-'+width,'junctions',{kind:'union',shapes:[h,v]},{width});add('crossing-'+width,'junctions',{kind:'union',shapes:[h,{kind:'stroke',points:[[.5,-2],[.5,3]],width}]},{width});}
 for(const width of [.25,.5,1])for(const bend of [.3,.7,1.2])add('s-bend-'+width+'-'+bend,'compound-curves',{kind:'bezier',points:[[-.5,.1],[.5,bend+1],[.5,-bend],[1.5,.9]],width},{width,bend});
 for(const [startWidth,endWidth]of [[.25,1.25],[1,2],[2,.5]])for(let q=0;q<4;q++)add('taper-'+startWidth+'-'+endWidth+'-'+q,'tapers',{kind:'variable-stroke',points:[rotate([-.5,.5],q),rotate([1.5,.5],q)],startWidth,endWidth},{startWidth,endWidth,quarterTurn:q});
 for(const [startWidth,endWidth]of [[.25,1],[1,2],[2,.5]])add('variable-cubic-'+startWidth+'-'+endWidth,'compound-curves',{kind:'variable-bezier',points:[[-.5,.1],[.5,1.7],[.5,-.7],[1.5,.9]],startWidth,endWidth},{startWidth,endWidth});
 return out;
}
export const CURVE_FAMILY_READINESS=Object.freeze([
 {id:'surface-masks',art:'prototype',coverage:'full/empty/half/diagonal/inner/outer/saddle',gameplay:'unbound'},
 {id:'paving-and-paths',art:'prototype',coverage:'arbitrary straight/curved stroke, rings, Beziers, caps and junctions',gameplay:'unbound'},
 {id:'terrain-and-water',art:'prototype',coverage:'independent surface/bank skins and masks',gameplay:'unbound; no water simulation'},
 {id:'linear-edges',art:'prototype',coverage:'solid contour extrusion; profile adapters for kerb/wall/quay',gameplay:'unbound; not a collision provider'},
 {id:'height-transitions',art:'open-surface-prototype',coverage:'native-height ramp/stair art studies; terraces and layered overpasses',gameplay:'requires frozen shared height/support contract'},
 {id:'barriers-and-trim',art:'sampled-profile-prototype',coverage:'curved panel fence and stepped cornice from independent profile sweeps',gameplay:'requires registered core RecipePort/UV profile binding'}
]);
