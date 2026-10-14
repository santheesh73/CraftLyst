// craft command-line interface. Exit codes: 0 ok, 1 findings at/above --fail-on,
// 2 usage error, 3 environment or tool unavailable (including commands not in this version).
import { parseArgs } from 'node:util';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VERSION } from './version.js';
import { detect } from './doctor.js';
import { init } from './init.js';
import { checkContract, RULE_ID as CONTRACT_RULE } from './contract.js';
import { checkPairs } from './tokens.js';
import { validateAgainst } from './schemas.js';

export const EXIT = { OK: 0, FINDINGS: 1, USAGE: 2, UNAVAILABLE: 3 };

/** Commands planned in the spec and the version that adds them. */
const PLANNED = {
  audit: '0.2.0',
  shoot: '0.2.0',
  report: '0.2.0',
  index: '0.4.0',
  search: '0.4.0',
  catalog: '0.4.0',
  tokens: '0.5.0'
};

const HELP = `craft ${VERSION}: design contract, checks, and proof for frontend work

Usage: craft <command> [path] [options]

Commands available in this version:
  doctor            Detect Node, package manager, framework, styling, Playwright, axe
  init              Scaffold .craft/ from templates (never overwrites existing files)
  lint [path]       Tier 0 checks. Rules in this version: ${CONTRACT_RULE}
  contrast          WCAG 2.x AA contrast for token pairs in .craft/tokens.json

Planned (exit 3 until released): ${Object.entries(PLANNED).map(([c, v]) => `${c} (${v})`).join(', ')}

Options:
  --json            Machine-readable output
  --fail-on <lvl>   block | warn (default: config failOn, else block)
  --cwd <dir>       Project root (default: current directory)
  --tokens <file>   Token file for contrast (default: .craft/tokens.json)
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
        'from-repo': { type: 'boolean', default: false },
        'allow-network': { type: 'boolean', default: false },
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
        const msg = `craft init --from-repo is planned for 0.2.0. Until then, extract the contract by hand (Direction Engine step 6).`;
        out({ command, ok: false, status: 'unavailable', availableIn: '0.2.0', message: msg }, msg + '\n');
        return EXIT.UNAVAILABLE;
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
      if (rest.length > 1) {
        io.stderr('craft lint takes at most one path.\n');
        return EXIT.USAGE;
      }
      const target = rest[0] ? resolve(root, rest[0]) : root;
      const failOn = failOnArg ?? readFailOn(target) ?? 'block';
      const { findings, files } = checkContract(target);
      findings.sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.message.localeCompare(b.message));
      const summary = { block: 0, warn: 0, info: 0 };
      for (const f of findings) summary[f.severity]++;
      const failing = failOn === 'warn' ? summary.block + summary.warn : summary.block;
      const text = [
        `craft lint ${VERSION}: rules run: ${CONTRACT_RULE} (other Slop Lint rules arrive in 0.2.0 and are not checked here)`,
        `Files: ${files.length ? files.join(', ') : 'none'}`,
        ...findings.map((f) => `${f.severity.toUpperCase().padEnd(5)} ${f.ruleId} ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}\n      fix: ${f.remediation}`),
        `${summary.block} block, ${summary.warn} warn, ${summary.info} info (fail on: ${failOn})`
      ].join('\n');
      out({ command, ok: failing === 0, rulesRun: [CONTRACT_RULE], failOn, files, summary, findings }, text + '\n');
      return failing ? EXIT.FINDINGS : EXIT.OK;
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
