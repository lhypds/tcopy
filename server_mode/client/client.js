import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import clipboard from 'clipboardy';
import 'dotenv/config';
import { writeId } from '../utils/idUtils.js';
import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { setupConnection } from '../utils/peerUtils.js';
import express from 'express';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HEARTBEAT_TIMEOUT = 40_000; // ms
const RECONNECT_DELAY = 10_000; // ms

// Logger
const log = createLogger('client.log');

log('info', `Starting tcopy client (id: ${id})...`);

// Client local server port
const port = process.env.PORT || 5461;

const id = writeId(path.join(__dirname, 'id'));
const baseUrl = process.env.SERVER_BASE_URL;

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

// Express server (client local server)
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    log('info', `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
});

app.listen(port, () => {
  // Log server start message
  log('info', `Server (client local server) is running at \`http://localhost:${port}\`.`);

  // Print available endpoints
  const endpoints = [
    { method: 'POST', path: '/paste' },
  ]
  console.log('\nAvailable endpoints:');
  endpoints.forEach(endpoint => {
    console.log(`- ${endpoint.method} ${endpoint.path}`);
  });
  console.log('');
});

// Route to get the content of the file
app.get('/paste', (req, res) => {
  // Trigger paste
  const { fromPeerId, toPath } = req.body || {};
  peer.connect(fromPeerId);
});

// Connect SSE
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

connectAndWatchEvents(baseUrl, id);
