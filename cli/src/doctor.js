// Environment and project detection. Reads files only; never spawns processes or uses the network.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {{
 *   node: string, nodeSupported: boolean, packageManager: string | null,
 *   framework: string | null, styling: string | null, tailwind: string | null,
 *   playwright: string | null, axe: string | null, projectScripts: string[],
 *   contract: boolean, packageJson: boolean
 * }} Environment
 */

/**
 * @param {string} path
 * @returns {any}
 */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Version of an installed package in the project, or null.
 * @param {string} root
 * @param {string} name
 * @returns {string | null}
 */
function installedVersion(root, name) {
  const pkg = readJson(join(root, 'node_modules', name, 'package.json'));
  return pkg && typeof pkg.version === 'string' ? pkg.version : null;
}

/**
 * @param {string} root project root
 * @returns {Environment}
 */
export function detect(root) {
  const pkg = readJson(join(root, 'package.json'));
  /** @type {Record<string, string>} */
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  const lockfiles = /** @type {const} */ ([
    ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lockb', 'bun'], ['bun.lock', 'bun'], ['package-lock.json', 'npm']
  ]);
  const packageManager = lockfiles.find(([f]) => existsSync(join(root, f)))?.[1] ?? (pkg ? 'npm' : null);

  let framework = null;
  if (deps.next) framework = 'next';
  else if (deps.astro) framework = 'astro';
  else if (deps.svelte || deps['@sveltejs/kit']) framework = 'svelte';
  else if (deps.vue || deps.nuxt) framework = 'vue';
  else if (deps.react) framework = 'react';
  else if (existsSync(join(root, 'index.html'))) framework = 'html';

  const tailwind = installedVersion(root, 'tailwindcss') ?? deps.tailwindcss ?? null;
  let styling = null;
  if (tailwind) {
    const major = /(\d+)/.exec(tailwind)?.[1];
    styling = major === '3' ? 'tailwind-v3' : major === '4' ? 'tailwind-v4' : 'tailwind';
  } else if (deps.sass || deps['sass-embedded']) styling = 'scss';
  else if (deps['styled-components'] || deps['@emotion/react']) styling = 'css-in-js';
  else if (pkg || framework === 'html') styling = 'css';

  const scripts = Object.keys(pkg?.scripts ?? {});
  const projectScripts = ['lint', 'typecheck', 'type-check', 'check', 'test', 'build'].filter((s) => scripts.includes(s));

  const major = Number(process.versions.node.split('.')[0]);
  return {
    node: process.versions.node,
    nodeSupported: major >= 20,
    packageManager,
    framework,
    styling,
    tailwind,
    playwright: installedVersion(root, 'playwright') ?? installedVersion(root, '@playwright/test'),
    axe: installedVersion(root, 'axe-core') ?? installedVersion(root, '@axe-core/playwright'),
    projectScripts,
    contract: existsSync(join(root, '.craft', 'DESIGN.md')),
    packageJson: Boolean(pkg)
  };
}
