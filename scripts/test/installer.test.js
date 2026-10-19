// Installer tests (P1b). Each adapter is exercised generically, so adding an agent adds coverage
// without editing this file. These run against a small stand-in package; the packaged build is
// covered by installer-e2e.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { main, loadAdapters, PACKAGE_ROOT } from '../../installer/main.js';
import { BEGIN, END, MANAGED, MARKER_FILE, PKG_DIR, upsertBlock, removeBlock, listFiles } from '../../installer/engine.js';

const adapters = loadAdapters();
const tmp = (p = 'fc-inst-') => mkdtempSync(join(tmpdir(), p));

/** A minimal package: SKILL.md with a description, a version, and a CLI that prints it. */
function fakePackage(version = '9.9.9', extra = {}) {
  const dir = tmp('fc-src-');
  writeFileSync(join(dir, 'SKILL.md'), '---\nname: frontend-craft\ndescription: Guides frontend work. Use when building UI.\n---\n\n# Body\n');
  mkdirSync(join(dir, 'cli', 'bin'), { recursive: true });
  writeFileSync(join(dir, 'cli', 'package.json'), JSON.stringify({ version }) + '\n');
  writeFileSync(join(dir, 'cli', 'bin', 'craft.js'), `console.log(${JSON.stringify(version)});\n`);
  writeFileSync(join(dir, 'references.md'), 'reference\n');
  for (const [f, c] of Object.entries(extra)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), c);
  }
  return dir;
}

