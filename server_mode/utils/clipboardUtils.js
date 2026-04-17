import clipboard from 'clipboardy';

export async function writeSystemClipboard(content) {
  await clipboard.write(content);
}

export async function readSystemClipboard() {
  const clipboardContent = await clipboard.read();
  return clipboardContent;
}

export function readPlainTextClipboard(content) {
  const id = content.match(/###ID=(.*?)###/)?.[1] || null;
  if (!id) return { id: null, text: content };
  const text = content.replace(`###ID=${id}###`, '');
  return { id, text }
}
