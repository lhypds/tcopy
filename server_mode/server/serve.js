import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import { writeId } from '../utils/idUtils.js';
import { ExpressPeerServer } from 'peer';
import { createLogger } from '../utils/logUtils.js';

const log = createLogger('server.log');

// Load environment variables from .env file
dotenv.config();

const port = process.env.PORT || 5460;
const outputFile = 'clipboard.txt';
const watchInterval = 300;
const heartbeatIntervalMs = 30 * 1000;


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    log('info', `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
});

const fileWatcher = (filePath, interval = 300) => (req, res) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  const sendFileContent = () => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return;
      }

      // Extract id from the data
      const id = data.match(/###ID=(.*?)###/)?.[1] || null;
      const text = data.replace(`###ID=${id}###`, '');

      log('info', 'File changed, sending new content to client.');
      res.write(`data: ${JSON.stringify({ id: id, text: text || '', timestamp: new Date().toISOString() })}\n\n`);
    });
  };

  const watcher = (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
      sendFileContent();
    }
  };

  fs.watchFile(filePath, { interval }, watcher);
  req.on('close', () => {
    fs.unwatchFile(filePath, watcher);
    res.end();
  });
};
const watchFileEvents = fileWatcher(outputFile, watchInterval);

// Route to replace text input in a file
// Input is JSON, for example: { "text": "Hello, World!" }
app.post('/', (req, res) => {
  const { id, text, timestamp } = req.body || {};

  if (text) {
    // Log the received text input to the console
    log('info', `Received text (id: ${id}, timestamp: ${timestamp}): ${text}`);

    fs.writeFile(outputFile, `###ID=${id}###` + text, (err) => {
      if (err) {
        res.status(500).send('Error saving the text');
      } else {
        res.send('Text saved: `' + text + '`');
      }
    });
  } else {
    res.status(400).send('No text input provided.');
  }
});

// Route to get the content of the file
app.get('/', (req, res) => {
  if (!fs.existsSync(outputFile)) {
    return res.send('');
  }

  fs.readFile(outputFile, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading the file');
    } else {
      res.send(data || '');
    }
  });
});

// Route for Server-Sent Events to watch file changes
app.get('/sse', (req, res) => {
  log('info', 'Client connected to /sse endpoint.');

  // Send an initial heartbeat to establish the connection
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ text: '###ALIVE###', timestamp: new Date().toISOString() })}\n\n`);
    }
  }, heartbeatIntervalMs);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    log('info', 'Client disconnected from /sse endpoint.');
  });

  watchFileEvents(req, res);
});

const server = app.listen(port, () => {
  // Ensure the output file exists
  if (!fs.existsSync(outputFile)) {
    log('info', `Output file "${outputFile}" does not exist. Creating it.`);
    fs.writeFileSync(outputFile, '', 'utf8');
  }

  // Write the id file
  writeId('id');

  // Log server start message
  log('info', `Server is running at \`http://localhost:${port}\`.`);

  // Print available endpoints
  const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'POST', path: '/' },
    { method: 'GET', path: '/sse' },
    { method: 'GET', path: '/signal' },
  ]
  console.log('\nAvailable endpoints:');
  endpoints.forEach(endpoint => {
    console.log(`- ${endpoint.method} ${endpoint.path}`);
  });
  console.log('');
});

// PeerJS signaling server for WebRTC
// ExpressPeerServer needs the http.Server instance returned by app.listen()
// so it must come after. That's the standard PeerJS pattern.
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
app.use("/signal", peerServer);
