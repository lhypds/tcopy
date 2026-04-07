const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const app = express();

// Load environment variables from .env file
dotenv.config();

const port = process.env.PORT || 5460;
const outputFile = 'clipboard.txt';
const watchInterval = 300;
const heartbeatIntervalMs = 60 * 1000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fileWatcher = (filePath, interval = 300) => (req, res) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendFileContent = () => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return;
      }
      res.write(`data: ${JSON.stringify({ text: data || '', timestamp: new Date().toISOString() })}\n\n`);
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
  const textInput = req.body && req.body.text;
  if (textInput) {
    // Log the received text input to the console
    console.log(`Received text: ${textInput}`);

    fs.writeFile(outputFile, textInput, (err) => {
      if (err) {
        res.status(500).send('Error saving the text');
      } else {
        res.send('Text saved: `' + textInput + '`');
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
app.get('/events', (req, res) => {
  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ text: '###ALIVE###', timestamp: new Date().toISOString() })}\n\n`);
    }
  }, heartbeatIntervalMs);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  watchFileEvents(req, res);
});

// Start the server
app.listen(port, () => {
  // Ensure the output file exists
  if (!fs.existsSync(outputFile)) {
    console.log(`Output file "${outputFile}" does not exist. Creating it.`);
    fs.writeFileSync(outputFile, '', 'utf8');
  }

  console.log(`Server is running at http://localhost:${port}`);
});
