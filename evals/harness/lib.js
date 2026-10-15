// Shared, side-effect-free helpers for the paired evaluation harness (P3).
// No process spawning and no network here; run.js and metrics.js do the spawning.
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HARNESS_DIR, '..', '..');
export const BRIEFS_DIR = join(REPO, 'evals', 'briefs');
export const RUNS_DIR = join(HARNESS_DIR, 'runs');
export const RESULTS_DIR = join(HARNESS_DIR, 'results');
export const ARMS = /** @type {const} */ (['skill', 'baseline']);

/** Default agent command. `{prompt}` is replaced by the prompt as one argument (no shell). */
export const DEFAULT_AGENT_CMD = 'claude -p {prompt} --permission-mode bypassPermissions --setting-sources project --output-format stream-json --verbose';

/** Environment variables that would leak the parent session into child runs (same list as evals/triggers/run.js). */
export const ISOLATE_UNSET = [
  'CLAUDE_COWORK_MEMORY_PATH_OVERRIDE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_PROJECTS_SESSION',
  'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD'
];

/**
 * @typedef {{ id: string, title: string, size: 'S' | 'M' | 'L', stack: string, path: string, entry: string, seed?: string }} Brief
 */

/**
 * @param {string} [dir]
 * @returns {Brief[]}
 */
export function loadBriefs(dir = BRIEFS_DIR) {
  return JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).briefs;
}

/**
 * Split an agent command template into argv. Whitespace separates arguments; single or double
 * quotes group. A `{prompt}` token becomes the prompt as one argument, never shell-interpreted.
 * @param {string} template
 * @param {string} prompt
 * @returns {string[]}
 */
export function buildAgentArgv(template, prompt) {
  /** @type {string[]} */
  const out = [];
  for (const m of template.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
    const tok = m[1] ?? m[2] ?? m[3];
    out.push(tok === '{prompt}' ? prompt : tok.split('{prompt}').join(prompt));
  }
  if (!template.includes('{prompt}')) throw new Error('--agent-cmd must contain a {prompt} placeholder');
  return out;
}

/**
 * The prompt both arms receive. It never mentions the skill, so the only difference between
 * arms is whether the skill is installed in the workspace.
 * @param {string} briefText
 * @param {boolean} hasSeed
 * @returns {string}
 */
export function buildPrompt(briefText, hasSeed) {
  return [
    hasSeed
      ? 'The current directory contains an existing project. Complete the brief below by changing it in place.'
      : 'The current directory is an empty project. Complete the brief below by creating the files here.',
    'Work only inside the current directory. Do not ask questions; make reasonable decisions and note them.',
    'When you finish, reply with a short summary of what you built and what you checked or verified, and how.',
    '',
    '--- BRIEF ---',
    briefText.trim(),
    ''
  ].join('\n');
}

/**
 * Pair ids: one per brief and repeat. Repeat 1 keeps the bare brief id.
 * @param {string[]} briefIds
 * @param {number} repeats
 * @returns {{ pairId: string, briefId: string, repeat: number }[]}
 */
export function pairIds(briefIds, repeats) {
  return briefIds.flatMap((briefId) => Array.from({ length: repeats }, (_, i) => ({ pairId: i === 0 ? briefId : `${briefId}~r${i + 1}`, briefId, repeat: i + 1 })));
}

/**
 * Deterministic PRNG (mulberry32) seeded from a string, for reproducible A/B order.
 * @param {string} seed
 * @returns {() => number} values in [0, 1)
 */
export function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which arm is shown as A for one pair, from a run seed and the pair id.
 * @param {string} seed
 * @param {string} pairId
 * @returns {{ A: 'skill' | 'baseline', B: 'skill' | 'baseline' }}
 */
export function assignOrder(seed, pairId) {
  const r = seededRandom(`${seed}:${pairId}`)();
  return r < 0.5 ? { A: 'skill', B: 'baseline' } : { A: 'baseline', B: 'skill' };
}

/**
 * Wilson score interval for a proportion.
 * @param {number} successes may be fractional (ties count half)
 * @param {number} n
 * @param {number} [z] 1.96 for 95%
 * @returns {{ low: number, high: number } | null}
 */
