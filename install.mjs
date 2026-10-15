#!/usr/bin/env node
// Installs Frontend Craft for coding agents: node install.mjs install --agent all
// From a clone, run "npm ci && npm run package" first. See docs/installation.md.
import { main } from './installer/main.js';

process.exitCode = main(process.argv.slice(2));
