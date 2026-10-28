export function createInspectionRenderer(T,canvas) {
  try {return new T.WebGLRenderer({canvas,antialias:true});}
  catch(first) {
    // Some devices cannot allocate a multisampled context after a large preview.
    // Retry without multisampling; model scale, materials and lighting are identical.
    try {return new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});}
    catch {throw Error('WebGL is unavailable. Close other 3D previews and reload the editor. '+first.message);}
  }
}
