// Keep physical inventories literal; npm's files field treats brackets as globs.
// Escape bracketed font filenames when serializing a publishing whitelist.
export const npmFilePatterns = files => files.map(file => file.replace(/[\[\]]/g, '\\$&'));
