// Interactive prompts (replaces the bash `read -r` loops).
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/** Thrown when there is no one to answer — piped input ran out, or no tty. */
export class PromptAbortError extends Error {}

function ask(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // rl.question() never settles if stdin reaches EOF, so race it against
  // 'close'. Without this the process exits on an unsettled await instead of
  // reporting anything.
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = fn => value => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    rl.on('close', () => {
      settle(reject)(new PromptAbortError('No input available (stdin closed).'));
    });

    rl.question(question).then(
      settle(answer => resolve(answer.trim())),
      settle(reject)
    );
  }).finally(() => rl.close());
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