/** @param {string[]} args */
function run(args) {
  let stdout = '';
  let stderr = '';
  const code = main(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}

/** Every file under dir with its sha256, for byte-identity checks. @param {string} dir */
function snapshot(dir) {
  return Object.fromEntries(listFiles(dir).map((f) => [f, createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')]));
}

/** All directories under dir (to prove nothing empty is left behind). @param {string} dir @returns {string[]} */
function dirs(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).flatMap((e) => [join(dir, e.name), ...dirs(join(dir, e.name))]);
}

const src = fakePackage();
const projectAdapters = adapters.filter((a) => a.project);
const userAdapters = adapters.filter((a) => a.user);

test('every adapter validates; none claims docsVerifiedOn without docsUrl', () => {
  assert.ok(adapters.length >= 2);
  for (const a of adapters) {
    assert.ok(!(a.docsVerifiedOn && !a.docsUrl), `${a.id}: docsVerifiedOn needs docsUrl`);
    if (a.kind === 'file') assert.equal(typeof a.frontmatter, 'string', `${a.id}: file kind needs frontmatter`);
  }
  assert.ok(adapters.some((a) => a.id === 'claude-code' && a.kind === 'skill'));
});

test('agent docs tables are generated from adapter data and list every adapter', async () => {
  const { agentSection, adaptersReadme, loadVerification, statusLabel } = await import('../generate-agent-docs.js');
  const ver = loadVerification();
  for (const id of Object.keys(ver.agents)) assert.ok(adapters.some((a) => a.id === id), `verification.json names unknown agent ${id}`);
  const section = agentSection(adapters, ver, '');
  for (const a of adapters) assert.ok(section.includes(`](${a.id}/adapter.json)`), `${a.id} missing from the table`);
  assert.match(section, /Researched, not supported/);
  // "Supported" only with a recorded V3 pass.
  assert.equal(statusLabel({ v2: { result: 'pass' } }), 'Installed, behavior unverified');
  assert.equal(statusLabel({ v3: { result: 'pass' } }), 'Supported');
  const readme = readFileSync(join(PACKAGE_ROOT, 'adapters', 'README.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(readme, adaptersReadme(adapters, ver), 'adapters/README.md is stale: run node scripts/generate-agent-docs.js');
});

test('list --json is generated from adapter data', () => {
  const r = run(['list', '--json']);
  assert.equal(r.code, 0);
  const rows = r.json().agents;
  assert.deepEqual(rows.map((/** @type {any} */ x) => x.id), adapters.map((a) => a.id));
  for (const row of rows) {
    const a = adapters.find((x) => x.id === row.id);
    assert.deepEqual({ kind: row.kind, project: row.project, user: row.user, aliases: row.aliases }, { kind: a?.kind, project: a?.project, user: a?.user, aliases: a?.aliases });
  }
});

test('dry run writes nothing', () => {
  const t = tmp();
  const r = run(['install', '--agent', 'all', '--target', t, '--source', src, '--dry-run', '--json']);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.json().results.every((/** @type {any} */ x) => ['create', 'n/a'].includes(x.action)));
  assert.deepEqual(readdirSync(t), []);
});

test('installs for every agent at the declared paths; verify reaches V1 and the installed CLI runs', () => {
  const t = tmp();
  const r = run(['install', '--agent', 'all', '--target', t, '--source', src, '--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  for (const a of projectAdapters) {
    const p = join(t, /** @type {string} */ (a.project));
    if (a.kind === 'skill') assert.ok(existsSync(join(p, 'SKILL.md')) && existsSync(join(p, MARKER_FILE)), a.id);
    else assert.ok(existsSync(p), `${a.id}: ${a.project}`);
  }
  assert.ok(existsSync(join(t, PKG_DIR, 'SKILL.md')) === projectAdapters.some((a) => a.kind !== 'skill'));
  const v = run(['verify', '--target', t, '--source', src, '--json']);
  assert.equal(v.code, 0, v.stdout);
  const agents = v.json().agents;
  assert.deepEqual(agents.map((/** @type {any} */ x) => x.agent).sort(), projectAdapters.map((a) => a.id).sort());
  for (const row of agents) {
    assert.equal(row.level, 'V1', JSON.stringify(row));
    assert.ok(row.checks.some((/** @type {any} */ c) => c.name === 'installed CLI runs' && c.ok));
  }
});

test('rule files carry their frontmatter and every pointer names the installed package', () => {
  const t = tmp();
  assert.equal(run(['install', '--agent', 'all', '--target', t, '--source', src]).code, 0);
  for (const a of projectAdapters.filter((x) => x.kind !== 'skill')) {
    const text = readFileSync(join(t, /** @type {string} */ (a.project)), 'utf8');
    assert.ok(text.includes(`${PKG_DIR}/SKILL.md`), `${a.id} points at the package`);
    assert.ok(text.includes(`node ${PKG_DIR}/cli/bin/craft.js --help`), `${a.id} names the CLI`);
    assert.ok(text.includes('Do not claim a check, render, or test you did not run.'), `${a.id} carries the honesty rule`);
    if (a.kind === 'file') {
      assert.ok(text.includes(MANAGED), `${a.id} is marked managed`);
      const fm = (a.frontmatter ?? '').replace(/\{\{description\}\}/g, JSON.stringify('Guides frontend work. Use when building UI.')).trim();
      if (fm) assert.ok(text.startsWith(fm + '\n'), `${a.id} starts with its frontmatter`);
    } else {
      assert.equal(text.split(BEGIN).length, 2, `${a.id}: exactly one block`);
    }
  }
});

test('first install reports create, a second run changes no bytes, a version change reports update', () => {
  const t = tmp();
  const first = run(['install', '--agent', 'all', '--target', t, '--source', src, '--json']).json().results;
  assert.ok(first.every((/** @type {any} */ x) => x.action === 'create'), JSON.stringify(first));
  const before = snapshot(t);
  const second = run(['install', '--agent', 'all', '--target', t, '--source', src, '--json']).json().results;
  assert.ok(second.every((/** @type {any} */ x) => x.action === 'unchanged'), JSON.stringify(second));
  assert.deepEqual(snapshot(t), before);
  const newer = fakePackage('9.9.10');
  const third = run(['update', '--target', t, '--source', newer, '--json']).json().results;
  assert.ok(third.length && third.every((/** @type {any} */ x) => x.action === 'update' || x.action === 'unchanged'));
  assert.ok(third.some((/** @type {any} */ x) => x.action === 'update'));
});

test('existing instruction files keep their content and uninstall restores them byte for byte; no empty directories remain', () => {
  const t = tmp();
  const shared = [...new Set(projectAdapters.filter((a) => a.kind === 'block').map((a) => /** @type {string} */ (a.project)))];
  const originals = Object.fromEntries(shared.map((p, i) => [p, i % 2 ? `# Team rules\n\nUse pnpm.` : `# Team rules\n\nUse pnpm.\n`]));
  for (const [p, c] of Object.entries(originals)) {
    mkdirSync(dirname(join(t, p)), { recursive: true });
    writeFileSync(join(t, p), c);
  }
  assert.equal(run(['install', '--agent', 'all', '--target', t, '--source', src]).code, 0);
  for (const [p, c] of Object.entries(originals)) assert.ok(readFileSync(join(t, p), 'utf8').startsWith(c), `${p} keeps its content`);
  assert.equal(run(['uninstall', '--target', t, '--source', src]).code, 0);
  for (const [p, c] of Object.entries(originals)) assert.equal(readFileSync(join(t, p), 'utf8'), c, `${p} restored`);
  const left = listFiles(t).filter((f) => !(f in originals));
  assert.deepEqual(left, []);
  const keep = new Set(Object.keys(originals).flatMap((p) => p.split('/').slice(0, -1).map((_, i, parts) => join(t, ...parts.slice(0, i + 1)))));
  assert.deepEqual(dirs(t).filter((d) => !keep.has(d)), []);
});

test('uninstall from an empty project leaves nothing behind', () => {
  const t = tmp();
  assert.equal(run(['install', '--agent', 'all', '--target', t, '--source', src]).code, 0);
  assert.equal(run(['uninstall', '--agent', 'all', '--target', t, '--source', src]).code, 0);
  assert.deepEqual(readdirSync(t), []);
});

test('a CRLF shared file stays CRLF and is restored exactly', () => {
  const block = projectAdapters.find((a) => a.kind === 'block');
  assert.ok(block);
  const t = tmp();
  const original = '# Rules\r\nKeep CRLF.\r\n';
  const p = join(t, /** @type {string} */ (block.project));
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, original);
  assert.equal(run(['install', '--agent', block.id, '--target', t, '--source', src]).code, 0);
  const text = readFileSync(p, 'utf8');
  assert.ok(!/[^\r]\n/.test(text), 'no bare LF introduced');
  assert.equal(run(['uninstall', '--agent', block.id, '--target', t, '--source', src]).code, 0);
  assert.equal(readFileSync(p, 'utf8'), original);
});

test('managed block helpers: one block, update in place, exact removal', () => {
  const a = upsertBlock('', ['x']);
  assert.ok(!('error' in a) && a.text === `${BEGIN}\nx\n${END}\n`);
  const b = upsertBlock('top\n\nbottom\n' + (('text' in a) ? a.text : '') + 'after\n', ['y']);
  assert.ok(!('error' in b) && b.existed && b.text.includes('y') && !b.text.includes('\nx\n') && b.text.endsWith('after\n'));
  assert.ok('error' in upsertBlock(`${BEGIN}\n${END}\n${BEGIN}\n${END}\n`, ['z']));
  for (const original of ['', 'a', 'a\n', 'a\n\n', 'a\r\n']) {
    const r = upsertBlock(original, ['p']);
    assert.ok(!('error' in r));
    assert.equal(removeBlock(r.text, r.separator), original, JSON.stringify(original));
  }
});

test('update removes stale files and repairs tampered ones', () => {
  const t = tmp();
  const v1 = fakePackage('1.0.0', { 'old.md': 'stale\n', 'nested/gone.md': 'gone\n' });
  assert.equal(run(['install', '--agent', 'all', '--target', t, '--source', v1]).code, 0);
  const skill = join(t, '.claude', 'skills', 'frontend-craft');
  writeFileSync(join(skill, 'references.md'), 'tampered\n');
  rmSync(join(skill, 'SKILL.md'));
  const v = run(['verify', '--agent', 'claude-code', '--target', t, '--source', v1, '--json']);
  assert.equal(v.code, 1, 'verify notices missing and changed files');
  const v2 = fakePackage('1.0.1');
  const r = run(['update', '--target', t, '--source', v2, '--json']);
  assert.equal(r.code, 0, r.stdout);
  for (const dir of [skill, join(t, PKG_DIR)].filter((d) => existsSync(d))) {
    assert.ok(!existsSync(join(dir, 'old.md')) && !existsSync(join(dir, 'nested')), `${dir}: stale files removed`);
    assert.equal(readFileSync(join(dir, 'references.md'), 'utf8'), 'reference\n', `${dir}: tampered file repaired`);
    assert.ok(existsSync(join(dir, 'SKILL.md')));
  }
  assert.equal(run(['verify', '--target', t, '--source', v2]).code, 0);
});

test('foreign files and directories are never overwritten without --force', () => {
  const t = tmp();
  const skill = join(t, '.claude', 'skills', 'frontend-craft');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), 'someone else\n');
  const r = run(['install', '--agent', 'claude-code', '--target', t, '--source', src, '--json']);
  assert.equal(r.code, 1);
  assert.equal(r.json().results[0].action, 'conflict');
  assert.equal(readFileSync(join(skill, 'SKILL.md'), 'utf8'), 'someone else\n');
  assert.equal(run(['install', '--agent', 'claude-code', '--target', t, '--source', src, '--force']).code, 0);
  assert.notEqual(readFileSync(join(skill, 'SKILL.md'), 'utf8'), 'someone else\n');

  const ruleFile = projectAdapters.find((a) => a.kind === 'file');
  if (ruleFile) {
    const t2 = tmp();
    const p = join(t2, /** @type {string} */ (ruleFile.project));
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, 'my own rule\n');
    assert.equal(run(['install', '--agent', ruleFile.id, '--target', t2, '--source', src]).code, 1);
    assert.equal(readFileSync(p, 'utf8'), 'my own rule\n');
    assert.equal(run(['uninstall', '--agent', ruleFile.id, '--target', t2, '--source', src]).code, 1, 'uninstall leaves foreign files alone');
    assert.equal(readFileSync(p, 'utf8'), 'my own rule\n');
  }

  const t3 = tmp();
  mkdirSync(join(t3, PKG_DIR));
  writeFileSync(join(t3, PKG_DIR, 'notes.txt'), 'mine\n');
  const r3 = run(['install', '--agent', 'agents-md', '--target', t3, '--source', src, '--json']);
  assert.equal(r3.code, 1);
  assert.ok(!existsSync(join(t3, 'AGENTS.md')), 'no pointer to a package that could not be installed');
});

test('a file where a directory is needed is reported, not a crash', () => {
  const nested = projectAdapters.find((a) => a.kind !== 'skill' && /** @type {string} */ (a.project).includes('/'));
  const skill = adapters.find((a) => a.id === 'claude-code');
  const t = tmp();
  writeFileSync(join(t, '.claude'), 'legacy single file\n');
  const r = run(['install', '--agent', 'claude-code', '--target', t, '--source', src, '--json']);
  assert.equal(r.code, 1);
  assert.equal(r.json().results[0].action, 'conflict');
  assert.ok(skill);
  if (nested) {
    const t2 = tmp();
    const top = /** @type {string} */ (nested.project).split('/')[0];
    writeFileSync(join(t2, top), 'legacy single-file rules\n');
    const r2 = run(['install', '--agent', nested.id, '--target', t2, '--source', src, '--json']);
    assert.equal(r2.code, 1, r2.stdout);
    assert.ok(r2.json().results.some((/** @type {any} */ x) => x.action === 'conflict' && /legacy single-file/.test(x.detail)));
    assert.equal(readFileSync(join(t2, top), 'utf8'), 'legacy single-file rules\n');
  }
});

test('--agent selection: ids, aliases, case, unknown names', () => {
  const t = tmp();
  const withAlias = adapters.find((a) => a.aliases.length);
  assert.ok(withAlias);
  const r = run(['install', '--agent', `${withAlias.aliases[0].toUpperCase()}`, '--target', t, '--source', src, '--dry-run', '--json']);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.json().results.some((/** @type {any} */ x) => x.agent === withAlias.id));
  const u = run(['install', '--agent', 'no-such-agent', '--target', t, '--source', src]);
  assert.equal(u.code, 2);
  assert.match(u.stderr, /Unknown agent "no-such-agent"/);
  assert.equal(run(['install', '--agent', ',', '--target', t, '--source', src]).code, 2);
  assert.equal(run(['install', '--scope', 'galaxy', '--target', t, '--source', src]).code, 2);
  assert.equal(run(['frobnicate']).code, 2);
  assert.equal(run([]).code, 2);
  assert.equal(run(['install', '--target', join(t, 'missing'), '--source', src]).code, 2);
  assert.equal(run(['install', '--target', t, '--source', tmp()]).code, 3);
});

