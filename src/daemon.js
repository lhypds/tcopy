// Portable background-process supervision.
//
// Replaces pm2 (server mode) and the `&` + PID-file + `kill -0` pattern
// (storage mode). Both of those were POSIX-only; this works on Windows too.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { stateDir, ensureDirs } from './config.js';

const isWindows = process.platform === 'win32';

function pidFile(name) {
  return path.join(stateDir, `${name}.pid`);
}

export function logFile(name) {
  return path.join(stateDir, `${name}.log`);
}

function readPid(name) {
  const file = pidFile(name);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8').trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

// `process.kill(pid, 0)` is the portable liveness probe: it performs the
// permission/existence check without delivering a signal. EPERM means the
// process exists but is owned by someone else, which still counts as running.
export function isRunning(pid) {
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

export function status(name) {
  const pid = readPid(name);
  if (pid === null) return { running: false, pid: null };
  if (!isRunning(pid)) {
    fs.rmSync(pidFile(name), { force: true });
    return { running: false, pid: null, stale: true };
  }
  return { running: true, pid };
}

/**
 * Spawn a detached `node <script>` process and record its pid.
 * Output is appended to a log file because a detached process has no terminal
 * to inherit once the CLI exits.
 */
export function start(name, scriptPath, args = []) {
  ensureDirs();

  const current = status(name);
  if (current.running) {
    return { started: false, pid: current.pid, reason: 'already-running' };
  }

  const out = fs.openSync(logFile(name), 'a');
  const child = spawn(process.execPath, [scriptPath, ...args], {
    detached: true,
    stdio: ['ignore', out, out],
    windowsHide: true,
    env: process.env,
  });
  child.unref();
  fs.closeSync(out);

  if (child.pid === undefined) {
    return { started: false, pid: null, reason: 'spawn-failed' };
  }

  fs.writeFileSync(pidFile(name), String(child.pid), 'utf8');
  return { started: true, pid: child.pid };
}

export function stop(name) {
  const current = status(name);
  if (!current.running) {
    fs.rmSync(pidFile(name), { force: true });
    return { stopped: false, reason: current.stale ? 'stale' : 'not-running' };
  }

  const { pid } = current;

  if (isWindows) {
    // Windows has no signals; TerminateProcess via process.kill leaves any
    // grandchildren orphaned, so use taskkill with /T to take the tree.
    const result = spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    if (result.status !== 0 && isRunning(pid)) {
      return { stopped: false, pid, reason: 'taskkill-failed' };
    }
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }

  fs.rmSync(pidFile(name), { force: true });
  return { stopped: true, pid };
}
