// Interactive prompts (replaces the bash `read -r` loops).
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/** Thrown when there is no one to answer — piped input ran out, or no tty. */
export class PromptAbortError extends Error {}

// One shared interface for the whole process. A fresh readline per question
// would work interactively but lose piped input: readline buffers a chunk of
// stdin, and that buffer dies with the interface, so the second question would
// see EOF instead of the next line.
let rl = null;
let lines = null;

function ensureInterface() {
  if (rl) return;
  rl = readline.createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
  // Pull answers from the line iterator rather than rl.question(). question()
  // never settles once stdin hits EOF, and watching 'close' to compensate is
  // unreliable: a drained pipe closes while readline still holds buffered
  // lines, so a later question would be refused with input still pending.
  lines = rl[Symbol.asyncIterator]();
}

/**
 * Releases stdin. Must be called once prompting is done, otherwise the open
 * interface keeps the event loop alive and the process never exits.
 */
export function closePrompts() {
  if (!rl) return;
  rl.close();
  rl = null;
  lines = null;
}

async function ask(question) {
  ensureInterface();
  stdout.write(question);
  const next = await lines.next();
  if (next.done) {
    stdout.write('\n');
    throw new PromptAbortError('No input available (stdin closed).');
  }
  return String(next.value).trim();
}

export async function askText(question, { required = true, defaultValue = '' } = {}) {
  for (;;) {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = await ask(`${question}${suffix}: `);
    if (answer) return answer;
    if (defaultValue) return defaultValue;
    if (!required) return '';
    console.log('Value cannot be empty.');
  }
}

/** Renders `storage` with key `t` as `s[t]orage`. */
function formatChoice({ value, key }) {
  const index = value.toLowerCase().indexOf(key.toLowerCase());
  if (index === -1) return `[${key}]${value}`;
  return `${value.slice(0, index)}[${value.slice(index, index + key.length)}]${value.slice(index + key.length)}`;
}

/**
 * Prompts until the answer matches one of `choices`, each `{ value, key }`.
 * The answer may be the full value or the shortcut key, case-insensitively.
 *
 * Keys are given explicitly rather than taken from the first letter: `server`
 * and `storage` both start with `s`, so deriving them silently made one of the
 * two unreachable.
 */
export async function askChoice(question, choices) {
  const keys = choices.map(choice => choice.key.toLowerCase());
  if (new Set(keys).size !== keys.length) {
    throw new Error(`Ambiguous shortcut keys: ${keys.join(', ')}`);
  }

  const hint = choices.map(formatChoice).join('/');
  const values = choices.map(choice => choice.value).join(', ');

  for (;;) {
    const answer = (await ask(`${question} (${hint}): `)).toLowerCase();
    const match = choices.find(
      choice => choice.value.toLowerCase() === answer || choice.key.toLowerCase() === answer
    );
    if (match) return match.value;
    console.log(`Invalid choice. Please choose one of: ${values}.`);
  }
}
