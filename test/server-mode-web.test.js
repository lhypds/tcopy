import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { acceptsHtml } from '../server_mode/server/contentNegotiation.js';

const projectRoot = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const publicDir = path.join(projectRoot, 'server_mode', 'public');

test('HTML is selected only when explicitly accepted', () => {
  assert.equal(acceptsHtml('text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'), true);
  assert.equal(acceptsHtml('application/xhtml+xml'), true);
  assert.equal(acceptsHtml('text/html;q=0'), false);
  assert.equal(acceptsHtml('text/plain'), false);
  assert.equal(acceptsHtml('*/*'), false);
  assert.equal(acceptsHtml(''), false);
});

test('the public Web UI exposes clipboard controls and server information', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  const clientFetch = fs.readFileSync(path.join(projectRoot, 'server_mode', 'client', 'fetch.js'), 'utf8');

  assert.match(html, /id="clipboard"/);
  assert.match(html, /id="copy-button"/);
  assert.match(html, /id="save-button"/);
  assert.match(html, /id="resize-handle"/);
  assert.match(html, />Status</);
  assert.match(html, />Endpoints</);
  assert.match(script, /Accept: 'text\/plain'/);
  assert.match(script, /new EventSource/);
  assert.match(clientFetch, /Accept: 'text\/plain'/);
});
