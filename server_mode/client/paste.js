// Fetch remote clipboard content and paste it to the local clipboard.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSystemClipboard, readPlainTextClipboard } from '../utils/clipboardUtils.js';
import { fetchClipboard, triggerPeerTransfer } from './fetch.js';
import fs from 'fs';

const FILE_REF_PATTERN = /\+file\[([^\]]+)\]/g;
const FILE_REF_CONTENT_PATTERN = /^\s*(?:\+file\[[^\]]+\])(?:\s+\+file\[[^\]]+\])*\s*$/;

function parseFileReferences(text) {
  if (!FILE_REF_CONTENT_PATTERN.test(text)) {
    return [];
  }

  return Array.from(text.matchAll(FILE_REF_PATTERN), match => match[1]);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const baseUrl = process.env.SERVER_BASE_URL;
if (!baseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

const remoteClipboardResult = await fetchClipboard();
if (!remoteClipboardResult.success) {
  console.error(`Error: ${remoteClipboardResult.error}`);
  console.log('Abort: failed to fetch remote clipboard content.');
  process.exit(1);
}

const { id, text } = readPlainTextClipboard(remoteClipboardResult.content);
console.log(`Remote server clipboard content (id: ${id}):\n\`\`\`\n${text.replace(/\n/g, '\\n')}\n\`\`\``);

// Paste file flag
const args = process.argv.slice(2);
const isPasteFile = args.includes('-f') || args.includes('--file');
const fileRefs = parseFileReferences(text);

// Normal text
if (!isPasteFile) {
  console.log('Pasting to local clipboard...');
  await writeSystemClipboard(text);
  console.log('Content pasted to local clipboard.');
}

// File reference
if (isPasteFile) {
  if (fileRefs.length === 0) {
    console.error('Error: clipboard content is not a valid file reference.');
    process.exit(1);
  }

  const fromPeerId = id;

  // Save to
  const flagIndex = args.indexOf('-f') !== -1 ? args.indexOf('-f') : args.indexOf('--file');
  const saveTo = flagIndex !== -1
    ? (args[flagIndex + 1] ?? process.cwd())
    : "";

  // Check path exist
  if (!saveTo || !fs.existsSync(saveTo)) {
    console.error(`Error: path \`${saveTo}\` does not exist.`);
    process.exit(1);
  }

  if (!fs.statSync(saveTo).isDirectory()) {
    console.error(`Error: path \`${saveTo}\` is not a directory.`);
    process.exit(1);
  }

  for (const fromPath of fileRefs) {
    console.log(`Fetching remote file from peer, id = ${fromPeerId}, remote path = \`${fromPath}\`, saving to = \`${saveTo}\``);

    const success = await triggerPeerTransfer(fromPeerId, fromPath, saveTo);
    if (!success) {
      console.log('Abort: failed to fetch remote file.');
      process.exit(1);
    }
  }
  console.log('File(s) fetched and saved.');
}
