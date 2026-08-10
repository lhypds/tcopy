import fs from 'fs';
import path from 'path';
import { loadIntoProcessEnv, stateFile } from '../../config.js';

loadIntoProcessEnv('server');

export function createLogger(logFile) {
  // Bare names land in the per-user state directory; the process CWD is
  // wherever the user happened to run tcopy from.
  const resolved = path.isAbsolute(logFile) ? logFile : stateFile(logFile);

  return function log(level, msg) {
    if (String(level).toLowerCase() === 'debug' && process.env.DEBUG !== 'true') return;

    const ts = new Date().toISOString().replace('T', ' ').slice(0, 23);
    const line = `[${ts}] ${level.toUpperCase().padEnd(7)} ${msg}`;

    console.log(line);
    fs.appendFile(resolved, `${line}\n`, 'utf8', err => {
      if (err) console.error(`Failed to write log file: ${err.message}`);
    });
  };
}
