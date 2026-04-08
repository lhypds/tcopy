// Send text (or current clipboard content) to the tcopy server.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import clipboard from 'clipboardy';
import 'dotenv/config';
import { readId } from '../utils/idUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idFile = path.join(__dirname, 'id');

const REQUEST_TIMEOUT_MS = parseFloat(process.env.REQUEST_TIMEOUT_SECONDS ?? '5') * 1000;

async function postContent(url, content = null) {
  if (content === null) {
    content = await clipboard.read();
  }

  const contentReplaced = content
    .replace(/\n/g, '<LF>')
    .replace(/\r/g, '<CR>')
    .replace(/\t/g, '<TAB>')
    .replace(/ /g, '<SPACE>');

  console.log(`Send content: \`${contentReplaced}\``);
  console.log(`Sending POST request to \`${url}\`.`);

  // Read client id
  const id = readId(idFile);

  const timestamp = String(Math.floor(Date.now() / 1000));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text: contentReplaced, timestamp }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const body = await response.text();
    console.log(`Server response: \`${body}\``);

    if (response.ok) {
      console.log('Clipboard content sent.');
      return true;
    } else {
      console.log(`Failed to send clipboard content. Status code: ${response.status}`);
      return false;
    }
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      console.error(`Error: Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    } else {
      console.error('Error: Cannot connect to server.');
    }
    return false;
  }
}

const args = process.argv.slice(2);
const serverBaseUrl = process.env.SERVER_BASE_URL;

if (!serverBaseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

const content = args.length > 0 ? args.join(' ').trim() : null;
const success = await postContent(serverBaseUrl, content);
if (!success) process.exit(1);
