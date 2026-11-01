// UI intent fields only. No sampling, matching, floor conversion or authority.
export function smartTileFormValues(draft) {
  const values={x:0,y:0,widthM:8,depthM:4,seed:0,curveKind:'line',
    ax:0,ay:0,bx:8,by:0,cx:0,cy:0,radius:4,startRad:0,sweepRad:Math.PI/2,
    p0x:0,p0y:0,p1x:2,p1y:0,p2x:6,p2y:4,p3x:8,p3y:4,skinId:''};
  if(!draft)return values;
  if(draft.origin){[values.x,values.y]=draft.origin;}
  for(const key of ['widthM','depthM','seed','skinId'])if(Object.hasOwn(draft,key))values[key]=draft[key];
  const curve=draft.path;
  if(!curve)return values;
  values.curveKind=curve.kind;
  if(curve.kind==='line'){[values.ax,values.ay]=curve.a;[values.bx,values.by]=curve.b;}
  if(curve.kind==='arc')for(const key of ['radius','startRad','sweepRad'])values[key]=curve[key];
  if(curve.kind==='arc')[values.cx,values.cy]=curve.center;
  if(curve.kind==='cubic')curve.points.forEach((point,index)=>{values['p'+index+'x']=point[0];values['p'+index+'y']=point[1];});
  return values;
}
export function smartTileDraftFromFields(tool,values,previous,selectedOwnerId) {
  const numeric=name=>{
    const raw=values[name];
    if(!['string','number'].includes(typeof raw)||typeof raw==='string'&&!raw.trim())throw new TypeError('Enter '+name+' explicitly.');
    const number=Number(raw);if(!Number.isFinite(number))throw new TypeError(name+' must be finite.');
    return number;
  };
  if(tool==='finish'){
    if(typeof selectedOwnerId!=='string'||!selectedOwnerId)throw new TypeError('Select a whole owner before finishing.');
    if(typeof values.skinId!=='string'||!values.skinId.trim())throw new TypeError('Enter an explicit finish ID.');
    return {tool,ownerId:selectedOwnerId,skinId:values.skinId};
  }
  if(!['rectangle','path'].includes(tool))throw new TypeError('Unsupported construction tool.');
  const seed=numeric('seed'),widthM=numeric('widthM');
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new TypeError('Seed must be a uint32 integer.');
  if(!(widthM>0))throw new TypeError('Width must be positive.');
  const draft={tool,ownerId:previous?.tool===tool?previous.ownerId:null,origin:[numeric('x'),numeric('y')],widthM,seed};
  if(tool==='rectangle'){
    draft.depthM=numeric('depthM');if(!(draft.depthM>0))throw new TypeError('Depth must be positive.');return draft;
  }
  const original=previous?.tool==='path'?previous.path:null,kind=values.curveKind;
  if(original&&!['line','arc','cubic'].includes(original.kind))throw new TypeError('This UI cannot edit '+original.kind+' controls. Keep the source and use a supported editor.');
  if(!['line','arc','cubic'].includes(kind))throw new TypeError('Choose a supported original curve type.');
  const id=original?.id??'path',height=index=>{
    if(!original)return 0;
    if(original.kind==='line')return original[index?'b':'a'][2];
    if(original.kind==='arc')return original[index?'h1':'h0'];
    return original.points[index?3:0][2];
  };
  if(original&&original.kind!==kind){
    const heights=original.kind==='cubic'?original.points.map(point=>point[2]):[height(0),height(1)];
    if(heights.some(h=>h!==0))throw new TypeError('Changing curve type cannot flatten saved height controls. Keep this source or begin a new level path.');
  }
  if(kind==='line')draft.path={kind,id,a:[numeric('ax'),numeric('ay'),height(0)],b:[numeric('bx'),numeric('by'),height(1)]};
  if(kind==='arc'){
    const radius=numeric('radius');if(!(radius>0))throw new TypeError('Radius must be positive.');
    draft.path={kind,id,center:[numeric('cx'),numeric('cy')],radius,startRad:numeric('startRad'),sweepRad:numeric('sweepRad'),h0:height(0),h1:height(1)};
  }
  if(kind==='cubic')draft.path={kind,id,points:[0,1,2,3].map(index=>[
    numeric('p'+index+'x'),numeric('p'+index+'y'),
    original?.kind==='cubic'?original.points[index][2]:0
  ])};
  return draft;
}
