import fs from 'fs';

/**
 * Writes a Unix-timestamp-based ID to the given file path.
 * Returns the generated ID string.
 */
export function writeId(filePath) {
  const id = String(Math.floor(Date.now() / 1000));
  fs.writeFileSync(filePath, id, 'utf-8');
  return id;
}

/**
 * Reads an ID from the given file path.
 * Returns the trimmed string, or an empty string if the file is absent.
 */
export function readId(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return '';
  }
}
