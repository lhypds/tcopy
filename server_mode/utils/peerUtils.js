import { sleep } from '../utils/sleepUtils.js';
import { createLogger } from '../utils/logUtils.js';
import { writeClipboard } from '../utils/clipboardUtils.js'

// Logger
const log = createLogger('peer.log');

const connections = new Map();
const incomingTransfers = new Map();

const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_BUFFERED_AMOUNT = 16 * CHUNK_SIZE; // 1MB

function getOrCreateTransfer(peerId) {
  let transfer = incomingTransfers.get(peerId);

  if (!transfer) {
    transfer = {
      name: null,
      size: 0,
      mime: 'application/octet-stream',
      received: 0,
      chunks: [],
      hasInfo: false,
    };
    incomingTransfers.set(peerId, transfer);
  }

  return transfer;
}

export async function handleIncomingData(conn, data) {
  const peerId = conn.peer;
  let transfer = incomingTransfers.get(peerId);

  if (typeof data === 'string') {
    await writeClipboard(data);

    const contentReplaced = data
      .replace(/\n/g, '<LF>')
      .replace(/\r/g, '<CR>')
      .replace(/\t/g, '<TAB>')
      .replace(/ /g, '<SPACE>');

    log('info', `Content received from ${peerId}: \`${contentReplaced}\``);
    return;
  }

  if (data && typeof data === "object" && data.type === "file-info") {
    transfer = getOrCreateTransfer(peerId);
    transfer.name = data.name;
    transfer.size = data.size;
    transfer.mime = data.mime || "application/octet-stream";
    transfer.hasInfo = true;

    log('info', `Receiving "${transfer.name}" from ${peerId} (${transfer.size} bytes)`);
    return;
  }

  if (data && typeof data === "object" && data.type === "file-end") {
    if (!transfer || !transfer.hasInfo) {
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

  transfer = getOrCreateTransfer(peerId);

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

  if (!transfer.hasInfo) {
    log('debug', `Buffered ${transfer.received} bytes from ${peerId} before file-info`);
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
