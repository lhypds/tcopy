// tcopy command dispatcher — the cross-platform replacement for tcopy.sh and
// the per-mode shell scripts it delegated to.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  packageRoot,
  configDir,
  stateDir,
  ENV_FILES,
  ensureDirs,
  ensureEnvFile,
  resetEnvFile,
  readEnvValue,
  writeEnvValue,
  getMode,
  setMode,
  getStoragePaths,
  migrateLegacyConfig,
  resolveHome,
} from './config.js';
import * as daemon from './daemon.js';
import { askChoice, askText } from './prompt.js';
import { copy as storageCopy } from '../storage_mode/copy.js';
import { paste as storagePaste } from '../storage_mode/paste.js';

const VERSION = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
).version;

const USAGE = `Usage: tcopy <command> [options]

Commands:
  copy [text]            Copy text to the shared clipboard (default: system clipboard)
  copy -f <path>...      Copy one or more files
  paste                  Paste shared clipboard text into the system clipboard
  paste -f [dir]         Paste stored file(s) into dir (default: current directory)
  setup                  Choose the mode and configure it
  start | stop | restart Manage the background process
  info                   Show version, mode and process status
  clear                  Delete runtime files (logs, pids, clipboard)
  reset                  Clear runtime files and restore default configuration
  update                 Update tcopy to the latest version
  -v, --version          Print the version
  -h, --help             Show this message

Configuration lives in ${configDir}`;

// --- helpers ----------------------------------------------------------------

