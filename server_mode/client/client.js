// `tcopy` client — connects to `tcopy` server's SSE endpoint and updates
// clipboard on content changes. Written in Node.js using EventSource for SSE.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import clipboard from 'clipboardy';
import 'dotenv/config';
import { createLogger } from '../utils/logUtils.js';
import { writeId } from '../utils/idUtils.js';
import { sleep } from '../utils/sleepUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idFile = path.join(__dirname, 'id');

const HEARTBEAT_TIMEOUT = 40_000; // ms
const RECONNECT_DELAY = 10_000; // ms
const LOG_FILE = 'client.log';

const log = createLogger(LOG_FILE);

async function connectAndWatchEvents(baseUrl, id) {
  while (true) {
    await new Promise(resolve => {
      let heartbeatTimer;

      function resetHeartbeat() {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = setTimeout(() => {
          log('warning', `No heartbeat received for ${HEARTBEAT_TIMEOUT / 1000}s. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
          es.close();
          resolve();
        }, HEARTBEAT_TIMEOUT);
      }

      const es = new EventSource(`${baseUrl}/sse?id=${encodeURIComponent(id)}`);

      es.onopen = () => {
        log('info', `Connected to SSE endpoint: ${baseUrl}/sse?id=${id}`);
        resetHeartbeat();
      };

      es.onmessage = async event => {
        resetHeartbeat();
        try {
          const data = JSON.parse(event.data);
          const { id: id_, text = '', timestamp = '' } = data;

          if (text === '###ALIVE###') {
            log('debug', 'Heartbeat.');
            return;
          }

          if (id === id_) {
            log('debug', 'Ignored as sent by self.');
            return;
          }

          const contentReplaced = text
            .replace(/\n/g, '<LF>')
            .replace(/\r/g, '<CR>')
            .replace(/\t/g, '<TAB>')
            .replace(/ /g, '<SPACE>');

          await clipboard.write(text);
          log('info', `Content received (id: ${id_}, timestamp: ${timestamp}): \`${contentReplaced}\``);
        } catch (e) {
          log('error', `Error parsing data: ${e.message}`);
        }
      };

      es.onerror = () => {
        clearTimeout(heartbeatTimer);
        log('warning', `Connection error. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
        es.close();
        resolve();
      };
    });

    await sleep(RECONNECT_DELAY);
  }
}

const id = writeId(idFile);
const baseUrl = process.env.SERVER_BASE_URL;

log('info', `Starting tcopy client (id: ${id})...`);

if (!baseUrl) {
  log('error', 'SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

process.on('SIGINT', () => {
  log('info', 'Stopped by user.');
  process.exit(0);
});

connectAndWatchEvents(baseUrl, id);
