const fs = require('fs');

const fileWatcher = (filePath, watchInterval = 300) => (req, res) => {
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

      res.write(`data: ${JSON.stringify({ text: data || '' })}\n\n`);
    });
  };

  sendFileContent();
  const watcher = (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
      sendFileContent();
    }
  };

  fs.watchFile(filePath, { interval: watchInterval }, watcher);
  req.on('close', () => {
    fs.unwatchFile(filePath, watcher);
    res.end();
  });
};

module.exports = {
  fileWatcher,
};
