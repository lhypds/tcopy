// Copy text (or a file reference) to the tcopy server.
import { postContent } from './post.js';
import { readSystemClipboard } from '../utils/clipboardUtils.js';
import fs from 'fs';

const args = process.argv.slice(2);

let content;

if (args.length === 0) {
  // No arguments: POST current clipboard content
  console.log('Reading content from local clipboard...');
  content = await readSystemClipboard();
} else if (args[0] === '-f' || args[0] === '--file') {
  if (args.length < 2) {
    console.error('Abort: missing file path after -f/--file.');
    process.exit(1);
  }

  const filePaths = args.slice(1);

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.error(`Abort: file not exists: ${filePath}`);
      process.exit(1);
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      const kind = stats.isDirectory()
        ? 'directory (macOS .app bundles are directories)'
        : 'non-regular file';
      console.error(`Abort: only regular files are supported in server mode; unsupported ${kind}: ${filePath}`);
      process.exit(1);
    }
  }

  console.log('Posting file reference(s) to server...');
  content = filePaths.map(filePath => `+file[${filePath}]`).join(' ');
} else {
  // First argument is the text to POST
  console.log('Posting text to server...');
  content = args[0];
}

await postContent(content);
console.log('Content copied to server clipboard.');
