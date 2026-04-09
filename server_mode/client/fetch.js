import 'dotenv/config';
import { writeClipboard, fetchRemoteClipboard } from '../utils/clipboardUtils.js';

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

const args = process.argv.slice(2);
if (args.length == 0) {
  console.log("Failed: paste to path not provided.")
  process.exit(1);
}
const pasteTo = args[0];
const remoteClipboardContent = await fetchRemoteClipboard(baseUrl);
const { id, text } = readContent(remoteClipboardContent);

let success = true;
if (text.startsWith("+file") || text.startsWith("+image")) {
  // Fetch remote file
  // Example: `+file[/home/user/a.txt]`
  const match = text.match(/\[(.*?)\]/);     // (.*?)  →  non‑greedy
  const filePath = match ? match[1] : null;  // 1 is the first capture group

  // Trigger client server to fetch file.
  success = fetchFile(id, filePath, pasteTo);
} else {
  // Write remote clipboard content to local clipboard
  writeClipboard(remoteClipboardContent)
}

if (!success) process.exit(1);
