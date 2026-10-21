// craft scan: inventory the design system a project already has, before anything is built.
// Static only, like extract.js: CSS custom properties, Tailwind v3 config and v4 @theme, shadcn
// components.json, MUI / Chakra / Mantine theme objects, DTCG or Style Dictionary token files,
// SCSS variables, fonts, and the project's own UI components. Nothing from the project is executed.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseJs } from '@babel/parser';
import { listFiles } from './files.js';
import { FIXTURE_FILE, TEST_FILE, parseDocument } from './document.js';
import { detect } from './doctor.js';
import { asColor, classify, collectCustomProps, tailwindColors } from './extract.js';

/**
 * @typedef {{ kind: string, file: string, detail: string }} Source
 * @typedef {{ name: string, light?: string, dark?: string, role?: string, aliasOf?: string, source: string }} ColorToken
 * @typedef {{ name: string, value: string, source: string }} ValueToken
 * @typedef {{ kind: string, name: string, package: string, version: string }} Library
 * @typedef {{ value: string, count: number }} Count
 * @typedef {{
 *   framework: string | null, styling: string | null, verdict: 'established' | 'partial' | 'none',
 *   libraries: Library[], sources: Source[],
 *   tokens: { color: ColorToken[], fontFamily: ValueToken[], fontSize: ValueToken[], radius: ValueToken[], space: ValueToken[], shadow: ValueToken[], breakpoint: ValueToken[] },
 *   fonts: { family: string, source: string }[], components: { dir: string, names: string[] }[],
 *   inUse: { color: Count[], fontFamily: Count[], fontSize: Count[], radius: Count[] },
 *   muiThemes: MuiTheme[], guidance: string[]
 * }} DesignScan
 * @typedef {{ file: string, mode: string | null, light: Record<string, string>, dark: Record<string, string>, fontFamily: string | null, radius: string | null, spacing: string | null }} MuiTheme
 */

