// frontend-craft installer: install, uninstall, update, list, verify, doctor across coding agents.
// Exit codes: 0 ok, 1 conflicts or failed verification, 2 usage error, 3 environment problem.
// Adapters are data (ADR-0017); install placement follows ADR-0018; no network, no install
// scripts (ADR-0019). verify is the only command that spawns a process: the installed CLI with
// the current Node binary, to prove it runs.
import { existsSync, readFileSync, readdirSync, accessSync, constants } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { validate } from '../cli/src/schema.js';
import {
  PKG_DIR, MARKER_FILE, display, inside, syncPackage, removePackage, releaseSkill, placePointer, removePointer,
  isInstalled, readMarker, listFiles
} from './engine.js';

/** @typedef {import('./engine.js').Adapter} Adapter */
/** @typedef {import('./engine.js').Context} Context */
/** @typedef {import('./engine.js').Result} Result */
/** @typedef {{ stdout: (s: string) => void, stderr: (s: string) => void }} IO */

export const EXIT = { OK: 0, CONFLICT: 1, USAGE: 2, ENV: 3 };
const here = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = resolve(here, '..');
/** Agents used by --agent auto when the project shows no agent configuration. */
export const AUTO_DEFAULT = ['claude-code', 'agents-md'];

const USAGE = `Usage: frontend-craft <command> [options]

Commands:
  install     Install the skill for the selected agents
  uninstall   Remove what the installer placed (shared files return to their original bytes)
  update      Re-install for agents that are already installed (repairs and removes stale files)
  list        List supported agents and where each installs
  verify      Check an existing installation and run the installed CLI
  doctor      Show Node, the source package, and agents detected in the target

Options:
  --agent <sel>     all | auto | comma-separated ids or aliases (install default: auto)
  --scope <s>       project (default) | user
  --target <dir>    project directory (default: current directory)
  --home <dir>      home directory for --scope user (default: your home directory)
  --source <dir>    packaged skill to install (default: this package, or dist/frontend-craft in a clone)
  --dry-run         report what would change; write nothing
  --force           install over files and directories this installer did not create
  --json            machine-readable output
  -h, --help        this help

Exit codes: 0 ok, 1 conflicts or failed checks, 2 usage error, 3 environment problem.
`;

/**
 * Load and validate every adapter. Throws with a readable message when one is invalid.
 * @param {string} [root]
 * @returns {Adapter[]}
 */
export function loadAdapters(root = PACKAGE_ROOT) {
  const dir = join(root, 'adapters');
  const schema = JSON.parse(readFileSync(join(dir, 'adapter-schema.json'), 'utf8'));
  /** @type {Adapter[]} */
  const adapters = [];
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, 'adapter.json');
    if (!existsSync(file)) continue;
    const a = JSON.parse(readFileSync(file, 'utf8'));
    const v = validate(schema, a);
    const problems = v.valid ? [] : v.errors.map((e) => `${e.path} ${e.message}`);
    if (a.id !== name) problems.push(`id "${a.id}" must equal its directory name "${name}"`);
    if (a.docsVerifiedOn && !a.docsUrl) problems.push('docsVerifiedOn needs a docsUrl');
    if (a.kind === 'file' && !a.frontmatter && a.frontmatter !== '') problems.push('kind "file" needs a frontmatter string (use "" for none)');
    if (!a.project && !a.user) problems.push('needs a project or a user path');
    if (problems.length) throw new Error(`adapters/${name}/adapter.json is invalid: ${problems.join('; ')}`);
    adapters.push(a);
  }
  const names = new Map();
  for (const a of adapters) {
    for (const n of [a.id, ...a.aliases]) {
      if (names.has(n)) throw new Error(`Agent name "${n}" is used by both ${names.get(n)} and ${a.id}.`);
      names.set(n, a.id);
    }
  }
  return adapters;
}

/**
 * Find the packaged skill: this package when run from a release or npm install, else dist/ in a clone.
 * @param {string | undefined} explicit
 */
