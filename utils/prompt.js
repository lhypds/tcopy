// Interactive prompts (replaces the bash `read -r` loops).
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function ask(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
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

/**
 * Prompts until the answer matches one of `choices`.
 * Each choice accepts its full name or its first letter, case-insensitively.
 */
export async function askChoice(question, choices) {
  const hint = choices.map(choice => `[${choice[0]}]${choice.slice(1)}`).join('/');
  for (;;) {
    const answer = (await ask(`${question} (${hint}): `)).toLowerCase();
    const match = choices.find(
      choice => choice.toLowerCase() === answer || choice[0].toLowerCase() === answer
    );
    if (match) return match;
    console.log(`Invalid choice. Please choose one of: ${choices.join(', ')}.`);
  }
}
