import fs from 'fs';

// Read .env
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export function createLogger(logFile) {
  return function log(level, msg) {
    if (String(level).toLowerCase() === 'debug' && process.env.DEBUG !== 'true') return;

    const ts = new Date().toISOString().replace('T', ' ').slice(0, 23);
    const line = `[${ts}] ${level.toUpperCase().padEnd(7)} ${msg}`;

    console.log(line);
    fs.appendFile(logFile, `${line}\n`, 'utf8', err => {
      if (err) console.error(`Failed to write log file: ${err.message}`);
    });
  };
}
