// craft command-line interface. Exit codes: 0 ok, 1 findings at/above --fail-on,
// 2 usage error, 3 environment or tool unavailable (including commands not in this version).
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VERSION } from './version.js';
import { detect } from './doctor.js';
import { init } from './init.js';
import { runLint } from './lint.js';
import { RULE_IDS } from '../rules/index.js';
import { checkPairs } from './tokens.js';
import { validateAgainst } from './schemas.js';
import { audit, DEFAULT_TIMEOUT_MS } from './audit.js';
import { shoot } from './shoot.js';
import { extractTokens } from './extract.js';
import { loadConfig } from './lint.js';
import { buildReport, writeReport, checkReport, saveTierResult } from './report.js';
import { BUNDLED_CATALOG, LOCAL_ENTRIES_DIR, LOCAL_INDEX_FILE, buildIndex, digestEntries, loadCatalog, locateIndex, parseFilters, search, serializeIndex, validateCatalog } from './catalog.js';

export const EXIT = { OK: 0, FINDINGS: 1, USAGE: 2, UNAVAILABLE: 3 };

/** Commands planned in the spec and the version that adds them. */
const PLANNED = {
  tokens: '0.5.0'
};

const HELP = `craft ${VERSION}: design contract, checks, and proof for frontend work

Usage: craft <command> [path] [options]

Commands available in this version:
  doctor            Detect Node, package manager, framework, styling, Playwright, axe
  init              Scaffold .craft/ from templates (never overwrites existing files)
  init --from-repo  Same, with tokens.json drafted from the project's custom properties and Tailwind config
  lint [paths]      Tier 0 Slop Lint (all static rules; --rules a,b to select)
  contrast          WCAG 2.x AA contrast for token pairs in .craft/tokens.json
  audit             Tier 1: run the project's lint/typecheck/test/build scripts (--scripts a,b; --dry-run)
  shoot             Tier 2: render --url (loopback) or --file pages in Chromium: overflow at
                    320-1920px, axe-core light/dark, keyboard focus, targets, reduced motion,
                    RTL, 200% zoom, forced colors (needs Playwright + axe-core in the project)
  report            Run Tier 0, fold in fresh Tier 1/2 results, write .craft/reports/latest.{json,md}
  report --check    Exit 0 if latest.json still matches the files, 1 if stale, missing, or invalid
  catalog validate  Validate catalog entries (bundled + .craft/catalog/): schema, trust, lifecycle,
                    license allowlist; stale verified_on dates are warnings
  index build       Build .craft/catalog-index.json from the bundled entries plus .craft/catalog/*.json
  search "<intent>" Offline catalog search: 3-5 compact cards (id, trust, intent, file to read).
                    Filters: --axes density=compact,... --stack react,tailwind-v4 --trust L1,L2
                    --category component --limit 5 (1-10)

Planned (exit 3 until released): ${Object.entries(PLANNED).map(([c, v]) => `${c} (${v})`).join(', ')}

Options:
  --json            Machine-readable output
  --fail-on <lvl>   block | warn (default: config failOn, else block)
  --cwd <dir>       Project root (default: current directory)
  --tokens <file>   Token file for contrast (default: .craft/tokens.json)
  --rules <ids>     Comma-separated rule ids for lint
  --scripts <names> Comma-separated scripts for audit (default: all detected)
  --timeout <sec>   Per-script timeout for audit (default: ${DEFAULT_TIMEOUT_MS / 1000})
  --dry-run         audit: list the scripts that would run, run nothing
  --url <url>       shoot: page URL, repeatable (loopback only without --allow-network)
  --file <path>     shoot: local HTML file, repeatable
  --allow-network   Allow non-loopback hosts and requests (off by default)
  --check           report: check freshness instead of writing
  --axes <k=v,...>  search: entries that fit these axis positions (entries silent on an axis pass)
  --stack <list>    search: frameworks and/or styling (any, react, next, vue, svelte, astro, html,
                    css, tailwind-v3, tailwind-v4, css-modules, scss, css-in-js)
  --trust <levels>  search: L0, L1, L2, L3 (comma-separated)
  --category <c>    search: page-composition, component, motion, specialized-product, design-system
  --limit <n>       search: number of cards (default 5, clamped to 1-10)
  --today <date>    catalog validate: evaluate staleness as of YYYY-MM-DD (deterministic runs)
  --catalog <dir>   catalog root with entries/ and index/ (default: the catalog shipped with craft)
  -v, --version     Print version
  -h, --help        Print this help

Exit codes: 0 ok, 1 findings at or above --fail-on, 2 usage error, 3 unavailable.
`;

