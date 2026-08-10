// PM2 process config for tcopy's server-mode background process.
//
// Which process that is comes from ENVIRONMENT in server.env: the relay
// (server_mode/server/serve.js) on the server, or the clipboard client
// (server_mode/client/client.js) on a client. Both are long-lived and benefit
// equally from surviving crashes and reboots, which is why one file covers the
// two roles rather than the server alone.
//
// Usage:
//   pm2 start ecosystem.config.cjs        # start
//   pm2 restart ecosystem.config.cjs      # restart after a deploy
//   pm2 logs "$PM2_NAME"                  # tail logs (default: tcopy)
//   pm2 save && pm2 startup               # persist across reboots
//
// ./start.sh, ./stop.sh and ./restart.sh run these for you when this machine
// is set up for server mode and pm2 is installed, so you rarely need them.
//
// Storage mode is not covered — its clipboard watcher stays on the built-in
// daemon, and starting from this file in storage mode is an error rather than a
// silently wrong process.
//
// Never set `script:` to `tcopy start` or ./start.sh: both spawn a detached
// child and exit, which pm2 reads as an instant crash and restart-loops on.
//
// PM2_NAME, ENVIRONMENT and PORT come from server.env, the file `tcopy setup`
// writes. Unlike the other repos, tcopy keeps its config in a per-user
// directory instead of the checkout (config.js explains why), so the path is
// resolved here the same way config.js resolves it. They are read at config
// time rather than left to the env block below because the processes load
// server.env over process.env on startup — anything set only in the env block
// would be overwritten by the file anyway.
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

function readEnv(file) {
  try {
    return fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8');
  } catch {
    return '';
  }
}

function getEnvVar(key, defaultValue, file = 'server.env') {
  const match = readEnv(file).match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : defaultValue;
}

const MODE = getEnvVar('MODE', '', 'tcopy.env');
const ENVIRONMENT = getEnvVar('ENVIRONMENT', '');
const PM2_NAME = getEnvVar('PM2_NAME', 'tcopy');
const PORT = getEnvVar('PORT', '5460');

const SCRIPTS = {
  server: 'server_mode/server/serve.js',
  client: 'server_mode/client/client.js',
};

// MODE is checked as well as ENVIRONMENT because server.env keeps its old
// ENVIRONMENT after a switch to storage mode — testing ENVIRONMENT alone would
// start a server-mode process for a machine that no longer runs one.
if (MODE !== 'server' || !SCRIPTS[ENVIRONMENT]) {
  throw new Error(
    `tcopy: pm2 manages server mode only, with ENVIRONMENT set to 'server' or 'client'. ` +
      `Found MODE='${MODE}', ENVIRONMENT='${ENVIRONMENT}' in ${CONFIG_DIR}. Run \`tcopy setup\`.`
  );
}

module.exports = {
  apps: [
    {
      name: PM2_NAME,
      script: SCRIPTS[ENVIRONMENT],
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork', // SSE, PeerJS and WebRTC hold long-lived connections
      autorestart: true,
      max_restarts: 10,
      watch: false,
      // File transfers stream in 64KB chunks straight to disk, so steady-state
      // memory stays small and a cap this low will not cut a transfer short.
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
