// Storage mode: write text or file references into the shared clipboard file.
import fs from 'node:fs';
import path from 'node:path';
import { getStoragePaths, resolveHome } from '../src/config.js';
import { parseFileReferences, formatFileReferences } from '../src/fileRefs.js';
import {
  ensureStorageDir,
  readClipboardFile,
  writeClipboardFile,
  readSystemClipboard,
} from './clipboardFile.js';

/**
 * If the clipboard currently holds `+file[...]` references, drop the matching
 * payloads from storage so they do not accumulate.
 */
function cleanupPreviousFiles() {
  const { storagePath } = getStoragePaths();
  const current = readClipboardFile();
  if (current === null) return;

  for (const reference of parseFileReferences(current.trim())) {
    const stored = path.join(storagePath, path.basename(resolveHome(reference)));
    if (fs.existsSync(stored)) {
      fs.rmSync(stored, { force: true });
      console.log(`Deleted previous file from storage: '${stored}'`);
    }
  }
}

function copyFileToStorage(sourcePath, storagePath) {
  const stats = fs.statSync(sourcePath);
  if (!stats.isFile()) {
    console.error(`Error: not a regular file: ${sourcePath}`);
    return false;
  }
  const destination = path.join(storagePath, path.basename(sourcePath));
  fs.copyFileSync(sourcePath, destination);
  console.log(`Copied '${sourcePath}' to '${destination}'`);
  return true;
}

export async function copy(args) {
  const storagePath = ensureStorageDir();
  const isFileMode = args[0] === '-f' || args[0] === '--file';

  if (isFileMode) {
    const filePaths = args.slice(1);
    if (filePaths.length === 0) {
      console.error('Error: missing file path after -f/--file.');
      return 1;
    }

    const expanded = filePaths.map(resolveHome);
    const missing = expanded.filter(filePath => !fs.existsSync(filePath));
    if (missing.length > 0) {
      for (const filePath of missing) console.error(`Error: file not found: ${filePath}`);
      return 1;
    }

    cleanupPreviousFiles();

    // The reference records the path as the user typed it; the payload is
    // stored under its basename.
    const content = formatFileReferences(filePaths);
    const clipboardFilePath = writeClipboardFile(content);
    console.log(`Updated clipboard file at '${clipboardFilePath}' with '${content}'`);

    for (const filePath of expanded) {
      if (!copyFileToStorage(filePath, storagePath)) return 1;
    }
    return 0;
  }

  cleanupPreviousFiles();

  if (args.length > 0) {
    const clipboardFilePath = writeClipboardFile(args[0]);
    console.log(`Updated clipboard file at '${clipboardFilePath}'`);
    return 0;
  }

  // No arguments: mirror the system clipboard into the shared file.
  // (The Python version shelled out to `pbpaste`, which is macOS-only.)
  const text = await readSystemClipboard();
  const clipboardFilePath = writeClipboardFile(text);
  console.log(`Copied system clipboard to '${clipboardFilePath}'`);
  return 0;
}
