import clipboard from 'clipboardy';

export async function writeClipboard(content) {
  await clipboard.write(content);
}

export async function readClipboard() {
  const clipboardContent = await clipboard.read();
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
