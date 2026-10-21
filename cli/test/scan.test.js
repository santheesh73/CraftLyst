// craft scan: the existing design system is found and described before anything is built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { scanDesignSystem, formatScan } from '../src/scan.js';
import { main, EXIT } from '../src/cli.js';
import { validateAgainst } from '../src/schemas.js';
import { checkPairs } from '../src/tokens.js';

const PROJECTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'projects');

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: () => {} });
  return { code, stdout, json: () => JSON.parse(stdout) };
}

/**
 * @param {Record<string, string | object>} files
 * @returns {string}
 */
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'craft-scan-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }
  return dir;
}

const SHADCN_CSS = `@import "tailwindcss";
:root { --background: oklch(1 0 0); --foreground: oklch(0.145 0 0); --primary: oklch(0.205 0 0); --primary-foreground: oklch(0.985 0 0); --radius: 0.625rem; }
.dark { --background: oklch(0.145 0 0); --foreground: oklch(0.985 0 0); --primary: oklch(0.922 0 0); --primary-foreground: oklch(0.205 0 0); }
@theme inline { --color-background: var(--background); --color-primary: var(--primary); --radius-lg: var(--radius); }
`;

const MUI_THEME = `import { createTheme } from '@mui/material/styles';
const options = {
  palette: {
    primary: { main: '#1b5e20', contrastText: '#ffffff' },
    error: { main: '#b3261e' },
    background: { default: '#fafaf7', paper: '#ffffff' },
    text: { primary: '#1c1b18', secondary: '#55524a' },
    divider: '#d8d4ca'
  },
  typography: { fontFamily: '"Source Sans 3", system-ui, sans-serif' },
  shape: { borderRadius: 10 },
  spacing: 8
} as const;
export const theme = createTheme({
  ...options,
  colorSchemes: { dark: { palette: { primary: { main: '#8fd694', contrastText: '#0b1f0c' }, background: { default: '#121411', paper: '#1b1e19' }, text: { primary: '#ecebe6', secondary: '#b4b1a8' }, error: { main: '#f2b8b5' } } } },
  components: { MuiButton: { defaultProps: { disableElevation: true } } }
});
`;

test('next-tailwind fixture: Tailwind v4 @theme with dark theme, aliases, and components', () => {
  const s = scanDesignSystem(join(PROJECTS, 'next-tailwind'));
  assert.equal(s.verdict, 'established');
  assert.equal(s.framework, 'next');
  assert.ok(s.sources.some((x) => x.kind === 'tailwind-v4-theme' && x.file === 'app/globals.css'));
  const primary = s.tokens.color.find((c) => c.name === '--primary');
  assert.deepEqual([primary?.light, primary?.dark], ['#2f5fc4', '#6d97ea']);
  assert.equal(s.tokens.color.find((c) => c.name === '--color-primary')?.aliasOf, '--primary');
  assert.ok(s.tokens.radius.some((r) => r.name === '--radius' && r.value === '6px'));
  assert.ok(s.guidance.some((g) => /@theme/.test(g)));
});

test('shadcn/ui: components.json, the ui folder, and the CSS variable theme are reported', () => {
  const dir = project({
    'package.json': { dependencies: { react: '19.0.0', next: '15.0.0', '@radix-ui/react-dialog': '1.1.0', 'class-variance-authority': '0.7.0', 'lucide-react': '0.400.0' }, devDependencies: { tailwindcss: '4.1.0' } },
    'components.json': { $schema: 'https://ui.shadcn.com/schema.json', style: 'new-york', tailwind: { css: 'src/app/globals.css', baseColor: 'neutral', cssVariables: true }, aliases: { components: '@/components', ui: '@/components/ui' }, iconLibrary: 'lucide' },
    'src/app/globals.css': SHADCN_CSS,
    'src/components/ui/button.tsx': 'export function Button() { return null; }\n',
    'src/components/ui/dialog.tsx': 'export function Dialog() { return null; }\n',
    'src/components/ui/button.stories.tsx': 'export default {};\n'
  });
  const s = scanDesignSystem(dir);
  assert.equal(s.verdict, 'established');
  const shadcn = s.sources.find((x) => x.kind === 'shadcn');
  assert.match(shadcn?.detail ?? '', /new-york.*neutral.*CSS variables.*src\/app\/globals.css/);
  assert.deepEqual(s.components.find((c) => c.dir === 'src/components/ui')?.names, ['button', 'dialog']);
  assert.deepEqual(s.libraries.map((l) => l.name), ['Radix Primitives', 'cva variants', 'icon set']);
  assert.ok(s.tokens.color.find((c) => c.name === '--background')?.dark);
  assert.ok(s.guidance.some((g) => /shadcn/.test(g)));
});

