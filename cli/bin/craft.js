#!/usr/bin/env node
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  process.stderr.write(`craft requires Node 20 or newer; this is Node ${process.versions.node}. Install a current Node LTS and retry.\n`);
  process.exit(3);
}

// Imported dynamically so a missing runtime dependency (a git clone without `npm install`)
// exits 3, "tool unavailable", instead of crashing with a stack trace.
let main;
try {
  ({ main } = await import('../src/cli.js'));
} catch (err) {
  const e = /** @type {NodeJS.ErrnoException} */ (err);
  if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  const pkg = /Cannot find package '([^']+)'/.exec(e.message)?.[1] ?? 'a runtime dependency';
  process.stderr.write(`craft: ${pkg} is not installed. Run \`npm install\` in the repository root (the packaged skill ships it already), then retry.\n`);
  process.exit(3);
}
process.exitCode = await main(process.argv.slice(2));
