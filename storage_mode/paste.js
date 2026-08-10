// Storage mode: read the shared clipboard file, or restore referenced files.
import fs from 'node:fs';
import path from 'node:path';
import { getStoragePaths, resolveHome } from '../config.js';
import { parseFileReferences } from '../utils/fileRefs.js';
import {
  readClipboardFile,
  writeSystemClipboard,
  normalizeNewlines,
  visualize,
} from './clipboardFile.js';

function isSameFile(a, b) {
  if (!fs.existsSync(b)) return false;
  try {
    const left = fs.statSync(a);
    const right = fs.statSync(b);
    return left.ino !== 0 && left.ino === right.ino && left.dev === right.dev;
  } catch {
    return false;
  }
}

function pasteFileFromStorage(reference, targetDir, storagePath) {
  const filename = path.basename(resolveHome(reference));
  const source = path.resolve(path.join(storagePath, filename));

  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    console.error(`Error: file not found in storage: '${source}'`);
    return false;
  }

  const destination = path.resolve(path.join(targetDir, filename));

  if (isSameFile(source, destination)) {
    console.log(`Skip copying because source and destination are the same file: '${source}'`);
    return true;
  }

  fs.copyFileSync(source, destination);
  console.log(`Copied '${source}' to '${destination}'`);
  return true;
}

export async function paste(args) {
  const { storagePath, clipboardFilePath } = getStoragePaths();

  const raw = readClipboardFile();
  if (raw === null) {
    console.error(`Error: clipboard file not found: ${clipboardFilePath}`);
    return 1;
  }

  const content = raw.trim();
  const fileRefs = parseFileReferences(content);

  const flagIndex = args.findIndex(arg => arg === '-f' || arg === '--file');
  const wantsFile = flagIndex !== -1;

  if (!wantsFile) {
    if (fileRefs.length > 0) {
      console.error('Error: clipboard contains a file reference. Use -f to paste the file.');
      return 1;
    }
    const text = normalizeNewlines(raw);
    console.log(`Read content: \`${visualize(text)}\``);
    await writeSystemClipboard(text);
    console.log(`Content copied to system clipboard from ${clipboardFilePath}`);
    return 0;
  }

  if (fileRefs.length === 0) {
    console.error('Error: clipboard does not contain a file reference.');
    return 1;
  }

  const targetDir = path.resolve(resolveHome(args[flagIndex + 1] ?? '.'));

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: target directory does not exist: '${targetDir}'`);
    return 1;
  }
  if (!fs.statSync(targetDir).isDirectory()) {
    console.error(`Error: target path is not a directory: '${targetDir}'`);
    return 1;
  }

  for (const reference of fileRefs) {
    if (!pasteFileFromStorage(reference, targetDir, storagePath)) return 1;
  }
  return 0;
}