export function findSource(explicit) {
  const isPackage = (/** @type {string} */ d) => existsSync(join(d, 'SKILL.md')) && existsSync(join(d, 'cli', 'package.json'));
  const candidates = explicit ? [resolve(explicit)] : [PACKAGE_ROOT, join(PACKAGE_ROOT, 'dist', 'frontend-craft')];
  const found = candidates.find(isPackage);
  if (!found) return { error: `No packaged skill at ${candidates.join(' or ')}. In a clone, run "npm ci && npm run package" first, or pass --source <dir>.` };
  const skill = readFileSync(join(found, 'SKILL.md'), 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skill)?.[1] ?? '';
  const description = fm.split(/\r?\n/).find((l) => l.startsWith('description:'))?.slice('description:'.length).trim();
  const version = JSON.parse(readFileSync(join(found, 'cli', 'package.json'), 'utf8')).version;
  if (!description || !version) return { error: `${found} has no SKILL.md description or version; rebuild the package.` };
  return { source: found, description, version };
}

/**
 * Resolve --agent into adapters.
 * @param {string} sel @param {Adapter[]} adapters @param {Context} ctx
 * @returns {{ chosen: Adapter[] } | { error: string }}
 */
export function select(sel, adapters, ctx) {
  if (sel === 'all') return { chosen: adapters };
  if (sel === 'auto') {
    const detected = ctx.scope === 'project' ? adapters.filter((a) => a.detectMarkers.some((m) => existsSync(inside(ctx.base, m)))) : [];
    return { chosen: detected.length ? detected : adapters.filter((a) => AUTO_DEFAULT.includes(a.id)) };
  }
  const byName = new Map(adapters.flatMap((a) => [a.id, ...a.aliases].map((n) => [n.toLowerCase(), a])));
  /** @type {Adapter[]} */
  const chosen = [];
  for (const raw of sel.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const a = byName.get(raw);
    if (!a) return { error: `Unknown agent "${raw}". Known: ${adapters.map((x) => x.id).join(', ')} (or all, auto). Run "frontend-craft list" for aliases.` };
    if (!chosen.includes(a)) chosen.push(a);
  }
  return chosen.length ? { chosen } : { error: 'Pass at least one agent to --agent.' };
}

/**
 * @param {Context} ctx @param {Adapter[]} chosen
 * @returns {Result[]}
 */
export function install(ctx, chosen) {
  /** @type {Result[]} */
  const results = [];
  /** @type {Map<string, Adapter[]>} */
  const groups = new Map();
  /** @type {Map<string, Adapter[]>} */
  const skills = new Map();
  for (const a of chosen) {
    const rel = a[ctx.scope];
    if (!rel) {
      results.push({ agent: a.id, path: '-', action: 'n/a', detail: `${a.label} has no file-based ${ctx.scope} location` });
      continue;
    }
    const into = a.kind === 'skill' ? skills : groups;
    into.set(rel, [...(into.get(rel) ?? []), a]);
  }
  // Agents that read the same skills directory (for example .agents/skills/) share one copy.
  for (const [rel, list] of skills) {
    const r = syncPackage(ctx, rel, undefined, list.map((a) => a.id));
    for (const a of list) results.push({ agent: a.id, path: display(ctx, rel) + '/', ...r });
  }
  if (!groups.size) return results;

  const pre = syncPackage({ ...ctx, dryRun: true }, PKG_DIR);
  if (pre.action === 'conflict') {
    results.push({ agent: '(package)', path: display(ctx, PKG_DIR) + '/', ...pre });
    for (const [rel, list] of groups) for (const a of list) results.push({ agent: a.id, path: display(ctx, rel), action: 'conflict', detail: 'the shared package copy could not be installed' });
    return results;
  }
  const old = readMarker(join(inside(ctx.base, PKG_DIR), MARKER_FILE));
  /** @type {Record<string, import('./engine.js').PointerState>} */
  const pointers = { ...(old?.pointers ?? {}) };
  for (const [rel, list] of groups) {
    const prev = pointers[rel];
    const agents = [...new Set([...(prev?.agents ?? []), ...list.map((a) => a.id)])].sort();
    const r = placePointer(ctx, list[0], rel, agents, prev);
    for (const a of list) results.push({ agent: a.id, path: display(ctx, rel), action: r.action, detail: r.detail });
    if (r.state) pointers[rel] = r.state;
  }
  results.push({ agent: '(package)', path: display(ctx, PKG_DIR) + '/', ...syncPackage(ctx, PKG_DIR, sortKeys(pointers)) });
  return results;
}

