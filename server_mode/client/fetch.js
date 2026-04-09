import 'dotenv/config';
import { writeClipboard, fetchRemoteClipboard, readPlainTextClipboard } from '../utils/clipboardUtils.js';
import { resolvePath } from '../utils/pathUtils.js';
import fs from 'fs';

const baseUrl = process.env.SERVER_BASE_URL;
if (!baseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

async function fetchFile(fromPeerId, filePath, pasteTo) {
  // Trigger paste
  const response = await fetch("/paste", {
    method: "POST",
    body: {
      fromPeerId: fromPeerId,
      filePath: filePath,
      pasteTo: pasteTo,
    }
  });

  if (!response.ok) {
    return false;
  }
  return true;
}

const remoteClipboardContent = await fetchRemoteClipboard(baseUrl);
const { id, text } = readPlainTextClipboard(remoteClipboardContent);
console.log(`Parsed clipboard content: id=\`${id}\`, text=\`${text}\``);

const args = process.argv.slice(2);

// e.g., `node fetch.js`
if (args.length == 0) {
  console.log("Pasting to clipboard...");

  // Write remote clipboard content to local clipboard
  await writeClipboard(text);
  process.exit(0);
}

const pasteTo = resolvePath(args[0]);
console.log("Pasting to path:", pasteTo);

// Check path exist
if (pasteTo && !fs.existsSync(pasteTo)) {
  console.error(`Error: path \`${pasteTo}\` does not exist.`);
  process.exit(1);
}

// e.g., `node fetch.js /path/to/destination`
let success = true;
if (text.startsWith("+file") || text.startsWith("+image")) {
  // Fetch remote file
  // Example: `+file[/home/user/a.txt]`
  const match = text.match(/\[(.*?)\]/);     // (.*?)  →  non‑greedy
  const filePath = match ? match[1] : null;  // 1 is the first capture group

  // Trigger client server to fetch file.
  success = await fetchFile(id, filePath, pasteTo);
}

if (!success) {
  process.exit(1);
}
