import clipboard from 'clipboardy';

export async function writeClipboard(content) {
  await clipboard.write(content);
  console.log('Content copied to clipboard.');
}

export async function readClipboard() {
  const clipboardContent = await clipboard.read();
  console.log("Content read from clipboard.");
  return clipboardContent;
}

export async function fetchRemoteClipboard(url) {
  try {
    console.log(`Fetching content from \`${url}\`.`);
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();

    // Print fetched content
    const contentReplaced = content
      .replace(/\n/g, '<LF>')
      .replace(/\r/g, '<CR>')
      .replace(/\t/g, '<TAB>')
      .replace(/ /g, '<SPACE>');
    console.log(`Fetched content: \`${contentReplaced}\``);

    return {
      success: true,
      content: content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readPlainTextClipboard(content) {
  const id = content.match(/###ID=(.*?)###/)?.[1] || null;
  const text = content.replace(`###ID=${id}###`, '');
  return { id, text }
}