/**
 * @param {Context} ctx @param {Adapter[]} chosen @param {Adapter[]} all
 * @returns {Result[]}
 */
export function uninstall(ctx, chosen, all) {
  /** @type {Result[]} */
  const results = [];
  const pkgAbs = inside(ctx.base, PKG_DIR);
  const old = readMarker(join(pkgAbs, MARKER_FILE));
  /** @type {Record<string, import('./engine.js').PointerState>} */
  const pointers = { ...(old?.pointers ?? {}) };
  for (const a of chosen) {
    const rel = a[ctx.scope];
    if (!rel) {
      results.push({ agent: a.id, path: '-', action: 'n/a' });
      continue;
    }
    if (a.kind === 'skill') {
      const rest = isInstalled(ctx, a) ? releaseSkill(ctx, rel, a.id) : [];
      if (rest.length) results.push({ agent: a.id, path: display(ctx, rel) + '/', action: 'remove', detail: `kept for ${rest.join(', ')}` });
      else results.push({ agent: a.id, path: display(ctx, rel) + '/', ...(isInstalled(ctx, a) || !existsSync(inside(ctx.base, rel)) ? removePackage(ctx, rel) : { action: /** @type {const} */ ('absent') }) });
      continue;
    }
    const st = pointers[rel];
    if (st && st.agents.length > 1 && st.agents.includes(a.id)) {
      pointers[rel] = { ...st, agents: st.agents.filter((x) => x !== a.id) };
      results.push({ agent: a.id, path: display(ctx, rel), action: 'remove', detail: `kept for ${pointers[rel].agents.join(', ')}` });
      continue;
    }
    results.push({ agent: a.id, path: display(ctx, rel), ...removePointer(ctx, a.kind === 'block' ? 'block' : 'file', rel, st) });
    delete pointers[rel];
  }
  if (old) {
    const stillUsed = Object.keys(pointers).length > 0 || all.some((a) => a.kind !== 'skill' && !chosen.includes(a) && isInstalled(ctx, a));
    if (!stillUsed) results.push({ agent: '(package)', path: display(ctx, PKG_DIR) + '/', ...removePackage(ctx, PKG_DIR) });
    else if (!ctx.dryRun) syncPackage({ ...ctx, version: old.version, source: pkgAbs }, PKG_DIR, sortKeys(pointers));
  }
  return results;
}

/**
 * Check an installation: files present and intact, version current, pointer targets resolve,
 * and the installed CLI runs. Reports the verification level reached here (V1 at most).
 * @param {Context} ctx @param {Adapter[]} chosen
 * @returns {{ agent: string, path: string, level: 'V1' | 'none', checks: { name: string, ok: boolean, detail?: string }[] }[]}
 */
export function verify(ctx, chosen) {
  /** @type {Map<string, { ok: boolean, detail: string }>} */
  const cliRuns = new Map();
  const runCli = (/** @type {string} */ dir) => {
    if (!cliRuns.has(dir)) {
      try {
        const out = execFileSync(process.execPath, [join(dir, 'cli', 'bin', 'craft.js'), '--version'], { encoding: 'utf8', timeout: 30000 }).trim();
        cliRuns.set(dir, { ok: out === ctx.version, detail: `craft --version printed ${out}` });
      } catch (err) {
        cliRuns.set(dir, { ok: false, detail: `the installed CLI failed to run: ${/** @type {Error} */ (err).message.split('\n')[0]}` });
      }
    }
    return /** @type {{ ok: boolean, detail: string }} */ (cliRuns.get(dir));
  };
  const out = [];
  for (const a of chosen) {
    const rel = a[ctx.scope];
    if (!rel || !isInstalled(ctx, a)) continue;
    const dir = a.kind === 'skill' ? inside(ctx.base, rel) : inside(ctx.base, PKG_DIR);
    const marker = readMarker(join(dir, MARKER_FILE));
    const checks = [];
    checks.push({ name: 'placement', ok: true, detail: display(ctx, rel) });
    if (!marker) checks.push({ name: 'package copy', ok: false, detail: `${display(ctx, PKG_DIR)}/ is missing or has no install marker; run update` });
    else {
      const missing = marker.files.filter((f) => !existsSync(join(dir, f)));
      const changed = marker.files.filter((f) => existsSync(join(dir, f)) && existsSync(join(ctx.source, f)) && !readFileSync(join(dir, f)).equals(readFileSync(join(ctx.source, f))));
      checks.push({ name: 'files intact', ok: !missing.length && !changed.length, detail: missing.length || changed.length ? `${missing.length} missing, ${changed.length} changed (first: ${[...missing, ...changed][0]}); run update` : `${marker.files.length} files` });
      checks.push({ name: 'version current', ok: marker.version === ctx.version, detail: `installed ${marker.version}, source ${ctx.version}` });
      checks.push({ name: 'pointer resolves', ok: existsSync(join(dir, 'SKILL.md')), detail: `${display(ctx, a.kind === 'skill' ? rel : PKG_DIR)}/SKILL.md` });
      const cli = runCli(dir);
      checks.push({ name: 'installed CLI runs', ok: cli.ok, detail: cli.detail });
    }
    out.push({ agent: a.id, path: display(ctx, rel), level: /** @type {'V1' | 'none'} */ (checks.every((c) => c.ok) ? 'V1' : 'none'), checks });
  }
  return out;
}