/** Packages that mean "this project already has a component library or design system". */
const LIBRARIES = /** @type {[RegExp, string, string][]} */ ([
  [/^@mui\/material$/, 'component-library', 'MUI'],
  [/^@mui\/joy$/, 'component-library', 'MUI Joy'],
  [/^@chakra-ui\/react$/, 'component-library', 'Chakra UI'],
  [/^@mantine\/core$/, 'component-library', 'Mantine'],
  [/^antd$/, 'component-library', 'Ant Design'],
  [/^@fluentui\/react-components$/, 'component-library', 'Fluent UI'],
  [/^@nextui-org\/react$|^@heroui\/react$/, 'component-library', 'HeroUI (NextUI)'],
  [/^primereact$|^primevue$/, 'component-library', 'PrimeReact/PrimeVue'],
  [/^vuetify$/, 'component-library', 'Vuetify'],
  [/^@angular\/material$/, 'component-library', 'Angular Material'],
  [/^react-bootstrap$|^bootstrap$/, 'component-library', 'Bootstrap'],
  [/^daisyui$/, 'component-library', 'daisyUI'],
  [/^@skeletonlabs\/skeleton$/, 'component-library', 'Skeleton'],
  [/^@radix-ui\/themes$/, 'component-library', 'Radix Themes'],
  [/^@radix-ui\/react-/, 'headless', 'Radix Primitives'],
  [/^radix-ui$/, 'headless', 'Radix Primitives'],
  [/^react-aria-components$|^react-aria$/, 'headless', 'React Aria'],
  [/^@headlessui\//, 'headless', 'Headless UI'],
  [/^@ark-ui\//, 'headless', 'Ark UI'],
  [/^bits-ui$/, 'headless', 'Bits UI'],
  [/^@base-ui-components\/react$|^@base-ui\/react$/, 'headless', 'Base UI'],
  [/^styled-components$/, 'styling', 'styled-components'],
  [/^@emotion\/react$|^@emotion\/styled$/, 'styling', 'Emotion'],
  [/^@vanilla-extract\/css$/, 'styling', 'vanilla-extract'],
  [/^@pandacss\/dev$/, 'styling', 'Panda CSS'],
  [/^@stitches\/react$/, 'styling', 'Stitches'],
  [/^class-variance-authority$/, 'styling', 'cva variants'],
  [/^style-dictionary$/, 'tokens', 'Style Dictionary'],
  [/^lucide-react$|^lucide-vue-next$|^@heroicons\/|^@phosphor-icons\/|^@tabler\/icons|^react-icons$|^@radix-ui\/react-icons$/, 'icons', 'icon set']
]);

/** MUI palette paths mapped to the semantic roles extract.js uses. */
const MUI_ROLES = /** @type {[string, string][]} */ ([
  ['background.default', 'surface'], ['background.paper', 'surface-raised'], ['text.primary', 'text'],
  ['text.secondary', 'text-muted'], ['primary.main', 'accent'], ['primary.contrastText', 'on-accent'],
  ['divider', 'border'], ['error.main', 'danger'], ['success.main', 'success'], ['warning.main', 'warning']
]);

const THEME_CALLS = new Set(['createTheme', 'extendTheme', 'experimental_extendTheme', 'unstable_createMuiStrictModeTheme', 'createSystem', 'defineConfig', 'responsiveFontSizes']);
const JS_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const MAX = 40;
/** Tests, fixtures, and demos describe other projects, not this one's design system. */
const product = (/** @type {string} */ f) => !TEST_FILE.test(f) && !FIXTURE_FILE.test(f);

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
 * Turn a literal AST node into a plain value; anything computed becomes undefined.
 * Identifiers are resolved through the file's top-level `const x = {...}` declarations.
 * @param {any} node
 * @param {Map<string, any>} consts
 * @param {number} [depth]
 * @returns {any}
 */
function literal(node, consts, depth = 0) {
  if (!node || depth > 12) return undefined;
  switch (node.type) {
    case 'StringLiteral': case 'NumericLiteral': case 'BooleanLiteral': return node.value;
    case 'TemplateLiteral': return node.expressions.length ? undefined : node.quasis.map((/** @type {any} */ q) => q.value.cooked).join('');
    case 'TSAsExpression': case 'TSSatisfiesExpression': case 'ParenthesizedExpression': return literal(node.expression, consts, depth + 1);
    case 'Identifier': return consts.has(node.name) ? literal(consts.get(node.name), consts, depth + 1) : undefined;
    case 'ArrayExpression': return node.elements.map((/** @type {any} */ e) => literal(e, consts, depth + 1));
    case 'ObjectExpression': {
      /** @type {Record<string, any>} */
      const o = {};
      for (const p of node.properties) {
        if (p.type === 'SpreadElement') {
          const v = literal(p.argument, consts, depth + 1);
          if (v && typeof v === 'object') Object.assign(o, v);
          continue;
        }
        if (p.type !== 'ObjectProperty' || p.computed) continue;
        const key = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' || p.key.type === 'NumericLiteral' ? String(p.key.value) : null;
        if (key !== null) o[key] = literal(p.value, consts, depth + 1);
      }
      return o;
    }
    default: return undefined;
  }
}

/**
 * @param {any} obj
 * @param {string} path dotted
 * @returns {any}
 */
const at = (obj, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);

/**
 * Parse a JS/TS file, returning its AST and top-level const initializers.
 * @param {string} file
 * @param {string} text
 * @returns {{ ast: any, consts: Map<string, any> } | null}
 */
function parseModule(file, text) {
  const ts = /\.tsx?$/.test(file);
  try {
    const ast = parseJs(text, { sourceType: 'unambiguous', errorRecovery: true, plugins: ts ? (file.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript']) : ['jsx'] });
    /** @type {Map<string, any>} */
    const consts = new Map();
    for (const st of ast.program.body) {
      const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
      if (decl?.type !== 'VariableDeclaration') continue;
      for (const d of decl.declarations) if (d.id.type === 'Identifier' && d.init) consts.set(d.id.name, d.init);
    }
    return { ast, consts };
  } catch {
    return null;
  }
}

/**
 * First-argument objects of theme factory calls (createTheme, extendTheme, createSystem, ...).
 * @param {any} ast
 * @param {Map<string, any>} consts
 * @returns {{ callee: string, value: any }[]}
 */
function themeCalls(ast, consts) {
  /** @type {{ callee: string, value: any }[]} */
  const out = [];
  /** @param {any} node */
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'CallExpression') {
      const callee = node.callee.type === 'Identifier' ? node.callee.name : node.callee.type === 'MemberExpression' && !node.callee.computed ? node.callee.property.name : null;
      if (callee && THEME_CALLS.has(callee)) {
        // createSystem(defaultConfig, config) and createTheme(base, overrides): read every object argument.
        for (const arg of node.arguments) {
          const value = literal(arg, consts);
          if (value && typeof value === 'object' && !Array.isArray(value)) out.push({ callee, value });
        }
      }
    }
    for (const k of Object.keys(node)) if (k !== 'loc' && k !== 'start' && k !== 'end' && k !== 'extra') visit(node[k]);
  };
  visit(ast.program);
  return out;
}

/**
 * Flatten nested color objects ({ brand: { 500: '#..' } }) into name/value pairs.
 * Chakra and Panda wrap leaves as { value: '#..' }.
 * @param {any} obj
 * @param {string} prefix
 * @param {{ name: string, value: string }[]} out
 */
function flattenColors(obj, prefix, out) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const name = k === 'DEFAULT' || k === 'value' || k === '$value' ? prefix : prefix ? `${prefix}-${k}` : k;
    if (typeof v === 'string' && asColor(v) && name) out.push({ name, value: v });
    else if (v && typeof v === 'object') flattenColors(v, name, out);
  }
}

/**
 * Read an MUI palette into role → color.
 * @param {any} palette
 * @returns {Record<string, string>}
 */
function muiRoles(palette) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!palette || typeof palette !== 'object') return out;
  for (const [path, role] of MUI_ROLES) {
    const v = at(palette, path);
    if (typeof v === 'string' && asColor(v)) out[role] = v;
  }
  return out;
}

