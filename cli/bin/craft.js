#!/usr/bin/env node
import { main } from '../src/cli.js';

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  process.stderr.write(`craft requires Node 20 or newer; this is Node ${process.versions.node}. Install a current Node LTS and retry.\n`);
  process.exit(3);
}
process.exitCode = await main(process.argv.slice(2));