/** @template T @param {Record<string, T>} o @returns {Record<string, T>} */
function sortKeys(o) {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

/**
 * @param {string[]} argv
 * @param {IO} [io]
 * @returns {number}
 */
export function main(argv, io = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) }) {
  /** @type {any} */
  let values;
  /** @type {string[]} */
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        agent: { type: 'string' },
        scope: { type: 'string', default: 'project' },
        target: { type: 'string' },
        home: { type: 'string' },
        source: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false }
      }
    }));
  } catch (err) {
    io.stderr(`frontend-craft: ${/** @type {Error} */ (err).message}\n\n${USAGE}`);
    return EXIT.USAGE;
  }
  const [command, ...extra] = positionals;
  if (values.help || command === 'help') {
    io.stdout(USAGE);
    return EXIT.OK;
  }
  const commands = ['install', 'uninstall', 'update', 'list', 'verify', 'doctor'];
  if (!command || !commands.includes(command) || extra.length) {
    io.stderr(`frontend-craft: ${command ? `unknown command "${[command, ...extra].join(' ')}"` : 'missing command'}.\n\n${USAGE}`);
    return EXIT.USAGE;
  }
  if (values.scope !== 'project' && values.scope !== 'user') {
    io.stderr(`frontend-craft: --scope must be "project" or "user", got "${values.scope}".\n`);
    return EXIT.USAGE;
  }
  const json = Boolean(values.json);
  /** @param {object} payload @param {string} text */
  const out = (payload, text) => io.stdout(json ? JSON.stringify({ tool: 'frontend-craft-installer', command, ...payload }, null, 2) + '\n' : text);

  /** @type {Adapter[]} */
  let adapters;
  try {
    adapters = loadAdapters();
  } catch (err) {
    io.stderr(`frontend-craft: ${/** @type {Error} */ (err).message}\n`);
    return EXIT.ENV;
  }

  if (command === 'list') {
    const rows = adapters.map((a) => ({ id: a.id, label: a.label, aliases: a.aliases, kind: a.kind, project: a.project, user: a.user, nativeSkillSupport: a.nativeSkillSupport, docsUrl: a.docsUrl, docsVerifiedOn: a.docsVerifiedOn }));
    out({ agents: rows }, rows.map((r) => `${r.id.padEnd(16)} ${r.kind.padEnd(6)} project: ${r.project ?? '-'}  user: ${r.user ? `~/${r.user}` : '-'}${r.aliases.length ? `  (aliases: ${r.aliases.join(', ')})` : ''}`).join('\n') + '\n');
    return EXIT.OK;
  }

  const scope = /** @type {'project' | 'user'} */ (values.scope);
  const base = resolve(scope === 'user' ? String(values.home ?? homedir()) : String(values.target ?? process.cwd()));
  if (!existsSync(base)) {
    io.stderr(`frontend-craft: ${scope === 'user' ? 'home' : 'target'} directory ${base} does not exist.\n`);
    return EXIT.USAGE;
  }
  const src = findSource(values.source);
  const nodeMajor = Number(process.versions.node.split('.')[0]);

  if (command === 'doctor') {
    let writable = true;
    try {
      accessSync(base, constants.W_OK);
    } catch {
      writable = false;
    }
    const detected = adapters.filter((a) => a.detectMarkers.some((m) => existsSync(join(base, m)))).map((a) => a.id);
    const ok = nodeMajor >= 20 && !('error' in src) && writable;
    out({ ok, node: process.versions.node, source: 'error' in src ? null : src.source, version: 'error' in src ? null : src.version, base, writable, detected },
      [`Node ${process.versions.node}${nodeMajor >= 20 ? '' : ' (Node 20 or newer is required)'}`,
        'error' in src ? src.error : `Source package: ${src.source} (${src.version})`,
        `${scope === 'user' ? 'Home' : 'Target'}: ${base}${writable ? '' : ' (not writable)'}`,
        `Agents detected: ${detected.join(', ') || 'none (install --agent auto would choose ' + AUTO_DEFAULT.join(' + ') + ')'}`].join('\n') + '\n');
    return ok ? EXIT.OK : EXIT.ENV;
  }
  if ('error' in src) {
    io.stderr(`frontend-craft: ${src.error}\n`);
    return EXIT.ENV;
  }
  if (nodeMajor < 20) {
    io.stderr(`frontend-craft: Node ${process.versions.node} is too old; install Node 20 or newer.\n`);
    return EXIT.ENV;
  }
  /** @type {Context} */
  const ctx = { base, scope, source: src.source, version: src.version, description: src.description, force: Boolean(values.force), dryRun: Boolean(values['dry-run']) };
  const installed = adapters.filter((a) => isInstalled(ctx, a));
  const defaultSel = command === 'install' ? 'auto' : null;
  /** @type {Adapter[]} */
  let chosen;
  if (values.agent ?? defaultSel) {
    const s = select(String(values.agent ?? defaultSel), adapters, ctx);
    if ('error' in s) {
      io.stderr(`frontend-craft: ${s.error}\n`);
      return EXIT.USAGE;
    }
    chosen = command === 'install' ? s.chosen : s.chosen.filter((a) => command === 'uninstall' || installed.includes(a));
  } else chosen = installed;

  if (command === 'verify') {
    const rows = verify(ctx, chosen);
    const failed = rows.filter((r) => r.level !== 'V1').length;
    const text = rows.length
      ? rows.map((r) => `${r.level === 'V1' ? 'V1 ok ' : 'FAILED'} ${r.agent.padEnd(16)} ${r.path}\n${r.checks.map((c) => `       ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? `: ${c.detail}` : ''}`).join('\n')}`).join('\n') +
        '\nV1 (placement) is the most this command can show. V2 (agent load check) and V3 (behavior) are recorded in docs/compatibility.md.\n'
      : `No frontend-craft installation found in ${base} (${scope} scope).\n`;
    out({ ok: failed === 0 && rows.length > 0, scope, base, agents: rows }, text);
    return rows.length === 0 ? EXIT.CONFLICT : failed ? EXIT.CONFLICT : EXIT.OK;
  }

  const results = command === 'uninstall' ? uninstall(ctx, chosen, adapters) : install(ctx, chosen);
  const conflicts = results.filter((r) => r.action === 'conflict').length;
  const text = [
    ...(results.length ? results.map((r) => `${r.action.padEnd(9)} ${r.agent.padEnd(16)} ${r.path}${r.detail ? `  (${r.detail})` : ''}`) : [`Nothing to ${command}: no frontend-craft installation found in ${base}.`]),
    ctx.dryRun ? 'Dry run: nothing was written.' : '',
    conflicts ? `${conflicts} conflict(s): nothing was overwritten there. Resolve them, or re-run with --force where the message says so.` : ''
  ].filter(Boolean).join('\n');
  out({ ok: conflicts === 0, scope, base, dryRun: ctx.dryRun, version: ctx.version, results }, text + '\n');
  return conflicts ? EXIT.CONFLICT : EXIT.OK;
}

/** Re-exported for tests that compare package copies. */
export { listFiles };
