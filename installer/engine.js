// Multi-agent install engine. Adapters are data (adapters/<id>/adapter.json, ADR-0017); this file
// knows three kinds of placement and nothing about any particular agent:
//   skill  copy the whole package into the agent's skills directory
//   block  a managed block inside a shared instructions file (AGENTS.md, GEMINI.md, ...)
//   file   a whole rule file owned by the installer
// Non-skill kinds point at one shared package copy (.frontend-craft/). No network, no eval,
// no process spawning here; every write stays inside the adapter-declared paths under the base
// directory (the project, or the home directory for --scope user).
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, lstatSync, rmSync, rmdirSync } from 'node:fs';
import { join, dirname, relative, resolve, sep, isAbsolute } from 'node:path';

export const PKG_DIR = '.frontend-craft';
export const MARKER_FILE = '.frontend-craft-install.json';
export const BEGIN = '<!-- frontend-craft:begin -->';
export const END = '<!-- frontend-craft:end -->';
export const MANAGED = 'frontend-craft:managed';
export const MANAGED_BY = 'frontend-craft';

/**
 * @typedef {{ schemaVersion: string, id: string, label: string, aliases: string[], docsUrl: string | null,
 *   docsVerifiedOn: string | null, kind: 'skill' | 'block' | 'file', project: string | null, user: string | null,
 *   frontmatter?: string | null, detectMarkers: string[], nativeSkillSupport: boolean, notes?: string, caveats?: string[] }} Adapter
 * @typedef {'create' | 'update' | 'unchanged' | 'conflict' | 'remove' | 'absent' | 'n/a'} Action
 * @typedef {{ agent: string, path: string, action: Action, detail?: string }} Result
 * @typedef {{ kind: 'block' | 'file', agents: string[], separator?: string, createdFile: boolean, createdDirs: string[] }} PointerState
 * @typedef {{ managedBy: string, version: string, files: string[], createdDirs: string[], agents?: string[], pointers?: Record<string, PointerState> }} Marker
 * @typedef {{ base: string, scope: 'project' | 'user', source: string, version: string, description: string,
 *   force?: boolean, dryRun?: boolean }} Context
 */

/** POSIX display form of a path relative to the base. @param {Context} ctx @param {string} rel */
export function display(ctx, rel) {
  const p = rel.split(sep).join('/');
  return ctx.scope === 'user' ? `~/${p}` : p;
}

/**
 * Resolve an adapter-declared path under the base, refusing anything that escapes it.
 * @param {string} base @param {string} rel
 */
export function inside(base, rel) {
  if (isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new Error(`Adapter path "${rel}" must be relative and stay inside the target.`);
  const abs = resolve(base, rel);
  const r = relative(base, abs);
  if (r.startsWith('..') || isAbsolute(r)) throw new Error(`Adapter path "${rel}" escapes ${base}.`);
  return abs;
}

/** @param {string} p */
const isDir = (p) => existsSync(p) && lstatSync(p).isDirectory();
/** @param {string} p */
const isFile = (p) => existsSync(p) && lstatSync(p).isFile();

/**
 * Sorted POSIX file list under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
export function listFiles(dir) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} d @param {string} prefix */
  const walk = (d, prefix) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(p, `${prefix}${name}/`);
      else out.push(`${prefix}${name}`);
    }
  };
  walk(dir, '');
  return out;
}

/** @param {string} p @returns {Marker | null} */
export function readMarker(p) {
  try {
    const m = JSON.parse(readFileSync(p, 'utf8'));
    return m && m.managedBy === MANAGED_BY && Array.isArray(m.files) ? m : null;
  } catch {
    return null;
  }
}

/**
 * Directories from the base down to `dir` that do not exist yet (outermost first).
 * @param {string} base @param {string} dir
 */
function missingDirs(base, dir) {
  /** @type {string[]} */
  const out = [];
  let d = dir;
  while (d !== base && relative(base, d) && !relative(base, d).startsWith('..') && !existsSync(d)) {
    out.unshift(relative(base, d).split(sep).join('/'));
    d = dirname(d);
  }
  return out;
}

/**
 * Remove recorded directories that are now empty (innermost first).
 * @param {string} base @param {string[]} dirs
 */
function pruneDirs(base, dirs) {
  for (const rel of [...dirs].sort((a, b) => b.length - a.length)) {
    const abs = join(base, rel);
    if (isDir(abs) && readdirSync(abs).length === 0) rmdirSync(abs);
  }
}

