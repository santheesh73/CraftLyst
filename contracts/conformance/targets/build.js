#!/usr/bin/env node
// Bundles each demo page (radix/main.jsx, react-aria/main.jsx) into <lib>/build/app.js with
// esbuild. Dependencies are NOT part of this repository: install them in a separate
// directory (see README.md) and pass it with --modules.
//   node contracts/conformance/targets/build.js --modules /path/to/dir/node_modules [radix react-aria]
import { createRequire } from 'node:module';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const { values, positionals } = parseArgs({ options: { modules: { type: 'string' } }, allowPositionals: true });
if (!values.modules) {
  console.error('Pass --modules <dir>/node_modules (where the pinned demo dependencies are installed).');
  process.exit(2);
}
const modules = resolve(values.modules);
const esbuild = createRequire(join(modules, 'noop.js'))('esbuild');
for (const lib of positionals.length ? positionals : ['radix', 'react-aria']) {
  await esbuild.build({
    entryPoints: [join(here, lib, 'main.jsx')],
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    minify: true,
    nodePaths: [modules],
    define: { 'process.env.NODE_ENV': '"production"' },
    outfile: join(here, lib, 'build', 'app.js'),
    logLevel: 'warning'
  });
  console.log(`built ${lib}/build/app.js`);
}
