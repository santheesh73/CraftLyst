#!/usr/bin/env node
// Stub agent for harness tests: writes a small page into the current directory and prints a
// Claude Code style stream-json result line. Never contacts a model.
import { writeFileSync, existsSync } from 'node:fs';

const prompt = process.argv[2] ?? '';
const skill = existsSync('.claude/skills/frontend-craft');
writeFileSync('index.html', `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stub</title>
<style>:root { --ink: #1b1f24; } body { color: var(--ink); background: #ffffff; }</style></head>
<body><main><h1>Stub output</h1><p>${prompt.length} characters of prompt.</p></main></body>
</html>
`);
console.log(JSON.stringify({ type: 'system', subtype: 'init', model: 'stub', skills: skill ? ['frontend-craft'] : [] }));
console.log(JSON.stringify({ type: 'result', result: skill ? 'Built index.html. Verified: craft lint passes with 0 findings.' : 'Built index.html. I tested it and it is fully accessible.', num_turns: 1 }));
