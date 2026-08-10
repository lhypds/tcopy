// Daemon entry point: `node src/storage/watchEntry.js` is what tcopy spawns
// detached for `tcopy start` in storage mode.
import { watch } from './watch.js';

await watch();
