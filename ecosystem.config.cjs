// PM2 process config for the tcopy server (server_mode/server/serve.js) — the
// relay that server-mode clients post text to and use for WebRTC signaling.
//
// Usage:
//   pm2 start ecosystem.config.cjs        # start
//   pm2 restart ecosystem.config.cjs      # restart after a deploy
//   pm2 logs "$PM2_NAME"                  # tail logs (default: tcopy)
//   pm2 save && pm2 startup               # persist across reboots
//
// Only for the machine whose ENVIRONMENT is `server`. Clients keep using
// `tcopy start`, and on this machine stop using it — PM2 owns the process now,
// and a second instance would just lose the race for the port.
//
// Never point PM2 at `tcopy start` or ./start.sh: those spawn a detached child
// and exit, which PM2 reads as an instant crash and restart-loops on.
//
// PM2_NAME and PORT come from server.env, the file `tcopy setup` writes. Unlike
// the other repos, tcopy keeps its config in a per-user directory instead of the
// checkout (config.js explains why), so the path is resolved here the same way
// config.js resolves it. They are read at config time rather than left to the
// env block below because serve.js loads server.env over process.env on startup
// — anything set only in the env block would be overwritten by the file anyway.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mirrors configDir() in config.js. Duplicated rather than imported because
// that file is ESM and a PM2 config has to be CommonJS.
function configDir() {
  if (process.env.TCOPY_CONFIG_DIR) {
    return path.resolve(process.env.TCOPY_CONFIG_DIR);
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'tcopy');
  }
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdg, 'tcopy');
}

const CONFIG_DIR = configDir();

function readEnv() {
  try {
    return fs.readFileSync(path.join(CONFIG_DIR, 'server.env'), 'utf8');
  } catch {
    return '';
  }
}

function getEnvVar(key, defaultValue) {
  const match = readEnv().match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : defaultValue;
}

const PM2_NAME = getEnvVar('PM2_NAME', 'tcopy');
const PORT = getEnvVar('PORT', '5460');

module.exports = {
  apps: [
    {
      name: PM2_NAME,
      script: 'server_mode/server/serve.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork', // SSE and PeerJS hold long-lived connections — one instance only
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: '256M',
      time: true, // prefix log lines with timestamps
      env: {
        NODE_ENV: 'production',
        PORT: PORT,
        // Pinned so a `pm2 resurrect` at boot reads the same config directory
        // this file read, whatever HOME the boot script happens to run with.
        TCOPY_CONFIG_DIR: CONFIG_DIR,
      },
    },
  ],
};
