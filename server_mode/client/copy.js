// Copy text (or a file reference) to the tcopy server.
import { postContent } from './post.js';
import { readClipboard } from '../utils/clipboardUtils.js';

const args = process.argv.slice(2);

let content;

if (args.length === 0) {
  // No arguments: POST current clipboard content
  content = await readClipboard();
} else if (args[0] === '-f' && args[1]) {
  // -f <path>: POST a file reference
  const filePath = args[1];
  content = `+file[${filePath}]`;
} else {
  // First argument is the text to POST
  content = args[0];
}

await postContent(content);
