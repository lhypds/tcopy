import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeClipboard, fetchRemoteClipboard, readPlainTextClipboard } from '../utils/clipboardUtils.js';
import { resolvePath } from '../utils/pathUtils.js';
import fs from 'fs';
import EventSource from 'eventsource';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Remote server base URL
const baseUrl = process.env.SERVER_BASE_URL;
if (!baseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

// Client server port
const port = process.env.PORT || 5460;

const sseUrl = `http://localhost:${port}/paste`;

async function triggerPeerTransfer(fromPeerId, filePath, pasteTo) {
  const params = new URLSearchParams({
    fromPeerId: String(fromPeerId ?? ''),
    filePath: String(filePath ?? ''),
    pasteTo: String(pasteTo ?? ''),
  });

  return await new Promise((resolve) => {
    const es = new EventSource(`${sseUrl}?${params.toString()}`);
    const timeout = setTimeout(() => {
      es.close();
      resolve(false);
    }, 15000);

    es.onmessage = (event) => {
      if (event.data?.trim()) {
        console.log('SSE:', event.data.trim());
      }
      clearTimeout(timeout);
      es.close();
      resolve(true);
    };

    es.addEventListener('heartbeat', (e) => {
      console.log(`SSE: Heartbeat (server: ${baseUrl}, data: ${e.data})`);
      resetHeartbeat();
    });

    es.onerror = () => {
      clearTimeout(timeout);
      es.close();
      resolve(false);
    };
  });
}

const remoteClipboardResult = await fetchRemoteClipboard(baseUrl);
if (!remoteClipboardResult.success) {
  console.error(`Error: ${remoteClipboardResult.error}`);
  console.log("Abort: failed to fetch remote clipboard content.");
  process.exit(1);
}

const { id, text } = readPlainTextClipboard(remoteClipboardResult.content);
console.log(`Parsed clipboard content: id=\`${id}\`, text=\`${text}\``);

const args = process.argv.slice(2);

// ---- pasting remote clipboard text to local clipboard -------------

// Has no argument.
// e.g., `node fetch.js`
if (args.length == 0) {
  console.log("Pasting to clipboard...");

  // Write remote clipboard content to local clipboard
  await writeClipboard(text);
  process.exit(0);
}

// ---- pasting a file to local path ---------------------------------

// Has a argument.
// e.g., `node fetch.js /path/to/destination`
const pasteTo = resolvePath(args[0]);
console.log("Pasting to path:", pasteTo);

// Check path exist
if (pasteTo && !fs.existsSync(pasteTo)) {
  console.error(`Error: path \`${pasteTo}\` does not exist.`);
  process.exit(1);
}

let success = true;
if (text.startsWith("+file") || text.startsWith("+image")) {
  // Fetch remote file
  // Example: `+file[/home/user/a.txt]`
  const match = text.match(/\[(.*?)\]/);     // (.*?)  →  non‑greedy
  const filePath = match ? match[1] : null;  // 1 is the first capture group

  // Trigger client server to fetch file.
  success = await triggerPeerTransfer(id, filePath, pasteTo);
}

if (!success) {
  console.error("Error: failed to fetch remote file.");
  process.exit(1);
}
