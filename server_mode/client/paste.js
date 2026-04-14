// Fetch remote clipboard content and paste it to the local clipboard.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeClipboard, fetchRemoteClipboard, readPlainTextClipboard } from '../utils/clipboardUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const baseUrl = process.env.SERVER_BASE_URL;
if (!baseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

const remoteClipboardResult = await fetchRemoteClipboard(baseUrl);
if (!remoteClipboardResult.success) {
  console.error(`Error: ${remoteClipboardResult.error}`);
  console.log('Abort: failed to fetch remote clipboard content.');
  process.exit(1);
}

const { id, text } = readPlainTextClipboard(remoteClipboardResult.content);
console.log(`Remote server clipboard content (id: ${id}):\n\`\`\`\n${text.replace(/\n/g, '\\n')}\n\`\`\``);

console.log('Pasting to local clipboard...');
await writeClipboard(text);
console.log('Content pasted to local clipboard.');