/**
 * Leaves of a DTCG ($value) or Style Dictionary (value) token file.
 * @param {any} obj
 * @param {string} prefix
 * @param {string | undefined} inheritedType
 * @param {{ name: string, value: string, type?: string }[]} out
 */
function tokenLeaves(obj, prefix, inheritedType, out) {
  if (!obj || typeof obj !== 'object' || out.length > 5000) return;
  const type = obj.$type ?? obj.type ?? inheritedType;
  const raw = obj.$value ?? obj.value;
  if (raw !== undefined && (typeof raw === 'string' || typeof raw === 'number')) {
    out.push({ name: prefix, value: String(raw), type: typeof type === 'string' ? type : undefined });
    return;
  }
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith('$') && v && typeof v === 'object') tokenLeaves(v, prefix ? `${prefix}-${k}` : k, typeof type === 'string' ? type : undefined, out);
}

/**
 * Component files in the usual shared-UI folders (names only).
 * @param {string} root
 * @param {string[]} extraDirs
 * @returns {{ dir: string, names: string[] }[]}
 */
function componentDirs(root, extraDirs) {
  const dirs = [...new Set([...extraDirs, 'components/ui', 'src/components/ui', 'app/components/ui', 'src/lib/components/ui', 'components', 'src/components', 'src/ui', 'src/lib/components', 'app/components'])];
  /** @type {{ dir: string, names: string[] }[]} */
  const out = [];
  const seen = new Set();
  for (const dir of dirs) {
    const abs = join(root, dir);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
    const names = readdirSync(abs, { withFileTypes: true })
      .filter((e) => (e.isFile() && /\.(jsx|tsx|vue|svelte|astro)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) || (e.isDirectory() && dir.endsWith('ui')))
      .map((e) => e.name.replace(/\.(jsx|tsx|vue|svelte|astro)$/, ''))
      .filter((n) => !seen.has(`${dir}/${n}`))
      .sort();
    if (!names.length) continue;
    names.forEach((n) => seen.add(`${dir}/${n}`));
    // A parent folder that only contains the ui/ subfolder adds nothing.
    if (names.length === 1 && names[0] === 'ui') continue;
    out.push({ dir, names });
  }
  return out;
}

/**
 * Inventory the project's existing design system.
 * @param {string} root
 * @param {string[]} [ignore]
 * @returns {DesignScan}
 */