/**
 * @typedef {{ stdout: (s: string) => void, stderr: (s: string) => void }} IO
 */

/**
 * @param {string[]} argv
 * @param {IO} [io]
 * @returns {Promise<number>} exit code
 */
export async function main(argv, io = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) }) {
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: 'boolean', default: false },
        'fail-on': { type: 'string' },
        cwd: { type: 'string' },
        tokens: { type: 'string' },
        rules: { type: 'string' },
        scripts: { type: 'string' },
        timeout: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        check: { type: 'boolean', default: false },
        url: { type: 'string', multiple: true },
        file: { type: 'string', multiple: true },
        'from-repo': { type: 'boolean', default: false },
        'allow-network': { type: 'boolean', default: false },
        axes: { type: 'string' },
        stack: { type: 'string' },
        trust: { type: 'string' },
        category: { type: 'string' },
        limit: { type: 'string' },
        today: { type: 'string' },
        catalog: { type: 'string' },
        version: { type: 'boolean', short: 'v', default: false },
        help: { type: 'boolean', short: 'h', default: false }
      }
    });
  } catch (err) {
    io.stderr(`craft: ${/** @type {Error} */ (err).message}\nRun "craft --help" for usage.\n`);
    return EXIT.USAGE;
  }
  const { values, positionals } = parsed;
  const json = Boolean(values.json);
  const [command, ...rest] = positionals;

  /** @param {object} payload @param {string} text */
  const out = (payload, text) => io.stdout(json ? JSON.stringify({ tool: 'frontend-craft', version: VERSION, ...payload }, null, 2) + '\n' : text);

  if (values.version) {
    out({ command: 'version' }, `${VERSION}\n`);
    return EXIT.OK;
  }
  if (values.help || !command || command === 'help') {
    io.stdout(HELP);
    return command || values.help ? EXIT.OK : EXIT.USAGE;
  }

  const root = resolve(String(values.cwd ?? process.cwd()));
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    io.stderr(`craft: project root "${root}" is not a directory. Pass an existing directory with --cwd.\n`);
    return EXIT.USAGE;
  }
  const failOnArg = values['fail-on'];
  if (failOnArg !== undefined && failOnArg !== 'block' && failOnArg !== 'warn') {
    io.stderr(`craft: --fail-on must be "block" or "warn", got "${failOnArg}".\n`);
    return EXIT.USAGE;
  }

  if (command in PLANNED) {
    const since = PLANNED[/** @type {keyof typeof PLANNED} */ (command)];
    const msg = `craft ${command} is not available in ${VERSION}; it is planned for ${since}. Report this check as not verified and check by inspection instead.`;
    out({ command, ok: false, status: 'unavailable', availableIn: since, message: msg }, `${msg}\n`);
    return EXIT.UNAVAILABLE;
  }

  switch (command) {
    case 'doctor': {
      const env = detect(root);
      const lines = [
        `Node ${env.node}${env.nodeSupported ? '' : ' (unsupported: Node 20 or newer is required)'}`,
        `Package manager: ${env.packageManager ?? 'none detected (no package.json)'}`,
        `Framework: ${env.framework ?? 'not detected'}`,
        `Styling: ${env.styling ?? 'not detected'}${env.tailwind ? ` (tailwindcss ${env.tailwind})` : ''}`,
        `Project scripts (Tier 1): ${env.projectScripts.length ? env.projectScripts.join(', ') : 'none found'}`,
        `Playwright (Tier 2): ${env.playwright ?? 'not installed in this project'}`,
        `axe-core (Tier 2): ${env.axe ?? 'not installed in this project'}`,
        `Design contract: ${env.contract ? '.craft/DESIGN.md found' : 'none (run craft init)'}`
      ];
      out({ command, ok: env.nodeSupported, environment: env }, lines.join('\n') + '\n');
      return env.nodeSupported ? EXIT.OK : EXIT.UNAVAILABLE;
    }

    case 'init': {
      if (values['from-repo']) {
        const ex = extractTokens(root, loadConfig(root).ignore ?? []);
        const tokensExists = existsSync(join(root, '.craft', 'tokens.json'));
        const valid = ex.tokens ? validateAgainst('tokens', ex.tokens) : null;
        if (valid && !valid.valid) {
          io.stderr(`craft init --from-repo: extracted tokens do not match the schema (please report this): ${valid.errors.slice(0, 3).map((e) => `${e.path} ${e.message}`).join('; ')}\n`);
          return EXIT.UNAVAILABLE;
        }
        const r = init(root, ex.tokens && !tokensExists ? { tokens: ex.tokens } : {});
        mkdirSync(join(root, '.craft', 'reports'), { recursive: true });
        if (ex.tokens && tokensExists) writeFileSync(join(root, '.craft', 'reports', 'tokens.extracted.json'), JSON.stringify(ex.tokens, null, 2) + '\n');
        const note = [
          '# Token extraction (craft init --from-repo)',
          '',
          ...ex.summary.map((l) => `- ${l}`),
          '',
          ex.tokens
            ? tokensExists ? 'tokens.json already existed and was kept; the draft is in .craft/reports/tokens.extracted.json.' : 'The draft is in .craft/tokens.json (meta.source: extracted).'
            : 'Nothing usable was found; .craft/tokens.json is the starter template.',
          'Review every semantic role and pair, then run craft contrast. Fill DESIGN.md from what the product already does.',
          ''
        ].join('\n');
        writeFileSync(join(root, '.craft', 'reports', 'extraction.md'), note);
        const text = [...r.created.map((f) => `created ${f}`), ...r.skipped.map((f) => `kept    ${f} (already exists)`), '', ...ex.summary, '', 'Summary: .craft/reports/extraction.md. Next: review the extracted roles, run craft contrast, fill DESIGN.md.'].join('\n');
        out({ command, ok: true, created: r.created, skipped: r.skipped, extracted: Boolean(ex.tokens), summary: ex.summary }, text + '\n');
        return EXIT.OK;
      }
      const r = init(root);
      const text = [
        ...r.created.map((f) => `created ${f}`),
        ...r.skipped.map((f) => `kept    ${f} (already exists)`),
        r.created.includes('.craft/DESIGN.md') ? '\nNext: fill every {{...}} in .craft/DESIGN.md and replace the placeholder tokens, then run craft lint and craft contrast.' : ''
      ].join('\n');
      out({ command, ok: true, created: r.created, skipped: r.skipped }, text + '\n');
      return EXIT.OK;
    }

    case 'lint': {
      const target = root;
      const failOn = failOnArg ?? readFailOn(target) ?? 'block';
      const rules = values.rules ? String(values.rules).split(',').map((r) => r.trim()).filter(Boolean) : undefined;
      const unknown = (rules ?? []).filter((r) => !RULE_IDS.has(r));
      if (unknown.length) {
        io.stderr(`craft lint: unknown rule id(s): ${unknown.join(', ')}. Known: ${[...RULE_IDS].join(', ')}\n`);
        return EXIT.USAGE;
      }
      const result = runLint(target, { paths: rest, rules });
      const { findings, summary } = result;
      const failing = failOn === 'warn' ? summary.block + summary.warn : summary.block;
      const text = [
        `craft lint ${VERSION}: ${result.files.length} files, ${result.rulesRun.length} rules, ${result.durationMs} ms`,
        ...findings.map((f) => `${f.severity.toUpperCase().padEnd(5)} ${f.ruleId} ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}${f.confidence < 0.7 ? ` (heuristic, confidence ${f.confidence})` : ''}\n      fix: ${f.remediation}`),
        ...result.exceptions.map((e) => `ALLOW ${e.ruleId} ${e.file}${e.line ? `:${e.line}` : ''}  ${e.reason}`),
        ...result.parseErrors.map((e) => `PARSE ${e.file}: ${e.error} (file checked partially)`),
        `Rendered-only rules not run by lint: ${result.rulesRenderedOnly.join(', ') || 'none'} (use craft shoot)`,
        `${summary.block} block, ${summary.warn} warn, ${summary.info} info, ${result.exceptions.length} exception(s) (fail on: ${failOn})`
      ].join('\n');
      out({ command, ok: failing === 0, failOn, files: result.files.length, durationMs: result.durationMs, rulesRun: result.rulesRun, rulesRenderedOnly: result.rulesRenderedOnly, summary, findings, exceptions: result.exceptions, parseErrors: result.parseErrors }, text + '\n');
      return failing ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'audit': {
      const scripts = values.scripts ? String(values.scripts).split(',').map((x) => x.trim()).filter(Boolean) : undefined;
      const timeoutSec = values.timeout === undefined ? undefined : Number(values.timeout);
      if (timeoutSec !== undefined && !(timeoutSec > 0)) {
        io.stderr(`craft audit: --timeout must be a positive number of seconds.\n`);
        return EXIT.USAGE;
      }
      const r = audit(root, { scripts, commands: loadConfig(root).tier1?.commands, dryRun: Boolean(values['dry-run']), timeoutMs: timeoutSec ? timeoutSec * 1000 : undefined });
      if (values['dry-run']) {
        const cmds = loadConfig(root).tier1?.commands ?? {};
        const text = r.planned.length ? `Would run: ${r.planned.map((x) => cmds[x] ?? `${r.packageManager} run ${x}`).join(', ')}` : `No Tier 1 scripts to run (${r.skipped ?? 'none detected'}).`;
        out({ command, ok: true, dryRun: true, packageManager: r.packageManager, planned: r.planned }, text + '\n');
        return EXIT.OK;
      }
      saveTierResult(root, 'audit', { checks: r.checks });
      const failed = r.checks.filter((c) => c.status === 'failed').length;
      const label = { verified: 'VERIFIED', failed: 'FAILED', not_verified: 'NOT VERIFIED' };
      const text = [
        ...r.checks.map((c) => `${label[c.status].padEnd(12)} ${c.id}: ${c.status === 'not_verified' ? c.reason : c.evidence}`),
        `Saved to .craft/reports/audit.json; run craft report to fold it into the proof report.`
      ].join('\n');
      out({ command, ok: failed === 0, packageManager: r.packageManager, checks: r.checks }, text + '\n');
      return failed ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'shoot': {
      const tier2 = loadConfig(root).tier2 ?? {};
      /** @type {string[] | undefined} */
      let urls = /** @type {string[] | undefined} */ (values.url);
      if (!urls && !values.file && tier2.url) urls = (tier2.routes?.length ? tier2.routes : ['/']).map((/** @type {string} */ r) => new URL(r, tier2.url).href);
      const r = await shoot(root, { urls, files: /** @type {string[] | undefined} */ (values.file), allowNetwork: Boolean(values['allow-network']), viewports: tier2.viewports });
      if (r.status === 'usage') {
        io.stderr(`craft shoot: ${r.message}\n`);
        return EXIT.USAGE;
      }
      if (r.status === 'unavailable') {
        out({ command, ok: false, status: 'unavailable', message: r.message }, r.message + '\n');
        return EXIT.UNAVAILABLE;
      }
      saveTierResult(root, 'shoot', { checks: r.checks, findings: r.findings });
      const failOn = failOnArg ?? readFailOn(root) ?? 'block';
      const summary = { block: 0, warn: 0, info: 0 };
      for (const f of r.findings) summary[f.severity]++;
      const failed = r.checks.filter((c) => c.status === 'failed').length;
      const label = { verified: 'VERIFIED', failed: 'FAILED', not_verified: 'NOT VERIFIED' };
      const text = [
        ...r.checks.map((c) => `${label[c.status].padEnd(12)} ${c.id}: ${c.status === 'not_verified' ? c.reason : c.evidence}`),
        ...r.findings.map((f) => `${f.severity.toUpperCase().padEnd(5)} ${f.ruleId} ${f.file}  ${f.message}`),
        `${r.screenshots.length} screenshots in .craft/reports/shots/; results saved to .craft/reports/shoot.json (run craft report).`
      ].join('\n');
      const failing = (failOn === 'warn' ? summary.block + summary.warn : summary.block) + failed;
      out({ command, ok: failing === 0, checks: r.checks, findings: r.findings, summary, screenshots: r.screenshots, blockedOrigins: r.blocked }, text + '\n');
      return failing ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'report': {
      if (values.check) {
        const c = checkReport(root);
        out({ command, ok: c.status === 'fresh', status: c.status, message: c.message, highestTier: c.report?.highestTier ?? null }, c.message + '\n');
        return c.status === 'fresh' ? EXIT.OK : EXIT.FINDINGS;
      }
      const report = buildReport(root);
      const v = validateAgainst('report', report);
      if (!v.valid) {
        io.stderr(`craft report: internal error, report does not match its schema: ${v.errors.map((e) => `${e.path} ${e.message}`).join('; ')}\n`);
        return EXIT.UNAVAILABLE;
      }
      writeReport(root, report);
      const counts = { verified: 0, failed: 0, not_verified: 0 };
      for (const c of report.checks) counts[/** @type {'verified' | 'failed' | 'not_verified'} */ (c.status)]++;
      const failOn = failOnArg ?? readFailOn(root) ?? 'block';
      const failing = failOn === 'warn' ? report.summary.block + report.summary.warn : report.summary.block;
      const text = [
        `Wrote .craft/reports/latest.json and latest.md`,
        `Highest tier: ${report.highestTier}; checks: ${counts.verified} verified, ${counts.failed} failed, ${counts.not_verified} not verified`,
        `Findings: ${report.summary.block} block, ${report.summary.warn} warn, ${report.summary.info} info`
      ].join('\n');
      out({ command, ok: failing === 0 && counts.failed === 0, highestTier: report.highestTier, counts, summary: report.summary, runId: report.runId }, text + '\n');
      return failing || counts.failed ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'contrast': {
      const file = values.tokens ? resolve(root, String(values.tokens)) : join(root, '.craft', 'tokens.json');
      if (!existsSync(file)) {
        const msg = `No token file at ${file}. Run craft init or pass --tokens <file>.`;
        out({ command, ok: false, status: 'unavailable', message: msg }, msg + '\n');
        return EXIT.UNAVAILABLE;
      }
      /** @type {any} */
      let tokens;
      try {
        tokens = JSON.parse(readFileSync(file, 'utf8'));
      } catch (err) {
        io.stderr(`craft contrast: ${file} is not valid JSON: ${/** @type {Error} */ (err).message}\n`);
        return EXIT.FINDINGS;
      }
      const schema = validateAgainst('tokens', tokens);
      if (!schema.valid) {
        const msg = `Token file does not match the schema:\n${schema.errors.map((e) => `  ${e.path} ${e.message}`).join('\n')}`;
        out({ command, ok: false, status: 'invalid', errors: schema.errors }, msg + '\n');
        return EXIT.FINDINGS;
      }
      const results = checkPairs(tokens);
      const counts = { pass: 0, fail: 0, unresolved: 0 };
      for (const r of results) counts[r.status]++;
      const text = [
        ...results.map((r) => `${r.status.toUpperCase().padEnd(10)} ${r.theme.padEnd(8)} ${r.pair.fg} on ${r.pair.bg} (${r.pair.use}): ${r.ratio !== undefined ? `${r.ratio}:1, needs ${r.required}:1` : r.reason}`),
        `${counts.pass} pass, ${counts.fail} fail, ${counts.unresolved} unresolved (not verified) across ${tokens.themes.length} theme(s)`,
        results.length === 0 ? 'No pairs declared in tokens.json: contrast is not verified. Add "pairs" for every foreground/background combination the UI uses.' : ''
      ].filter(Boolean).join('\n');
      out({ command, ok: counts.fail === 0, ruleId: 'a11y/contrast', counts, results }, text + '\n');
      return counts.fail ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'catalog': {
      if (rest[0] !== 'validate') {
        io.stderr(`craft catalog: unknown or missing subcommand${rest[0] ? ` "${rest[0]}"` : ''}. Use "craft catalog validate".\n`);
        return EXIT.USAGE;
      }
      const today = values.today === undefined ? undefined : String(values.today);
      if (today !== undefined && !(/^\d{4}-\d{2}-\d{2}$/.test(today) && !Number.isNaN(Date.parse(today + 'T00:00:00Z')))) {
        io.stderr(`craft catalog validate: --today must be a date as YYYY-MM-DD, got "${today}".\n`);
        return EXIT.USAGE;
      }
      const catalogRoot = values.catalog ? resolve(root, String(values.catalog)) : BUNDLED_CATALOG;
      const loaded = loadCatalog({ catalogRoot, projectRoot: root });
      if (!loaded.length) {
        const msg = `No catalog entries found in ${join(catalogRoot, 'entries')} or ${LOCAL_ENTRIES_DIR}/. Pass --catalog <dir> or reinstall the skill.`;
        out({ command, ok: false, status: 'unavailable', message: msg }, msg + '\n');
        return EXIT.UNAVAILABLE;
      }
      const r = validateCatalog(loaded, { today });
      const failOn = failOnArg ?? 'block';
      const failing = r.errors.length + (failOn === 'warn' ? r.warnings.length : 0);
      const text = [
        ...r.errors.map((e) => `ERROR ${e.file} [${e.rule}] ${e.message}\n      fix: ${e.remediation}`),
        ...r.warnings.map((w) => `WARN  ${w.file} [${w.rule}] ${w.message}\n      fix: ${w.remediation}`),
        `${loaded.length} entries (${loaded.filter((l) => l.origin === 'local').length} local): ${r.errors.length} error(s), ${r.warnings.length} warning(s)`
      ].join('\n');
      out({ command: 'catalog validate', ok: failing === 0, entries: loaded.length, valid: r.valid.length, errors: r.errors, warnings: r.warnings }, text + '\n');
      return failing ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'index': {
      if (rest[0] !== 'build') {
        io.stderr(`craft index: unknown or missing subcommand${rest[0] ? ` "${rest[0]}"` : ''}. Use "craft index build".\n`);
        return EXIT.USAGE;
      }
      const catalogRoot = values.catalog ? resolve(root, String(values.catalog)) : BUNDLED_CATALOG;
      const loaded = loadCatalog({ catalogRoot, projectRoot: root });
      if (!loaded.length) {
        const msg = `No catalog entries found in ${join(catalogRoot, 'entries')} or ${LOCAL_ENTRIES_DIR}/. Pass --catalog <dir> or reinstall the skill.`;
        out({ command: 'index build', ok: false, status: 'unavailable', message: msg }, msg + '\n');
        return EXIT.UNAVAILABLE;
      }
      const r = validateCatalog(loaded);
      const bundledDigest = digestEntries(validateCatalog(loaded.filter((l) => l.origin === 'bundled')).valid);
      const index = buildIndex(r.valid, { bundledDigest });
      mkdirSync(join(root, '.craft'), { recursive: true });
      writeFileSync(join(root, LOCAL_INDEX_FILE), serializeIndex(index));
      const text = [
        ...r.errors.map((e) => `SKIP  ${e.file} [${e.rule}] ${e.message}\n      fix: ${e.remediation}`),
        `Wrote ${LOCAL_INDEX_FILE}: ${index.entryCount} entries (${r.valid.filter((l) => l.origin === 'local').length} local), ${Object.keys(index.terms).length} terms.${r.errors.length ? ` ${new Set(r.errors.map((e) => e.file)).size} invalid entr(ies) left out.` : ''}`
      ].join('\n');
      out({ command: 'index build', ok: r.errors.length === 0, file: LOCAL_INDEX_FILE, entries: index.entryCount, terms: Object.keys(index.terms).length, skipped: r.errors }, text + '\n');
      return r.errors.length ? EXIT.FINDINGS : EXIT.OK;
    }

    case 'search': {
      const query = rest.join(' ').trim();
      if (!query) {
        io.stderr('craft search: give an intent to search for, for example: craft search "sortable data table" --limit 5\n');
        return EXIT.USAGE;
      }
      const parsedFilters = parseFilters({
        axes: /** @type {string | undefined} */ (values.axes),
        stack: /** @type {string | undefined} */ (values.stack),
        trust: /** @type {string | undefined} */ (values.trust),
        category: /** @type {string | undefined} */ (values.category),
        limit: /** @type {string | undefined} */ (values.limit)
      });
      if ('error' in parsedFilters) {
        io.stderr(`craft search: ${parsedFilters.error}\n`);
        return EXIT.USAGE;
      }
      const catalogRoot = values.catalog ? resolve(root, String(values.catalog)) : BUNDLED_CATALOG;
      const loc = locateIndex({ catalogRoot, projectRoot: root });
      if (loc.status !== 'ok') {
        out({ command, ok: false, status: 'unavailable', message: loc.message }, loc.message + '\n');
        return EXIT.UNAVAILABLE;
      }
      const r = search(loc.index, query, parsedFilters.filters);
      const results = r.results.map((x) => ({ ...x, file: x.origin === 'local' ? join(root, x.path) : join(loc.catalogRoot, x.path) }));
      const staleNote = loc.stale ? `Note: ${LOCAL_INDEX_FILE} was built from an older bundled catalog; run craft index build.` : '';
      const text = [
        ...results.map((x, i) => `${i + 1}. ${x.id}  [${x.trust} ${x.status} ${x.category}]  score ${x.score}\n   ${x.title}: ${x.intent}\n   read: ${x.file}`),
        results.length
          ? `${results.length} of ${r.matched} matching entries${r.filteredOut ? ` (${r.filteredOut} removed by filters)` : ''}. Read only the entry files you will use.`
          : `No entries matched${r.filteredOut ? ` after filters (${r.filteredOut} matched the words but not the filters; relax --axes, --stack, --trust, or --category)` : '; try other words for the intent'}.`,
        staleNote
      ].filter(Boolean).join('\n');
      out({
        command, ok: true, query, terms: r.terms, filters: parsedFilters.filters,
        index: { file: loc.file, origin: loc.origin, entries: loc.index.entryCount, stale: loc.stale },
        matched: r.matched, filteredOut: r.filteredOut, results
      }, text + '\n');
      return EXIT.OK;
    }

    default:
      io.stderr(`craft: unknown command "${command}". Run "craft --help" for the list.\n`);
      return EXIT.USAGE;
  }
}

/**
 * @param {string} root
 * @returns {'block' | 'warn' | undefined}
 */
function readFailOn(root) {
  try {
    const cfg = JSON.parse(readFileSync(join(root, '.craft', 'craft.config.json'), 'utf8'));
    return cfg.failOn === 'warn' || cfg.failOn === 'block' ? cfg.failOn : undefined;
  } catch {
    return undefined;
  }
}
