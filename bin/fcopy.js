#!/usr/bin/env node
import { runSingle } from '../cli.js';

process.exitCode = await runSingle('fcopy', process.argv.slice(2));
