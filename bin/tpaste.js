#!/usr/bin/env node
import { runSingle } from '../cli.js';

process.exitCode = await runSingle('tpaste', process.argv.slice(2));
