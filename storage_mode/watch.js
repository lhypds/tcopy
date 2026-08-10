// Storage mode: watch the shared clipboard file and mirror its content into
// the system clipboard.
//
// chokidar's awaitWriteFinish handles the partially-written-file case, and
// watching the parent directory (non-recursively) survives the delete/recreate
// cycle that sync clients produce.
import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { getStoragePaths } from '../config.js';
import { isFileReference } from '../utils/fileRefs.js';
import { normalizeNewlines, writeSystemClipboard } from './clipboardFile.js';

// Local time, matching the Python version's time.localtime() output.
function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

export async function watch() {
  const { storagePath, clipboardFilePath } = getStoragePaths();

  fs.mkdirSync(storagePath, { recursive: true });

  let lastContent = null;

  async function handleChange() {
    let raw;
    try {
      raw = fs.readFileSync(clipboardFilePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return; // Removed between event and read.
      console.error(`Error reading ${clipboardFilePath}: ${error.message}`);
      return;
    }

    // Suppress no-op events; sync clients rewrite files with identical content.
    if (raw === lastContent) return;
    lastContent = raw;

    const content = normalizeNewlines(raw);

    if (isFileReference(content.trim())) {
      console.log(`File reference detected in clipboard: ${content.trim()}. Skipping clipboard update.`);
      return;
    }

    try {
      await writeSystemClipboard(content);
    } catch (error) {
      console.error(`Error writing to system clipboard: ${error.message}`);
      return;
    }

    console.log(`${timestamp()} - update received, content:`);
    console.log(content);
  }

  const watcher = chokidar.watch(storagePath, {
    depth: 0,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('all', (event, changedPath) => {
    if (path.resolve(changedPath) !== path.resolve(clipboardFilePath)) return;
    if (event === 'unlink') {
      lastContent = null;
      return;
    }
    void handleChange();
  });

  watcher.on('error', error => {
    console.error(`Watcher error: ${error.message}`);
  });

  console.log(`Start watching file \`${clipboardFilePath}\` for changes...`);

  const shutdown = () => {
    void watcher.close().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the event loop alive for the detached daemon.
  return new Promise(() => {});
}
