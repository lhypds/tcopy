import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { readClipboard } from '../utils/clipboardUtils.js'

// Logger
const log = createLogger('peer.log');

const connections = new Map();
const incomingTransfers = new Map();

const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_BUFFERED_AMOUNT = 16 * CHUNK_SIZE; // 1MB

// Source peer
export function setupConnection(conn) {
  if (connections.has(conn.peer)) {
    const oldConn = connections.get(conn.peer);
    if (oldConn && oldConn.open) {
      log('info', `Already connected to ${conn.peer}`);
      return oldConn;
    }
  }

  connections.set(conn.peer, conn);
  conn.on("open", async () => {
    log('info', `Connection open with ${conn.peer}`);

    // Send anything in clipboard buffer (file or content)
    const clipboard = await readClipboard();
    conn.send(clipboard);
  });

  conn.on("close", () => {
    log('info', `Connection closed with ${conn.peer}`);
    connections.delete(conn.peer);
    incomingTransfers.delete(conn.peer);
  });

  conn.on("error", (err) => {
    log('error', `Connection error with ${conn.peer}: ${err.message || err}`);
  });

  conn.on("data", async (data) => {
    await handleIncomingData(conn, data);
  });

  return conn;
}

// Destination peer
export function connectToPeer(peer, fromPeerId) {
  return new Promise((resolve, reject) => {
    const conn = peer.connect(fromPeerId);
    if (!conn) {
      reject(new Error('peer.connect returned no connection'));
      return;
    }

    conn.on("open", () => {
      log('info', `Connection open with ${conn.peer}`);
    });

    conn.on("close", () => {
      log('info', `Connection closed with ${conn.peer}`);
      connections.delete(conn.peer);
      incomingTransfers.delete(conn.peer);
    });

    conn.on("error", (err) => {
      log('error', `Connection error with ${conn.peer}: ${err.message || err}`);
    });

    conn.on("data", async (data) => {
      await handleIncomingData(conn, data);
    });
  });
}

export async function handleIncomingData(conn, data) {
  const peerId = conn.peer;
  let transfer = incomingTransfers.get(peerId);

  if (data && typeof data === "object" && data.type === "file-info") {
    transfer = {
      name: data.name,
      size: data.size,
      mime: data.mime || "application/octet-stream",
      received: 0,
      chunks: [],
    };

    incomingTransfers.set(peerId, transfer);
    log('info', `Receiving "${transfer.name}" from ${peerId} (${transfer.size} bytes)`);
    return;
  }

  if (data && typeof data === "object" && data.type === "file-end") {
    if (!transfer) {
      log('warn', `Received file-end from ${peerId}, but no file-info found`);
      return;
    }

    const blob = new Blob(transfer.chunks, { type: transfer.mime });

    // Download blob (file)
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = transfer.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Clean up
    log('info', `Finished receiving "${transfer.name}" from ${peerId}`);
    incomingTransfers.delete(peerId);
    return;
  }

  if (!transfer) {
    log('warn', `Received binary data from ${peerId} before file-info`);
    return;
  }

  if (data instanceof ArrayBuffer) {
    transfer.chunks.push(data);
    transfer.received += data.byteLength;
  } else if (ArrayBuffer.isView(data)) {
    const chunk = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
    transfer.chunks.push(chunk);
    transfer.received += data.byteLength;
  } else if (data instanceof Blob) {
    transfer.chunks.push(data);
    transfer.received += data.size;
  } else {
    log('warn', `Unknown data type from ${peerId}`);
    return;
  }

  log('debug', `Receiving "${transfer.name}" from ${peerId}: ${transfer.received}/${transfer.size}`);
}

export async function sendFile(conn, file) {
  if (!conn.open) {
    throw new Error("Connection is not open");
  }

  log('info', `Sending "${file.name}" to ${conn.peer} (${file.size} bytes)`);
  conn.send({
    type: "file-info",
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
  });

  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();

    while (conn.dataChannel && conn.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      await sleep(50);
    }

    conn.send(buffer);
    offset += buffer.byteLength;

    log('debug', `Sending "${file.name}" to ${conn.peer}: ${offset}/${file.size}`);
  }

  conn.send({ type: "file-end" });
  log('info', `Finished sending "${file.name}" to ${conn.peer}`);
}

export function getConnectionToRemote() {
  const remoteId = remoteIdInput.value.trim();

  if (!remoteId) return null;
  return connections.get(remoteId) || null;
}
