import fs from 'fs';

export function createLogger(logFile) {
  return function log(level, msg) {
    if (String(level).toLowerCase() === 'debug') return;

    const ts = new Date().toISOString().replace('T', ' ').slice(0, 23);
    const line = `[${ts}] ${level.toUpperCase().padEnd(7)} ${msg}`;

    console.log(line);
    fs.appendFile(logFile, `${line}\n`, 'utf8', err => {
      if (err) console.error(`Failed to write log file: ${err.message}`);
    });
  };
}
