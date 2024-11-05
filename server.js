const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const app = express();

// Load environment variables from .env file
dotenv.config();

// Use the STORE_FILE and PORT environment variables
const outputFile = process.env.STORE_FILE || 'a.txt';
const port = process.env.PORT || 5460;

// Route to replace text input in a file
app.get('/save', (req, res) => {
  const textInput = req.query.text;
  if (textInput) {
    // Log the received text input to the console
    console.log(`Received text: ${textInput}`);

    fs.writeFile(outputFile, textInput, (err) => {
      if (err) {
        res.status(500).send('Error saving the text');
      } else {
        res.send('Text replaced successfully');
      }
    });
  } else {
    res.status(400).send('No text input provided');
  }
});

// Route to get the content of the file
app.get('/', (req, res) => {
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