import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import clipboard from 'clipboardy';
import dotenv from 'dotenv';
import { writeId } from '../utils/idUtils.js';
import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { setupConnection, connectToPeer } from '../utils/peerUtils.js';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

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

const HEARTBEAT_TIMEOUT = 40_000; // ms
const RECONNECT_DELAY = 10_000; // ms

const id = writeId(path.join(__dirname, 'id'));

// Logger
const log = createLogger('client.log');

log('info', `Starting tcopy client (id: ${id})...`);

// Client local server port
const port = process.env.PORT || 5461;

// Server base URL
const baseUrl = process.env.SERVER_BASE_URL;

if (!baseUrl) {
  log('error', 'SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

const sseUrl = `${baseUrl}/sse?id=${id}`;
const peerSignalUrl = `${baseUrl}/signal`;

globalThis.sseStatus = 'starting';
globalThis.peerStatus = 'starting';

process.on('SIGINT', () => {
  globalThis.sseStatus = 'disconnected';
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
  globalThis.peerStatus = 'connected';
  log('info', `Ready for incoming connections. (ID: ${id})`);
});

peer.on("connection", (conn) => {
  log('info', `Incoming connection from ${conn.peer}.`);
  setupConnection(conn);
});

peer.on("error", (err) => {
  globalThis.peerStatus = 'error';
  log('error', `Peer error. ${err.message || err}`);
});

peer.on("disconnected", () => {
  globalThis.peerStatus = 'disconnected';
  log('warn', "Disconnected from peer server.");
});

peer.on("close", () => {
  globalThis.peerStatus = 'closed';
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

// Get client info
app.get('/', (req, res) => {
  return res.json({
    id,
    serverBaseUrl: baseUrl,
    sse: {
      url: sseUrl,
      status: globalThis.sseStatus,
    },
    peer: {
      url: peerSignalUrl,
      status: globalThis.peerStatus,
    }
  });
});

// Route to get the content of the file
app.post('/paste', async (req, res) => {
  // Trigger paste
  const { fromPeerId, filePath, pasteTo } = req.body || {};

  // Log the paste request
  log('info', `Received paste request: ${JSON.stringify({ fromPeerId, filePath, pasteTo })}`);

  if (!fromPeerId) {
    log('warn', 'Paste request missing fromPeerId.');
    return res.status(400).json({ success: false, error: 'fromPeerId is required' });
  }

  // Connect to the peer to trigger file transfer
  try {
    await connectToPeer(peer, fromPeerId);
    return res.json({ success: true });
  } catch (error) {
    log('error', `Failed to connect to peer ${fromPeerId}: ${error.message || error}`);
    return res.status(500).json({ success: false, error: 'Failed to connect to peer' });
  }
});

app.listen(port, () => {
  // Log server start message
  log('info', `Server (client local server) is running at \`http://localhost:${port}\`.`);

  // Print available endpoints
  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'POST', path: '/paste' },
  ]
  console.log('\nAvailable endpoints:');
  endpoints.forEach(endpoint => {
    console.log(`- ${endpoint.method} ${endpoint.path}`);
  });
  console.log('');
});

// Connect SSE
async function connectAndWatchEvents(baseUrl, id) {
  while (true) {
    await new Promise(resolve => {
      let heartbeatTimer;
      globalThis.sseStatus = 'connecting';

      function resetHeartbeat() {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = setTimeout(() => {
          globalThis.sseStatus = 'reconnecting';
          log('warning', `No heartbeat received for ${HEARTBEAT_TIMEOUT / 1000}s. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
          es.close();
          resolve();
        }, HEARTBEAT_TIMEOUT);
      }

      const es = new EventSource(sseUrl);
      es.onopen = () => {
        globalThis.sseStatus = 'connected';
        log('info', `Connected to SSE endpoint: ${sseUrl}`);
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
        globalThis.sseStatus = 'reconnecting';
        log('warning', `Connection error. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
        es.close();
        resolve();
      };
    });

    await sleep(RECONNECT_DELAY);
  }
}

connectAndWatchEvents(baseUrl, id);
