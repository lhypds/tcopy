import clipboard from 'clipboardy';

export async function writeClipboard(content) {
  await clipboard.write(content);
  console.log('Content copied to clipboard.');
}

export async function readClipboard() {
  const clipboardContent = await clipboard.read();
  return clipboardContent;
}

export async function fetchRemoteClipboard(url) {
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
  return content;
}
