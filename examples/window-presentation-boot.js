const installed=new URL(location.href).searchParams.has('installed');
const base=installed?'../artifacts/window-presentation-package/consumer/node_modules/':'../';
const at=file=>new URL(base+file,import.meta.url).href;
const imports=installed?{
 '@nautilus-engine/core/windows':at('@nautilus-engine/core/packages/windows-core/index.js'),
 '@nautilus-engine/core/adapters/farmyard/windows':at('@nautilus-engine/core/packages/adapters/farmyard/windows.js'),
 '@nautilus-engine/renderer/render-effects/three':at('@nautilus-engine/renderer/packages/render-effects/three.js'),
 '@nautilus-engine/renderer/adapters/farmyard/windows/three':at('@nautilus-engine/renderer/packages/window-visuals/three.js')
}:{
 '@nautilus-engine/core/windows':at('packages/windows-core/index.js'),
 '@nautilus-engine/core/adapters/farmyard/windows':at('packages/adapters/farmyard/windows.js'),
 '@nautilus-engine/renderer/render-effects/three':at('packages/render-effects/three.js'),
 '@nautilus-engine/renderer/adapters/farmyard/windows/three':at('packages/window-visuals/three.js')
};
const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
await import('./window-presentation-review.js');
