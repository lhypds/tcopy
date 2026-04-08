/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