/** Remove empty directories below (and including) dir. @param {string} dir */
function removeEmptyTree(dir) {
  if (!isDir(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (lstatSync(p).isDirectory()) removeEmptyTree(p);
  }
  if (readdirSync(dir).length === 0) rmdirSync(dir);
}

/**
 * @param {string} p @param {Buffer | string} data
 */
function write(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
}

/**
 * Mirror the package into dest, owned through a marker file. Adds, changes, and removes stale
 * files; repairs tampered ones. Never touches a non-empty directory without our marker unless forced.
 * @param {Context} ctx
 * @param {string} rel destination relative to the base
 * @param {Record<string, PointerState>} [pointers] pointer state to keep in the marker (package copy only)
 * @param {string[]} [agents] agents sharing this skill directory (skill installs only)
 * @returns {{ action: Action, detail?: string }}
 */
export function syncPackage(ctx, rel, pointers, agents) {
  const dest = inside(ctx.base, rel);
  if (isFile(dest)) return { action: 'conflict', detail: `a file exists where the directory ${display(ctx, rel)}/ is needed; move it and re-run` };
  const parentFile = firstFileAncestor(ctx.base, dirname(dest));
  if (parentFile) return { action: 'conflict', detail: `${display(ctx, parentFile)} is a file where a directory is needed (for example a legacy single-file rules file); move it and re-run` };
  const markerPath = join(dest, MARKER_FILE);
  const old = isDir(dest) ? readMarker(markerPath) : null;
  if (isDir(dest) && !old && readdirSync(dest).length && !ctx.force) {
    return { action: 'conflict', detail: `${display(ctx, rel)}/ exists and was not created by this installer; re-run with --force to install over it` };
  }
  const createdDirs = old?.createdDirs ?? missingDirs(ctx.base, dest);
  const files = listFiles(ctx.source).filter((f) => f !== MARKER_FILE);
  let changes = 0;
  for (const f of files) {
    const want = readFileSync(join(ctx.source, f));
    const target = join(dest, f);
    if (isFile(target) && readFileSync(target).equals(want)) continue;
    changes++;
    if (!ctx.dryRun) write(target, want);
  }
  const stale = (old?.files ?? []).filter((f) => !files.includes(f));
  for (const f of stale) {
    const target = join(dest, f);
    if (!existsSync(target)) continue;
    changes++;
    if (!ctx.dryRun) rmSync(target, { force: true });
  }
  if (!ctx.dryRun && stale.length) {
    for (const d of new Set(stale.map((f) => dirname(join(dest, f))))) {
      let cur = d;
      while (cur.startsWith(dest + sep) && isDir(cur) && readdirSync(cur).length === 0) {
        rmdirSync(cur);
        cur = dirname(cur);
      }
    }
  }
  /** @type {Marker} */
  const marker = { managedBy: MANAGED_BY, version: ctx.version, files, createdDirs };
  if (agents) marker.agents = [...new Set([...(old?.agents ?? []), ...agents])].sort();
  if (pointers) marker.pointers = pointers;
  const text = JSON.stringify(marker, null, 2) + '\n';
  const markerChanged = !old || readFileSync(markerPath, 'utf8') !== text;
  if (!ctx.dryRun && markerChanged) write(markerPath, text);
  if (!old) return { action: 'create' };
  return { action: changes || old.version !== ctx.version ? 'update' : 'unchanged', detail: changes ? `${changes} file(s) changed` : undefined };
}

/**
 * Drop one agent from a shared skill directory's marker. Returns the agents still using it.
 * @param {Context} ctx @param {string} rel @param {string} agent
 * @returns {string[]}
 */
export function releaseSkill(ctx, rel, agent) {
  const markerPath = join(inside(ctx.base, rel), MARKER_FILE);
  const m = readMarker(markerPath);
  if (!m || !m.agents) return [];
  const rest = m.agents.filter((a) => a !== agent);
  if (rest.length && !ctx.dryRun) writeFileSync(markerPath, JSON.stringify({ ...m, agents: rest }, null, 2) + '\n');
  return rest;
}

/**
 * Remove a package copy: only the files the marker lists, then emptied directories.
 * @param {Context} ctx @param {string} rel
 * @returns {{ action: Action, detail?: string }}
 */
export function removePackage(ctx, rel) {
  const dest = inside(ctx.base, rel);
  const marker = isDir(dest) ? readMarker(join(dest, MARKER_FILE)) : null;
  if (!marker) return isDir(dest) ? { action: 'conflict', detail: `${display(ctx, rel)}/ was not created by this installer; left in place` } : { action: 'absent' };
  if (!ctx.dryRun) {
    for (const f of marker.files) rmSync(join(dest, f), { force: true });
    rmSync(join(dest, MARKER_FILE), { force: true });
    removeEmptyTree(dest);
    pruneDirs(ctx.base, marker.createdDirs);
  }
  return { action: 'remove' };
}

/** @param {string} text */
export const eolOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n');

/**
 * The pointer an agent reads: when to use the skill, where SKILL.md and the CLI are, and the honesty rule.
 * @param {Context} ctx
 * @returns {string[]}
 */
export function pointerLines(ctx) {
  const pkg = ctx.scope === 'user' ? join(ctx.base, PKG_DIR).split(sep).join('/') : PKG_DIR;
  return [
    '## Frontend Craft',
    '',
    `Use for: ${ctx.description}`,
    '',
    `Before such work, read \`${pkg}/SKILL.md\` and follow it. Where it says \`<skill-dir>\`, use \`${pkg}\`.`,
    `Run its checks with \`node ${pkg}/cli/bin/craft.js --help\`. Read only the references SKILL.md points to.`,
    'Do not claim a check, render, or test you did not run.'
  ];
}

/**
 * Locate managed blocks. @param {string} text
 * @returns {{ start: number, end: number }[]} end is just past the END marker's line break
 */
export function findBlocks(text) {
  /** @type {{ start: number, end: number }[]} */
  const out = [];
  let from = 0;
  for (;;) {
    const s = text.indexOf(BEGIN, from);
    if (s === -1) return out;
    const e = text.indexOf(END, s);
    if (e === -1) return [...out, { start: s, end: text.length }];
    let end = e + END.length;
    if (text.startsWith('\r\n', end)) end += 2;
    else if (text.startsWith('\n', end)) end += 1;
    out.push({ start: s, end });
    from = end;
  }
}

/**
 * Insert or replace the managed block. Everything outside the block is preserved byte for byte.
 * @param {string} text current file content ('' when the file is new)
 * @param {string[]} lines block body
 * @returns {{ text: string, separator: string, existed: boolean } | { error: string }}
 */
export function upsertBlock(text, lines) {
  const eol = eolOf(text);
  const block = [BEGIN, ...lines, END].join(eol) + eol;
  const blocks = findBlocks(text);
  if (blocks.length > 1) return { error: 'more than one frontend-craft block; remove the extras by hand' };
  if (blocks.length === 1) return { text: text.slice(0, blocks[0].start) + block + text.slice(blocks[0].end), separator: '', existed: true };
  const separator = text === '' ? '' : text.endsWith(eol + eol) ? '' : text.endsWith(eol) ? eol : eol + eol;
  return { text: text + separator + block, separator, existed: false };
}

/**
 * Remove the managed block and the separator that was added before it.
 * @param {string} text @param {string | undefined} separator undefined when the install state is lost
 */
export function removeBlock(text, separator) {
  const [b] = findBlocks(text);
  if (!b) return text;
  let before = text.slice(0, b.start);
  const after = text.slice(b.end);
  const eol = eolOf(text);
  const sepToDrop = separator ?? (before.endsWith(eol + eol) && after === '' ? eol : '');
  if (after === '' && sepToDrop && before.endsWith(sepToDrop)) before = before.slice(0, before.length - sepToDrop.length);
  return before + after;
}

/**
 * Whole rule file content: adapter frontmatter, the managed marker, the pointer.
 * @param {Context} ctx @param {Adapter} adapter
 */
export function ruleFile(ctx, adapter) {
  const fm = (adapter.frontmatter ?? '').replace(/\{\{description\}\}/g, JSON.stringify(ctx.description)).replace(/\s*$/, '');
  return `${fm ? fm + '\n\n' : ''}<!-- ${MANAGED}: written by the frontend-craft installer; edits are replaced on update -->\n\n${pointerLines(ctx).join('\n')}\n`;
}

/**
 * Place one pointer (block or file) for a set of agents sharing the same path.
 * @param {Context} ctx @param {Adapter} adapter @param {string} rel @param {string[]} agents
 * @param {PointerState | undefined} prev
 * @returns {{ action: Action, detail?: string, state?: PointerState }}
 */
export function placePointer(ctx, adapter, rel, agents, prev) {
  const abs = inside(ctx.base, rel);
  if (isDir(abs)) return { action: 'conflict', detail: `${display(ctx, rel)} is a directory; a file is needed there` };
  const parentFile = firstFileAncestor(ctx.base, dirname(abs));
  if (parentFile) return { action: 'conflict', detail: `${display(ctx, parentFile)} is a file where a directory is needed (for example a legacy single-file rules file); move it and re-run` };
  const exists = isFile(abs);
  const current = exists ? readFileSync(abs, 'utf8') : '';
  const createdDirs = prev?.createdDirs ?? missingDirs(ctx.base, dirname(abs));
  if (adapter.kind === 'block') {
    const r = upsertBlock(current, pointerLines(ctx));
    if ('error' in r) return { action: 'conflict', detail: `${display(ctx, rel)}: ${r.error}` };
    const state = { kind: /** @type {'block'} */ ('block'), agents, separator: r.existed ? prev?.separator ?? '' : r.separator, createdFile: prev?.createdFile ?? !exists, createdDirs };
    if (r.text === current) return { action: 'unchanged', state };
    if (!ctx.dryRun) write(abs, r.text);
    return { action: r.existed ? 'update' : 'create', state };
  }
  const want = ruleFile(ctx, adapter);
  if (exists && !current.includes(MANAGED) && !ctx.force) {
    return { action: 'conflict', detail: `${display(ctx, rel)} exists and is not managed by this installer; re-run with --force to replace it` };
  }
  const state = { kind: /** @type {'file'} */ ('file'), agents, createdFile: prev?.createdFile ?? !exists, createdDirs };
  if (current === want) return { action: 'unchanged', state };
  if (!ctx.dryRun) write(abs, want);
  return { action: exists && current.includes(MANAGED) ? 'update' : 'create', state };
}

/**
 * Remove a pointer. Shared files go back to their original bytes; files the installer created
 * and that end up empty are deleted; directories it created are pruned when empty.
 * @param {Context} ctx @param {'block' | 'file'} kind @param {string} rel @param {PointerState | undefined} state
 * @returns {{ action: Action, detail?: string }}
 */
export function removePointer(ctx, kind, rel, state) {
  const abs = inside(ctx.base, rel);
  if (!isFile(abs)) return { action: 'absent' };
  const current = readFileSync(abs, 'utf8');
  if (kind === 'block') {
    if (!findBlocks(current).length) return { action: 'absent' };
    const next = removeBlock(current, state?.separator);
    if (!ctx.dryRun) {
      if (next === '' && (state ? state.createdFile : true)) rmSync(abs);
      else writeFileSync(abs, next);
      pruneDirs(ctx.base, state?.createdDirs ?? []);
    }
    return { action: 'remove' };
  }
  if (!current.includes(MANAGED)) return { action: 'conflict', detail: `${display(ctx, rel)} is not managed by this installer; left in place` };
  if (!ctx.dryRun) {
    rmSync(abs);
    pruneDirs(ctx.base, state?.createdDirs ?? []);
  }
  return { action: 'remove' };
}

/**
 * The nearest existing ancestor (below the base) that is a file, if any.
 * @param {string} base @param {string} dir
 * @returns {string | null} path relative to the base
 */
function firstFileAncestor(base, dir) {
  let d = dir;
  while (d !== base && !relative(base, d).startsWith('..')) {
    if (isFile(d)) return relative(base, d);
    d = dirname(d);
  }
  return null;
}

/**
 * Whether an agent's placement is currently present (used by update, uninstall, verify).
 * @param {Context} ctx @param {Adapter} adapter
 */
export function isInstalled(ctx, adapter) {
  const rel = adapter[ctx.scope];
  if (!rel) return false;
  const abs = inside(ctx.base, rel);
  if (adapter.kind === 'skill') {
    const m = isDir(abs) ? readMarker(join(abs, MARKER_FILE)) : null;
    return m !== null && (!m.agents || m.agents.includes(adapter.id));
  }
  if (!isFile(abs)) return false;
  const text = readFileSync(abs, 'utf8');
  return adapter.kind === 'block' ? findBlocks(text).length > 0 : text.includes(MANAGED);
}

/** @param {string} p */
export const statSafe = (p) => (existsSync(p) ? statSync(p) : null);
