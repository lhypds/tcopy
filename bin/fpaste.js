#!/usr/bin/env node
import { runSingle } from '../cli.js';

process.exitCode = await runSingle('fpaste', process.argv.slice(2));
