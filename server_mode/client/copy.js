// Copy text (or a file reference) to the tcopy server.
import { postContent } from './post.js';
import { readSystemClipboard } from '../utils/clipboardUtils.js';

const args = process.argv.slice(2);

let content;

if (args.length === 0) {
  // No arguments: POST current clipboard content
  console.log('Reading content from local clipboard...');
  content = await readSystemClipboard();
} else if ((args[0] === '-f' || args[0] === '--file') && args[1]) {
  // -f <path>: POST a file reference
  console.log('Posting file reference to server...');
  const filePath = args[1];
  content = `+file[${filePath}]`;
} else {
  // First argument is the text to POST
  console.log('Posting text to server...');
  content = args[0];
}

await postContent(content);
console.log('Content copied to server clipboard.');
