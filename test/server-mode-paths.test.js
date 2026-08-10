import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolvePath } from '../server_mode/utils/pathUtils.js';

test('server-mode file paths are resolved from the command working directory', () => {
  assert.equal(resolvePath('yt.py'), path.join(process.cwd(), 'yt.py'));
  assert.equal(resolvePath(path.resolve('yt.py')), path.resolve('yt.py'));
});
