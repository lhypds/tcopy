import path from 'node:path';
import fs from 'node:fs';
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
import { resolvePath } from '../utils/pathUtils.js';

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
        log('warning', `Server connection error. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
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

// Data source side
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

    // Handle file request
    if (data && data.type === 'file_request' && data.filePath) {
      log('info', `Peer connection | File request: filePath = ${data.filePath}`);

      // Check file exist
      const filePath = resolvePath(data.filePath);
      if (!fs.existsSync(filePath)) {
        log('warn', `Peer connection | File not found: filePath = ${filePath}`);

        // Close connection
        conn.close();
        return;
      }

      // Send file
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      const chunkSize = 64 * 1024; // 64KB
      const MAX_BUFFERED_AMOUNT = 16 * chunkSize; // 1MB

      // Send metadata first
      conn.send({
        type: 'file-meta',
        name: fileName,
        size: fileSize,
        mime: 'application/octet-stream',
      });

      // Stream and send chunks to avoid loading the entire file into memory
      const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      for await (const chunk of stream) {
        while (conn.dataChannel && conn.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          await sleep(50);
        }
        conn.send({ type: 'file-chunk', chunk });
      }

      conn.send({ type: 'file-end' });
      log('info', `Peer connection | File sent: filePath = ${filePath}, size = ${fileSize} bytes`);
    }
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

// Paste SSE: Local SSE route for accepting paste events and triggering PeerJS file transfer
app.get('/filepaste', async (req, res) => {
  // Get paste parameters from query string
  const { fromPeerId, filePath, pasteTo } = req.query || {};

  // Log the paste request
  log('info', `Paste SSE: received paste SSE request: ${JSON.stringify({ fromPeerId, filePath, pasteTo })}`);

  if (!fromPeerId) {
    log('warn', 'Paste SSE: request missing fromPeerId.');
    return res.status(400).json({ success: false, error: 'fromPeerId is required' });
  }

  if (!filePath) {
    log('warn', 'Paste SSE: request missing filePath.');
    return res.status(400).json({ success: false, error: 'filePath is required' });
  }

  if (!pasteTo) {
    log('warn', 'Paste SSE: request missing pasteTo.');
    return res.status(400).json({ success: false, error: 'pasteTo is required' });
  }

  // Check paste to path exists
  const pasteTo_ = resolvePath(pasteTo);
  if (!fs.existsSync(pasteTo_) || !fs.statSync(pasteTo_).isDirectory()) {
    log('warn', `Paste SSE: request pasteTo path does not exist or is not a directory: pasteTo = ${pasteTo_}`);
    return res.status(400).json({ success: false, error: 'pasteTo path does not exist or is not a directory' });
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

    // Data destination side
    const conn = peer.connect(fromPeerId);

    // File receive state
    let fileMeta = null;
    let fileChunks = [];
    let receivedSize = 0;

    conn.on('open', () => {
      log('info', `Paste SSE | Connection open: peer = ${conn.peer}`);

      // Send success SSE message
      res.write(`data: Connected to peer (id: ${conn.peer})\n\n`);

      // Send filePath for verification
      conn.send({ type: 'file_request', filePath });
    });

    conn.on("close", () => {
      log('info', `Paste SSE | Connection closed: connection peer = ${conn.peer}`);

      // Send close SSE message
      res.write(`data: Connection closed (id: ${fromPeerId}).\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
    });

    conn.on('error', (error) => {
      log('error', `Paste SSE | Connection error: peer = ${conn.peer}, error = ${error.message || error}`);

      // Send error SSE message
      res.write(`data: Connection error (id: ${fromPeerId}).\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
    });

    conn.on("data", async (data) => {
      log('info', `Paste SSE | Connection data: received, connection peer = ${conn.peer}`);

      // Handle file transfer
      if (data.type === 'file-meta') {
        fileMeta = data;
        fileChunks = [];
        receivedSize = 0;
        log('info', `Paste SSE | File meta received: name = ${fileMeta.name}, size = ${fileMeta.size}`);
        res.write(`data: Receiving file: ${fileMeta.name} (${fileMeta.size} bytes)\n\n`);
        return;
      }

      if (data.type === 'file-chunk') {
        fileChunks.push(Buffer.from(data.chunk));
        receivedSize += data.chunk.byteLength;

        // Notify progress
        const progress = fileMeta?.size ? Math.round((receivedSize / fileMeta.size) * 100) : 0;
        log('debug', `Paste SSE | File chunk received: ${receivedSize}/${fileMeta?.size} (${progress}%)`);
        res.write(`data: Receiving: ${fileMeta.name} — ${receivedSize}/${fileMeta.size} bytes (${progress}%)\n\n`);
        return;
      }

      if (data.type === 'file-end') {
        const fileBuffer = Buffer.concat(fileChunks);
        const destDir = resolvePath(pasteTo);
        const destPath = path.join(destDir, fileMeta.name);

        fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destPath, fileBuffer);

        log('info', `Paste SSE | File saved: path = ${destPath}, size = ${fileBuffer.length} bytes`);
        res.write(`data: File saved: ${destPath}\n\n`);

        // Clear state
        fileMeta = null;
        fileChunks = [];
        receivedSize = 0;

        // Close connection
        conn.close();
      }
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
