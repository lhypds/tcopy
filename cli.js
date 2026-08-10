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
import { askChoice, askText, closePrompts, PromptAbortError } from './utils/prompt.js';
import { copy as storageCopy } from './storage_mode/copy.js';
import { paste as storagePaste } from './storage_mode/paste.js';

const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
);
const VERSION = MANIFEST.version;
const PACKAGE_NAME = MANIFEST.name;

const USAGE = `Usage: tcopy [text] | tcopy <command>

The four commands:
  tcopy [text]           Copy text (no argument copies the system clipboard)
  tpaste                 Paste text into the system clipboard
  fcopy <path>...        Copy one or more files
  fpaste [dir]           Paste stored file(s) into dir (default: current directory)

Management (via tcopy):
  setup                  Choose the mode and configure it
  start | stop | restart Manage the background process
  info                   Show version, mode and process status
  clear                  Delete runtime files (logs, pids, clipboard)
  reset                  Clear runtime files and restore default configuration
  update                 Update tcopy to the latest version
  -v, --version          Print the version
  -h, --help             Show this message

Configuration lives in ${configDir}`;

const SHORT_USAGE = {
  tpaste: 'Usage: tpaste\n\nPaste text from the shared clipboard into the system clipboard.',
  fcopy: 'Usage: fcopy <path>...\n\nCopy one or more files to the shared clipboard.',
  fpaste:
    'Usage: fpaste [dir]\n\nPaste stored file(s) into dir (default: the current directory).',
};

// `server` and `storage` share a first letter, so the shortcut keys are given
// explicitly — the original bash prompt used s/t for the same reason.
const MODE_CHOICES = [
  { value: 'server', key: 's' },
  { value: 'storage', key: 't' },
];

const ENVIRONMENT_CHOICES = [
  { value: 'server', key: 's' },
  { value: 'client', key: 'c' },
];

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

/** Prompts until the answer is a usable TCP port, then returns it as a string. */
async function askPort(question, defaultValue) {
  for (;;) {
    const answer = await askText(question, { defaultValue });
    const port = Number(answer);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) return String(port);
    console.log('Enter a port number between 1 and 65535.');
  }
}

