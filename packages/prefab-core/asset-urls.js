// This module keeps the same depth in the source package and static build.
export const prefabFileURL=relative=>new URL('../../'+relative,import.meta.url).href;
