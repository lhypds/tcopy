import os from 'os';
import path from 'path';

export function resolvePath(inputPath) {
  if (!inputPath) {
    return inputPath;
  }

  // Handle `~` and `~/...`
  if (inputPath === '~') {
    return os.homedir();
  }
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return path.resolve(inputPath);
}
