const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const app = express();

// Load environment variables from .env file
dotenv.config();

const port = process.env.PORT || 5460;
const outputFile = 'clipboard.txt';

if (!fs.existsSync(outputFile)) {
  fs.writeFileSync(outputFile, '', 'utf8');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