async function ensureMode() {
  let mode = getMode();
  if (mode !== 'server' && mode !== 'storage') {
    mode = await askChoice('Choose MODE', MODE_CHOICES);
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

// --- mode dispatch ----------------------------------------------------------
// Both modes accept the same argument shape: a bare value copies/pastes text,
// a leading -f switches to files.

async function dispatchCopy(args) {
  const mode = await ensureMode();
  if (mode === 'storage') return storageCopy(args);
  if (!requireServerClient()) return 1;
  return runNodeScript('server_mode/client/copy.js', args);
}

async function dispatchPaste(args) {
  const mode = await ensureMode();
  if (mode === 'storage') return storagePaste(args);
  if (!requireServerClient()) return 1;
  return runNodeScript('server_mode/client/paste.js', args);
}

// --- commands ---------------------------------------------------------------

/** `tcopy [text]` — copy text. No argument copies the system clipboard. */
async function cmdCopyText(args) {
  if (args[0] === '-f' || args[0] === '--file') {
    console.error("Error: use 'fcopy <path>...' to copy files.");
    return 1;
  }
  return dispatchCopy(args);
}

/** `tpaste` — paste text into the system clipboard. */
async function cmdPasteText(args) {
  if (args[0] === '-f' || args[0] === '--file') {
    console.error("Error: use 'fpaste [dir]' to paste files.");
    return 1;
  }
  return dispatchPaste([]);
}

/** `fcopy <path>...` — copy one or more files. */
async function cmdCopyFile(args) {
  const paths = args.filter(arg => arg !== '-f' && arg !== '--file');
  if (paths.length === 0) {
    console.error('Error: missing file path. Usage: fcopy <path>...');
    return 1;
  }
  return dispatchCopy(['-f', ...paths]);
}

/** `fpaste [dir]` — restore stored file(s), defaulting to the current directory. */
async function cmdPasteFile(args) {
  const targets = args.filter(arg => arg !== '-f' && arg !== '--file');
  if (targets.length > 1) {
    console.error('Error: fpaste accepts a single target directory.');
    return 1;
  }
  return dispatchPaste(['-f', targets[0] ?? '.']);
}

async function cmdSetup() {
  ensureDirs();
  ensureEnvFile('tcopy');

  const mode = await askChoice('Choose MODE', MODE_CHOICES);
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
    const environment = await askChoice('Enter ENVIRONMENT', ENVIRONMENT_CHOICES);
    writeEnvValue('server', 'ENVIRONMENT', environment);

    if (environment === 'client') {
      const current = readEnvValue('server', 'SERVER_BASE_URL');
      const baseUrl = await askText(
        'Enter SERVER_BASE_URL (e.g. http://localhost:5460)',
        current ? { defaultValue: current } : {}
      );
      writeEnvValue('server', 'SERVER_BASE_URL', baseUrl);
    } else {
      const port = await askPort(
        'Enter PORT (the port the server listens on)',
        readEnvValue('server', 'PORT')
      );
      writeEnvValue('server', 'PORT', port);
    }

    // Asked for both roles: pm2 supervises the client as readily as the server,
    // and only ecosystem.config.cjs reads it — see docs/06_PM2.md.
    const pm2Name = await askText(
      'Enter PM2_NAME (process name if you run tcopy under pm2)',
      { defaultValue: readEnvValue('server', 'PM2_NAME') }
    );
    writeEnvValue('server', 'PM2_NAME', pm2Name);

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
    console.log(`PM2 name: ${readEnvValue('server', 'PM2_NAME')}`);
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
  const result = spawnSync(npm, ['install', '-g', `${PACKAGE_NAME}@latest`], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Error: failed to run npm: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

// --- entry points -----------------------------------------------------------

/** Shared start-up: config directory plus one-off migration from the 0.0.x layout. */
function bootstrap() {
  ensureDirs();
  const migrated = migrateLegacyConfig();
  if (migrated.length > 0) {
    console.log(`Migrated existing configuration (${migrated.join(', ')}) to ${configDir}`);
  }
}

/** Entry point for the tpaste, fcopy and fpaste binaries. */
export async function runSingle(name, argv) {
  return withPromptGuard(() => runSingleInner(name, argv));
}

async function runSingleInner(name, argv) {
  if (argv[0] === '-h' || argv[0] === '--help') {
    console.log(SHORT_USAGE[name]);
    return 0;
  }
  if (argv[0] === '-v' || argv[0] === '--version') {
    console.log(VERSION);
    return 0;
  }

  bootstrap();

  switch (name) {
    case 'tpaste':
      return cmdPasteText(argv);
    case 'fcopy':
      return cmdCopyFile(argv);
    case 'fpaste':
      return cmdPasteFile(argv);
    default:
      throw new Error(`Unknown command: ${name}`);
  }
}

/** Entry point for the tcopy binary. */
export async function run(argv) {
  return withPromptGuard(() => runInner(argv));
}

/** Turns an aborted prompt into a plain message and a non-zero exit code. */
async function withPromptGuard(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PromptAbortError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    throw error;
  } finally {
    // Releases stdin; without this an opened prompt keeps the process alive.
    closePrompts();
  }
}

async function runInner(argv) {
  // Answered before bootstrap so that simply asking the version never creates
  // the config directory or triggers a migration.
  if (argv[0] === '-v' || argv[0] === '--version') {
    console.log(VERSION);
    return 0;
  }
  if (argv[0] === '-h' || argv[0] === '--help') {
    console.log(USAGE);
    return 0;
  }

  bootstrap();

  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
      return cmdCopyText(rest);
    // Accepted so that `tcopy copy <text>` does not copy the literal word
    // "copy", and so old muscle memory keeps working.
    case 'copy':
      return cmdCopyText(rest);
    case 'paste':
      return cmdPasteText(rest);
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
      console.error(`Run ./${command}.sh from the tcopy checkout (${packageRoot}).`);
      return 1;
    default:
      // Anything unrecognised is treated as text to copy, as before.
      return cmdCopyText(argv);
  }
}