test('MUI: createTheme palette, color schemes, typography, and shape are read without running the file', () => {
  const dir = project({
    'package.json': { dependencies: { react: '19.0.0', '@mui/material': '6.1.0', '@emotion/react': '11.13.0' } },
    'src/theme.ts': MUI_THEME
  });
  const s = scanDesignSystem(dir);
  assert.equal(s.verdict, 'established');
  assert.equal(s.muiThemes.length, 1);
  const t = s.muiThemes[0];
  assert.equal(t.light.accent, '#1b5e20');
  assert.equal(t.light['surface-raised'], '#ffffff');
  assert.equal(t.light.border, '#d8d4ca');
  assert.equal(t.dark.accent, '#8fd694');
  assert.equal(t.radius, '10px');
  assert.equal(t.spacing, '8px');
  assert.match(t.fontFamily ?? '', /Source Sans 3/);
  assert.ok(s.libraries.some((l) => l.name === 'MUI'));
  assert.ok(s.guidance.some((g) => /MUI/.test(g)));
});

test('init --from-repo folds the MUI palette into schema-valid tokens with passing contrast pairs', async () => {
  const dir = project({
    'package.json': { dependencies: { react: '19.0.0', '@mui/material': '6.1.0' } },
    'src/theme.ts': MUI_THEME
  });
  const r = await run(['init', '--from-repo', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK);
  assert.equal(r.json().designSystem, 'established');
  const tokens = JSON.parse(readFileSync(join(dir, '.craft', 'tokens.json'), 'utf8'));
  assert.deepEqual(validateAgainst('tokens', tokens).errors, []);
  assert.deepEqual(tokens.themes, ['light', 'dark']);
  assert.equal(tokens.primitive.color['mui-accent'], '#1b5e20');
  assert.equal(tokens.primitive.color['mui-accent-dark'], '#8fd694');
  assert.equal(tokens.semantic.color.accent.dark, '{primitive.color.mui-accent-dark}');
  assert.equal(tokens.primitive.radius['mui-radius'], '10px');
  const results = checkPairs(tokens);
  assert.ok(results.length >= 8);
  assert.deepEqual(results.filter((x) => x.status !== 'pass').map((x) => `${x.theme} ${x.pair.fg}/${x.pair.bg} ${x.ratio}`), []);
  assert.match(readFileSync(join(dir, '.craft', 'reports', 'design-scan.md'), 'utf8'), /mui-theme: `src\/theme.ts`/);
});

test('Chakra v3 createSystem tokens, DTCG files, SCSS variables, Tailwind v3 config, and fonts', () => {
  const dir = project({
    'package.json': { dependencies: { react: '19.0.0', '@chakra-ui/react': '3.2.0', sass: '1.80.0' } },
    'src/theme.ts': "import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';\nconst config = defineConfig({ theme: { tokens: { colors: { brand: { 500: { value: '#0a7b5f' }, 600: { value: '#08624c' } } }, fonts: { body: { value: 'Figtree, sans-serif' } } } } });\nexport const system = createSystem(defaultConfig, { theme: { tokens: { colors: { brand: { 500: { value: '#0a7b5f' } } } } } });\n",
    'tokens/color.tokens.json': { color: { $type: 'color', ink: { $value: '#1d1d1b' }, paper: { $value: '#fbfaf6' }, link: { $value: '{color.ink}' } }, radius: { md: { $type: 'dimension', $value: '6px' } } },
    'src/styles/_variables.scss': '$brand-primary: #0a7b5f;\n$spacing-unit: 8px;\n$grid-breakpoint-md: 768px;\n$font-family-base: "Figtree", sans-serif;\n',
    'tailwind.config.js': "module.exports = { theme: { screens: { sm: '640px' }, extend: { colors: { clay: '#a2522b' }, fontFamily: { display: ['Fraunces', 'serif'] }, borderRadius: { card: '14px' } } } };\n",
    'index.html': '<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Fraunces&display=swap" rel="stylesheet">\n'
  });
  const s = scanDesignSystem(dir);
  const kinds = s.sources.map((x) => x.kind);
  for (const k of ['chakra-theme', 'dtcg-tokens', 'scss-variables', 'tailwind-config']) assert.ok(kinds.includes(k), `${k} in ${kinds.join(', ')}`);
  const names = s.tokens.color.map((c) => c.name);
  for (const n of ['chakra:brand-500', 'token:color-ink', 'token:color-paper', '$brand-primary', 'tw:clay']) assert.ok(names.includes(n), `${n} in ${names.join(', ')}`);
  assert.ok(!names.includes('token:color-link'), 'references are not colors');
  assert.ok(s.tokens.radius.some((r) => r.name === 'token:radius-md' && r.value === '6px'));
  assert.ok(s.tokens.radius.some((r) => r.name === 'tw:rounded-card'));
  assert.ok(s.tokens.fontFamily.some((r) => r.name === 'tw:font-display' && /Fraunces/.test(r.value)));
  assert.ok(s.tokens.breakpoint.some((r) => r.name === 'tw:sm'));
  assert.ok(s.tokens.breakpoint.some((r) => r.name === '$grid-breakpoint-md'));
  assert.deepEqual(s.fonts.map((f) => f.family), ['Figtree', 'Fraunces']);
  assert.equal(s.verdict, 'established');
});

test('nothing in the project is executed', () => {
  const marker = join(tmpdir(), `craft-scan-executed-${process.pid}`);
  const dir = project({
    'tailwind.config.js': `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x');\nmodule.exports = { theme: { extend: { colors: { ink: '#111111' } } } };\n`,
    'src/theme.js': `import { createTheme } from '@mui/material/styles';\nrequire('fs').writeFileSync(${JSON.stringify(marker)}, 'x');\nexport default createTheme({ palette: { primary: { main: '#123456' } } });\n`
  });
  const s = scanDesignSystem(dir);
  assert.equal(existsSync(marker), false);
  assert.ok(s.tokens.color.some((c) => c.name === 'tw:ink'));
  assert.equal(s.muiThemes[0]?.light.accent, '#123456');
});

test('tests and fixtures are not mistaken for the product design system; an empty project is "none"', () => {
  const dir = project({
    'package.json': { dependencies: { react: '19.0.0' } },
    'src/App.jsx': 'export default function App() { return <main>Hi</main>; }\n',
    'test/fixtures/theme.css': ':root { --a: #111; --b: #222; --c: #333; --d: #444; --e: 4px; --f: 8px; }\n'
  });
  const s = scanDesignSystem(dir);
  assert.equal(s.verdict, 'none');
  assert.deepEqual(s.sources, []);
  assert.match(formatScan(s), /No design system found/);
});

test('craft scan --json is read-only and exits 0', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-scan-cli-'));
  cpSync(join(PROJECTS, 'next-tailwind'), dir, { recursive: true });
  const r = await run(['scan', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK);
  const j = r.json();
  assert.equal(j.command, 'scan');
  assert.equal(j.verdict, 'established');
  assert.ok(Array.isArray(j.tokens.color));
  assert.equal(existsSync(join(dir, '.craft')), false);
  const text = await run(['scan', '--cwd', dir]);
  assert.match(text.stdout, /^# Existing design system \(craft scan\)/);
});

test('without tokens, repeated literal values are reported as the de facto system', () => {
  const dir = project({
    'index.html': '<!doctype html><html lang="en"><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hi</h1></body></html>\n',
    'styles.css': 'body { font-family: Georgia, serif; color: #333; font-size: 16px; }\n.a { color: #1d6f73; border-radius: 4px; }\n.b { background: #1d6f73; border: 1px solid #ddd; }\n.c { color: var(--x, #000); }\n'
  });
  const s = scanDesignSystem(dir);
  assert.equal(s.verdict, 'partial');
  assert.deepEqual(s.inUse.color[0], { value: '#1d6f73', count: 2 });
  assert.ok(!s.inUse.color.some((c) => c.value === '#000'), 'values inside var() fallbacks are not counted');
  assert.deepEqual(s.inUse.fontFamily, [{ value: 'Georgia, serif', count: 1 }]);
  assert.deepEqual(s.inUse.radius, [{ value: '4px', count: 1 }]);
  assert.match(formatScan(s), /Values in use[\s\S]*#1d6f73 \(2\)/);
});
