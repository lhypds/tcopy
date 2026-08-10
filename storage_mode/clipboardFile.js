// Storage mode: reading and writing the shared clipboard file.
import fs from 'node:fs';
import path from 'node:path';
import clipboard from 'clipboardy';
import { getStoragePaths } from '../config.js';

const LINE_ENDINGS = { CRLF: '\r\n', LF: '\n', CR: '\r' };

/** Collapses every line-ending convention to \n. */
export function normalizeNewlines(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function applyLineEnding(content, lineEndingName) {
  const ending = LINE_ENDINGS[lineEndingName];
  if (ending === undefined) {
    console.warn(`Warning: invalid LINE_ENDING_SAVING value "${lineEndingName}". Using CRLF.`);
    return normalizeNewlines(content).replace(/\n/g, LINE_ENDINGS.CRLF);
  }
  return normalizeNewlines(content).replace(/\n/g, ending);
}

/** Makes whitespace visible for the debug lines the Python version printed. */
export function visualize(content) {
  return content
    .replace(/\n/g, '<LF>')
    .replace(/\r/g, '<CR>')
    .replace(/\t/g, '<TAB>')
    .replace(/ /g, '<SPACE>');
}

export function ensureStorageDir() {
  const { storagePath } = getStoragePaths();
  fs.mkdirSync(storagePath, { recursive: true });
  return storagePath;
}

export function readClipboardFile() {
  const { clipboardFilePath } = getStoragePaths();
  if (!fs.existsSync(clipboardFilePath)) return null;
  return fs.readFileSync(clipboardFilePath, 'utf8');
}

export function writeClipboardFile(content) {
  const { clipboardFilePath, lineEnding } = getStoragePaths();
  fs.mkdirSync(path.dirname(clipboardFilePath), { recursive: true });
  fs.writeFileSync(clipboardFilePath, applyLineEnding(content, lineEnding), 'utf8');
  return clipboardFilePath;
}

export async function readSystemClipboard() {
  return clipboard.read();
}

export async function writeSystemClipboard(content) {
  await clipboard.write(content);
}
