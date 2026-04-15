import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import { clearProgressBar, renderProgressBar } from '../utils/progressUtils.js';
import { createLogger } from '../utils/logUtils.js';

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

// Local SSE endpoint for file paste events
const sseFilePasteUrl = `http://localhost:${port}/filepaste`;

// Logger
const log = createLogger('peer.log');

export async function triggerPeerTransfer(fromPeerId, fromPath, saveTo) {
  const params = new URLSearchParams({
    fromPeerId: String(fromPeerId ?? ''),
    fromPath: String(fromPath ?? ''),
    saveTo: String(saveTo ?? ''),
  });

  log(`info`, `Triggering peer transfer...`);

  return await new Promise((resolve) => {
    const es = new EventSource(`${sseFilePasteUrl}?${params.toString()}`);
    let progressActive = false;
    let timeout = setTimeout(() => {
      es.close();
      resolve(false);
    }, 15000);

    es.onmessage = (event) => {
      const msg = event.data?.trim();
      let parsedMessage = null;

      if (msg) {
        try {
          parsedMessage = JSON.parse(msg);
        } catch {
          parsedMessage = null;
        }
      }

      if (parsedMessage?.type === 'progress') {
        progressActive = true;
        renderProgressBar(parsedMessage);
      } else if (msg) {
        if (progressActive) {
          clearProgressBar();
          process.stdout.write('\n');
          progressActive = false;
        }

        log('info', `SSE: ${msg}`);
      }

      // Reset the overall timeout on each incoming message
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        es.close();
        resolve(false);
      }, 15000);

      // Only close once we receive a terminal event
      if (
        msg.startsWith('File saved:') ||
        msg.startsWith('Connection closed') ||
        msg.startsWith('Connection error') ||
        msg.startsWith('Error')
      ) {
        clearTimeout(timeout);
        es.close();
        resolve(msg.startsWith('File saved:'));
      }
    };

    es.addEventListener('heartbeat', (e) => {
      log('debug', `SSE: Heartbeat (server: ${baseUrl}, data: ${e.data})`);
    });

    es.onerror = () => {
      if (progressActive) {
        clearProgressBar();
        process.stdout.write('\n');
        progressActive = false;
      }

      clearTimeout(timeout);
      es.close();
      resolve(false);
    };
  });
}

export async function fetchClipboard() {
  const url = baseUrl;

  try {
    log('info', `Fetching content from \`${url}\`.`);
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();
    return {
      success: true,
      content: content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
