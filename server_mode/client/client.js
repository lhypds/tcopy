// `tcopy` client — connects to `tcopy` server's SSE endpoint and updates
// clipboard on content changes. Written in Node.js using EventSource for SSE.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import clipboard from 'clipboardy';
import 'dotenv/config';
import { writeId } from '../utils/idUtils.js';
import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { setupConnection } from '../utils/peerUtils.js';

import wrtc from "@roamhq/wrtc";

// Set WebRTC globals BEFORE loading peerjs
globalThis.window = globalThis;
globalThis.self = globalThis;

globalThis.RTCPeerConnection = wrtc.RTCPeerConnection;
globalThis.RTCSessionDescription = wrtc.RTCSessionDescription;
globalThis.RTCIceCandidate = wrtc.RTCIceCandidate;
globalThis.MediaStream = wrtc.MediaStream;

if (!globalThis.navigator) {
  globalThis.navigator = {};
}
if (!globalThis.navigator.mediaDevices) {
  globalThis.navigator.mediaDevices = {};
}

// Dynamically import peerjs AFTER globals are ready
const peerjsModule = await import("peerjs");
const peerjs = peerjsModule.default ?? peerjsModule;
const { Peer } = peerjs;

const log = createLogger('client.log');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idFile = path.join(__dirname, 'id');

const HEARTBEAT_TIMEOUT = 40_000; // ms
const RECONNECT_DELAY = 10_000; // ms

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

// PeerJS client for WebRTC
const url = new URL(baseUrl);
const peer = new Peer(id, {
  host: url.hostname,
  port: url.port ? Number(url.port) : (url.protocol === "https:" ? 443 : 80),
  path: "/signal",
  secure: url.protocol === "https:",
  wrtc,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  },
});

peer.on("open", (id) => {
  log('info', `Ready for incoming connections. (ID: ${id})`);
});

peer.on("connection", (conn) => {
  log('info', `Incoming connection from ${conn.peer}.`);
  setupConnection(conn);
});

peer.on("error", (err) => {
  log('error', `Peer error: ${err.message || err}`);
});

peer.on("disconnected", () => {
  log('warn', "Disconnected from peer server.");
});

peer.on("close", () => {
  log('warn', "Peer closed.");
});

connectAndWatchEvents(baseUrl, id);