test('--agent auto installs for detected agents only, and defaults to Claude Code plus AGENTS.md', () => {
  const empty = tmp();
  const r = run(['install', '--agent', 'auto', '--target', empty, '--source', src, '--dry-run', '--json']);
  assert.deepEqual(r.json().results.filter((/** @type {any} */ x) => x.agent !== '(package)').map((/** @type {any} */ x) => x.agent).sort(), ['agents-md', 'claude-code']);
  for (const a of adapters.filter((x) => x.detectMarkers.length)) {
    const t = tmp();
    const marker = join(t, a.detectMarkers[0]);
    mkdirSync(dirname(marker), { recursive: true });
    if (/\.[a-z]+$/i.test(a.detectMarkers[0])) writeFileSync(marker, 'x\n');
    else mkdirSync(marker, { recursive: true });
    const d = run(['install', '--target', t, '--source', src, '--dry-run', '--json']).json().results.map((/** @type {any} */ x) => x.agent);
    assert.ok(d.includes(a.id), `${a.id} detected from ${a.detectMarkers[0]}`);
  }
});

test('user scope installs only agents with a user location, never touches the project, and uninstalls cleanly', () => {
  const home = tmp('fc-home-');
  const project = tmp();
  const r = run(['install', '--agent', 'all', '--scope', 'user', '--home', home, '--source', src, '--json']);
  assert.equal(r.code, 0, r.stdout);
  const results = r.json().results;
  for (const a of adapters) {
    const row = results.find((/** @type {any} */ x) => x.agent === a.id);
    assert.equal(row.action, a.user ? 'create' : 'n/a', a.id);
  }
  for (const a of userAdapters) {
    const text = a.kind === 'skill' ? null : readFileSync(join(home, /** @type {string} */ (a.user)), 'utf8');
    if (text) assert.ok(text.includes(join(home, PKG_DIR).split('\\').join('/') + '/SKILL.md'), `${a.id}: user pointer uses the absolute package path`);
  }
  assert.deepEqual(readdirSync(project), []);
  assert.equal(run(['uninstall', '--scope', 'user', '--home', home, '--source', src]).code, 0);
  assert.deepEqual(readdirSync(home), []);
});