/** Runs a bundled Node script in the foreground, inheriting the terminal. */
function runNodeScript(relativePath, args) {
  const result = spawnSync(process.execPath, [path.join(packageRoot, relativePath), ...args], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Error: failed to run ${relativePath}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

async function ensureMode() {
  let mode = getMode();
  if (mode !== 'server' && mode !== 'storage') {
    mode = await askChoice('Choose MODE', ['server', 'storage']);
    setMode(mode);
  }
  return mode;
}

/** Identifies the background process for the current mode. */
function daemonFor(mode) {
  if (mode === 'storage') {
    return { name: 'watch', script: 'storage_mode/watchEntry.js', label: 'clipboard watcher' };
  }
  const environment = readEnvValue('server', 'ENVIRONMENT');
  if (environment === 'server') {
    return { name: 'server', script: 'server_mode/server/serve.js', label: 'tcopy server' };
  }
  if (environment === 'client') {
    return { name: 'client', script: 'server_mode/client/client.js', label: 'tcopy client' };
  }
  return null;
}

function requireServerClient() {
  const environment = readEnvValue('server', 'ENVIRONMENT');
  if (environment !== 'client') {
    console.error(
      `Error: ENVIRONMENT is '${environment || '(unset)'}', not 'client'. This command is for clients only.`
    );
    return false;
  }
  return true;
}

// --- commands ---------------------------------------------------------------

async function cmdCopy(args) {
  const mode = await ensureMode();
  if (mode === 'storage') return storageCopy(args);
  if (!requireServerClient()) return 1;
  return runNodeScript('server_mode/client/copy.js', args);
}

async function cmdPaste(args) {
  const mode = await ensureMode();
  if (mode === 'storage') return storagePaste(args);
  if (!requireServerClient()) return 1;
  return runNodeScript('server_mode/client/paste.js', args);
}

async function cmdSetup() {
  ensureDirs();
  ensureEnvFile('tcopy');

  const mode = await askChoice('Choose MODE', ['server', 'storage']);
  setMode(mode);

  if (mode === 'storage') {
    ensureEnvFile('storage');
    const { storagePath } = getStoragePaths();
    const answer = await askText(
      'Enter STORAGE_PATH (a folder synced between your machines)',
      { defaultValue: storagePath }
    );
    // Stored absolute: the value is read back from processes with different
    // working directories.
    writeEnvValue('storage', 'STORAGE_PATH', path.resolve(resolveHome(answer)));

    const resolved = getStoragePaths();
    fs.mkdirSync(resolved.storagePath, { recursive: true });
    console.log(`Storage path set to: ${resolved.storagePath}`);
  } else {
    ensureEnvFile('server');
    const environment = await askChoice('Enter ENVIRONMENT', ['server', 'client']);
    writeEnvValue('server', 'ENVIRONMENT', environment);

    if (environment === 'client') {
      const current = readEnvValue('server', 'SERVER_BASE_URL');
      const baseUrl = await askText(
        'Enter SERVER_BASE_URL (e.g. http://localhost:5460)',
        current ? { defaultValue: current } : {}
      );
      writeEnvValue('server', 'SERVER_BASE_URL', baseUrl);
    }
    console.log(`Environment set to: ${environment}`);
  }

  console.log(`Setup completed. Configuration: ${configDir}`);
  return 0;
}

async function cmdStart() {
  const mode = await ensureMode();
  const target = daemonFor(mode);
  if (!target) {
    console.error("Error: ENVIRONMENT is not configured. Run 'tcopy setup' first.");
    return 1;
  }

  const result = daemon.start(target.name, path.join(packageRoot, target.script));
  if (!result.started) {
    if (result.reason === 'already-running') {
      console.log(`${target.label} is already running (pid ${result.pid}).`);
      return 0;
    }
    console.error(`Error: failed to start ${target.label}.`);
    return 1;
  }

  console.log(`Started ${target.label} (pid ${result.pid}).`);
  console.log(`Logs: ${daemon.logFile(target.name)}`);
  return 0;
}

async function cmdStop() {
  const mode = await ensureMode();
  const target = daemonFor(mode);
  if (!target) {
    console.error("Error: ENVIRONMENT is not configured. Run 'tcopy setup' first.");
    return 1;
  }

  const result = daemon.stop(target.name);
  if (!result.stopped) {
    console.log(`No running ${target.label} found.`);
    return 0;
  }
  console.log(`Stopped ${target.label} (pid ${result.pid}).`);
  return 0;
}

async function cmdRestart() {
  const stopCode = await cmdStop();
  if (stopCode !== 0) return stopCode;
  return cmdStart();
}

async function cmdInfo() {
  const mode = getMode();
  console.log(`tcopy ${VERSION}`);
  console.log(`Config: ${configDir}`);
  console.log(`Current mode: ${mode || '(not set)'}`);

  if (mode === 'server') {
    const environment = readEnvValue('server', 'ENVIRONMENT');
    console.log(`Current environment: ${environment || '(not set)'}`);
    if (environment === 'client') {
      console.log(`Server base URL: ${readEnvValue('server', 'SERVER_BASE_URL') || '(not set)'}`);
    }
    console.log(`Port: ${readEnvValue('server', 'PORT')}`);
  } else if (mode === 'storage') {
    const { storagePath, clipboardFilePath } = getStoragePaths();
    console.log(`Storage path: ${storagePath}`);
    console.log(`Clipboard file: ${clipboardFilePath}`);
  }

  const target = mode ? daemonFor(mode) : null;
  if (target) {
    const state = daemon.status(target.name);
    console.log(
      state.running ? `Process: running (pid ${state.pid})` : 'Process: not running'
    );
  }
  return 0;
}

function cmdClear() {
  let removed = 0;

  if (fs.existsSync(stateDir)) {
    for (const entry of fs.readdirSync(stateDir)) {
      if (entry === 'storage') continue; // Holds user file payloads.
      fs.rmSync(path.join(stateDir, entry), { force: true, recursive: true });
      removed += 1;
    }
  }

  // The shared clipboard file may live outside the state dir.
  const { clipboardFilePath } = getStoragePaths();
  if (fs.existsSync(clipboardFilePath)) {
    fs.rmSync(clipboardFilePath, { force: true });
    removed += 1;
  }

  console.log(`Cleared ${removed} runtime file(s).`);
  return 0;
}

async function cmdReset() {
  const mode = getMode();
  if (mode) {
    const target = daemonFor(mode);
    if (target) daemon.stop(target.name);
  }

  cmdClear();
  for (const scope of Object.keys(ENV_FILES)) resetEnvFile(scope);

  console.log('Reset complete.');
  return 0;
}

function cmdUpdate() {
  // A git checkout is a development install; anything else came from npm.
  if (fs.existsSync(path.join(packageRoot, '.git'))) {
    const result = spawnSync('git', ['pull'], { cwd: packageRoot, stdio: 'inherit' });
    return result.status ?? 1;
  }

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['install', '-g', 'tcopy@latest'], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Error: failed to run npm: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

// --- entry point ------------------------------------------------------------

export async function run(argv) {
  ensureDirs();

  const migrated = migrateLegacyConfig();
  if (migrated.length > 0) {
    console.log(`Migrated existing configuration (${migrated.join(', ')}) to ${configDir}`);
  }

  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
    case 'copy':
      return cmdCopy(rest);
    case 'paste':
      return cmdPaste(rest);
    case 'setup':
      return cmdSetup();
    case 'start':
      return cmdStart();
    case 'stop':
      return cmdStop();
    case 'restart':
      return cmdRestart();
    case 'info':
      return cmdInfo();
    case 'clear':
      return cmdClear();
    case 'reset':
      return cmdReset();
    case 'update':
      return cmdUpdate();
    case '-v':
    case '--version':
      console.log(VERSION);
      return 0;
    case '-h':
    case '--help':
      console.log(USAGE);
      return 0;
    case 'install':
    case 'uninstall':
      console.error(
        `tcopy is installed with npm now. Use 'npm ${command === 'install' ? 'install' : 'uninstall'} -g tcopy'.`
      );
      return 1;
    default:
      // Anything unrecognised is treated as text to copy, as before.
      return cmdCopy(argv);
  }
}
