// Shared parsing for the `+file[/path/to/thing]` clipboard convention.
// Previously duplicated across copy.py, paste.py, watch.py and client/paste.js
// (watch.py used a looser startsWith/endsWith check that misfired on text
// merely beginning with "+file[").
const FILE_REF_PATTERN = /\+file\[([^\]]+)\]/g;
const FILE_REF_CONTENT_PATTERN = /^\s*(?:\+file\[[^\]]+\])(?:\s+\+file\[[^\]]+\])*\s*$/;

/** Returns the referenced paths, or [] when the content is not purely file refs. */
export function parseFileReferences(content) {
  if (typeof content !== 'string') return [];
  if (!FILE_REF_CONTENT_PATTERN.test(content)) return [];
  return Array.from(content.matchAll(FILE_REF_PATTERN), match => match[1]);
}

export function isFileReference(content) {
  return parseFileReferences(content).length > 0;
}

export function formatFileReferences(paths) {
  return paths.map(filePath => `+file[${filePath}]`).join(' ');
}