export function scanDesignSystem(root, ignore = []) {
  const env = detect(root);
  const pkg = readJson(join(root, 'package.json'));
  /** @type {Record<string, string>} */
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  /** @type {Library[]} */
  const libraries = [];
  for (const [dep, version] of Object.entries(deps).sort((a, b) => a[0].localeCompare(b[0]))) {
    const hit = LIBRARIES.find(([re]) => re.test(dep));
    if (!hit) continue;
    const existing = libraries.find((l) => l.name === hit[2]);
    if (existing) continue;
    libraries.push({ kind: hit[1], name: hit[2], package: dep, version: String(version) });
  }

  /** @type {Source[]} */
  const sources = [];
  /** @type {DesignScan['tokens']} */
  const tokens = { color: [], fontFamily: [], fontSize: [], radius: [], space: [], shadow: [], breakpoint: [] };
  /** @type {Map<string, ColorToken>} */
  const colors = new Map();
  /** @param {string} name @param {'light' | 'dark'} theme @param {string} value @param {string} source @param {string} [role] */
  const addColor = (name, theme, value, source, role) => {
    const c = colors.get(name) ?? { name, source };
    c[theme] ??= value;
    if (role) c.role ??= role;
    colors.set(name, c);
  };
  /** @param {'fontFamily' | 'fontSize' | 'radius' | 'space' | 'shadow' | 'breakpoint'} group @param {string} name @param {unknown} value @param {string} source */
  const addValue = (group, name, value, source) => {
    if ((typeof value !== 'string' && typeof value !== 'number') || tokens[group].some((t) => t.name === name)) return;
    tokens[group].push({ name, value: String(value), source });
  };

  // 1. CSS custom properties at root, theme, and dark scopes (plain CSS, shadcn, Tailwind v4 @theme).
  const props = collectCustomProps(root, ignore).filter((p) => product(p.file));
  const byFile = new Map();
  for (const p of props) byFile.set(p.file, (byFile.get(p.file) ?? 0) + 1);
  for (const [file, n] of byFile) {
    const text = readFileSync(join(root, file), 'utf8');
    const v4 = /@theme\b/.test(text);
    const dark = props.some((p) => p.file === file && p.theme === 'dark');
    sources.push({ kind: v4 ? 'tailwind-v4-theme' : 'css-variables', file, detail: `${n} custom propert${n === 1 ? 'y' : 'ies'} at root/theme scope${dark ? ', with a dark theme' : ''}${v4 ? ', @theme block' : ''}` });
  }
  /** @type {Map<string, { light?: string, dark?: string, file: string }>} */
  const propMap = new Map();
  for (const p of props) {
    const e = propMap.get(p.name) ?? { file: p.file };
    e[p.theme] ??= p.value;
    propMap.set(p.name, e);
  }
  /** @param {string | undefined} v @param {'light' | 'dark'} theme @param {number} [d] @returns {string | undefined} */
  const deref = (v, theme, d = 0) => {
    const m = v === undefined ? null : /^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/.exec(v.trim());
    if (!m || d > 8) return v;
    const e = propMap.get(m[1]);
    return deref(e?.[theme] ?? e?.light ?? m[2], theme, d + 1);
  };
  for (const [name, e] of propMap) {
    const light = deref(e.light, 'light');
    const dark = deref(e.dark, 'dark');
    const kind = classify(name, light ?? dark ?? '');
    const alias = /^var\(\s*--([\w-]+)\s*\)$/.exec((e.light ?? e.dark ?? '').trim())?.[1];
    if (kind === 'color' && alias && propMap.has(alias)) {
      colors.set(`--${name}`, { name: `--${name}`, aliasOf: `--${alias}`, source: e.file });
    } else if (kind === 'color') {
      const lc = light && asColor(light);
      const dc = dark && asColor(dark);
      if (lc) addColor(`--${name}`, 'light', lc, e.file);
      if (dc) addColor(`--${name}`, 'dark', dc, e.file);
    } else if (kind === 'duration' || kind === null) {
      if (/^breakpoint|^screen/.test(name)) addValue('breakpoint', `--${name}`, light ?? dark ?? '', e.file);
    } else {
      addValue(kind, `--${name}`, light ?? dark ?? '', e.file);
    }
  }

  // 2. Tailwind v3 config.
  for (const file of ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts']) {
    if (!existsSync(join(root, file))) continue;
    const parsed = parseModule(file, readFileSync(join(root, file), 'utf8'));
    /** @type {any} */
    let theme = null;
    if (parsed) {
      /** @param {any} node */
      const find = (node) => {
        if (theme || !node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(find);
        if (node.type === 'ObjectProperty' && (node.key.name ?? node.key.value) === 'theme' && node.value.type !== 'ArrowFunctionExpression') {
          theme = literal(node.value, parsed.consts);
          return;
        }
        for (const k of Object.keys(node)) if (k !== 'loc') find(node[k]);
      };
      find(parsed.ast.program);
    }
    const merged = { ...(theme ?? {}), ...(theme?.extend ?? {}) };
    const keys = Object.keys(merged).filter((k) => k !== 'extend' && merged[k] && typeof merged[k] === 'object');
    for (const c of tailwindColors(root).filter((x) => x.file === file)) addColor(`tw:${c.name}`, 'light', c.value, file);
    for (const [k, v] of Object.entries(merged.fontFamily ?? {})) addValue('fontFamily', `tw:font-${k}`, Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(', ') : v, file);
    for (const [k, v] of Object.entries(merged.borderRadius ?? {})) addValue('radius', `tw:rounded-${k}`, v, file);
    for (const [k, v] of Object.entries(merged.spacing ?? {})) addValue('space', `tw:spacing-${k}`, v, file);
    for (const [k, v] of Object.entries(merged.fontSize ?? {})) addValue('fontSize', `tw:text-${k}`, Array.isArray(v) ? v[0] : v, file);
    for (const [k, v] of Object.entries(merged.boxShadow ?? {})) addValue('shadow', `tw:shadow-${k}`, v, file);
    for (const [k, v] of Object.entries(merged.screens ?? {})) addValue('breakpoint', `tw:${k}`, v, file);
    sources.push({ kind: 'tailwind-config', file, detail: keys.length ? `theme keys: ${keys.join(', ')}` : 'no static theme values (preset, plugin, or computed config)' });
  }

  // 3. shadcn/ui.
  const shadcn = readJson(join(root, 'components.json'));
  /** @type {string[]} */
  const uiDirs = [];
  if (shadcn && (shadcn.$schema?.includes('shadcn') || shadcn.aliases || shadcn.tailwind)) {
    const ui = typeof shadcn.aliases?.ui === 'string' ? shadcn.aliases.ui : typeof shadcn.aliases?.components === 'string' ? `${shadcn.aliases.components}/ui` : null;
    if (ui) uiDirs.push(ui.replace(/^[@~$]\/?/, '').replace(/^\//, ''), `src/${ui.replace(/^[@~$]\/?/, '').replace(/^\//, '')}`);
    sources.push({ kind: 'shadcn', file: 'components.json', detail: [`style ${shadcn.style ?? 'default'}`, shadcn.tailwind?.baseColor && `base color ${shadcn.tailwind.baseColor}`, shadcn.tailwind?.cssVariables === false ? 'utility colors (no CSS variables)' : 'CSS variables', shadcn.tailwind?.css && `theme in ${shadcn.tailwind.css}`, shadcn.iconLibrary && `icons ${shadcn.iconLibrary}`].filter(Boolean).join(', ') });
  }

  // 4. Theme objects in JS/TS (MUI, Chakra, Mantine, Panda) and font imports.
  /** @type {MuiTheme[]} */
  const muiThemes = [];
  /** @type {{ family: string, source: string }[]} */
  const fonts = [];
  const scriptFiles = listFiles(root, { ignore, extensions: JS_EXT, maxFileBytes: 400_000 }).filter(product);
  for (const file of scriptFiles) {
    const text = readFileSync(join(root, file), 'utf8');
    for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](next\/font\/google|@next\/font\/google)['"]/g)) {
      for (const f of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) fonts.push({ family: f.replace(/_/g, ' '), source: file });
    }
    if (/from\s+['"]next\/font\/local['"]/.test(text)) fonts.push({ family: '(local font via next/font/local)', source: file });
    const lib = /from\s+['"]@mui\/(material|joy)(\/styles)?['"]/.test(text) ? 'mui'
      : /from\s+['"]@chakra-ui\/react['"]/.test(text) ? 'chakra'
        : /from\s+['"]@mantine\/core['"]/.test(text) ? 'mantine'
          : /from\s+['"]@pandacss\/dev['"]/.test(text) ? 'panda' : null;
    if (!lib || !/\b(createTheme|extendTheme|experimental_extendTheme|createSystem|defineConfig|unstable_createMuiStrictModeTheme)\s*\(/.test(text)) continue;
    const parsed = parseModule(file, text);
    if (!parsed) continue;
    const calls = themeCalls(parsed.ast, parsed.consts);
    if (!calls.length) continue;
    if (lib === 'mui') {
      for (const { value } of calls) {
        /** @type {MuiTheme} */
        const t = { file, mode: null, light: {}, dark: {}, fontFamily: null, radius: null, spacing: null };
        const pal = value.palette;
        const mode = typeof pal?.mode === 'string' ? pal.mode : null;
        t.mode = mode;
        Object.assign(mode === 'dark' ? t.dark : t.light, muiRoles(pal));
        Object.assign(t.light, muiRoles(at(value, 'colorSchemes.light.palette')));
        Object.assign(t.dark, muiRoles(at(value, 'colorSchemes.dark.palette')));
        const ff = at(value, 'typography.fontFamily');
        t.fontFamily = typeof ff === 'string' ? ff : null;
        const r = at(value, 'shape.borderRadius');
        t.radius = typeof r === 'number' ? `${r}px` : typeof r === 'string' ? r : null;
        t.spacing = typeof value.spacing === 'number' ? `${value.spacing}px` : typeof value.spacing === 'string' ? value.spacing : null;
        if (!Object.keys(t.light).length && !Object.keys(t.dark).length && !t.fontFamily && !t.radius && !t.spacing) continue;
        muiThemes.push(t);
        for (const theme of /** @type {const} */ (['light', 'dark'])) for (const [role, v] of Object.entries(t[theme])) addColor(`mui:${role}`, theme, v, file, role);
        if (t.fontFamily) addValue('fontFamily', 'mui:typography.fontFamily', t.fontFamily, file);
        if (t.radius) addValue('radius', 'mui:shape.borderRadius', t.radius, file);
        if (t.spacing) addValue('space', 'mui:spacing', t.spacing, file);
        sources.push({ kind: 'mui-theme', file, detail: `palette roles: ${[...new Set([...Object.keys(t.light), ...Object.keys(t.dark)])].join(', ') || 'none'}${Object.keys(t.dark).length ? ' (dark scheme too)' : ''}${t.fontFamily ? '; typography.fontFamily' : ''}${t.radius ? `; borderRadius ${t.radius}` : ''}` });
      }
    } else {
      /** @type {{ name: string, value: string }[]} */
      const found = [];
      for (const { value } of calls) {
        const theme = value.theme ?? value;
        flattenColors(theme.colors ?? at(theme, 'tokens.colors') ?? at(theme, 'extend.tokens.colors'), '', found);
        const fam = theme.fontFamily ?? at(theme, 'fonts.body') ?? at(theme, 'tokens.fonts.body.value') ?? at(theme, 'extend.tokens.fonts.body.value');
        if (typeof fam === 'string') addValue('fontFamily', `${lib}:body`, fam, file);
      }
      for (const c of found) addColor(`${lib}:${c.name}`, 'light', c.value, file);
      sources.push({ kind: `${lib}-theme`, file, detail: `${found.length} static color value(s)${lib === 'mantine' && calls.some((c) => c.value.primaryColor) ? `, primaryColor ${calls.find((c) => c.value.primaryColor)?.value.primaryColor}` : ''}` });
    }
  }

  // 5. DTCG / Style Dictionary token files.
  const tokenFiles = listFiles(root, { ignore: [...ignore, 'package.json', 'package-lock.json', 'tsconfig*.json', 'components.json'], extensions: new Set(['.json']), maxFileBytes: 2_000_000 })
    .filter((f) => product(f) && /(^|\/)(tokens?|design-tokens?)(\/|\.|-)|\.tokens\.json$/i.test(f));
  for (const file of tokenFiles) {
    const data = readJson(join(root, file));
    /** @type {{ name: string, value: string, type?: string }[]} */
    const leaves = [];
    tokenLeaves(data, '', undefined, leaves);
    if (!leaves.length) continue;
    const dtcg = JSON.stringify(data).includes('"$value"');
    let n = 0;
    for (const l of leaves) {
      if (l.value.startsWith('{')) continue;
      if (l.type === 'color' || (!l.type && asColor(l.value))) {
        if (asColor(l.value)) { addColor(`token:${l.name}`, /dark/i.test(l.name) ? 'dark' : 'light', l.value, file); n++; }
      } else if (l.type === 'fontFamily' || /font-?family/i.test(l.name)) addValue('fontFamily', `token:${l.name}`, l.value, file);
      else if (l.type === 'dimension' || /^-?[\d.]+(px|rem|em)$/.test(l.value)) addValue(/radius/i.test(l.name) ? 'radius' : /font-?size|text/i.test(l.name) ? 'fontSize' : 'space', `token:${l.name}`, l.value, file);
      else if (l.type === 'shadow' || /shadow/i.test(l.name)) addValue('shadow', `token:${l.name}`, l.value, file);
    }
    sources.push({ kind: dtcg ? 'dtcg-tokens' : 'style-dictionary-tokens', file, detail: `${leaves.length} token(s), ${n} literal color(s)` });
  }

  // 6. SCSS variables and @font-face / Google Fonts in CSS and HTML.
  const styleFiles = listFiles(root, { ignore, extensions: new Set(['.scss', '.css', '.html', '.htm']), maxFileBytes: 1_000_000 }).filter(product);
  for (const file of styleFiles) {
    const text = readFileSync(join(root, file), 'utf8');
    if (file.endsWith('.scss')) {
      let n = 0;
      for (const m of text.matchAll(/^\s*\$([\w-]+)\s*:\s*([^;]+?)\s*(?:!default\s*)?;/gm)) {
        const [, name, value] = m;
        const kind = classify(name, value);
        if (kind === 'color') addColor(`$${name}`, 'light', value, file);
        else if (kind && kind !== 'duration') addValue(kind, `$${name}`, value, file);
        else if (/^(breakpoint|grid-breakpoint)/.test(name)) addValue('breakpoint', `$${name}`, value, file);
        n++;
      }
      if (n) sources.push({ kind: 'scss-variables', file, detail: `${n} top-level variable(s)` });
    }
    for (const m of text.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^;'"]+)['"]?/g)) fonts.push({ family: m[1].trim(), source: file });
    for (const m of text.matchAll(/fonts\.googleapis\.com\/css2?\?([^"')\s]+)/g)) {
      for (const fam of m[1].split('&').filter((x) => x.startsWith('family=')).map((x) => decodeURIComponent(x.slice(7).split(':')[0]).replace(/\+/g, ' '))) fonts.push({ family: fam, source: file });
    }
  }

  // 7. Literal values the styles already repeat: the de facto system when nothing is tokenized.
  /** @type {Record<'color' | 'fontFamily' | 'fontSize' | 'radius', Map<string, number>>} */
  const counts = { color: new Map(), fontFamily: new Map(), fontSize: new Map(), radius: new Map() };
  const bump = (/** @type {Map<string, number>} */ m, /** @type {string} */ v) => m.set(v, (m.get(v) ?? 0) + 1);
  for (const file of listFiles(root, { ignore, extensions: new Set(['.css', '.scss', '.pcss', '.html', '.htm', '.vue', '.svelte', '.astro']), maxFileBytes: 1_000_000 }).filter(product)) {
    for (const css of parseDocument(file, readFileSync(join(root, file), 'utf8')).css) {
      for (const d of css.decls) {
        const prop = d.prop.toLowerCase();
        const value = d.value.trim();
        if (prop.startsWith('--') || value.includes('var(') || value.includes('$')) continue;
        if (/^(color|background(-color)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|box-shadow)$/.test(prop)) {
          for (const m of value.matchAll(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/gi)) bump(counts.color, m[0].toLowerCase());
        } else if (prop === 'font-family') bump(counts.fontFamily, value);
        else if (prop === 'font-size' && /^[\d.]+(px|rem|em)$/.test(value)) bump(counts.fontSize, value);
        else if (prop === 'border-radius' && /^[\d.]+(px|rem|em|%)$/.test(value)) bump(counts.radius, value);
      }
    }
  }
  const top = (/** @type {Map<string, number>} */ m) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([value, count]) => ({ value, count }));
  const inUse = { color: top(counts.color), fontFamily: top(counts.fontFamily), fontSize: top(counts.fontSize), radius: top(counts.radius) };

  // Tie MUI roles and recognizable CSS roles together on the color list.
  tokens.color = [...colors.values()];
  const seenFonts = new Set();
  const uniqueFonts = fonts.filter((f) => (seenFonts.has(f.family) ? false : (seenFonts.add(f.family), true)));
  const components = componentDirs(root, uiDirs);

  const tokenCount = Object.values(tokens).reduce((n, g) => n + g.length, 0);
  const hasLibrary = libraries.some((l) => l.kind === 'component-library');
  /** @type {DesignScan['verdict']} */
  const verdict = (tokens.color.length >= 4 && tokenCount >= 6) || hasLibrary || muiThemes.length || sources.some((s) => s.kind === 'shadcn' || s.kind.endsWith('-tokens'))
    ? 'established'
    : tokenCount || components.length || libraries.length || inUse.color.length >= 3 ? 'partial' : 'none';

  /** @type {string[]} */
  const guidance = [];
  if (verdict === 'established') {
    guidance.push('An existing design system was found. Extend it: reuse these tokens, theme values, and components. Do not add a parallel palette, type scale, radius scale, or spacing scale.');
    if (sources.some((s) => s.kind === 'shadcn')) guidance.push('shadcn/ui: add or edit components through the files in the ui folder and the CSS variables in the theme file; new colors become new variables in both the light and .dark blocks.');
    if (muiThemes.length || libraries.some((l) => l.name === 'MUI')) guidance.push('MUI: change look through the theme (palette, typography, shape, components overrides) and the sx prop with theme keys, not hard-coded colors or px values.');
    if (sources.some((s) => s.kind === 'tailwind-v4-theme')) guidance.push('Tailwind v4: new tokens go in the existing @theme block; use the generated utilities (bg-*, text-*) rather than arbitrary values.');
    if (sources.some((s) => s.kind === 'tailwind-config')) guidance.push('Tailwind v3: new tokens go in theme.extend of the existing config; use its utilities rather than arbitrary values.');
    guidance.push('If .craft/ is missing, run craft init --from-repo to draft tokens.json from this system, then describe it in DESIGN.md instead of inventing a new direction.');
  } else if (verdict === 'partial') {
    guidance.push(tokenCount
      ? 'Some design values exist but no full system. Reuse the values listed here before adding any new one; add new values as tokens next to the existing ones.'
      : 'No tokens, but the styles repeat the values under "Values in use". Treat them as the design system: reuse those colors, fonts, and sizes, and if you introduce variables, give them these values rather than new ones (unless the user asked for a redesign).');
  } else {
    guidance.push('No design system found. For size M or L work, create a contract (craft init, then the Direction Engine); for size S, follow the code\'s conventions.');
  }
  if (uniqueFonts.length) guidance.push(`Keep the existing font families (${uniqueFonts.slice(0, 4).map((f) => f.family).join(', ')}) unless the user asks for a change.`);
  if (components.length) guidance.push('Reuse the existing components listed here before writing new ones.');

  return {
    framework: env.framework,
    styling: env.styling,
    verdict,
    libraries,
    sources,
    tokens,
    fonts: uniqueFonts,
    components,
    inUse,
    muiThemes,
    guidance
  };
}

/**
 * Human-readable summary (also written by init --from-repo).
 * @param {DesignScan} s
 * @returns {string}
 */
export function formatScan(s) {
  /** @param {string} title @param {string[]} items */
  const section = (title, items) => (items.length ? [`## ${title}`, '', ...items, ''] : []);
  const list = (/** @type {string[]} */ xs) => xs.slice(0, MAX).concat(xs.length > MAX ? [`- …and ${xs.length - MAX} more`] : []);
  const t = s.tokens;
  return [
    '# Existing design system (craft scan)',
    '',
    `Verdict: **${s.verdict}**. Framework: ${s.framework ?? 'not detected'}. Styling: ${s.styling ?? 'not detected'}.`,
    '',
    ...section('What to do', s.guidance.map((g) => `- ${g}`)),
    ...section('Libraries', s.libraries.map((l) => `- ${l.name} (${l.kind}): \`${l.package}@${l.version}\``)),
    ...section('Sources', s.sources.map((x) => `- ${x.kind}: \`${x.file}\`: ${x.detail}`)),
    ...section('Colors', list(t.color.map((c) => c.aliasOf ? `- \`${c.name}\`: alias of \`${c.aliasOf}\`` : `- \`${c.name}\`${c.role ? ` (${c.role})` : ''}: ${c.light ?? '–'}${c.dark ? ` / dark ${c.dark}` : ''}`))),
    ...section('Typography', list([...t.fontFamily, ...t.fontSize].map((v) => `- \`${v.name}\`: ${v.value}`))),
    ...section('Fonts loaded', s.fonts.map((f) => `- ${f.family} (\`${f.source}\`)`)),
    ...section('Radius, spacing, shadow, breakpoints', list([...t.radius, ...t.space, ...t.shadow, ...t.breakpoint].map((v) => `- \`${v.name}\`: ${v.value}`))),
    ...section('Values in use (hard-coded, most frequent first)', [
      ...(s.inUse.color.length ? [`- colors: ${s.inUse.color.map((c) => `${c.value} (${c.count})`).join(', ')}`] : []),
      ...(s.inUse.fontFamily.length ? [`- font families: ${s.inUse.fontFamily.map((c) => `${c.value} (${c.count})`).join('; ')}`] : []),
      ...(s.inUse.fontSize.length ? [`- font sizes: ${s.inUse.fontSize.map((c) => `${c.value} (${c.count})`).join(', ')}`] : []),
      ...(s.inUse.radius.length ? [`- radius: ${s.inUse.radius.map((c) => `${c.value} (${c.count})`).join(', ')}`] : [])
    ]),
    ...section('Components', s.components.map((c) => `- \`${c.dir}/\`: ${c.names.slice(0, MAX).join(', ')}${c.names.length > MAX ? `, and ${c.names.length - MAX} more` : ''}`))
  ].join('\n');
}

