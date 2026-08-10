// Daemon entry point: `node storage_mode/watchEntry.js` is what tcopy spawns
// detached for `tcopy start` in storage mode.
import { watch } from './watch.js';

await watch();
