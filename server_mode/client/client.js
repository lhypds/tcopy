import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventSource from 'eventsource';
import clipboard from 'clipboardy';
import dotenv from 'dotenv';
import { readId } from '../utils/idUtils.js';
import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { startSseHeartbeat, resetSseTimeout } from '../utils/sseUtils.js';
import { RECONNECT_DELAY } from '../constants.js';
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

const id = readId(path.join(__dirname, 'id'));

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

// ---- I. Connect SSE for clipboard updates from server -------------
async function connectAndWatchEvents() {
  while (true) {
    await new Promise(resolve => {
      let heartbeatTimer;
      globalThis.sseStatus = 'connecting';

      function resetHeartbeat() {
        heartbeatTimer = resetSseTimeout(heartbeatTimer, () => {
          globalThis.sseStatus = 'reconnecting';
          log('warning', `No heartbeat received. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
          es.close();
          resolve();
        });
      }

      const es = new EventSource(sseUrl);
      es.onopen = () => {
        globalThis.sseStatus = 'connected';
        log('info', `Connected to SSE endpoint: ${sseUrl}`);
        resetHeartbeat();
      };

      es.addEventListener('heartbeat', (e) => {
        log('debug', `Heartbeat (server: ${baseUrl}, data: ${e.data})`);
        resetHeartbeat();
      });

      es.onmessage = async event => {
        resetHeartbeat();

        try {
          const data = JSON.parse(event.data);
          const { id: id_, text = '', timestamp = '' } = data;

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
          log('info', `Content received(id: ${id_}, timestamp: ${timestamp}): \`${contentReplaced}\``);
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
connectAndWatchEvents();

// ---- II. PeerJS client for WebRTC connections ---------------------
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
  log('info', `Peer open: server = ${baseUrl}/signal`);
});

peer.on("connection", (conn) => {
  globalThis.peerStatus = 'connection';
  log('info', `Peer connection: incoming connection peer = ${conn.peer}.`);

  conn.on("open", async () => {
    log('info', `Peer connection | Connection open: connection peer = ${conn.peer}`);
  });

  conn.on("close", () => {
    log('info', `Peer connection | Connection closed: connection peer = ${conn.peer}`);
  });

  conn.on("error", (err) => {
    log('error', `Peer connection | Connection error: connection peer = ${conn.peer}, error = ${err.message || err}`);
  });

  conn.on("data", async (data) => {
    log('info', `Peer connection | Connection data: received, connection peer = ${conn.peer}`);
  });
});

peer.on("error", (err) => {
  globalThis.peerStatus = 'error';
  log('error', `Peer error: server = ${baseUrl}/signal, error = ${err.message || err}`);
});

peer.on("disconnected", () => {
  globalThis.peerStatus = 'disconnected';
  log('info', `Peer disconnected: server = ${baseUrl}/signal`);
});

peer.on("close", () => {
  globalThis.peerStatus = 'closed';
  log('warn', `Peer close: server = ${baseUrl}/signal`);
});

// Local SSE route for accepting paste events and triggering PeerJS file transfer
app.get('/filepaste', async (req, res) => {
  // Get paste parameters from query string
  const { fromPeerId, filePath, pasteTo } = req.query || {};

  // Log the paste request
  log('info', `Received paste SSE request: ${JSON.stringify({ fromPeerId, filePath, pasteTo })}`);

  if (!fromPeerId) {
    log('warn', 'Paste SSE request missing fromPeerId.');
    return res.status(400).json({ success: false, error: 'fromPeerId is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Connect to the peer to trigger file transfer
  try {
    // Keep connection alive with heartbeats
    const heartbeatInterval = startSseHeartbeat(res);
    const conn = peer.connect(fromPeerId);

    conn.on('open', () => {
      log('info', `Paste SSE | Connection open: peer = ${conn.peer}`);

      // Send success event
      res.write(`data: Connected to peer (id: ${conn.peer})\n\n`);
    });

    conn.on('error', (error) => {
      log('error', `Paste SSE | Connection error: peer = ${conn.peer}, error = ${error.message || error}`);

      res.write(`data: Connection error (id: ${fromPeerId}).\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
    });

    // Clean up on client disconnect
    req.on('close', () => {
      log('info', `Paste SSE | Connection close: peer = ${fromPeerId}`);

      clearInterval(heartbeatInterval);
      res.end();
    });
  } catch (error) {
    log('error', `Paste SSE failed with error: ${error.message || error}`);

    res.write(`data: Error (id: ${fromPeerId}).\n\n`);
    res.end();
  }
});

// Server start
// Get client info and status
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

app.listen(port, () => {
  // Log server start message
  log('info', `Server (client local server) is running at \`http://localhost:${port}\`.`);

  // Print available endpoints
  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/filepaste' },
  ]
  console.log('\nAvailable endpoints:');
  endpoints.forEach(endpoint => {
    console.log(`- ${endpoint.method} ${endpoint.path}`);
  });
  console.log('');
});
