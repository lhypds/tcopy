// Cross-platform configuration and state storage.
//
// tcopy used to keep .env files next to the scripts. That breaks once the CLI
// is installed globally from npm, because the package directory lives inside
// node_modules and is replaced on every update. Config and runtime state now
// live in a per-user directory instead.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = path.dirname(fileURLToPath(import.meta.url));

function defaultConfigDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'tcopy');
  }
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdg, 'tcopy');
}

export const configDir = process.env.TCOPY_CONFIG_DIR
  ? path.resolve(process.env.TCOPY_CONFIG_DIR)
  : defaultConfigDir();

// Runtime artifacts: pid files, logs, peer ids, the server-side clipboard file.
export const stateDir = path.join(configDir, 'state');

export const ENV_FILES = {
  tcopy: path.join(configDir, 'tcopy.env'),
  server: path.join(configDir, 'server.env'),
  storage: path.join(configDir, 'storage.env'),
};

const DEFAULTS = {
  tcopy: {
    MODE: '',
  },
  server: {
    ENVIRONMENT: '',
    PORT: '5460',
    PM2_NAME: 'tcopy',
    LINE_ENDING_SAVING: 'CR',
    DEBUG: 'false',
    SERVER_BASE_URL: '',
  },
  storage: {
    STORAGE_PATH: '',
    CLIPBOARD_FILE: '.clipboard',
    LINE_ENDING_SAVING: 'CRLF',
  },
};

export function ensureDirs() {
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
}

/**
 * Absolute path for a runtime artifact (pid, log, id, clipboard).
 * Server-mode modules used to write these relative to the process CWD or to
 * their own directory; neither survives a global npm install.
 */
export function stateFile(name) {
  ensureDirs();
  return path.join(stateDir, name);
}

// --- .env parsing -----------------------------------------------------------
// Deliberately minimal: `KEY=value`, `#` comments, optional surrounding quotes.
// Values are never interpolated, so a Windows path like C:\Users\me stays intact.

export function parseEnv(text) {
  const result = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    result.set(key, value);
  }
  return result;
}

export function readEnvFile(scope) {
  const file = ENV_FILES[scope];
  if (!file) throw new Error(`Unknown config scope: ${scope}`);
  if (!fs.existsSync(file)) return new Map();
  return parseEnv(fs.readFileSync(file, 'utf8'));
}

export function readEnvValue(scope, key) {
  const fromFile = readEnvFile(scope).get(key);
  if (fromFile !== undefined && fromFile !== '') return fromFile;
  const fallback = DEFAULTS[scope]?.[key];
  return fromFile !== undefined ? fromFile : (fallback ?? '');
}

// Rewrites a single key while preserving comments, ordering and unknown keys —
// this is what the old awk/sed block in tcopy.sh was doing.
export function writeEnvValue(scope, key, value) {
  writeEnvValues(scope, { [key]: value });
}

export function writeEnvValues(scope, updates) {
  ensureDirs();
  const file = ENV_FILES[scope];
  if (!file) throw new Error(`Unknown config scope: ${scope}`);

  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = existing === '' ? [] : existing.split(/\r?\n/);
  const pending = new Map(Object.entries(updates));

  const rewritten = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = line.indexOf('=');
    if (eq === -1) return line;
    const key = line.slice(0, eq).trim();
    if (!pending.has(key)) return line;
    const value = pending.get(key);
    pending.delete(key);
    return `${key}=${value}`;
  });

  for (const [key, value] of pending) {
    rewritten.push(`${key}=${value}`);
  }

  // Keep exactly one trailing newline.
  while (rewritten.length > 0 && rewritten[rewritten.length - 1] === '') {
    rewritten.pop();
  }
  fs.writeFileSync(file, `${rewritten.join('\n')}\n`, 'utf8');
}

// Seeds a config file with commented defaults on first use.
export function ensureEnvFile(scope) {
  ensureDirs();
  const file = ENV_FILES[scope];
  if (fs.existsSync(file)) return;
  const defaults = DEFAULTS[scope] ?? {};
  const body = Object.entries(defaults)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(file, `${body}\n`, 'utf8');
}

export function resetEnvFile(scope) {
  ensureDirs();
  const file = ENV_FILES[scope];
  fs.rmSync(file, { force: true });
  ensureEnvFile(scope);
}

// --- migration --------------------------------------------------------------
// Carry settings over from the pre-0.1 layout (.env files inside the checkout)
// so upgrading users do not silently lose their configuration.
const LEGACY_SOURCES = [
  { scope: 'tcopy', file: path.join(packageRoot, '.env') },
  { scope: 'server', file: path.join(packageRoot, 'server_mode', '.env') },
  { scope: 'storage', file: path.join(packageRoot, 'storage_mode', '.env') },
];

// Settings that no longer mean anything after the rewrite. PM2_NAME was here
// until ecosystem.config.cjs brought it back — it is read from server.env when
// the server runs under PM2, so a migrating value is worth keeping.
const OBSOLETE_KEYS = new Set();

export function migrateLegacyConfig() {
  const migrated = [];
  for (const { scope, file } of LEGACY_SOURCES) {
    if (fs.existsSync(ENV_FILES[scope])) continue;
    if (!fs.existsSync(file)) continue;

    const values = parseEnv(fs.readFileSync(file, 'utf8'));
    for (const key of OBSOLETE_KEYS) values.delete(key);

    // The old STORAGE_PATH was relative to storage_mode/, a directory that no
    // longer exists. Drop it so the default applies rather than silently
    // resolving against whatever directory tcopy is invoked from.
    const storagePath = values.get('STORAGE_PATH');
    if (storagePath !== undefined && (storagePath === '' || !path.isAbsolute(resolveHome(storagePath)))) {
      values.delete('STORAGE_PATH');
    }

    if (values.size === 0) continue;
    ensureEnvFile(scope);
    writeEnvValues(scope, Object.fromEntries(values));
    migrated.push(scope);
  }
  return migrated;
}

// --- resolved views ---------------------------------------------------------

export function resolveHome(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export function getMode() {
  return readEnvValue('tcopy', 'MODE');
}

export function setMode(mode) {
  ensureEnvFile('tcopy');
  writeEnvValue('tcopy', 'MODE', mode);
}

// Storage mode defaults to a directory inside the config dir so a fresh install
// works without the user picking a path first.
export function getStoragePaths() {
  const configured = resolveHome(readEnvValue('storage', 'STORAGE_PATH'));
  // A relative value is resolved against the state directory, never the CWD,
  // so the storage location does not depend on where tcopy was invoked.
  const storagePath = configured
    ? path.resolve(stateDir, configured)
    : path.join(stateDir, 'storage');
  const clipboardFile = readEnvValue('storage', 'CLIPBOARD_FILE') || '.clipboard';
  return {
    storagePath,
    clipboardFile,
    clipboardFilePath: path.join(storagePath, clipboardFile),
    lineEnding: readEnvValue('storage', 'LINE_ENDING_SAVING') || 'CRLF',
  };
}

// Loads a config scope into process.env for the server-mode modules, which
// read their settings via process.env.
export function loadIntoProcessEnv(scope) {
  for (const [key, value] of readEnvFile(scope)) {
    if (value !== '') process.env[key] = value;
  }
  const defaults = DEFAULTS[scope] ?? {};
  for (const [key, value] of Object.entries(defaults)) {
    if (process.env[key] === undefined && value !== '') process.env[key] = value;
  }
  process.env.TCOPY_STATE_DIR = stateDir;
}
