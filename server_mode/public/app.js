const clipboardField = document.getElementById('clipboard');
const resizeHandle = document.getElementById('resize-handle');
const copyButton = document.getElementById('copy-button');
const saveButton = document.getElementById('save-button');
const actionMessage = document.getElementById('action-message');
const characterCount = document.getElementById('character-count');
const connectionDot = document.getElementById('connection-dot');
const connectionStatus = document.getElementById('connection-status');
const connectionDetail = document.getElementById('connection-detail');
const updatedStatus = document.getElementById('updated-status');

const browserIdKey = 'tcopy-browser-id';
const browserId = getBrowserId();
let messageTimer;
const minimumClipboardHeight = 80;

function getBrowserId() {
  try {
    const existingId = window.sessionStorage.getItem(browserIdKey);
    if (existingId) return existingId;

    const randomId = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    const id = `web-${randomId}`;
    window.sessionStorage.setItem(browserIdKey, id);
    return id;
  } catch {
    return `web-${Math.random().toString(36).slice(2)}`;
  }
}

function plainClipboardText(content) {
  return content.replace(/^###ID=.*?###/, '');
}

function setClipboard(text, updateLabel = 'Received just now') {
  clipboardField.value = text;
  updateCharacterCount();
  updatedStatus.textContent = updateLabel;
}

function updateCharacterCount() {
  const count = clipboardField.value.length;
  characterCount.textContent = `${count} ${count === 1 ? 'character' : 'characters'}`;
}

function resizeClipboardBy(delta) {
  clipboardField.style.height = `${Math.max(minimumClipboardHeight, clipboardField.offsetHeight + delta)}px`;
}

function startClipboardResize(event) {
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = clipboardField.offsetHeight;

  function onPointerMove(moveEvent) {
    clipboardField.style.height = `${Math.max(minimumClipboardHeight, startHeight + moveEvent.clientY - startY)}px`;
  }

  function stopResize() {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', stopResize);
    document.removeEventListener('pointercancel', stopResize);
  }

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', stopResize);
  document.addEventListener('pointercancel', stopResize);
}

function showMessage(message, state = 'normal', duration = 2400) {
  window.clearTimeout(messageTimer);
  actionMessage.textContent = message;
  actionMessage.dataset.state = state;

  if (duration > 0) {
    messageTimer = window.setTimeout(() => {
      actionMessage.textContent = '';
      actionMessage.dataset.state = 'normal';
    }, duration);
  }
}

function setConnection(state) {
  connectionDot.dataset.state = state;

  if (state === 'connected') {
    connectionStatus.textContent = 'Connected';
    connectionDetail.textContent = 'Live updates are on.';
  } else if (state === 'disconnected') {
    connectionStatus.textContent = 'Reconnecting';
    connectionDetail.textContent = 'Waiting for the server…';
  } else {
    connectionStatus.textContent = 'Connecting';
    connectionDetail.textContent = 'Opening live updates…';
  }
}

async function loadClipboard() {
  try {
    const response = await fetch('/', {
      headers: { Accept: 'text/plain' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    setClipboard(plainClipboardText(await response.text()), 'Loaded just now');
    showMessage('Clipboard loaded.');
  } catch {
    showMessage('Could not load the clipboard.', 'error', 0);
    setConnection('disconnected');
  }
}

async function copyClipboard() {
  try {
    await navigator.clipboard.writeText(clipboardField.value);
    showMessage('Copied to this device.');
  } catch {
    clipboardField.focus();
    clipboardField.select();
    const copied = document.execCommand?.('copy');
    showMessage(copied ? 'Copied to this device.' : 'Copy failed. Select the text and copy it manually.', copied ? 'normal' : 'error', copied ? 2400 : 0);
  }
}

async function saveClipboard() {
  if (saveButton.disabled) return;

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  showMessage('Saving clipboard…', 'normal', 0);

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: browserId,
        text: clipboardField.value,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    updatedStatus.textContent = 'Saved just now';
    showMessage('Saved to the server.');
  } catch {
    showMessage('Could not save the clipboard.', 'error', 0);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save';
  }
}

function connectLiveUpdates() {
  setConnection('connecting');
  const events = new EventSource(`/sse?id=${encodeURIComponent(browserId)}`);

  events.onopen = () => setConnection('connected');
  events.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      setClipboard(message.text || '');
      showMessage(message.id === browserId ? 'Saved to the server.' : 'Clipboard updated from another device.');
    } catch {
      showMessage('Received an unreadable clipboard update.', 'error');
    }
  };
  events.onerror = () => setConnection('disconnected');
}

clipboardField.addEventListener('input', updateCharacterCount);
clipboardField.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    saveClipboard();
  }
});
resizeHandle.addEventListener('pointerdown', startClipboardResize);
resizeHandle.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  resizeClipboardBy(event.key === 'ArrowUp' ? -16 : 16);
});
copyButton.addEventListener('click', copyClipboard);
saveButton.addEventListener('click', saveClipboard);

loadClipboard();
connectLiveUpdates();