export function wilson(successes, n, z = 1.96) {
  if (!n) return null;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/**
 * Win rate of the skill arm: wins count 1, ties 0.5, losses 0.
 * @param {('skill' | 'baseline' | 'tie')[]} outcomes
 * @returns {{ n: number, wins: number, ties: number, losses: number, score: number, rate: number | null, ci95: { low: number, high: number } | null }}
 */
export function winRate(outcomes) {
  const wins = outcomes.filter((o) => o === 'skill').length;
  const ties = outcomes.filter((o) => o === 'tie').length;
  const n = outcomes.length;
  const score = wins + ties / 2;
  return { n, wins, ties, losses: n - wins - ties, score, rate: n ? score / n : null, ci95: wilson(score, n) };
}

/** Phrases that state a check was done. */
const VERIFY_VERB = /\b(verified|verify|tested|tests? pass(?:es|ed)?|checked|confirmed|validated|passes|passed|passing|no (?:axe )?violations|no errors|meets|compliant|zero (?:violations|errors|findings)|clean)\b/i;
/** Phrases that disclaim a check (honest "not verified" statements are not claims). */
const DISCLAIMER = /\b(not (?:been )?(?:verified|tested|checked|run)|nothing (?:was |has been |is )?(?:verified|tested|checked)|unverified|did not|didn't|could not|couldn't|cannot|can't|unable|was not|wasn't|no browser|without (?:a )?browser|not able|untested|n't run|needs? (?:a )?(?:manual|human|visual) review)\b/i;

/** Claim categories, the words that signal them, and the receipt check ids that back them. */
export const CLAIM_CATEGORIES = [
  { category: 'accessibility', words: /\b(accessib\w*|a11y|axe|screen[- ]?readers?|aria|keyboard)\b/i, receipts: /^t2\.(axe|keyboard)/ },
  { category: 'contrast', words: /\bcontrast\b/i, receipts: /^(t2\.axe|t0\.contrast)/ },
  { category: 'responsive', words: /\b(responsive|overflow|reflow|viewports?|breakpoints?|320\s?px|375\s?px|mobile|200% zoom)\b/i, receipts: /^t2\.(overflow|zoom200|rtl)/ },
  { category: 'motion', words: /\b(reduced[- ]motion|prefers-reduced-motion)\b/i, receipts: /^t2\.reduced-motion/ },
  { category: 'build', words: /\b(builds?|typecheck\w*|type-check\w*|tsc|compiles?|npm run \w+)\b/i, receipts: /^t1\./ },
  { category: 'lint', words: /\b(lint\w*|slop)\b/i, receipts: /^t0\./ },
  { category: 'tier', words: /\b(tier ?[0-3]|T[0-3])\b/, receipts: /^t[0-3]\./ },
  { category: 'rendered', words: /\b(rendered|screenshots?|chromium|playwright|in (?:a|the) browser)\b/i, receipts: /^t2\./ }
];

/**
 * Heuristic claims parser. Splits an agent's final answer into sentences and keeps the ones
 * that state a verification (a verify verb, no disclaimer). Each claim gets categories from
 * keywords; a claim with a verify verb but no category is "general". This is a heuristic: it
 * can miss paraphrased claims and can misread quoted text. Results record the matched text.
 * @param {string} text
 * @returns {{ sentence: string, categories: string[] }[]}
 */
export function parseClaims(text) {
  /** @type {{ sentence: string, categories: string[] }[]} */
  const claims = [];
  /** @param {string} s */
  const add = (s) => {
    const categories = CLAIM_CATEGORIES.filter((c) => c.words.test(s)).map((c) => c.category);
    claims.push({ sentence: s.slice(0, 300), categories: categories.length ? categories : ['general'] });
  };
  // Section state: lines under a heading such as "Verified" or "Tests" are claims even without
  // a verb; lines under "Not verified" are disclaimers. Headings themselves are not claims.
  /** @type {'none' | 'verify' | 'disclaim'} */
  let section = 'none';
  for (const raw of text.replace(/```[\s\S]*?```/g, ' ').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^(#{1,6}\s+(.+)|\*\*([^*]+)\*\*:?|([A-Z][^.!?]{0,60}):)$/.exec(line);
    if (heading) {
      const title = heading[2] ?? heading[3] ?? heading[4] ?? '';
      section = DISCLAIMER.test(title) || /\b(not|human|manual|todo|next)\b/i.test(title) ? 'disclaim' : VERIFY_VERB.test(title) || /\b(verification|checks?|tests?)\b/i.test(title) ? 'verify' : 'none';
      continue;
    }
    const body = line.replace(/^([>*\-+]|\d+[.)])\s+/, '');
    if (section === 'disclaim') continue;
    for (const s of body.split(/(?<=[.!?])\s+/)) {
      const sentence = s.trim();
      if (!sentence || DISCLAIMER.test(sentence)) continue;
      if (section === 'verify' || VERIFY_VERB.test(sentence)) add(sentence);
    }
  }
  return claims;
}

/**
 * Check each claim against receipt checks (status "verified" only). A claim is matched when
 * every one of its categories has at least one verified receipt check of the right kind.
 * @param {{ sentence: string, categories: string[] }[]} claims
 * @param {{ id: string, status: string }[]} receipts verified checks from .craft/reports/latest.json
 * @returns {{ claims: number, matched: number, unmatched: number, rate: number | null, details: { sentence: string, categories: string[], matched: boolean, receipts: string[] }[] }}
 */
export function auditClaims(claims, receipts) {
  const verified = receipts.filter((r) => r.status === 'verified').map((r) => r.id);
  const details = claims.map((c) => {
    /** @type {string[]} */
    const backing = [];
    let ok = true;
    for (const cat of c.categories) {
      const def = CLAIM_CATEGORIES.find((d) => d.category === cat);
      const hits = def ? verified.filter((id) => def.receipts.test(id)) : verified;
      if (!hits.length) ok = false;
      backing.push(...hits);
    }
    return { ...c, matched: ok, receipts: [...new Set(backing)] };
  });
  const matched = details.filter((d) => d.matched).length;
  return { claims: claims.length, matched, unmatched: claims.length - matched, rate: claims.length ? matched / claims.length : null, details };
}

/**
 * List files under dir (POSIX relative paths), skipping named directories at any depth.
 * @param {string} dir
 * @param {Set<string>} [skip]
 * @returns {string[]}
 */
export function listFiles(dir, skip = new Set()) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (skip.has(name)) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Copy a tree, skipping named directories. Symlinks are not followed.
 * @param {string} from
 * @param {string} to
 * @param {Set<string>} [skip]
 * @returns {string[]} copied relative paths
 */
export function copyTree(from, to, skip = new Set()) {
  const files = listFiles(from, skip);
  for (const f of files) {
    mkdirSync(dirname(join(to, f)), { recursive: true });
    copyFileSync(join(from, f), join(to, f));
  }
  return files;
}

/** Directories that never go into an evaluation copy or a blind bundle. */
export const NON_PRODUCT_DIRS = new Set(['.craft', '.claude', 'node_modules', '.git', '.cursor', '.agents']);

/** Text that would reveal which arm produced an output. */
/** Tool-specific markers, safe to remove from product code (they never occur as product content). */
export const CODE_MARKERS = [
  /frontend[\s_-]?craft/gi, /craft-allow[^\n]*/gi, /\.craft\/[^\s"'`)]*/gi, /\.craft\b/g,
  /\bcraft (?:lint|shoot|audit|report|init|contrast|doctor)\b/gi, /\bDESIGN\.md\b/g, /\bSKILL\.md\b/g, /\bslop[\s-]?lint\b/gi
];
/** Markers for agent prose: also the skill's vocabulary, which could be ordinary words in product copy. */
export const ARM_MARKERS = [...CODE_MARKERS, /\bproof report\b/gi, /\breceipts?\b/gi, /\btier ?[0-3]\b/gi, /\bT[0-3]\b/g, /\bdesign contract\b/gi];

/**
 * Remove arm-identifying markers from text. In "code" mode a comment line that mentions a
 * marker is dropped entirely (a visible "[redacted]" would itself reveal the arm) and other
 * mentions are deleted; in "prose" mode markers become "[redacted]".
 * @param {string} text
 * @param {'code' | 'prose'} [mode]
 * @returns {{ text: string, redactions: number }}
 */
export function redact(text, mode = 'prose') {
  let redactions = 0;
  const markers = mode === 'code' ? CODE_MARKERS : ARM_MARKERS;
  /** @param {string} s */
  const hits = (s) => markers.some((re) => {
    re.lastIndex = 0;
    return re.test(s);
  });
  /** @param {string} s @param {string} by */
  const replaceAll = (s, by) => {
    let out = s;
    for (const re of markers) {
      out = out.replace(re, () => {
        redactions++;
        return by;
      });
    }
    return out;
  };
  if (mode === 'prose') return { text: replaceAll(text, '[redacted]'), redactions };
  // Whole comments (HTML, CSS/JS block, JS line) that mention a marker go first.
  const decommented = text.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<=^|\s)\/\/[^\n]*/g, (c) => {
    if (!hits(c)) return c;
    redactions++;
    return '';
  });
  const lines = [];
  for (const line of decommented.split('\n')) {
    if (hits(line) && /^\s*(\/\*|\/\/|<!--|\*|#)/.test(line)) {
      redactions++;
      continue;
    }
    lines.push(hits(line) ? replaceAll(line, '') : line);
  }
  return { text: lines.join('\n'), redactions };
}

/**
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => /** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * @param {string} p
 * @returns {any}
 */
export function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}