test('Antigravity: one workspace copy for every surface, separate global folders for IDE/app and CLI', () => {
  const t = tmp();
  const r = run(['install', '--agent', 'antigravity,agy', '--target', t, '--source', src, '--json']);
  assert.equal(r.code, 0, r.stdout);
  const rows = r.json().results.filter((/** @type {any} */ x) => x.agent.startsWith('antigravity'));
  assert.deepEqual(rows.map((/** @type {any} */ x) => x.agent).sort(), ['antigravity', 'antigravity-cli']);
  const skill = readFileSync(join(t, '.agents', 'skills', 'frontend-craft', 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\n(?:.*\n)*?name: frontend-craft\n/, 'name matches the folder (Antigravity: lowercase, hyphens)');
  assert.match(skill, /\ndescription: \S/, 'description is present (required by Antigravity)');
  const home = tmp('fc-home-');
  assert.equal(run(['install', '--agent', 'antigravity,antigravity-cli', '--scope', 'user', '--home', home, '--source', src]).code, 0);
  assert.ok(existsSync(join(home, '.gemini', 'config', 'skills', 'frontend-craft', 'SKILL.md')), 'IDE and app global folder');
  assert.ok(existsSync(join(home, '.gemini', 'antigravity-cli', 'skills', 'frontend-craft', 'SKILL.md')), 'CLI global folder');
  assert.ok(!existsSync(join(home, '.agents')), 'nothing in ~/.agents, which the CLI does not read');
  assert.equal(run(['uninstall', '--scope', 'user', '--home', home, '--source', src]).code, 0);
  assert.deepEqual(readdirSync(home), []);
});

test('project scope never touches the home directory', () => {
  const home = tmp('fc-home-');
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    const t = tmp();
    assert.equal(run(['install', '--agent', 'all', '--target', t, '--source', src]).code, 0);
    assert.equal(run(['uninstall', '--target', t, '--source', src]).code, 0);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  assert.deepEqual(readdirSync(home), []);
});

test('agents sharing one file share one block; it stays until the last of them is uninstalled', () => {
  const groups = new Map();
  for (const a of projectAdapters.filter((x) => x.kind === 'block')) groups.set(a.project, [...(groups.get(a.project) ?? []), a.id]);
  const shared = [...groups.entries()].find(([, ids]) => ids.length > 1);
  if (!shared) return;
  const [path, ids] = shared;
  const t = tmp();
  assert.equal(run(['install', '--agent', ids.join(','), '--target', t, '--source', src]).code, 0);
  assert.equal(readFileSync(join(t, path), 'utf8').split(BEGIN).length, 2);
  assert.equal(run(['uninstall', '--agent', ids[0], '--target', t, '--source', src]).code, 0);
  assert.ok(readFileSync(join(t, path), 'utf8').includes(BEGIN), 'block kept for the other agents');
  assert.ok(existsSync(join(t, PKG_DIR, 'SKILL.md')), 'package kept while a pointer uses it');
  assert.equal(run(['uninstall', '--agent', ids.slice(1).join(','), '--target', t, '--source', src]).code, 0);
  assert.deepEqual(readdirSync(t), []);
});

test('installer source has no network, eval, or lifecycle-script hooks', () => {
  const files = ['install.mjs', ...readdirSync(join(PACKAGE_ROOT, 'installer')).filter((f) => f.endsWith('.js')).map((f) => `installer/${f}`), 'scripts/install-claude-code.js'];
  for (const f of files) {
    const text = readFileSync(join(PACKAGE_ROOT, f), 'utf8');
    assert.ok(!/from ['"]node:(net|http|https|http2|dgram|dns|tls)['"]|require\(['"](net|http|https)['"]\)|\bfetch\(|WebSocket/.test(text), `${f}: no network APIs`);
    assert.ok(!/\beval\(|new Function\(/.test(text), `${f}: no eval`);
  }
  const execUsers = files.filter((f) => /child_process/.test(readFileSync(join(PACKAGE_ROOT, f), 'utf8')));
  assert.deepEqual(execUsers, ['installer/main.js'], 'only verify starts a process');
});
