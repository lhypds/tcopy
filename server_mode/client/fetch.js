// Fetch clipboard content from the tcopy server and copy it to the local clipboard.
import clipboard from 'clipboardy';
import 'dotenv/config';

const baseUrl = process.env.SERVER_BASE_URL;

if (!baseUrl) {
  console.error('Error: SERVER_BASE_URL not found in .env file');
  process.exit(1);
}

async function fetchAndCopy(url) {
  try {
    console.log(`Fetching content from \`${url}\`.`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const content = await response.text();

    const contentReplaced = content
      .replace(/\n/g, '<LF>')
      .replace(/\r/g, '<CR>')
      .replace(/\t/g, '<TAB>')
      .replace(/ /g, '<SPACE>');

    console.log(`Fetched content: \`${contentReplaced}\``);
    await clipboard.write(content);
    console.log('Content copied to clipboard.');
  } catch (e) {
    console.error(`Error fetching content from ${url}: ${e.message}`);
    process.exit(1);
  }
}

fetchAndCopy(baseUrl);
