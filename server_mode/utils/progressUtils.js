function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function renderProgressBar(progressInfo) {
  const percentage = Math.max(0, Math.min(100, Number(progressInfo.progress) || 0));
  const barWidth = 30;
  const filled = Math.round((percentage / 100) * barWidth);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)}`;
  const received = formatBytes(progressInfo.receivedSize);
  const total = formatBytes(progressInfo.totalSize);
  const line = `Receiving ${progressInfo.name} [${bar}] ${percentage.toFixed(1)}% (${received}/${total})`;

  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
    process.stdout.write(line);
    return;
  }

  console.log(line);
}

export function clearProgressBar() {
  if (!process.stdout.isTTY) {
    return;
  }

  process.stdout.cursorTo(0);
  process.stdout.clearLine(0);
}
