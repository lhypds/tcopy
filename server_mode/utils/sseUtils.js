import { SSE_HEARTBEAT_INTERVAL } from '../constants.js';

export function startSseHeartbeat(res, intervalMs = SSE_HEARTBEAT_INTERVAL) {
  return setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, intervalMs);
}

export function resetSseTimeout(heartbeatTimer, onTimeout, intervalMs = SSE_HEARTBEAT_INTERVAL, multiplier = 1.5) {
  clearTimeout(heartbeatTimer);
  return setTimeout(onTimeout, intervalMs * multiplier);
}
