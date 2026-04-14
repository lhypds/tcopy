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
async function connectSSE() {
  while (true) {
    await new Promise(resolve => {
      let heartbeatTimer;
      globalThis.sseStatus = 'connecting';

      function resetHeartbeat() {
        heartbeatTimer = resetSseTimeout(heartbeatTimer, () => {
          globalThis.sseStatus = 'reconnecting';
          log('info', `No heartbeat received. Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
          es.close();
          resolve();
        });
      }

      const es = new EventSource(sseUrl);
      es.onopen = () => {
        log('info', `SSE: Open, endpoint = ${sseUrl}`);

        globalThis.sseStatus = 'connected';
        resetHeartbeat();
      };

      es.addEventListener('heartbeat', (e) => {
        log('debug', `SSE: Heartbeat, server = ${baseUrl}, data = ${e.data}`);
        resetHeartbeat();
      });

      es.onmessage = async event => {
        log('debug', `SSE: Message, event data = ${event.data}`);
        resetHeartbeat();

        try {
          const data = JSON.parse(event.data);
          const { id: id_, text = '', timestamp = '' } = data;

          if (id === id_) {
            log('debug', 'SSE: Message, send to self, ignored.');
            return;
          }

          if (text.startsWith('+file[') && text.endsWith(']')) {
            log('info', `SSE: Message, file reference received, from id = ${id_}, data timestamp = ${timestamp}), file reference = ${text}`);
            return;
          }

          const contentReplaced = text
            .replace(/\n/g, '<LF>')
            .replace(/\r/g, '<CR>')
            .replace(/\t/g, '<TAB>')
            .replace(/ /g, '<SPACE>');

          await clipboard.write(text);
          log('info', `SSE: Message, content received, from id = ${id_}, data timestamp = ${timestamp}), content = \`${contentReplaced}\``);
        } catch (e) {
          log('error', `SSE: Message, error, error = ${JSON.stringify(e)}`);
        }
      };

      es.onerror = (error) => {
        log('info', `SSE: Error, error = ${JSON.stringify(error)}.`);

        clearTimeout(heartbeatTimer);
        globalThis.sseStatus = 'reconnecting';
        es.close();
        resolve();
      };
    });

    log('info', `SSE: Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
    await sleep(RECONNECT_DELAY);
  }
}

log('info', `Connecting to SSE endpoint: ${sseUrl}...`);
connectSSE();

// ---- II. PeerJS client for WebRTC connections ---------------------
const url = new URL(baseUrl);
let peer;

async function connectPeer() {
  while (true) {
    await new Promise(resolve => {
      globalThis.peerStatus = 'connecting';

      peer = new Peer(id, {
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

      // Timeout if the signaling server never responds (PeerJS silently hangs on unreachable servers)
      const connectTimeout = setTimeout(() => {
        if (globalThis.peerStatus !== 'connected') {
          log('info', `Peer: Connection timeout.`);
          peer.destroy();
        }
      }, RECONNECT_DELAY * 1.5);

      peer.on("open", () => {
        log('info', `Peer: Open, server = ${peerSignalUrl}`);

        globalThis.peerStatus = 'connected';
        clearTimeout(connectTimeout);
      });

      // Data source side: handle incoming connections and serve file requests
      peer.on("connection", (conn) => {
        log('info', `Peer: Incoming connection from peer = ${conn.peer}.`);

        conn.on("open", () => {
          log('info', `Peer | Connection: Open, peer = ${conn.peer}`);
        });

        conn.on("close", () => {
          log('info', `Peer | Connection: Closed, peer = ${conn.peer}`);
        });

        conn.on("error", (err) => {
          log('error', `Peer | Connection: Error, peer = ${conn.peer}, error = ${JSON.stringify(err)}`);
        });

        conn.on("data", async (data) => {
          log('info', `Peer | Connection: Data, received, peer = ${conn.peer}, data type = ${data?.type || 'unknown'}`);

          // Handle file request
          if (data && data.type === 'file_request' && data.filePath) {
            log('info', `Peer | Connection: Data, file request, filePath = ${data.filePath}`);

            const filePath = resolvePath(data.filePath);
            if (!fs.existsSync(filePath)) {
              log('warn', `Peer | File not found: filePath = ${filePath}`);
              conn.close();
              return;
            }

            log('info', `Peer | Connection: Data, file request valid, send file: filePath = ${filePath}`);
            const fileName = path.basename(filePath);
            const fileSize = fs.statSync(filePath).size;
            const chunkSize = 64 * 1024; // 64KB
            const MAX_BUFFERED_AMOUNT = 16 * chunkSize; // 1MB

            conn.send({
              type: 'file-meta',
              name: fileName,
              size: fileSize,
              mime: 'application/octet-stream',
            });

            // Stream chunks to avoid loading the entire file into memory
            const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
            try {
              for await (const chunk of stream) {
                if (!conn.open) {
                  log('warn', `Peer | Connection: Data, connection closed mid-transfer, aborting: filePath = ${filePath}`);
                  stream.destroy();
                  return;
                }
                while (conn.dataChannel && conn.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                  await sleep(50);
                }
                conn.send({ type: 'file-chunk', chunk });
              }
            } catch (error) {
              log('error', `Peer | Connection: Data, file send error, filePath = ${filePath}, error = ${JSON.stringify(error)}`);
              stream.destroy();
              return;
            }

            conn.send({ type: 'file-end' });
            log('info', `Peer | Connection: Data, file sent: filePath = ${filePath}, size = ${fileSize} bytes`);
          }
        });
      });

      peer.on("error", (error) => {
        log('info', `Peer: Error, error = ${JSON.stringify(error)}`);

        globalThis.peerStatus = 'error';
        clearTimeout(connectTimeout);

        // Destroy triggers 'close', which resolves and falls into the reconnect loop
        peer.destroy();
      });

      peer.on("disconnected", () => {
        log('info', `Peer: Disconnected.`);

        globalThis.peerStatus = 'reconnecting';
      });

      peer.on("close", () => {
        log('info', `Peer: Closed.`);

        globalThis.peerStatus = 'closed';
        clearTimeout(connectTimeout);
        resolve();
      });
    });

    log('info', `Peer: Reconnecting (${RECONNECT_DELAY / 1000}s)...`);
    await sleep(RECONNECT_DELAY);
  }
}

log('info', `Connecting to peer signaling endpoint: ${peerSignalUrl}...`);
connectPeer();

// Paste SSE: Local SSE route for accepting paste events and triggering PeerJS file transfer
app.get('/filepaste', async (req, res) => {
  // Get paste parameters from query string
  const { fromPeerId, fromPath, saveTo } = req.query || {};

  // Log the paste request
  log('info', `Paste SSE: Received paste SSE request: ${JSON.stringify({ fromPeerId, fromPath, saveTo })}`);

  if (!fromPeerId) {
    log('warn', 'Paste SSE: Request missing fromPeerId.');
    return res.status(400).json({ success: false, error: 'fromPeerId is required' });
  }

  if (!fromPath) {
    log('warn', 'Paste SSE: Request missing fromPath.');
    return res.status(400).json({ success: false, error: 'fromPath is required' });
  }

  if (!saveTo) {
    log('warn', 'Paste SSE: Request missing saveTo.');
    return res.status(400).json({ success: false, error: 'saveTo is required' });
  }

  // Check save to path exists
  const saveTo_ = resolvePath(saveTo);
  if (!fs.existsSync(saveTo_) || !fs.statSync(saveTo_).isDirectory()) {
    log('warn', `Paste SSE: Request saveTo path does not exist or is not a directory: saveTo = ${saveTo_}`);
    return res.status(400).json({ success: false, error: 'saveTo path does not exist or is not a directory' });
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
    let writeStream = null;
    let receivedSize = 0;
    let lastNotifiedProgress = -1;

    conn.on('open', () => {
      log('info', `Paste SSE | Peer Connection: Open, peer = ${conn.peer}`);

      // Send success SSE message
      res.write(`data: Connected to peer (id: ${conn.peer})\n\n`);

      // Send fromPath for verification
      conn.send({ type: 'file_request', filePath: fromPath });
    });

    conn.on("close", () => {
      log('info', `Paste SSE | Peer connection: Closed, peer = ${conn.peer}`);

      // Ensure write stream is closed on unexpected disconnect
      if (writeStream && !writeStream.closed) writeStream.destroy();

      // Send close SSE message
      res.write(`data: Connection closed (id: ${fromPeerId}).\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
    });

    conn.on('error', (error) => {
      log('error', `Paste SSE | Peer connection: Error, peer = ${conn.peer}, error = ${JSON.stringify(error)}`);

      if (writeStream && !writeStream.closed) writeStream.destroy();

      // Send error SSE message
      res.write(`data: Connection error (id: ${fromPeerId}).\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
    });

    conn.on("data", async (data) => {
      // Handle file transfer
      if (data.type === 'file-meta') {
        log('info', `Paste SSE | Peer connection: Data, file meta received, peer = ${conn.peer}, meta = ${JSON.stringify(data)}`);
        fileMeta = data;
        receivedSize = 0;
        lastNotifiedProgress = -1;

        // Open write stream immediately so chunks stream straight to disk
        const destDir = resolvePath(saveTo);
        const destPath = path.join(destDir, fileMeta.name);
        fs.mkdirSync(destDir, { recursive: true });
        writeStream = fs.createWriteStream(destPath);

        log('info', `Paste SSE | Data: File meta received: name = ${fileMeta.name}, size = ${fileMeta.size}`);
        res.write(`data: Receiving file: ${fileMeta.name} (${fileMeta.size} bytes)\n\n`);
        return;
      }

      if (data.type === 'file-chunk') {
        writeStream.write(Buffer.from(data.chunk));
        receivedSize += data.chunk.byteLength;

        // Notify progress
        const progress = fileMeta?.size ? (receivedSize / fileMeta.size) * 100 : 0;
        if (progress >= lastNotifiedProgress + 0.1) {
          lastNotifiedProgress = progress;
          const progressJson = {
            type: 'progress',
            name: fileMeta.name,
            copyFrom: {
              peerId: fromPeerId,
              path: fromPath,
            },
            pasteTo: {
              peerId: id,
              path: saveTo,
            },
            receivedSize: receivedSize,
            totalSize: fileMeta.size,
            progress: parseFloat(progress.toFixed(1)),
          };
          res.write(`data: ${JSON.stringify(progressJson)}\n\n`);
        }
        return;
      }

      if (data.type === 'file-end') {
        log('info', `Paste SSE | Peer connection: Data, file end received, peer = ${conn.peer}`);

        const destDir = resolvePath(saveTo);
        const destPath = path.join(destDir, fileMeta.name);

        // Flush and close the write stream before reporting success
        await new Promise((resolve, reject) => {
          writeStream.end(err => err ? reject(err) : resolve());
        });

        log('info', `Paste SSE | Data: File saved: path = ${destPath}, size = ${receivedSize} bytes`);
        res.write(`data: File saved: ${destPath}\n\n`);

        // Clear state
        fileMeta = null;
        writeStream = null;
        receivedSize = 0;

        // Close connection
        conn.close();
      }
    });

    // Clean up on client disconnect
    req.on('close', () => {
      log('info', `Paste SSE | Request: Close, peer = ${fromPeerId}`);

      // Ensure PeerJS connection is closed
      if (conn && conn.open) conn.close();

      // Ensure write stream is closed if client disconnects
      if (writeStream && !writeStream.closed) writeStream.destroy();

      clearInterval(heartbeatInterval);
      res.end();
    });
  } catch (error) {
    log('error', `Paste SSE: Paste SSE failed with error: ${error.message || error}`);

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

const server = app.listen(port, () => {
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

// Handle graceful shutdown on Ctrl+C / SIGTERM
function shutdown(signal) {
  log('info', `Shutdown: Received ${signal}, shutting down...`);

  globalThis.sseStatus = 'disconnected';
  globalThis.peerStatus = 'closed';

  // Close PeerJS
  if (peer) {
    try {
      peer.destroy();
      log('info', 'Shutdown: Peer destroyed.');
    } catch (e) {
      log('warn', `Shutdown: Error destroying peer: ${e.message}`);
    }
  }

  // Close HTTP server (stop accepting new connections)
  server.close((err) => {
    if (err) {
      log('warn', `Shutdown: Error closing HTTP server: ${err.message}`);
    } else {
      log('info', 'Shutdown: HTTP server closed.');
    }
    process.exit(0);
  });

  // Force exit if server hasn't closed within 5s
  setTimeout(() => {
    log('warn', 'Shutdown: Forced exit after timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
